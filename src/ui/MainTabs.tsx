import React from 'react';
import { FAMILY, FAMILY_LABELS } from '../core/catalog';
import type { Kind, Variant } from '../core/catalog';
import TypePicker, { KindTabs, VariantList } from './panels/CatalogPicker';
import CabinetConfigurator from './CabinetConfigurator';
import RoomTab from './panels/RoomTab';
import CostsTab from './panels/CostsTab';
import CutlistTab from './panels/CutlistTab';
import { CabinetConfig } from './types';
import SlidingPanel from './components/SlidingPanel';
import GlobalSettings from './panels/GlobalSettings';

interface MainTabsProps {
  t: (key: string, opts?: any) => string;
  tab: 'cab' | 'room' | 'costs' | 'cut' | 'global' | null;
  setTab: (t: 'cab' | 'room' | 'costs' | 'cut' | 'global' | null) => void;
  family: FAMILY;
  setFamily: (f: FAMILY) => void;
  kind: Kind | null;
  setKind: (k: Kind | null) => void;
  variant: Variant | null;
  setVariant: (v: Variant | null) => void;
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
  threeRef: React.MutableRefObject<any>;
  boardL: number;
  setBoardL: (v: number) => void;
  boardW: number;
  setBoardW: (v: number) => void;
  boardKerf: number;
  setBoardKerf: (v: number) => void;
  boardHasGrain: boolean;
  setBoardHasGrain: (v: boolean) => void;
  addCountertop: boolean;
  setAddCountertop: (v: boolean) => void;
}

export default function MainTabs({
  t,
  tab,
  setTab,
  family,
  setFamily,
  kind,
  setKind,
  variant,
  setVariant,
  widthMM,
  setWidthMM,
  gLocal,
  setAdv,
  onAdd,
  threeRef,
  boardL,
  setBoardL,
  boardW,
  setBoardW,
  boardKerf,
  setBoardKerf,
  boardHasGrain,
  setBoardHasGrain,
  addCountertop,
  setAddCountertop,
}: MainTabsProps) {
  const toggleTab = (name: 'cab' | 'room' | 'costs' | 'cut' | 'global') => {
    setTab(tab === name ? null : name);
  };

  return (
    <>
      <div className="tabs">
        <button className={`tabBtn ${tab === 'cab' ? 'active' : ''}`} onClick={() => toggleTab('cab')}>
          {t('app.tabs.cab')}
        </button>
        <button className={`tabBtn ${tab === 'room' ? 'active' : ''}`} onClick={() => toggleTab('room')}>
          {t('app.tabs.room')}
        </button>
        <button className={`tabBtn ${tab === 'costs' ? 'active' : ''}`} onClick={() => toggleTab('costs')}>
          {t('app.tabs.costs')}
        </button>
        <button className={`tabBtn ${tab === 'cut' ? 'active' : ''}`} onClick={() => toggleTab('cut')}>
          {t('app.tabs.cut')}
        </button>
        <button className={`tabBtn ${tab === 'global' ? 'active' : ''}`} onClick={() => toggleTab('global')}>
          {t('app.tabs.global')}
        </button>
      </div>

      <SlidingPanel
        isOpen={tab !== null}
        onClose={() => setTab(null)}
        className={tab !== null ? 'open' : ''}
      >
        {tab === 'cab' && (
          <>
            <div>
              <div className="h1">{t('app.cabinetType')}</div>
              <TypePicker
                family={family}
                setFamily={(f: FAMILY) => {
                  setFamily(f);
                  setKind(null);
                  setVariant(null);
                }}
              />
            </div>

            <div className="section">
              <div className="hd">
                <div>
                  <div className="h1">{t('app.subcategories', { family: FAMILY_LABELS[family] })}</div>
                </div>
              </div>
              <div className="bd">
                <KindTabs
                  family={family}
                  kind={kind}
                  setKind={(k: Kind) => {
                    setKind(k);
                    setVariant(null);
                  }}
                />
              </div>
            </div>

            {kind && kind.key !== 'countertop' && !variant && (
              <div className="section">
                <div className="hd">
                  <div>
                    <div className="h1">{t('app.variant')}</div>
                  </div>
                </div>
                <div className="bd">
                  <VariantList kind={kind} onPick={(v: Variant) => { setVariant(v); }} />
                </div>
              </div>
            )}

            {variant && kind?.key !== 'countertop' && (
              <CabinetConfigurator
                family={family}
                kind={kind}
                variant={variant}
                widthMM={widthMM}
                setWidthMM={setWidthMM}
                gLocal={gLocal}
                setAdv={setAdv}
                onAdd={onAdd}
              />
            )}

            {kind?.key === 'countertop' && (
              <div className="section">
                <label
                  className="small"
                  style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={!addCountertop}
                    onChange={(e) =>
                      setAddCountertop(!(e.target as HTMLInputElement).checked)
                    }
                  />
                  {t('configurator.hideCountertop')}
                </label>
              </div>
            )}
          </>
        )}

        {tab === 'room' && <RoomTab three={threeRef} />}
        {tab === 'costs' && <CostsTab />}
        {tab === 'cut' && (
          <CutlistTab
            boardL={boardL}
            setBoardL={setBoardL}
            boardW={boardW}
            setBoardW={setBoardW}
            boardKerf={boardKerf}
            setBoardKerf={setBoardKerf}
            boardHasGrain={boardHasGrain}
            setBoardHasGrain={setBoardHasGrain}
          />
        )}
        {tab === 'global' && <GlobalSettings />}
      </SlidingPanel>
    </>
  );
}
