import React from 'react'
import { FAMILY, FAMILY_LABELS, FAMILY_COLORS, KIND_SETS, Kind, Variant } from '../../core/catalog'
export default function TypePicker({ family, setFamily }:{ family:FAMILY; setFamily:(f:FAMILY)=>void }){
  return (
    <div className="tiles">
      {Object.values(FAMILY).map((f)=>{
        const dim = family && f!==family
        return (
          <div key={f} className={`tile ${dim?'dim':''}`} onClick={()=>setFamily(f)} title={FAMILY_LABELS[f]}>
            <div className="dot" style={{background:FAMILY_COLORS[f]}}/>
            <div>{FAMILY_LABELS[f]}</div>
          </div>
        )
      })}
    </div>
  )
}
export function KindTabs({ family, kind, setKind }:{ family:FAMILY; kind:Kind|null; setKind:(k:Kind)=>void }){
  const kinds = KIND_SETS[family] || []
  return (
    <div className="row" style={{ flexWrap:'wrap' }}>
      {kinds.map(k => (
        <button key={k.key} className={`badge ${kind?.key===k.key?'active':''}`} onClick={()=>setKind(k)}>{k.label}</button>
      ))}
    </div>
  )
}
export function VariantList({ kind, onPick }:{ kind:Kind|null; onPick:(v:Variant)=>void }){
  const variants = (kind?.variants||[])
  return (
    <div className="list">
      {variants.map(v => (
        <div key={v.key} className="card">
          <div style={{fontWeight:700}}>{v.label}</div>
          <div className="row">
            <button className="btn" onClick={()=>onPick(v)}>Wybierz</button>
          </div>
        </div>
      ))}
    </div>
  )
}
