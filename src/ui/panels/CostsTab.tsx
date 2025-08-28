import React from 'react'
import { usePlannerStore } from '../../state/store'

export default function CostsTab(){
  const store = usePlannerStore()
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
      <div className="hd"><div><div className="h1">Koszty</div></div></div>
      <div className="bd">
        <table className="table" style={{marginBottom:12}}>
          <thead><tr><th>Moduł</th><th>Szer.(mm)</th><th>Rodzaj</th><th>Drzwi</th><th>Szufl.</th><th>Razem (zł)</th></tr></thead>
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
          <thead><tr><th>Pozycja</th><th>Kwota (zł)</th></tr></thead>
          <tbody>
            {Object.entries(totals).filter(([k])=>k!=='total').map(([k,v])=> <tr key={k}><td>{k}</td><td>{(v as number).toLocaleString('pl-PL')}</td></tr>)}
            <tr><td><b>Razem</b></td><td><b>{(totals.total||0).toLocaleString('pl-PL')} zł</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
