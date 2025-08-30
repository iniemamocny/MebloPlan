import React from 'react'
import { useTranslation } from 'react-i18next'
import SingleMMInput from '../components/SingleMMInput'
import { CabinetFormValues, CabinetFormProps } from './CornerCabinetForm'

export default function CargoCabinetForm({ values, onChange }: CabinetFormProps){
  const { t } = useTranslation()
  const { width, height, depth, doorsCount = 0, drawersCount = 0, adv, hardware } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  return (
    <div>
      <details open>
        <summary>{t('configurator.sections.korpus')}</summary>
        <div>
          <div className="small">{t('forms.width')}</div>
          <SingleMMInput value={width} onChange={w=>update({ width:w })} />
          <div className="small">{t('forms.height')}</div>
          <SingleMMInput value={height} onChange={h=>update({ height:h })} />
          <div className="small">{t('forms.depth')}</div>
          <SingleMMInput value={depth} onChange={d=>update({ depth:d })} />
        </div>
      </details>
      <details>
        <summary>{t('configurator.sections.fronty')}</summary>
        <div>
          <div className="small">{t('forms.doorsCount')}</div>
          <SingleMMInput min={0} step={1} value={doorsCount} onChange={n=>update({ doorsCount:n })} />
          <div className="small">{t('forms.drawersCount')}</div>
          <SingleMMInput min={0} step={1} value={drawersCount} onChange={n=>update({ drawersCount:n })} />
        </div>
      </details>
      <details>
        <summary>{t('configurator.sections.okucie')}</summary>
        {adv && <pre style={{ display:'none' }}>{JSON.stringify(adv)}</pre>}
      </details>
      <details>
        <summary>{t('configurator.sections.nozki')}</summary>
        {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
      </details>
    </div>
  )
}
