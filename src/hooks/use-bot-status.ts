import { useEffect, useState } from "react";

const KEY = "hifex.bot.status.v1";
const EVT = "hifex:bot-status";

export type BotStatus = {
  running: boolean;
  strategy?: string;
  symbol?: string;
  pnl?: number;
  trades?: number;
  startedAt?: number;
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
