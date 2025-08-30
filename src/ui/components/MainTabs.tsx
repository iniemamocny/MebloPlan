import React from 'react'

type Tab = 'cab' | 'room' | 'costs' | 'cut'

type Props = {
  tab: Tab
  setTab: (t:Tab)=>void
}

export default function MainTabs({ tab, setTab }: Props){
  return (
    <div className="tabs">
      <button className={`tabBtn ${tab==='cab'?'active':''}`} onClick={()=>setTab('cab')}>Kuchnia</button>
      <button className={`tabBtn ${tab==='room'?'active':''}`} onClick={()=>setTab('room')}>Pomieszczenie</button>
      <button className={`tabBtn ${tab==='costs'?'active':''}`} onClick={()=>setTab('costs')}>Koszty</button>
      <button className={`tabBtn ${tab==='cut'?'active':''}`} onClick={()=>setTab('cut')}>Formatki</button>
    </div>
  )
}
