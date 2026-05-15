// Deriv WebSocket client (browser-only). Per-tab connection, auto-reconnect,
// request/response correlation by req_id, and pub/sub for streaming messages.

type Listener = (msg: any) => void;

export class DerivClient {
  private ws: WebSocket | null = null;
  private appId: string;
  private url: string;
  private nextReqId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private subs = new Map<string, Set<Listener>>(); // by msg_type
  private subscriptions = new Map<string, string>(); // logical key -> subscription id
  private connectPromise: Promise<void> | null = null;
  private authToken: string | null = null;
  private isAuthed = false;
  private statusListeners = new Set<(s: string) => void>();
  private status: "idle" | "connecting" | "open" | "closed" = "idle";
  private reconnectTimer: any = null;

  constructor(appId: string) {
    this.appId = appId;
    this.url = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
  }

  onStatus(cb: (s: string) => void) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }
  private setStatus(s: typeof this.status) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    this.setStatus("connecting");
    this.connectPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = async () => {
        this.setStatus("open");
        if (this.authToken) {
          try { await this.authorize(this.authToken); } catch (e) { /* ignore */ }
        }
        resolve();
      };
      ws.onerror = (e) => {
        this.setStatus("closed");
        reject(e);
      };
      ws.onclose = () => {
        this.setStatus("closed");
        this.connectPromise = null;
        this.isAuthed = false;
        // auto-reconnect after delay
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(() => {});
          }, 2000);
        }
      };
      ws.onmessage = (ev) => {
        let data: any;
        try { data = JSON.parse(ev.data); } catch { return; }
        const reqId = data.req_id;
        if (reqId && this.pending.has(reqId)) {
          const p = this.pending.get(reqId)!;
          this.pending.delete(reqId);
          if (data.error) p.reject(data.error);
          else p.resolve(data);
        }
        const msgType = data.msg_type;
        if (msgType && this.subs.has(msgType)) {
          this.subs.get(msgType)!.forEach((l) => l(data));
        }
      };
    });
    return this.connectPromise;
  }

  on(msgType: string, listener: Listener): () => void {
    if (!this.subs.has(msgType)) this.subs.set(msgType, new Set());
    this.subs.get(msgType)!.add(listener);
    return () => this.subs.get(msgType)?.delete(listener);
  }

  async send(payload: Record<string, any>): Promise<any> {
    await this.connect();
    const req_id = this.nextReqId++;
    return new Promise((resolve, reject) => {
      this.pending.set(req_id, { resolve, reject });
      this.ws!.send(JSON.stringify({ ...payload, req_id }));
      // safety timeout
      setTimeout(() => {
        if (this.pending.has(req_id)) {
          this.pending.delete(req_id);
          reject(new Error("Request timeout"));
        }
      }, 30_000);
    });
  }

  setToken(token: string | null) {
    this.authToken = token;
    this.isAuthed = false;
    if (token && this.ws?.readyState === WebSocket.OPEN) {
      this.authorize(token).catch(() => {});
    }
  }

  async authorize(token: string) {
    const res = await this.send({ authorize: token });
    this.isAuthed = true;
    return res.authorize;
  }

  async forgetSubscription(key: string) {
    const id = this.subscriptions.get(key);
    if (id) {
      this.subscriptions.delete(key);
      try { await this.send({ forget: id }); } catch {}
    }
  }

  async subscribeTicks(symbol: string, onTick: (t: { symbol: string; quote: number; epoch: number }) => void) {
    const key = `ticks:${symbol}`;
    await this.forgetSubscription(key);
    const off = this.on("tick", (msg) => {
      if (msg.tick?.symbol === symbol) {
        onTick({ symbol, quote: msg.tick.quote, epoch: msg.tick.epoch });
      }
    });
    const res = await this.send({ ticks: symbol, subscribe: 1 });
    if (res.subscription?.id) this.subscriptions.set(key, res.subscription.id);
    return () => { off(); this.forgetSubscription(key); };
  }

  async subscribeBalance(onBalance: (b: { balance: number; currency: string; loginid: string }) => void) {
    const key = "balance";
    await this.forgetSubscription(key);
    const off = this.on("balance", (msg) => {
      if (msg.balance) onBalance({ balance: msg.balance.balance, currency: msg.balance.currency, loginid: msg.balance.loginid });
    });
    const res = await this.send({ balance: 1, subscribe: 1 });
    if (res.subscription?.id) this.subscriptions.set(key, res.subscription.id);
    return () => { off(); this.forgetSubscription(key); };
  }

  async getProposal(params: {
    contract_type: string;
    symbol: string;
    amount: number;
    duration: number;
    duration_unit: string;
    barrier?: string | number;
    currency?: string;
  }) {
    const res = await this.send({
      proposal: 1,
      amount: params.amount,
      basis: "stake",
      contract_type: params.contract_type,
      currency: params.currency || "USD",
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
      ...(params.barrier !== undefined ? { barrier: String(params.barrier) } : {}),
    });
    return res.proposal;
  }

  async buyContract(proposalId: string, price: number) {
    const res = await this.send({ buy: proposalId, price });
    return res.buy;
  }

  // Wait for a contract to settle (poll proposal_open_contract)
  async waitForContract(contract_id: number, onUpdate?: (c: any) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const off = this.on("proposal_open_contract", (msg) => {
        const c = msg.proposal_open_contract;
        if (c?.contract_id !== contract_id) return;
        try { onUpdate?.(c); } catch {}
        if (c.is_sold) {
          off();
          this.send({ forget: msg.subscription?.id }).catch(() => {});
          resolve(c);
        }
      });
      this.send({ proposal_open_contract: 1, contract_id, subscribe: 1 }).catch((e) => {
        off();
        reject(e);
      });
    });
  }

  close() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
  }
}
