import React, { useEffect, useRef, useState } from 'react';
import { FAMILY, Kind, Variant } from '../core/catalog';
import { usePlannerStore } from '../state/store';
import SceneViewer from './SceneViewer';
import useCabinetConfig from './useCabinetConfig';
import TopBar from './TopBar';
import { createTranslator } from './i18n';
import MainTabs from './MainTabs';
import { safeSetItem } from '../utils/storage';
import { PlayerMode } from './types';
import type { ThreeEngine } from '../scene/engine';

type PlayerSubMode = Exclude<PlayerMode, null>;

export default function App() {
  const store = usePlannerStore();
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE);
  const [kind, setKind] = useState<Kind | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [addCountertop, setAddCountertop] = useState(true);
  const threeRef = useRef<ThreeEngine | null>(null);

  const { t, i18n } = createTranslator();
  const [lang, setLang] = useState(
    localStorage.getItem('lang') || i18n.language,
  );
  useEffect(() => {
    i18n.changeLanguage(lang);
    safeSetItem('lang', lang);
  }, [lang, i18n]);

  const {
    widthMM,
    setWidthMM,
    gLocal,
    setAdv,
    onAdd,
    initBlenda,
    initSidePanel,
  } = useCabinetConfig(family, kind, variant, setVariant);

  const [tab, setTab] = useState<'cab' | 'costs' | 'cut' | 'room' | 'global' | 'play' | null>(null);
  const [activeTab, setActiveTab] =
    useState<'cab' | 'costs' | 'cut' | 'room' | 'global' | 'play' | null>(null);
  const [boardL, setBoardL] = useState(2800);
  const [boardW, setBoardW] = useState(2070);
  const [boardKerf, setBoardKerf] = useState(3);
  const [boardHasGrain, setBoardHasGrain] = useState(false);
  const [mode, setMode] = useState<PlayerMode>(null);
  const [startMode, setStartMode] = useState<PlayerSubMode>('furnish');
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const undo = store.undo;
  const redo = store.redo;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  useEffect(() => {
    if (mode !== null) setTab(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== null) setStartMode(mode);
  }, [mode]);

  useEffect(() => {
    if (tab === 'room') handleSetViewMode('2d');
  }, [tab]);

  const handleSetViewMode = (v: '3d' | '2d') => {
    setViewMode(v);
  };

  const toggleViewMode = () => {
    const next = viewMode === '3d' ? '2d' : '3d';
    handleSetViewMode(next);
  };

  return (
    <div className="app">
      {mode === null && (
        <div className="mainTabs">
          <MainTabs
            t={t}
            tab={tab}
            setTab={setTab}
            setActiveTab={setActiveTab}
            family={family}
            setFamily={setFamily}
            kind={kind}
            setKind={setKind}
            variant={variant}
            setVariant={setVariant}
            widthMM={widthMM}
            setWidthMM={setWidthMM}
            gLocal={gLocal}
            setAdv={setAdv}
            onAdd={onAdd}
            initBlenda={initBlenda}
            initSidePanel={initSidePanel}
            boardL={boardL}
            setBoardL={setBoardL}
            boardW={boardW}
            setBoardW={setBoardW}
            boardKerf={boardKerf}
            setBoardKerf={setBoardKerf}
            boardHasGrain={boardHasGrain}
            setBoardHasGrain={setBoardHasGrain}
            addCountertop={addCountertop}
            setAddCountertop={setAddCountertop}
            threeRef={threeRef}
            setMode={setMode}
            startMode={startMode}
            setStartMode={setStartMode}
          />
        </div>
      )}
      {mode === null && (
        <div className="topBarWrap">
          <TopBar
            t={t}
            store={store}
            setVariant={setVariant}
            setKind={setKind}
            lang={lang}
            setLang={setLang}
            viewMode={viewMode}
            toggleViewMode={toggleViewMode}
          />
        </div>
      )}
      <div className="canvasWrap">
        <SceneViewer
          threeRef={threeRef}
          addCountertop={addCountertop}
          mode={mode}
          setMode={setMode}
          viewMode={viewMode}
          setViewMode={handleSetViewMode}
          showRoomTools={activeTab === 'room'}
        />
      </div>
    </div>
  );
}
