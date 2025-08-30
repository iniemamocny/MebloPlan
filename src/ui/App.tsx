import React, { useEffect, useRef, useState } from 'react'
import useLocalStorageState from './hooks/useLocalStorageState'
import { FAMILY, FAMILY_LABELS, Kind, Variant } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import GlobalSettings from './panels/GlobalSettings'
import RoomTab from './panels/RoomTab'
import CostsTab from './panels/CostsTab'
import TypePicker, { KindTabs, VariantList } from './panels/CatalogPicker'
import CutlistTab from './panels/CutlistTab'
import SceneViewer from './SceneViewer'
import CabinetConfigurator from './CabinetConfigurator'
import useCabinetConfig from './useCabinetConfig'
import { CabinetConfig } from './types'
import TopBar from './components/TopBar'
import SheetSettingsPanel from './components/SheetSettingsPanel'
import MainTabs from './components/MainTabs'

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
        <TopBar selWall={selWall} setSelWall={setSelWall} onResetSelection={()=>{ setVariant(null); setKind(null); }} doAutoOnSelectedWall={doAutoOnSelectedWall} />
      </div>
      <aside className="sidebar">
        <SheetSettingsPanel boardL={boardL} boardW={boardW} boardKerf={boardKerf} boardHasGrain={boardHasGrain} setBoardL={setBoardL} setBoardW={setBoardW} setBoardKerf={setBoardKerf} setBoardHasGrain={setBoardHasGrain} />

        <GlobalSettings />

        <MainTabs tab={tab} setTab={setTab} />

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
