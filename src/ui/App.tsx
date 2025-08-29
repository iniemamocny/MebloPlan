import React, { useEffect, useRef, useState } from 'react'
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
  const [boardL, setBoardL] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardL')||2800) }catch{ return 2800 } })
  const [boardW, setBoardW] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardW')||2070) }catch{ return 2070 } })
  const [boardKerf, setBoardKerf] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardKerf')||3) }catch{ return 3 } })
  const [boardHasGrain, setBoardHasGrain] = useState<boolean>(()=>{ try{ return (localStorage.getItem('boardHasGrain')||'1')==='1' }catch{ return true } })

  useEffect(()=>{ try{ localStorage.setItem('boardL', String(boardL)) }catch{} }, [boardL])
  useEffect(()=>{ try{ localStorage.setItem('boardW', String(boardW)) }catch{} }, [boardW])
  useEffect(()=>{ try{ localStorage.setItem('boardKerf', String(boardKerf)) }catch{} }, [boardKerf])
  useEffect(()=>{ try{ localStorage.setItem('boardHasGrain', boardHasGrain?'1':'0') }catch{} }, [boardHasGrain])

  const store = usePlannerStore()
  const [tab, setTab] = useState<'cab'|'room'|'costs'|'cut'>('cab')
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE)
  const [kind, setKind] = useState<Kind|null>(null)
  const [variant, setVariant] = useState<Variant|null>(null)
  const [selWall, setSelWall] = useState(0)
  const [addCountertop] = useState(true)
  const threeRef = useRef<any>({})

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
          <button className="btnGhost" onClick={()=>store.setRole(store.role==='stolarz'?'klient':'stolarz')}>Tryb: {store.role=='stolarz'?'Stolarz':'Klient'}</button>
          <button className="btnGhost" onClick={()=>{ setVariant(null); setKind(null); }}>Reset wyboru</button>
          <button className="btnGhost" onClick={()=>store.undo()} disabled={store.past.length===0}>Cofnij</button>
          <button className="btnGhost" onClick={()=>store.redo()} disabled={store.future.length===0}>Ponów</button>
          <button className="btnGhost" onClick={()=>store.clear()}>Wyczyść</button>
          <select className="btnGhost" value={selWall} onChange={e=>setSelWall(Number((e.target as HTMLSelectElement).value)||0)}>
            {getWallSegments().map((s,i)=> <option key={i} value={i}>Ściana {i+1} ({Math.round(s.length)} mm)</option>)}
          </select>
          <button className="btn" onClick={doAutoOnSelectedWall}>Auto pod ścianę</button>
        </div>
      </div>
      <aside className="sidebar">
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

        <GlobalSettings />

        <div className="tabs">
          <button className={`tabBtn ${tab==='cab'?'active':''}`} onClick={()=>setTab('cab')}>Kuchnia</button>
          <button className={`tabBtn ${tab==='room'?'active':''}`} onClick={()=>setTab('room')}>Pomieszczenie</button>
          <button className={`tabBtn ${tab==='costs'?'active':''}`} onClick={()=>setTab('costs')}>Koszty</button>
          <button className={`tabBtn ${tab==='cut'?'active':''}`} onClick={()=>setTab('cut')}>Formatki</button>
            {/* placeholder removed */}
        </div>

        {tab==='cab' && (<>
          <div>
            <div className="h1">Typ szafki</div>
              <TypePicker family={family} setFamily={(f: FAMILY)=>{ setFamily(f); setKind(null); setVariant(null); }} />
          </div>

          <div className="section">
            <div className="hd"><div><div className="h1">Podkategorie ({FAMILY_LABELS[family]})</div></div></div>
            <div className="bd">
                <KindTabs family={family} kind={kind} setKind={(k: Kind)=>{ setKind(k); setVariant(null); }} />
            </div>
          </div>

          {kind && (
            <div className="section">
              <div className="hd"><div><div className="h1">Wariant</div></div></div>
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
