import { useEffect, useRef } from 'react';

interface LevelMeterProps {
  level: number;
  label: string;
  tall?: boolean;
}

export function LevelMeter({ level, label, tall = false }: LevelMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const wave = 0.72 + 0.28 * Math.sin((time - start) / 420 + level * 12);
      const value = Math.max(0, Math.min(1, level * wave));
      fillRef.current?.style.setProperty('--level', `${(value * 100).toFixed(1)}%`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [level]);

  return (
    <div
      className={`meter${tall ? ' meter--tall' : ''}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
    >
      <div ref={fillRef} className="meter-fill" />
      <div className="meter-ticks" aria-hidden="true" />
    </div>
  );
}
