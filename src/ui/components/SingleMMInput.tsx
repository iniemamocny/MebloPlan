import React from 'react';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export default function SingleMMInput({
  value,
  onChange,
  min = 0,
  max = 4000,
  step = 1,
}: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const val = Number.isFinite(value) ? value : 0;
  return (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={val}
      onChange={(e) => {
        const v = Number((e.target as HTMLInputElement).value);
        onChange(clamp(Number.isFinite(v) ? v : 0));
      }}
    />
  );
}
