// Caches `contracts_for` lookups and exposes helpers to validate / snap
// trade parameters before sending a proposal. This eliminates the
// "Trading is not offered for this duration" error.
import type { DerivClient } from "./deriv-ws";

export type ContractSpec = {
  contract_type: string;
  min_duration_seconds: number;
  max_duration_seconds: number;
  units: Set<string>; // 't','s','m','h','d'
  barriers?: number; // number of barriers required (0,1,2)
};

export type SymbolContractInfo = {
  symbol: string;
  fetchedAt: number;
  byType: Map<string, ContractSpec>;
};

const cache = new Map<string, Promise<SymbolContractInfo>>();

const UNIT_SECONDS: Record<string, number> = { t: 2, s: 1, m: 60, h: 3600, d: 86400 };

function parseDur(s: string | number | undefined): number {
  if (s == null) return 0;
  const str = String(s);
  const m = str.match(/^(\d+)([tsmhd])$/);
  if (!m) return 0;
  return Number(m[1]) * (UNIT_SECONDS[m[2]] ?? 1);
}

export async function getContractsFor(client: DerivClient, symbol: string): Promise<SymbolContractInfo> {
  const existing = cache.get(symbol);
  if (existing) return existing;
  const p = (async () => {
    const res = await client.send({ contracts_for: symbol, currency: "USD" });
    const list = res.contracts_for?.available || [];
    const byType = new Map<string, ContractSpec>();
    for (const c of list) {
      const type = c.contract_type as string;
      const minS = parseDur(c.min_contract_duration);
      const maxS = parseDur(c.max_contract_duration);
      const unit = (c.expiry_type === "tick" ? "t" : (c.min_contract_duration?.toString().slice(-1) || "m")) as string;
      const cur = byType.get(type) || {
        contract_type: type,
        min_duration_seconds: Number.MAX_SAFE_INTEGER,
        max_duration_seconds: 0,
        units: new Set<string>(),
        barriers: c.barriers ?? 0,
      };
      cur.min_duration_seconds = Math.min(cur.min_duration_seconds, minS || cur.min_duration_seconds);
      cur.max_duration_seconds = Math.max(cur.max_duration_seconds, maxS || cur.max_duration_seconds);
      if (unit) cur.units.add(unit);
      byType.set(type, cur);
    }
    return { symbol, fetchedAt: Date.now(), byType };
  })();
  cache.set(symbol, p);
  try { return await p; } catch (e) { cache.delete(symbol); throw e; }
}

export function supportsContract(info: SymbolContractInfo, contract_type: string) {
  return info.byType.has(contract_type);
}

/** Snap requested duration into the supported range for the contract.
 *  Returns null if the contract type itself isn't supported on this symbol. */
export function snapDuration(
  info: SymbolContractInfo,
  contract_type: string,
  duration: number,
  unit: string,
): { duration: number; unit: string } | null {
  const spec = info.byType.get(contract_type);
  if (!spec) return null;
  // Prefer ticks for synthetic indices when supported (lowest latency).
  let chosenUnit = spec.units.has(unit) ? unit : (spec.units.has("t") ? "t" : Array.from(spec.units)[0] || "s");
  let secs = duration * (UNIT_SECONDS[chosenUnit] ?? 1);
  secs = Math.max(spec.min_duration_seconds || 1, Math.min(spec.max_duration_seconds || secs, secs));
  let dur = Math.max(1, Math.round(secs / (UNIT_SECONDS[chosenUnit] ?? 1)));
  // Tick contracts must be 1..10
  if (chosenUnit === "t") dur = Math.max(1, Math.min(10, dur));
  return { duration: dur, unit: chosenUnit };
}
