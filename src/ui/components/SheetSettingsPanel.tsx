import React from 'react'
import SingleMMInput from './SingleMMInput'

type Props = {
  boardL: number
  boardW: number
  boardKerf: number
  boardHasGrain: boolean
  setBoardL: (n:number)=>void
  setBoardW: (n:number)=>void
  setBoardKerf: (n:number)=>void
  setBoardHasGrain: (v:boolean)=>void
}

export default function SheetSettingsPanel({
  boardL,
  boardW,
  boardKerf,
  boardHasGrain,
  setBoardL,
  setBoardW,
  setBoardKerf,
  setBoardHasGrain,
}: Props){
  return (
    <div className="section card">
      <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
        <div className="h2">Materiał (arkusz)</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(120px, 1fr))', gap:12, marginTop:10}}>
        <div>
          <div className="small">Wysokość arkusza L (mm)</div>
          <SingleMMInput value={boardL} onChange={v=>setBoardL(v)} max={4000} />
        </div>
        <div>
          <div className="small">Szerokość arkusza W (mm)</div>
          <SingleMMInput value={boardW} onChange={v=>setBoardW(v)} max={4000} />
        </div>
        <div>
          <div className="small">Kerf (mm)</div>
          <input className="input" type="number" min={0} max={10} step={0.1}
                 value={boardKerf}
                 onChange={e=>setBoardKerf(Math.max(0, Math.min(10, Number(e.target.value)||0)))} />
        </div>
        <div style={{display:'flex', alignItems:'end'}}>
          <label className="small" style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={boardHasGrain} onChange={e=>setBoardHasGrain(e.target.checked)} />
            Płyta ma usłojenie
          </label>
        </div>
      </div>
      <div className="tiny muted" style={{marginTop:6}}>
        Bez usłojenia: formatki można obracać (muszą się zmieścić w {boardL}×{boardW} lub {boardW}×{boardL}).
        Z usłojeniem: elementy wymagające słojów bez rotacji (h≤{boardL}, w≤{boardW}).
      </div>
    </div>
  )
}
