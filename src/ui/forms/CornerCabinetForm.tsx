import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SingleMMInput from '../components/SingleMMInput'

export interface CabinetFormValues {
  height: number
  depth: number
  hardware?: any
  legs?: any
}

export interface CabinetFormProps {
  values: CabinetFormValues
  onChange: (vals: CabinetFormValues) => void
}

export default function CornerCabinetForm({ values, onChange }: CabinetFormProps){
  const { t } = useTranslation()
  const { height, depth, hardware, legs } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  const [openSection, setOpenSection] =
    useState<'korpus' | 'fronty' | 'okucie' | 'nozki' | null>(null)
  return (
    <div>
      <details open={openSection === 'korpus'}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'korpus' ? null : 'korpus');
          }}
          className={openSection === 'korpus' ? 'active' : ''}
        >
          {t('forms.sections.korpus')}
        </summary>
        <div>
          <div className="small">{t('forms.height')}</div>
          <SingleMMInput value={height} onChange={h=>update({ height:h })} />
          <div className="small">{t('forms.depth')}</div>
          <SingleMMInput value={depth} onChange={d=>update({ depth:d })} />
        </div>
      </details>
      <details open={openSection === 'fronty'}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'fronty' ? null : 'fronty');
          }}
          className={openSection === 'fronty' ? 'active' : ''}
        >
          {t('forms.sections.fronty')}
        </summary>
        <div />
      </details>
      <details open={openSection === 'okucie'}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'okucie' ? null : 'okucie');
          }}
          className={openSection === 'okucie' ? 'active' : ''}
        >
          {t('forms.sections.okucie')}
        </summary>
        {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
      </details>
      <details open={openSection === 'nozki'}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'nozki' ? null : 'nozki');
          }}
          className={openSection === 'nozki' ? 'active' : ''}
        >
          {t('forms.sections.nozki')}
        </summary>
        {legs && <pre style={{ display:'none' }}>{JSON.stringify(legs)}</pre>}
      </details>
    </div>
  )
}
