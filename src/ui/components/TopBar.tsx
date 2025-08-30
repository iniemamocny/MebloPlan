import React from 'react'
import { usePlannerStore } from '../../state/store'
import { getWallSegments } from '../../utils/walls'
import { Lang } from '../i18n'

type Props = {
  selWall: number
  setSelWall: (n: number) => void
  onResetSelection: () => void
  doAutoOnSelectedWall: () => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, any>) => string
}

export default function TopBar({
  selWall,
  setSelWall,
  onResetSelection,
  doAutoOnSelectedWall,
  lang,
  setLang,
  t,
}: Props){
  const store = usePlannerStore()

  return (
    <div className="topbar row">
      <button className="btnGhost" onClick={()=>store.setRole(store.role==='stolarz'?'klient':'stolarz')}>
        {t('app.mode')}: {t(`app.roles.${store.role}`)}
      </button>
      <button className="btnGhost" onClick={onResetSelection}>{t('app.resetSelection')}</button>
      <button className="btnGhost" onClick={()=>store.undo()} disabled={store.past.length===0}>{t('app.undo')}</button>
      <button className="btnGhost" onClick={()=>store.redo()} disabled={store.future.length===0}>{t('app.redo')}</button>
      <button className="btnGhost" onClick={()=>store.clear()}>{t('app.clear')}</button>
      <select className="btnGhost" value={selWall} onChange={e=>setSelWall(Number((e.target as HTMLSelectElement).value)||0)}>
        {getWallSegments().map((s,i)=> (
          <option key={i} value={i}>
            {t('app.wallLabel', { num: i+1, len: Math.round(s.length) })}
          </option>
        ))}
      </select>
      <button className="btn" onClick={doAutoOnSelectedWall}>{t('app.autoWall')}</button>
      <select className="btnGhost" value={lang} onChange={e=>setLang((e.target as HTMLSelectElement).value as Lang)}>
        <option value="pl">PL</option>
        <option value="en">EN</option>
      </select>
    </div>
  )
}
