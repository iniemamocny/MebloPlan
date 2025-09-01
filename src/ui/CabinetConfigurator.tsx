import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FAMILY, Kind, Variant } from '../core/catalog';
import { usePlannerStore } from '../state/store';
import TechDrawing from './components/TechDrawing';
import Cabinet3D from './components/Cabinet3D';
import { CabinetConfig } from './types';
import { Gaps } from '../types';
import {
  CornerCabinetForm,
  SinkCabinetForm,
  CargoCabinetForm,
  ApplianceCabinetForm,
  CabinetFormValues,
  CabinetFormProps,
} from './forms';

interface Props {
  family: FAMILY;
  kind: Kind | null;
  variant: Variant;
  widthMM: number;
  setWidthMM: (n: number) => void;
  gLocal: CabinetConfig;
  setAdv: (v: CabinetConfig) => void;
  onAdd: (
    width: number,
    adv: CabinetConfig,
    doorsCount: number,
    drawersCount: number,
  ) => void;
}

const FORM_COMPONENTS: Record<string, React.ComponentType<CabinetFormProps>> = {
  corner: CornerCabinetForm,
  sink: SinkCabinetForm,
  cargo: CargoCabinetForm,
  appliance: ApplianceCabinetForm,
};

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
  const setShowFronts = usePlannerStore((s) => s.setShowFronts);
  const currentShowFronts = usePlannerStore((s) => s.showFronts);
  const prices = usePlannerStore((s) => s.prices);
  const { t } = useTranslation();
  const [doorsCount, setDoorsCount] = useState(1);
  const [drawersCount, setDrawersCount] = useState(0);
  const [openKorpus, setOpenKorpus] = useState(false);
  const [openFronty, setOpenFronty] = useState(false);
  const [openOkucie, setOpenOkucie] = useState(false);
  const [openNozki, setOpenNozki] = useState(false);
  const [openRysunki, setOpenRysunki] = useState(false);
  const showFronts = !openKorpus;
  useEffect(() => {
    if (currentShowFronts !== showFronts) setShowFronts(showFronts);
  }, [currentShowFronts, showFronts, setShowFronts]);
  const FormComponent = kind ? FORM_COMPONENTS[kind.key] : null;
  const formValues: CabinetFormValues = {
    height: gLocal.height,
    depth: gLocal.depth,
    hardware: gLocal.hardware,
    legs: gLocal.legs,
  };
  const handleFormChange = (vals: CabinetFormValues) => {
    setAdv({
      ...gLocal,
      height: vals.height,
      depth: vals.depth,
      hardware: vals.hardware,
      legs: vals.legs,
    });
  };

  useEffect(() => {
    if (kind?.key === 'doors') {
      setDoorsCount(1);
      setDrawersCount(0);
    } else if (kind?.key === 'drawers') {
      setDoorsCount(0);
      setDrawersCount(1);
    } else {
      setDoorsCount(0);
      setDrawersCount(0);
    }
  }, [kind]);

  useEffect(() => {
    if (drawersCount > 0) {
      if (gLocal.dividerPosition)
        setAdv({ ...gLocal, dividerPosition: undefined });
      return;
    }
    const fronts = doorsCount;
    if (fronts < 3) {
      if (gLocal.dividerPosition)
        setAdv({ ...gLocal, dividerPosition: undefined });
    } else if (fronts === 4) {
      if (gLocal.dividerPosition !== 'center')
        setAdv({ ...gLocal, dividerPosition: 'center' });
    } else if (fronts === 3 && !gLocal.dividerPosition) {
      setAdv({ ...gLocal, dividerPosition: 'left' });
    }
  }, [doorsCount, drawersCount, gLocal]);
  return (
    <div className="section">
      <div className="hd">
        <div>
          <div className="h1">
            {t('configurator.title', { variant: variant.label })}
          </div>
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
              topPanel={gLocal.topPanel}
              bottomPanel={gLocal.bottomPanel}
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
                onChange={(e) =>
                  setWidthMM(Number((e.target as HTMLInputElement).value) || 0)
                }
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
                onChange={(e) =>
                  setDoorsCount(Number((e.target as HTMLSelectElement).value))
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

        <details open={openKorpus} className={openKorpus ? 'active' : ''}>
          <summary
            onClick={(e) => {
              e.preventDefault();
              setOpenKorpus((v) => !v);
            }}
          >
            {t('configurator.sections.korpus')}
          </summary>
        <div>
          {FormComponent && (
            <div style={{ marginBottom: 8 }}>
              <FormComponent
                values={formValues}
                onChange={handleFormChange}
              />
            </div>
          )}
          <div className="grid3">
            <div>
              <div className="small">{t('configurator.width')}</div>
              <input
                className="input"
                type="number"
                min={200}
                max={2400}
                step={1}
                value={widthMM}
                onChange={(e) =>
                  setWidthMM(Number((e.target as HTMLInputElement).value) || 0)
                }
              />
            </div>
            <div>
              <div className="small">{t('configurator.height')}</div>
              <input
                className="input"
                type="number"
                value={gLocal.height}
                onChange={(e) =>
                  setAdv({
                    ...gLocal,
                    height: Number((e.target as HTMLInputElement).value) || 0,
                  })
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
                  setAdv({
                    ...gLocal,
                    depth: Number((e.target as HTMLInputElement).value) || 0,
                  })
                }
              />
              </div>
              <div>
                <div className="small">{t('configurator.board')}</div>
                <select
                  className="input"
                  value={gLocal.boardType}
                  onChange={(e) =>
                    setAdv({
                      ...gLocal,
                      boardType: (e.target as HTMLSelectElement).value,
                    })
                  }
                >
                  {Object.keys(prices.board).map((k) => (
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
                      backPanel: (e.target as HTMLSelectElement)
                        .value as CabinetConfig['backPanel'],
                    })
                  }
                >
                  <option value="full">
                    {t('configurator.backOptions.full')}
                  </option>
                  <option value="split">
                    {t('configurator.backOptions.split')}
                  </option>
                  <option value="none">
                    {t('configurator.backOptions.none')}
                  </option>
                </select>
              </div>
              <div>
                <div className="small">{t('configurator.top')}</div>
                <select
                  className="input"
                  value={gLocal.topPanel?.type || 'full'}
                  onChange={(e) => {
                    const v = (e.target as HTMLSelectElement).value as any;
                    if (v === 'twoTraverses')
                      setAdv({
                        ...gLocal,
                        topPanel: {
                          type: 'twoTraverses',
                          front: {
                            orientation: 'horizontal',
                            offset: 0,
                            width: 100,
                          },
                          back: {
                            orientation: 'horizontal',
                            offset: 0,
                            width: 100,
                          },
                        },
                      });
                    else if (v === 'frontTraverse' || v === 'backTraverse')
                      setAdv({
                        ...gLocal,
                        topPanel: {
                          type: v,
                          traverse: {
                            orientation: 'horizontal',
                            offset: 0,
                            width: 100,
                          },
                        },
                      });
                    else setAdv({ ...gLocal, topPanel: { type: v } });
                  }}
                >
                  <option value="full">
                    {t('configurator.topOptions.full')}
                  </option>
                  <option value="twoTraverses">
                    {t('configurator.topOptions.twoTraverses')}
                  </option>
                  <option value="frontTraverse">
                    {t('configurator.topOptions.frontTraverse')}
                  </option>
                  <option value="backTraverse">
                    {t('configurator.topOptions.backTraverse')}
                  </option>
                  <option value="none">
                    {t('configurator.topOptions.none')}
                  </option>
                </select>
                {gLocal.topPanel?.type === 'frontTraverse' ||
                gLocal.topPanel?.type === 'backTraverse' ? (
                  <div style={{ marginTop: 4 }}>
                    <div className="small">
                      {t('configurator.orientation.label')}
                    </div>
                    <select
                      className="input"
                      value={gLocal.topPanel.traverse.orientation}
                      onChange={(e) =>
                        setAdv({
                          ...gLocal,
                          topPanel: {
                            ...gLocal.topPanel,
                            traverse: {
                              ...gLocal.topPanel.traverse,
                              orientation: (e.target as HTMLSelectElement)
                                .value as any,
                            },
                          } as any,
                        })
                      }
                    >
                      <option value="horizontal">
                        {t('configurator.orientation.horizontal')}
                      </option>
                      <option value="vertical">
                        {t('configurator.orientation.vertical')}
                      </option>
                    </select>
                    <div className="small" style={{ marginTop: 4 }}>
                      {t(
                        gLocal.topPanel.traverse.orientation === 'vertical'
                          ? 'configurator.offsetDepth'
                          : 'configurator.offsetWidth',
                      )}
                    </div>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={
                        gLocal.topPanel.traverse.orientation === 'vertical'
                          ? gLocal.depth - gLocal.topPanel.traverse.width
                          : gLocal.width - gLocal.topPanel.traverse.width
                      }
                      value={gLocal.topPanel.traverse.offset}
                      onChange={(e) =>
                        setAdv({
                          ...gLocal,
                          topPanel: {
                            ...gLocal.topPanel,
                            traverse: {
                              ...gLocal.topPanel.traverse,
                              offset:
                                Number((e.target as HTMLInputElement).value) ||
                                0,
                            },
                          } as any,
                        })
                      }
                    />
                    <div className="small" style={{ marginTop: 4 }}>
                      {t('configurator.traverseWidth')}
                    </div>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={gLocal.topPanel.traverse.width}
                      onChange={(e) =>
                        setAdv({
                          ...gLocal,
                          topPanel: {
                            ...gLocal.topPanel,
                            traverse: {
                              ...gLocal.topPanel.traverse,
                              width:
                                Number((e.target as HTMLInputElement).value) ||
                                0,
                            },
                          } as any,
                        })
                      }
                    />
                  </div>
                ) : gLocal.topPanel?.type === 'twoTraverses' ? (
                  <div style={{ marginTop: 4 }}>
                    {(['front', 'back'] as const).map((pos) => (
                      <div key={pos} style={{ marginBottom: 4 }}>
                        <div className="small">
                          {t(`configurator.topOptions.${pos}Traverse`)}
                        </div>
                        <div className="small">
                          {t('configurator.orientation.label')}
                        </div>
                        <select
                          className="input"
                          value={gLocal.topPanel[pos].orientation}
                          onChange={(e) =>
                            setAdv({
                              ...gLocal,
                              topPanel: {
                                ...gLocal.topPanel,
                                [pos]: {
                                  ...gLocal.topPanel[pos],
                                  orientation: (e.target as HTMLSelectElement)
                                    .value as any,
                                },
                              } as any,
                            })
                          }
                        >
                          <option value="horizontal">
                            {t('configurator.orientation.horizontal')}
                          </option>
                          <option value="vertical">
                            {t('configurator.orientation.vertical')}
                          </option>
                        </select>
                        <div className="small" style={{ marginTop: 4 }}>
                          {t(
                            gLocal.topPanel[pos].orientation === 'vertical'
                              ? 'configurator.offsetDepth'
                              : 'configurator.offsetWidth',
                          )}
                        </div>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={
                            gLocal.topPanel[pos].orientation === 'vertical'
                              ? gLocal.depth - gLocal.topPanel[pos].width
                              : gLocal.width - gLocal.topPanel[pos].width
                          }
                          value={gLocal.topPanel[pos].offset}
                          onChange={(e) =>
                            setAdv({
                              ...gLocal,
                              topPanel: {
                                ...gLocal.topPanel,
                                [pos]: {
                                  ...gLocal.topPanel[pos],
                                  offset:
                                    Number(
                                      (e.target as HTMLInputElement).value,
                                    ) || 0,
                                },
                              } as any,
                            })
                          }
                        />
                        <div className="small" style={{ marginTop: 4 }}>
                          {t('configurator.traverseWidth')}
                        </div>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={gLocal.topPanel[pos].width}
                          onChange={(e) =>
                            setAdv({
                              ...gLocal,
                              topPanel: {
                                ...gLocal.topPanel,
                                [pos]: {
                                  ...gLocal.topPanel[pos],
                                  width:
                                    Number(
                                      (e.target as HTMLInputElement).value,
                                    ) || 0,
                                },
                              } as any,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="small">{t('configurator.bottom')}</div>
                <select
                  className="input"
                  value={gLocal.bottomPanel || 'full'}
                  onChange={(e) =>
                    setAdv({
                      ...gLocal,
                      bottomPanel: (e.target as HTMLSelectElement).value as any,
                    })
                  }
                >
                  <option value="full">
                    {t('configurator.bottomOptions.full')}
                  </option>
                  <option value="none">
                    {t('configurator.bottomOptions.none')}
                  </option>
                </select>
              </div>
              <div>
                <div className="small">{t('configurator.edgeBanding')}</div>
                <div className="row" style={{ gap: 8 }}>
                  {(['front', 'back', 'left', 'right'] as const).map((edge) => (
                    <label
                      key={edge}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <input
                        type="checkbox"
                        checked={gLocal.edgeBanding?.[edge] ?? false}
                        onChange={(e) =>
                          setAdv({
                            ...gLocal,
                            edgeBanding: {
                              ...gLocal.edgeBanding,
                              [edge]: (e.target as HTMLInputElement).checked,
                            },
                          })
                        }
                      />
                      {t(`configurator.edgeBandingOptions.${edge}`)}
                    </label>
                  ))}
                </div>
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
                    setAdv({
                      ...gLocal,
                      shelves:
                        Number((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                />
              </div>
            )}
          </div>
        </details>

        <details open={openFronty} className={openFronty ? 'active' : ''}>
          <summary
            onClick={(e) => {
              e.preventDefault();
              setOpenFronty((v) => !v);
            }}
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
                  onChange={(e) => {
                    const ft = (e.target as HTMLSelectElement).value;
                    setAdv({
                      ...gLocal,
                      frontType: ft,
                      frontFoldable: ft === 'DALL·E' ? gLocal.frontFoldable : false,
                    });
                  }}
                >
                  {Object.keys(prices.front)
                    .filter((k) => !k.includes('stowalna'))
                    .map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                </select>
                {gLocal.frontType === 'DALL·E' && (
                  <label className="row" style={{ marginTop: 4, gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={!!gLocal.frontFoldable}
                      onChange={(e) =>
                        setAdv({
                          ...gLocal,
                          frontFoldable: (e.target as HTMLInputElement).checked,
                        })
                      }
                    />
                    {t('configurator.frontFoldable')}
                  </label>
                )}
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
                        onChange={() =>
                          setAdv({ ...gLocal, dividerPosition: 'left' })
                        }
                      />
                      L
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={gLocal.dividerPosition === 'right'}
                        onChange={() =>
                          setAdv({ ...gLocal, dividerPosition: 'right' })
                        }
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

        <details open={openOkucie} className={openOkucie ? 'active' : ''}>
          <summary
            onClick={(e) => {
              e.preventDefault();
              setOpenOkucie((v) => !v);
            }}
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

        <details open={openNozki} className={openNozki ? 'active' : ''}>
          <summary
            onClick={(e) => {
              e.preventDefault();
              setOpenNozki((v) => !v);
            }}
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
        <details open={openRysunki} className={openRysunki ? 'active' : ''}>
          <summary
            onClick={(e) => {
              e.preventDefault();
              setOpenRysunki((v) => !v);
            }}
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
              edgeBanding={gLocal.edgeBanding}
              onChangeGaps={(gg: Gaps) => setAdv({ ...gLocal, gaps: gg })}
              onChangeDrawerFronts={(arr: number[]) =>
                setAdv({ ...gLocal, drawerFronts: arr })
              }
            />
          </div>
        </details>
      </div>
    </div>
  );
};

export default CabinetConfigurator;
