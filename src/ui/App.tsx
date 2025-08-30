import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useLocalStorageState from './hooks/useLocalStorageState'
import { FAMILY, FAMILY_LABELS, Kind, Variant } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import GlobalSettings from './panels/GlobalSettings'
import RoomTab from './panels/RoomTab'
import CostsTab from './panels/CostsTab'
import TypePicker, { KindTabs, VariantList } from './panels/CatalogPicker'
import { getWallSegments } from '../utils/walls'
import CutlistTab from './panels/CutlistTab'
import SingleMMInput from './components/SingleMMInput'
import SceneViewer from './SceneViewer'
import CabinetConfigurator from './CabinetConfigurator'
import useCabinetConfig from './useCabinetConfig'
import { CabinetConfig } from './types'

export default function App(){
  const [boardL, setBoardL] = useLocalStorageState<number>('boardL', 2800)
  const [boardW, setBoardW] = useLocalStorageState<number>('boardW', 2070)
  const [boardKerf, setBoardKerf] = useLocalStorageState<number>('boardKerf', 3)
  const [boardHasGrain, setBoardHasGrain] = useLocalStorageState<boolean>('boardHasGrain', true)

  const store = usePlannerStore()
  const [tab, setTab] = useState<'cab'|'room'|'costs'|'cut'>('cab')
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE)
  const [kind, setKind] = useState<Kind|null>(null)
  const [variant, setVariant] = useState<Variant|null>(null)
  const [selWall, setSelWall] = useState(0)
  const [addCountertop] = useState(true)
  const threeRef = useRef<any>({})
  const { t, i18n } = useTranslation()
  const [lang, setLang] = useState(localStorage.getItem('lang') || i18n.language)
  useEffect(() => { i18n.changeLanguage(lang); localStorage.setItem('lang', lang) }, [lang, i18n])

  const {
    cfgTab,
    setCfgTab,
    widthMM,
    setWidthMM,
    setAdv,
    gLocal,
    onAdd,
    doAutoOnSelectedWall
  }: {
    cfgTab: 'basic' | 'adv'
    setCfgTab: (t: 'basic' | 'adv') => void
    widthMM: number
    setWidthMM: (n: number) => void
    setAdv: (v: CabinetConfig) => void
    gLocal: CabinetConfig
    onAdd: (width: number, adv: CabinetConfig) => void
    doAutoOnSelectedWall: () => void
  } = useCabinetConfig(
    family,
    kind,
    variant,
    selWall,
    setVariant
  )

  const undo = store.undo
  const redo = store.redo
  useEffect(()=>{
    const handler = (e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey) && e.key==='z'){
        e.preventDefault()
        if(e.shiftKey) redo()
        else undo()
      }else if((e.ctrlKey||e.metaKey) && e.key==='y'){
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return ()=>window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return (
    <div className="app">
      <div className="canvasWrap">
        <SceneViewer threeRef={threeRef} addCountertop={addCountertop} />
        <div className="topbar row">
          <button className="btnGhost" onClick={()=>store.setRole(store.role==='stolarz'?'klient':'stolarz')}>{t('app.mode')}: {t(`app.roles.${store.role}`)}</button>
          <button className="btnGhost" onClick={()=>{ setVariant(null); setKind(null); }}>{t('app.resetSelection')}</button>
          <button className="btnGhost" onClick={()=>store.undo()} disabled={store.past.length===0}>{t('app.undo')}</button>
          <button className="btnGhost" onClick={()=>store.redo()} disabled={store.future.length===0}>{t('app.redo')}</button>
          <button className="btnGhost" onClick={()=>store.clear()}>{t('app.clear')}</button>
          <select className="btnGhost" value={selWall} onChange={e=>setSelWall(Number((e.target as HTMLSelectElement).value)||0)}>
            {getWallSegments().map((s,i)=> <option key={i} value={i}>{t('app.wallLabel',{num:i+1,len:Math.round(s.length)})}</option>)}
          </select>
          <button className="btn" onClick={doAutoOnSelectedWall}>{t('app.autoWall')}</button>
          <select className="btnGhost" value={lang} onChange={e=>setLang((e.target as HTMLSelectElement).value)}>
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
      <aside className="sidebar">
        <div className="section card">
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
            <div className="h2">{t('app.material.title')}</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(120px, 1fr))', gap:12, marginTop:10}}>
            <div>
              <div className="small">{t('app.material.boardHeight')}</div>
              <SingleMMInput value={boardL} onChange={v=>setBoardL(v)} max={4000} />
            </div>
            <div>
              <div className="small">{t('app.material.boardWidth')}</div>
              <SingleMMInput value={boardW} onChange={v=>setBoardW(v)} max={4000} />
            </div>
            <div>
              <div className="small">{t('app.material.kerf')}</div>
              <input className="input" type="number" min={0} max={10} step={0.1}
                    value={boardKerf}
                    onChange={e=>setBoardKerf(Math.max(0, Math.min(10, Number(e.target.value)||0)))} />
            </div>
            <div style={{display:'flex', alignItems:'end'}}>
              <label className="small" style={{display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" checked={boardHasGrain} onChange={e=>setBoardHasGrain(e.target.checked)} />
                {t('app.material.grain')}
              </label>
            </div>
          </div>
          <div className="tiny muted" style={{marginTop:6}}>
            {t('app.material.info',{l:boardL,w:boardW})}
          </div>
        </div>

        <GlobalSettings />

        <div className="tabs">
          <button className={`tabBtn ${tab==='cab'?'active':''}`} onClick={()=>setTab('cab')}>{t('app.tabs.cab')}</button>
          <button className={`tabBtn ${tab==='room'?'active':''}`} onClick={()=>setTab('room')}>{t('app.tabs.room')}</button>
          <button className={`tabBtn ${tab==='costs'?'active':''}`} onClick={()=>setTab('costs')}>{t('app.tabs.costs')}</button>
          <button className={`tabBtn ${tab==='cut'?'active':''}`} onClick={()=>setTab('cut')}>{t('app.tabs.cut')}</button>
            {/* placeholder removed */}
        </div>

        {tab==='cab' && (<>
          <div>
            <div className="h1">{t('app.cabinetType')}</div>
              <TypePicker family={family} setFamily={(f: FAMILY)=>{ setFamily(f); setKind(null); setVariant(null); }} />
          </div>

          <div className="section">
            <div className="hd"><div><div className="h1">{t('app.subcategories',{family:FAMILY_LABELS[family]})}</div></div></div>
            <div className="bd">
                <KindTabs family={family} kind={kind} setKind={(k: Kind)=>{ setKind(k); setVariant(null); }} />
            </div>
          </div>

          {kind && (
            <div className="section">
              <div className="hd"><div><div className="h1">{t('app.variant')}</div></div></div>
              <div className="bd">
                  <VariantList kind={kind} onPick={(v: Variant)=>{ setVariant(v); setCfgTab('basic'); }} />
              </div>
            </div>
          )}

          {variant && (
            <CabinetConfigurator
              family={family}
              kind={kind}
              variant={variant}
              cfgTab={cfgTab}
              setCfgTab={setCfgTab}
              widthMM={widthMM}
              setWidthMM={setWidthMM}
              gLocal={gLocal}
              setAdv={setAdv}
              onAdd={onAdd}
            />
          )}
        </>)}

        {tab==='room' && (<RoomTab three={threeRef} />)}
        {tab==='costs' && (<CostsTab />)}
        {tab==='cut' && (<CutlistTab />)}

      </aside>
    </div>
  )
}
