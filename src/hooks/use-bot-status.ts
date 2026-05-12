import { useEffect, useState } from "react";

const KEY = "hifex.bot.status.v1";
const EVT = "hifex:bot-status";
export const BOT_EVT = "hifex:bot-event";
export const BOT_TP = "hifex:bot-tp";

export type BotStatus = {
  running: boolean;
  paused?: boolean;
  strategy?: string;
  symbol?: string;
  pnl?: number;
  trades?: number;
  wins?: number;
  losses?: number;
  streak?: number;        // current win streak (negative for loss streak)
  bestStreak?: number;
  peak?: number;          // peak P&L
  baseEquity?: number;    // for ROI calc
  currency?: string;
  takeProfit?: number;
  stopLoss?: number;
  confidence?: number;
  direction?: "RISE" | "FALL" | "WAIT";
  activeTrades?: number;
  accountType?: "Demo" | "Real";
  loginid?: string;
  startedAt?: number;
};

export type BotFeedEvent = {
  id: string;
  ts: number;
  kind: "scan" | "open" | "won" | "lost" | "tp" | "sl" | "switch" | "info" | "warn";
  symbol?: string;
  contract?: string;
  profit?: number;
  confidence?: number;
  message: string;
};

export type TpPayload = {
  ts: number;
  pnl: number;
  roi: number;
  trades: number;
  wins: number;
  losses: number;
  strategy: string;
  symbol: string;
  confidence: number;
  currency: string;
  accountType: "Demo" | "Real";
  reason: "take_profit" | "daily_target";
};

const empty: BotStatus = { running: false };

function read(): BotStatus {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BotStatus) : empty;
  } catch {
    return empty;
  }
}

export function setBotStatus(status: BotStatus) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent(EVT, { detail: status }));
  } catch {}
}

export function emitBotEvent(e: Omit<BotFeedEvent, "id" | "ts"> & { ts?: number }) {
  if (typeof window === "undefined") return;
  const evt: BotFeedEvent = {
    id: Math.random().toString(36).slice(2),
    ts: e.ts ?? Date.now(),
    ...e,
  };
  window.dispatchEvent(new CustomEvent(BOT_EVT, { detail: evt }));
}

export function emitTakeProfit(payload: TpPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BOT_TP, { detail: payload }));
}

export function useBotStatus(): BotStatus {
  const [s, setS] = useState<BotStatus>(empty);
  useEffect(() => {
    setS(read());
    const onEvt = (e: Event) => setS((e as CustomEvent<BotStatus>).detail || read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setS(read()); };
    window.addEventListener(EVT, onEvt as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onEvt as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return s;
}
