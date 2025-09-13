import React from 'react'

type Props = {
  value: number
  onChange: (v:number)=>void
  min?: number
  max?: number
  maxLength?: number
}

export default function SingleMMInput({ value, onChange, min=0, max=4000, maxLength }: Props){
  const clamp = (v:number) => Math.max(min, Math.min(max, v))
  const val = Number.isFinite(value) ? String(value) : ''
  const widthStyle = maxLength ? { width: `${maxLength + 1}ch` } : undefined
  return (
    <input
      className="input"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={maxLength ? val.slice(0, maxLength) : val}
      maxLength={maxLength}
      onChange={(e)=>{
        const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '')
        const sliced = maxLength ? digits.slice(0, maxLength) : digits
        const num = Number(sliced)
        onChange(clamp(Number.isFinite(num) ? num : 0))
      }}
      style={widthStyle}
    />
  )
}
