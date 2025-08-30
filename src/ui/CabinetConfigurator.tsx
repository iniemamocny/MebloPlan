import React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <div className="section">
      <div className="hd">
        <div><div className="h1">{t('configurator.title',{variant:variant.label})}</div></div>
        <div className="tabs">
          <button className={`tabBtn ${cfgTab==='basic'?'active':''}`} onClick={()=>setCfgTab('basic')}>{t('configurator.basic')}</button>
          <button className={`tabBtn ${cfgTab==='adv'?'active':''}`} onClick={()=>setCfgTab('adv')}>{t('configurator.advanced')}</button>
        </div>
      </div>
      <div className="bd">
        {cfgTab==='basic' && (
          <div>
            <div className="grid2">
              <div>
                <div className="small">{t('configurator.width')}</div>
                <input className="input" type="number" min={200} max={2400} step={1} value={widthMM} onChange={e=>setWidthMM(Number((e.target as HTMLInputElement).value)||0)} onKeyDown={(e)=>{ if (e.key==='Enter'){ const v = Number((e.target as HTMLInputElement).value)||0; if(v>0) onAdd(v, gLocal) } }} />
              </div>
              <div className="row" style={{alignItems:'flex-end'}}>
                <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>{t('configurator.insertCabinet')}</button>
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
              <div><div className="small">{t('configurator.height')}</div><input className="input" type="number" value={gLocal.height} onChange={e=>setAdv({...gLocal, height:Number((e.target as HTMLInputElement).value)||0})} /></div>
              <div><div className="small">{t('configurator.depth')}</div><input className="input" type="number" value={gLocal.depth} onChange={e=>setAdv({...gLocal, depth:Number((e.target as HTMLInputElement).value)||0})} /></div>
              <div><div className="small">{t('configurator.board')}</div><select className="input" value={gLocal.boardType} onChange={e=>setAdv({...gLocal, boardType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.board).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              <div><div className="small">{t('configurator.front')}</div><select className="input" value={gLocal.frontType} onChange={e=>setAdv({...gLocal, frontType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.front).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              <div><div className="small">{t('configurator.back')}</div><select className="input" value={gLocal.backPanel||'full'} onChange={e=>setAdv({...gLocal, backPanel:(e.target as HTMLSelectElement).value})}>
                <option value="full">{t('configurator.backOptions.full')}</option>
                <option value="split">{t('configurator.backOptions.split')}</option>
                <option value="none">{t('configurator.backOptions.none')}</option>
              </select></div>
            </div>
            {!(variant?.key?.startsWith('s')) && (
              <div style={{marginTop:8}}>
                <div className="small">{t('configurator.shelves')}</div>
                <input className="input" type="number" min={0} value={gLocal.shelves||0} onChange={e=>setAdv({...gLocal, shelves:Number((e.target as HTMLInputElement).value)||0})} />
              </div>
            )}
            <div style={{marginTop:8}}>
              <div className="small">{t('configurator.gapsTitle')}</div>
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
              <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>{t('configurator.insertCabinet')}</button>
              <button className="btnGhost" onClick={()=>setCfgTab('basic')}>{t('configurator.backToBasic')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CabinetConfigurator
