import React from 'react'

type Props = {
  /** Optional label displayed alongside the numeric field */
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}

export default function SingleMMInput({ label, value, onChange, min = 0, max = 4000, step = 1 }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const val = Number.isFinite(value) ? value : 0

  const input = (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={val}
      onChange={(e) => {
        const v = Number((e.target as HTMLInputElement).value)
        onChange(clamp(Number.isFinite(v) ? v : 0))
      }}
    />
  )

  return label ? (
    <label className="flex items-center gap-2">
      <span>{label}</span>
      {input}
    </label>
  ) : (
    input
  )
}
