import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePlannerStore } from '../../state/store'

export default function CostsTab(){
  const store = usePlannerStore()
  const { t } = useTranslation()
  const totals = store.modules.reduce((acc,m:any)=>{
    const p = m.price?.parts||{}
    for (const k of Object.keys(p)){
      acc[k] = (acc[k]||0) + (p as any)[k]
    }
    acc.total += m.price?.total||0
    return acc
  }, { total:0 } as any)
  return (
    <div className="section">
      <div className="hd"><div><div className="h1">{t('costs.title')}</div></div></div>
      <div className="bd">
        <table className="table" style={{marginBottom:12}}>
          <thead><tr><th>{t('costs.table.module')}</th><th>{t('costs.table.width')}</th><th>{t('costs.table.family')}</th><th>{t('costs.table.doors')}</th><th>{t('costs.table.drawers')}</th><th>{t('costs.table.total')}</th></tr></thead>
        <tbody>
          {store.modules.map((m:any)=> (
            <tr key={m.id}>
              <td>{m.label}</td>
              <td>{Math.round(m.size.w*1000)}</td>
              <td>{m.family}</td>
              <td>{m.price?.counts?.doors ?? '-'}</td>
              <td>{m.price?.counts?.drawers ?? '-'}</td>
              <td><b>{(m.price?.total||0).toLocaleString('pl-PL')}</b></td>
            </tr>
          ))}
        </tbody>
        </table>
        <table className="table">
          <thead><tr><th>{t('costs.summary.item')}</th><th>{t('costs.summary.amount')}</th></tr></thead>
          <tbody>
            {Object.entries(totals).filter(([k])=>k!=='total').map(([k,v])=> <tr key={k}><td>{k}</td><td>{(v as number).toLocaleString('pl-PL')}</td></tr>)}
            <tr><td><b>{t('costs.summary.total')}</b></td><td><b>{(totals.total||0).toLocaleString('pl-PL')} {t('costs.currency')}</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
