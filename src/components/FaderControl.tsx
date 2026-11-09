import { useId } from 'react';
import { faderToDb } from '../domain/format';

interface FaderControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function FaderControl({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: FaderControlProps) {
  const id = useId();
  return (
    <div className="fader-control">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="fader-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={faderToDb(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
