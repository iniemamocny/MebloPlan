import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FAMILY, Kind, Variant } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import TechDrawing from './components/TechDrawing'
import Cabinet3D from './components/Cabinet3D'
import { CabinetConfig } from './types'
import { Gaps } from '../types'
import {
  CornerCabinetForm,
  SinkCabinetForm,
  CargoCabinetForm,
  ApplianceCabinetForm,
  CabinetFormValues,
  CabinetFormProps,
} from './forms'

interface Props {
  family: FAMILY
  kind: Kind | null
  variant: Variant
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

const FORM_COMPONENTS: Record<string, React.ComponentType<CabinetFormProps>> = {
  corner: CornerCabinetForm,
  sink: SinkCabinetForm,
  cargo: CargoCabinetForm,
  appliance: ApplianceCabinetForm,
}

const CabinetConfigurator: React.FC<Props> = ({
  family,
  kind,
  variant,
  widthMM,
  setWidthMM,
  gLocal,
  setAdv,
  onAdd,
}) => {
  const store = usePlannerStore()
  const { t } = useTranslation()
  const [doorsCount, setDoorsCount] = useState(1)
  const [drawersCount, setDrawersCount] = useState(0)
  const [openSection, setOpenSection] = useState<
    'korpus' | 'fronty' | 'okucie' | 'nozki' | 'rysunki' | null
  >(null)
  const showFronts = openSection !== 'korpus'
  useEffect(() => {
    store.setShowFronts(showFronts)
  }, [showFronts, store])
  const FormComponent = kind ? FORM_COMPONENTS[kind.key] : null
  const formValues: CabinetFormValues = {
    height: gLocal.height,
    depth: gLocal.depth,
    hardware: gLocal.hardware,
    legs: gLocal.legs,
  }
  const handleFormChange = (vals: CabinetFormValues) => {
    setAdv({
      ...gLocal,
      height: vals.height,
      depth: vals.depth,
      hardware: vals.hardware,
      legs: vals.legs,
    })
  }

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
    if (drawersCount > 0) {
      if (gLocal.dividerPosition) setAdv({ ...gLocal, dividerPosition: undefined })
      return
    }
    const fronts = doorsCount
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
        <div>
          <div className="h1">{t('configurator.title', { variant: variant.label })}</div>
        </div>
      </div>
      <div className="bd">
        <div className="configuratorHeader">
          <div className="preview">
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
              edgeBanding={gLocal.edgeBanding}
              carcassType={gLocal.carcassType}
              showFronts={showFronts}
            />
          </div>
          <div className="grid2" style={{ marginTop: 8 }}>
            <div>
              <div className="small">{t('configurator.width')}</div>
              <input
                className="input"
                type="number"
                min={200}
                max={2400}
                step={1}
                value={widthMM}
                onChange={(e) => setWidthMM(Number((e.target as HTMLInputElement).value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = Number((e.target as HTMLInputElement).value) || 0;
                    if (v > 0) onAdd(v, gLocal, doorsCount, drawersCount);
                  }
                }}
              />
            </div>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => onAdd(widthMM, gLocal, doorsCount, drawersCount)}
              >
                {t('configurator.insertCabinet')}
              </button>
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
        </div>

        <details open={openSection === 'korpus'}>
          <summary
            onClick={() =>
              setOpenSection(openSection === 'korpus' ? null : 'korpus')
            }
          >
            {t('configurator.sections.korpus')}
          </summary>
          <div>
            {FormComponent && (
              <div style={{ marginBottom: 8 }}>
                <FormComponent values={formValues} onChange={handleFormChange} />
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <div className="small">{t('configurator.carcassType')}</div>
              <select
                className="input"
                value={gLocal.carcassType || 'type1'}
                onChange={(e) =>
                  setAdv({
                    ...gLocal,
                    carcassType: (e.target as HTMLSelectElement).value as CabinetConfig['carcassType'],
                  })
                }
              >
                <option value="type1">{t('configurator.carcassTypes.type1')}</option>
                <option value="type2">{t('configurator.carcassTypes.type2')}</option>
                <option value="type3">{t('configurator.carcassTypes.type3')}</option>
              </select>
            </div>
            <div className="grid4">
              <div>
                <div className="small">{t('configurator.height')}</div>
                <input
                  className="input"
                  type="number"
                  value={gLocal.height}
                  onChange={(e) =>
                    setAdv({ ...gLocal, height: Number((e.target as HTMLInputElement).value) || 0 })
                  }
                />
              </div>
              <div>
                <div className="small">{t('configurator.depth')}</div>
                <input
                  className="input"
                  type="number"
                  value={gLocal.depth}
                  onChange={(e) =>
                    setAdv({ ...gLocal, depth: Number((e.target as HTMLInputElement).value) || 0 })
                  }
                />
              </div>
              <div>
                <div className="small">{t('configurator.board')}</div>
                <select
                  className="input"
                  value={gLocal.boardType}
                  onChange={(e) =>
                    setAdv({ ...gLocal, boardType: (e.target as HTMLSelectElement).value })
                  }
                >
                  {Object.keys(store.prices.board).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small">{t('configurator.back')}</div>
                <select
                  className="input"
                  value={gLocal.backPanel || 'full'}
                  onChange={(e) =>
                    setAdv({
                      ...gLocal,
                      backPanel: (e.target as HTMLSelectElement).value as CabinetConfig['backPanel'],
                    })
                  }
                >
                  <option value="full">{t('configurator.backOptions.full')}</option>
                  <option value="split">{t('configurator.backOptions.split')}</option>
                  <option value="none">{t('configurator.backOptions.none')}</option>
                </select>
              </div>
              <div>
                <div className="small">Edge banding</div>
                <select
                  className="input"
                  value={gLocal.edgeBanding || 'front'}
                  onChange={(e) =>
                    setAdv({
                      ...gLocal,
                      edgeBanding: (e.target as HTMLSelectElement).value as CabinetConfig['edgeBanding'],
                    })
                  }
                >
                  <option value="none">none</option>
                  <option value="front">front</option>
                  <option value="full">full</option>
                </select>
              </div>
            </div>
            {drawersCount === 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="small">{t('configurator.shelves')}</div>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={gLocal.shelves || 0}
                  onChange={(e) =>
                    setAdv({ ...gLocal, shelves: Number((e.target as HTMLInputElement).value) || 0 })
                  }
                />
              </div>
            )}
          </div>
        </details>

        <details open={openSection === 'fronty'}>
          <summary
            onClick={() =>
              setOpenSection(openSection === 'fronty' ? null : 'fronty')
            }
          >
            {t('configurator.sections.fronty')}
          </summary>
          <div>
            <div className="grid4">
              <div>
                <div className="small">{t('configurator.front')}</div>
                <select
                  className="input"
                  value={gLocal.frontType}
                  onChange={(e) =>
                    setAdv({ ...gLocal, frontType: (e.target as HTMLSelectElement).value })
                  }
                >
                  {Object.keys(store.prices.front).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {doorsCount >= 3 && (
              <div style={{ marginTop: 8 }}>
                <div className="small">Przegroda</div>
                {doorsCount === 3 ? (
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
          </div>
        </details>

        <details open={openSection === 'okucie'}>
          <summary
            onClick={() =>
              setOpenSection(openSection === 'okucie' ? null : 'okucie')
            }
          >
            {t('configurator.sections.okucie')}
          </summary>
          <div>
            <div className="grid2">
              <div>
                <div className="small">Zawias</div>
                <input className="input" placeholder="-" />
              </div>
              <div>
                <div className="small">Prowadnica</div>
                <input className="input" placeholder="-" />
              </div>
            </div>
          </div>
        </details>

        <details open={openSection === 'nozki'}>
          <summary
            onClick={() =>
              setOpenSection(openSection === 'nozki' ? null : 'nozki')
            }
          >
            {t('configurator.sections.nozki')}
          </summary>
          <div>
            <div className="grid2">
              <div>
                <div className="small">Typ</div>
                <input className="input" placeholder="-" />
              </div>
              <div>
                <div className="small">Wysokość</div>
                <input className="input" placeholder="-" />
              </div>
            </div>
          </div>
        </details>
        <details open={openSection === 'rysunki'}>
          <summary
            onClick={() =>
              setOpenSection(openSection === 'rysunki' ? null : 'rysunki')
            }
          >
            {t('configurator.sections.rysunki')}
          </summary>
          <div>
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
              onChangeDrawerFronts={(arr: number[]) =>
                setAdv({ ...gLocal, drawerFronts: arr })
              }
            />
          </div>
        </details>
      </div>
    </div>
  )
}

export default CabinetConfigurator
