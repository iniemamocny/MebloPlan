import React from 'react'

type Tab = 'cab' | 'room' | 'costs' | 'cut'

type Props = {
  tab: Tab
  setTab: (t:Tab)=>void
  t: (key: string, vars?: Record<string, any>) => string
}

export default function MainTabs({ tab, setTab, t }: Props){
  return (
    <div className="tabs">
      <button className={`tabBtn ${tab==='cab'?'active':''}`} onClick={()=>setTab('cab')}>{t('app.tabs.cab')}</button>
      <button className={`tabBtn ${tab==='room'?'active':''}`} onClick={()=>setTab('room')}>{t('app.tabs.room')}</button>
      <button className={`tabBtn ${tab==='costs'?'active':''}`} onClick={()=>setTab('costs')}>{t('app.tabs.costs')}</button>
      <button className={`tabBtn ${tab==='cut'?'active':''}`} onClick={()=>setTab('cut')}>{t('app.tabs.cut')}</button>
    </div>
  )
}
