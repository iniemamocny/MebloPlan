import React from 'react'
import { useTranslation } from 'react-i18next'
import SingleMMInput from '../components/SingleMMInput'
import { CabinetFormValues, CabinetFormProps } from './CornerCabinetForm'

export default function ApplianceCabinetForm({ values, onChange }: CabinetFormProps){
  const { t } = useTranslation()
  const { height, depth, hardware, legs } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  return (
    <div>
      <details open>
        <summary>{t('forms.sections.korpus')}</summary>
        <div>
          <div className="small">{t('forms.height')}</div>
          <SingleMMInput value={height} onChange={h=>update({ height:h })} />
          <div className="small">{t('forms.depth')}</div>
          <SingleMMInput value={depth} onChange={d=>update({ depth:d })} />
        </div>
      </details>
      <details>
        <summary>{t('forms.sections.fronty')}</summary>
        <div />
      </details>
      <details>
        <summary>{t('forms.sections.okucie')}</summary>
        {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
      </details>
      <details>
        <summary>{t('forms.sections.nozki')}</summary>
        {legs && <pre style={{ display:'none' }}>{JSON.stringify(legs)}</pre>}
      </details>
    </div>
  )
}
