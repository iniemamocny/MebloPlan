import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SingleMMInput from '../components/SingleMMInput'
import { CabinetFormValues, CabinetFormProps } from './CornerCabinetForm'

export default function CargoCabinetForm({ values, onChange }: CabinetFormProps){
  const { t } = useTranslation()
  const { height, depth, hardware, legs } = values
  const update = (patch: Partial<CabinetFormValues>) => onChange({ ...values, ...patch })
  const [openSection, setOpenSection] =
    useState<'korpus' | 'fronty' | 'okucie' | 'nozki' | null>(null)
  return (
    <div>
      <details
        open={openSection === 'korpus'}
        className={openSection === 'korpus' ? 'active' : ''}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'korpus' ? null : 'korpus');
          }}
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
      <details
        open={openSection === 'fronty'}
        className={openSection === 'fronty' ? 'active' : ''}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'fronty' ? null : 'fronty');
          }}
        >
          {t('forms.sections.fronty')}
        </summary>
        <div />
      </details>
      <details
        open={openSection === 'okucie'}
        className={openSection === 'okucie' ? 'active' : ''}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'okucie' ? null : 'okucie');
          }}
        >
          {t('forms.sections.okucie')}
        </summary>
        {hardware && <pre style={{ display:'none' }}>{JSON.stringify(hardware)}</pre>}
      </details>
      <details
        open={openSection === 'nozki'}
        className={openSection === 'nozki' ? 'active' : ''}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            setOpenSection(openSection === 'nozki' ? null : 'nozki');
          }}
        >
          {t('forms.sections.nozki')}
        </summary>
        {legs && <pre style={{ display:'none' }}>{JSON.stringify(legs)}</pre>}
      </details>
    </div>
  )
}
