import { useMemo } from "react";

/**
 * Cinematic animated background: drifting gradient mesh, AI grid lines,
 * floating gold/blue particles, and soft aurora blobs. Pointer-events
 * disabled — purely decorative, sits fixed behind app content.
 */
export function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: `${(i * 4.7) % 100}%`,
        delay: `${(i * 0.7) % 12}s`,
        duration: `${14 + ((i * 1.3) % 12)}s`,
        size: 2 + ((i * 1.7) % 4),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.55_0.18_250/0.25),transparent_60%)]" />
      {/* Drifting mesh */}
      <div className="absolute inset-0 bg-mesh-anim opacity-80" />
      {/* AI grid lines */}
      <div className="absolute inset-0 bg-grid-ai opacity-60" />
      {/* Aurora blobs */}
      <div
        className="aurora-blob"
        style={{
          width: 520, height: 520, left: "-8%", top: "-12%",
          background: "oklch(0.62 0.18 250 / 0.35)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 460, height: 460, right: "-6%", top: "20%",
          background: "oklch(0.82 0.15 85 / 0.28)",
          animationDelay: "4s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 600, height: 600, left: "20%", bottom: "-20%",
          background: "oklch(0.55 0.2 280 / 0.28)",
          animationDelay: "8s",
        }}
      />
      {/* Floating particles */}
      <div className="particles-layer">
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              left: p.left,
              width: p.size, height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>
      {/* Bottom darkening for content readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}