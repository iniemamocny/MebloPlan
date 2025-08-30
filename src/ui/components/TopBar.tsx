import React from 'react'
import { usePlannerStore } from '../../state/store'
import { getWallSegments } from '../../utils/walls'

type Props = {
  selWall: number
  setSelWall: (n:number)=>void
  onResetSelection: () => void
  doAutoOnSelectedWall: () => void
}

export default function TopBar({ selWall, setSelWall, onResetSelection, doAutoOnSelectedWall }: Props){
  const store = usePlannerStore()

  return (
    <div className="topbar row">
      <button className="btnGhost" onClick={()=>store.setRole(store.role==='stolarz'?'klient':'stolarz')}>
        Tryb: {store.role==='stolarz'?'Stolarz':'Klient'}
      </button>
      <button className="btnGhost" onClick={onResetSelection}>Reset wyboru</button>
      <button className="btnGhost" onClick={()=>store.undo()} disabled={store.past.length===0}>Cofnij</button>
      <button className="btnGhost" onClick={()=>store.redo()} disabled={store.future.length===0}>Ponów</button>
      <button className="btnGhost" onClick={()=>store.clear()}>Wyczyść</button>
      <select className="btnGhost" value={selWall} onChange={e=>setSelWall(Number((e.target as HTMLSelectElement).value)||0)}>
        {getWallSegments().map((s,i)=> <option key={i} value={i}>Ściana {i+1} ({Math.round(s.length)} mm)</option>)}
      </select>
      <button className="btn" onClick={doAutoOnSelectedWall}>Auto pod ścianę</button>
    </div>
  )
}
