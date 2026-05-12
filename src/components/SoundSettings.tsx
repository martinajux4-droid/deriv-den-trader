import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  getSoundSettings, setSoundSettings, subscribeSoundSettings,
  playBoot, playExecute, playProfit, playLoss, primeAudio,
  type SoundSettings,
} from "@/lib/audio-engine";
import { Volume2, VolumeX, Music2, Sparkles, Zap, Mic2, Play } from "lucide-react";

export function SoundSettingsCard() {
  const [s, setS] = useState<SoundSettings>(() => getSoundSettings());

  useEffect(() => subscribeSoundSettings(setS), []);

  const update = (patch: Partial<SoundSettings>) => {
    primeAudio();
    setS(setSoundSettings(patch));
  };

  return (
    <Card className="card-premium space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Sound Experience</h2>
          <p className="text-[11px] text-muted-foreground">
            Cinematic AI feedback · synthesized · mobile-optimized
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> Premium
        </span>
      </div>

      <Row
        icon={s.master ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        title="Master sound"
        desc="Enable all AI engine sounds"
        checked={s.master}
        onChange={(v) => update({ master: v })}
      />

      <div className="rounded-xl border border-border/60 bg-background/30 p-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" />Volume</span>
          <span className="num text-foreground">{Math.round(s.volume * 100)}%</span>
        </div>
        <Slider
          className="mt-2"
          value={[Math.round(s.volume * 100)]}
          min={0} max={100} step={1}
          disabled={!s.master}
          onValueChange={([v]) => update({ volume: v / 100 })}
        />
      </div>

      <Row
        icon={<Music2 className="h-4 w-4" />}
        title="Market ambience"
        desc="Soft radar / scanning loop while AI analyses"
        checked={s.ambience}
        disabled={!s.master}
        onChange={(v) => update({ ambience: v })}
      />
      <Row
        icon={<Zap className="h-4 w-4" />}
        title="Trade sounds"
        desc="Execution, profit and loss confirmations"
        checked={s.profit}
        disabled={!s.master}
        onChange={(v) => update({ profit: v })}
      />
      <Row
        icon={<Mic2 className="h-4 w-4" />}
        title="AI voice"
        desc="Reserved for upcoming voice alerts"
        checked={s.voice}
        disabled={!s.master}
        onChange={(v) => update({ voice: v })}
      />

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
        <Preview label="Boot" onClick={playBoot} />
        <Preview label="Execute" onClick={playExecute} />
        <Preview label="Profit" onClick={playProfit} />
        <Preview label="Loss" onClick={playLoss} />
      </div>
    </Card>
  );
}

function Row({
  icon, title, desc, checked, onChange, disabled,
}: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">{icon}</span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[11px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function Preview({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => { primeAudio(); onClick(); }}
      className="h-8 gap-1.5 border-border/60 bg-background/40 px-2.5 text-[11px]"
    >
      <Play className="h-3 w-3" /> {label}
    </Button>
  );
}
