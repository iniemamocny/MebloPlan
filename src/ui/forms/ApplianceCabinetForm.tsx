import React from 'react'
import SingleMMInput from '../components/SingleMMInput'
import { CabinetFormValues, CabinetFormProps } from './types'

export default function ApplianceCabinetForm({ values, onChange }: CabinetFormProps){
  const { width, height, depth, adv, hardware } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  return (
    <div>
      <SingleMMInput label="Szerokość" value={width} onChange={w=>update({ width:w })} />
      <SingleMMInput label="Wysokość" value={height} onChange={h=>update({ height:h })} />
      <SingleMMInput label="Głębokość" value={depth} onChange={d=>update({ depth:d })} />
      {/* Appliance specific options such as appliance type could be configured elsewhere. */}
      {adv && <pre style={{ display:'none' }}>{JSON.stringify(adv)}</pre>}
      {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
    </div>
  )
}
