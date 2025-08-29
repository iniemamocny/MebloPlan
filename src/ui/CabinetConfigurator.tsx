import React from 'react'
import { FAMILY, Kind, Variant } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import TechDrawing from './components/TechDrawing'
import Cabinet3D from './components/Cabinet3D'
import { CabinetConfig } from './types'
import { Gaps } from '../types'

interface Props {
  family: FAMILY
  kind: Kind | null
  variant: Variant
  cfgTab: 'basic' | 'adv'
  setCfgTab: (t: 'basic' | 'adv') => void
  widthMM: number
  setWidthMM: (n: number) => void
  gLocal: CabinetConfig
  setAdv: (v: CabinetConfig) => void
  onAdd: (width: number, adv: CabinetConfig) => void
}

const CabinetConfigurator: React.FC<Props> = ({
  family,
  kind,
  variant,
  cfgTab,
  setCfgTab,
  widthMM,
  setWidthMM,
  gLocal,
  setAdv,
  onAdd
}) => {
  const store = usePlannerStore()
  return (
    <div className="section">
      <div className="hd">
        <div><div className="h1">Konfiguracja — {variant.label}</div></div>
        <div className="tabs">
          <button className={`tabBtn ${cfgTab==='basic'?'active':''}`} onClick={()=>setCfgTab('basic')}>Podstawowe</button>
          <button className={`tabBtn ${cfgTab==='adv'?'active':''}`} onClick={()=>setCfgTab('adv')}>Zaawansowane</button>
        </div>
      </div>
      <div className="bd">
        {cfgTab==='basic' && (
          <div>
            <div className="grid2">
              <div>
                <div className="small">Szerokość (mm)</div>
                <input className="input" type="number" min={200} max={2400} step={1} value={widthMM} onChange={e=>setWidthMM(Number((e.target as HTMLInputElement).value)||0)} onKeyDown={(e)=>{ if (e.key==='Enter'){ const v = Number((e.target as HTMLInputElement).value)||0; if(v>0) onAdd(v, gLocal) } }} />
              </div>
              <div className="row" style={{alignItems:'flex-end'}}>
                <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>Wstaw szafkę</button>
              </div>
            </div>
            <div style={{marginTop:8}}>
              <TechDrawing
                mode="view"
                family={family}
                kindKey={kind?.key||'doors'}
                variantKey={variant?.key||'d1'}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                gaps={gLocal.gaps}
                drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                drawerFronts={gLocal.drawerFronts}
              />
            </div>
            <div className="row" style={{marginTop:8}}>
              <Cabinet3D
                family={family}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                gaps={{ top: gLocal.gaps.top, bottom: gLocal.gaps.bottom }}
                drawerFronts={gLocal.drawerFronts}
                shelves={gLocal.shelves}
                backPanel={gLocal.backPanel}
              />
            </div>
          </div>
        )}
        {cfgTab==='adv' && (
          <div>
            <div className="grid4">
              <div><div className="small">Wysokość (mm)</div><input className="input" type="number" value={gLocal.height} onChange={e=>setAdv({...gLocal, height:Number((e.target as HTMLInputElement).value)||0})} /></div>
              <div><div className="small">Głębokość (mm)</div><input className="input" type="number" value={gLocal.depth} onChange={e=>setAdv({...gLocal, depth:Number((e.target as HTMLInputElement).value)||0})} /></div>
              <div><div className="small">Płyta</div><select className="input" value={gLocal.boardType} onChange={e=>setAdv({...gLocal, boardType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.board).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              <div><div className="small">Front</div><select className="input" value={gLocal.frontType} onChange={e=>setAdv({...gLocal, frontType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.front).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              <div><div className="small">Plecy</div><select className="input" value={gLocal.backPanel||'full'} onChange={e=>setAdv({...gLocal, backPanel:(e.target as HTMLSelectElement).value})}>
                <option value="full">full</option>
                <option value="split">split</option>
                <option value="none">none</option>
              </select></div>
            </div>
            {!(variant?.key?.startsWith('s')) && (
              <div style={{marginTop:8}}>
                <div className="small">Liczba półek</div>
                <input className="input" type="number" min={0} value={gLocal.shelves||0} onChange={e=>setAdv({...gLocal, shelves:Number((e.target as HTMLInputElement).value)||0})} />
              </div>
            )}
            <div style={{marginTop:8}}>
              <div className="small">Szczeliny i wysokości frontów (ustawiaj graficznie)</div>
              <TechDrawing
                mode="edit"
                family={family}
                kindKey={kind?.key||'doors'}
                variantKey={variant?.key||'d1'}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                gaps={gLocal.gaps}
                drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                drawerFronts={gLocal.drawerFronts}
                onChangeGaps={(gg: Gaps) => setAdv({ ...gLocal, gaps: gg })}
                onChangeDrawerFronts={(arr: number[]) => setAdv({ ...gLocal, drawerFronts: arr })}
              />
            </div>
            <div className="row" style={{marginTop:8}}>
              <Cabinet3D
                family={family}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                gaps={{ top: gLocal.gaps.top, bottom: gLocal.gaps.bottom }}
                drawerFronts={gLocal.drawerFronts}
                shelves={gLocal.shelves}
                backPanel={gLocal.backPanel}
              />
            </div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>Wstaw szafkę</button>
              <button className="btnGhost" onClick={()=>setCfgTab('basic')}>← Podstawowe</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CabinetConfigurator
