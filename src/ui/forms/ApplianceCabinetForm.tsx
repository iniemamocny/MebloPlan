import React from 'react'
import { useTranslation } from 'react-i18next'
import SingleMMInput from '../components/SingleMMInput'
import { CabinetFormValues, CabinetFormProps } from './CornerCabinetForm'

export default function ApplianceCabinetForm({ values, onChange }: CabinetFormProps){
  const { t } = useTranslation()
  const { width, height, depth, adv, hardware } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  return (
    <div>
      <SingleMMInput label={t('forms.width')} value={width} onChange={w=>update({ width:w })} />
      <SingleMMInput label={t('forms.height')} value={height} onChange={h=>update({ height:h })} />
      <SingleMMInput label={t('forms.depth')} value={depth} onChange={d=>update({ depth:d })} />
      {/* Appliance specific options such as appliance type could be configured elsewhere. */}
      {adv && <pre style={{ display:'none' }}>{JSON.stringify(adv)}</pre>}
      {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
    </div>
  )
}
