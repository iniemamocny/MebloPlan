import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FAMILY, Kind, Variant } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import TechDrawing from './components/TechDrawing'
import Cabinet3D from './components/Cabinet3D'
import Accordion from './components/Accordion'
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
  onAdd: (
    width: number,
    adv: CabinetConfig,
    doorsCount: number,
    drawersCount: number,
  ) => void
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
  const [doorsCount, setDoorsCount] = useState(1)
  const [drawersCount, setDrawersCount] = useState(0)

  useEffect(() => {
    if (kind?.key === 'doors') {
      setDoorsCount(1)
      setDrawersCount(0)
    } else if (kind?.key === 'drawers') {
      setDoorsCount(0)
      setDrawersCount(1)
    } else {
      setDoorsCount(0)
      setDrawersCount(0)
    }
  }, [kind])

  useEffect(() => {
    const fronts = Math.max(doorsCount, drawersCount)
    if (fronts < 3) {
      if (gLocal.dividerPosition) setAdv({ ...gLocal, dividerPosition: undefined })
    } else if (fronts === 4) {
      if (gLocal.dividerPosition !== 'center')
        setAdv({ ...gLocal, dividerPosition: 'center' })
    } else if (fronts === 3 && !gLocal.dividerPosition) {
      setAdv({ ...gLocal, dividerPosition: 'left' })
    }
  }, [doorsCount, drawersCount, gLocal])
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
                <input className="input" type="number" min={200} max={2400} step={1} value={widthMM} onChange={e=>setWidthMM(Number((e.target as HTMLInputElement).value)||0)} onKeyDown={(e)=>{ if (e.key==='Enter'){ const v = Number((e.target as HTMLInputElement).value)||0; if(v>0) onAdd(v, gLocal, doorsCount, drawersCount) } }} />
              </div>
              <div className="row" style={{alignItems:'flex-end'}}>
                <button className="btn" onClick={()=>onAdd(widthMM, gLocal, doorsCount, drawersCount)}>{t('configurator.insertCabinet')}</button>
              </div>
            </div>
            {kind?.key === 'doors' && (
              <div style={{ marginTop: 8 }}>
                <div className="small">{t('configurator.doorsCount')}</div>
                <select
                  className="input"
                  value={doorsCount}
                  onChange={(e) => setDoorsCount(Number((e.target as HTMLSelectElement).value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {kind?.key === 'drawers' && (
              <div style={{ marginTop: 8 }}>
                <div className="small">{t('configurator.drawersCount')}</div>
                <select
                  className="input"
                  value={drawersCount}
                  onChange={(e) =>
                    setDrawersCount(Number((e.target as HTMLSelectElement).value))
                  }
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {Math.max(doorsCount, drawersCount) >= 3 && (
              <div style={{ marginTop: 8 }}>
                <div className="small">Przegroda</div>
                {Math.max(doorsCount, drawersCount) === 3 ? (
                  <div className="row" style={{ gap: 8 }}>
                    <label>
                      <input
                        type="radio"
                        checked={gLocal.dividerPosition === 'left'}
                        onChange={() => setAdv({ ...gLocal, dividerPosition: 'left' })}
                      />
                      L
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={gLocal.dividerPosition === 'right'}
                        onChange={() => setAdv({ ...gLocal, dividerPosition: 'right' })}
                      />
                      P
                    </label>
                  </div>
                ) : (
                  <div className="small">Centralna</div>
                )}
              </div>
            )}
            <div style={{marginTop:8}}>
              <TechDrawing
                mode="view"
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                gaps={gLocal.gaps}
                doorsCount={doorsCount}
                drawersCount={drawersCount}
                drawerFronts={gLocal.drawerFronts}
                dividerPosition={gLocal.dividerPosition}
              />
            </div>
            <div className="row" style={{marginTop:8}}>
              <Cabinet3D
                family={family}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                doorsCount={doorsCount}
                drawersCount={drawersCount}
                gaps={{ top: gLocal.gaps.top, bottom: gLocal.gaps.bottom }}
                drawerFronts={gLocal.drawerFronts}
                shelves={gLocal.shelves}
                backPanel={gLocal.backPanel}
                dividerPosition={gLocal.dividerPosition}
              />
            </div>
          </div>
        )}
        {cfgTab==='adv' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Accordion title={t('configurator.corpus')}>
              <div className="grid4">
                <div><div className="small">{t('configurator.height')}</div><input className="input" type="number" value={gLocal.height} onChange={e=>setAdv({...gLocal, height:Number((e.target as HTMLInputElement).value)||0})} /></div>
                <div><div className="small">{t('configurator.depth')}</div><input className="input" type="number" value={gLocal.depth} onChange={e=>setAdv({...gLocal, depth:Number((e.target as HTMLInputElement).value)||0})} /></div>
                <div><div className="small">{t('configurator.board')}</div><select className="input" value={gLocal.boardType} onChange={e=>setAdv({...gLocal, boardType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.board).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                <div><div className="small">{t('configurator.back')}</div><select className="input" value={gLocal.backPanel||'full'} onChange={e=>setAdv({...gLocal, backPanel:(e.target as HTMLSelectElement).value})}>
                  <option value="full">{t('configurator.backOptions.full')}</option>
                  <option value="split">{t('configurator.backOptions.split')}</option>
                  <option value="none">{t('configurator.backOptions.none')}</option>
                </select></div>
              </div>
              {drawersCount === 0 && (
                <div style={{marginTop:8}}>
                  <div className="small">{t('configurator.shelves')}</div>
                  <input className="input" type="number" min={0} value={gLocal.shelves||0} onChange={e=>setAdv({...gLocal, shelves:Number((e.target as HTMLInputElement).value)||0})} />
                </div>
              )}
            </Accordion>
            <Accordion title={t('configurator.fronts')}>
              <div className="grid4">
                <div><div className="small">{t('configurator.front')}</div><select className="input" value={gLocal.frontType} onChange={e=>setAdv({...gLocal, frontType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.front).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              </div>
              <div style={{marginTop:8}}>
                <div className="small">{t('configurator.gapsTitle')}</div>
                <TechDrawing
                  mode="edit"
                  widthMM={widthMM}
                  heightMM={gLocal.height}
                  depthMM={gLocal.depth}
                  gaps={gLocal.gaps}
                  doorsCount={doorsCount}
                  drawersCount={drawersCount}
                  drawerFronts={gLocal.drawerFronts}
                  dividerPosition={gLocal.dividerPosition}
                  onChangeGaps={(gg: Gaps) => setAdv({ ...gLocal, gaps: gg })}
                  onChangeDrawerFronts={(arr: number[]) => setAdv({ ...gLocal, drawerFronts: arr })}
                />
              </div>
            </Accordion>
            <Accordion title={t('configurator.fittings')}>
              {kind?.key === 'doors' ? (
                <div><div className="small">{t('configurator.hinge')}</div><select className="input" value={(gLocal as any).hinge || Object.keys(store.prices.hinges)[0]} onChange={e=>setAdv({ ...gLocal, hinge:(e.target as HTMLSelectElement).value } as any)}>{Object.keys(store.prices.hinges).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              ) : kind?.key === 'drawers' ? (
                <div><div className="small">{t('configurator.drawerSlide')}</div><select className="input" value={(gLocal as any).drawerSlide || Object.keys(store.prices.drawerSlide)[0]} onChange={e=>setAdv({ ...gLocal, drawerSlide:(e.target as HTMLSelectElement).value } as any)}>{Object.keys(store.prices.drawerSlide).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              ) : (
                <div><div className="small">{t('configurator.aventos')}</div><select className="input" value={(gLocal as any).aventos || Object.keys(store.prices.aventos)[0]} onChange={e=>setAdv({ ...gLocal, aventos:(e.target as HTMLSelectElement).value } as any)}>{Object.keys(store.prices.aventos).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
              )}
            </Accordion>
            <Accordion title={t('configurator.legs')}>
              <div className="grid4">
                <div><div className="small">{t('global.legs')}</div><select className="input" value={(gLocal as any).legsType || store.globals[family].legsType} onChange={e=>setAdv({ ...gLocal, legsType:(e.target as HTMLSelectElement).value } as any)}>{Object.keys(store.prices.legs).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                <div><div className="small">{t('global.legsHeight')}</div><input className="input" type="number" value={(gLocal as any).legsHeight ?? store.globals[family].legsHeight || 0} onChange={e=>setAdv({ ...gLocal, legsHeight:Number((e.target as HTMLInputElement).value)||0 } as any)} /></div>
              </div>
            </Accordion>
            <div className="row" style={{marginTop:8}}>
              <Cabinet3D
                family={family}
                widthMM={widthMM}
                heightMM={gLocal.height}
                depthMM={gLocal.depth}
                doorsCount={doorsCount}
                drawersCount={drawersCount}
                gaps={{ top: gLocal.gaps.top, bottom: gLocal.gaps.bottom }}
                drawerFronts={gLocal.drawerFronts}
                shelves={gLocal.shelves}
                backPanel={gLocal.backPanel}
                dividerPosition={gLocal.dividerPosition}
              />
            </div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn" onClick={()=>onAdd(widthMM, gLocal, doorsCount, drawersCount)}>{t('configurator.insertCabinet')}</button>
              <button className="btnGhost" onClick={()=>setCfgTab('basic')}>{t('configurator.backToBasic')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CabinetConfigurator
