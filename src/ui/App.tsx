import React, { useEffect, useRef, useState } from 'react';
import useLocalStorageState from './hooks/useLocalStorageState';
import { FAMILY, Kind, Variant } from '../core/catalog';
import { usePlannerStore } from '../state/store';
import GlobalSettings from './panels/GlobalSettings';
import SceneViewer from './SceneViewer';
import useCabinetConfig from './useCabinetConfig';
import { CabinetConfig } from './types';
import TopBar from './TopBar';
import SheetSettingsPanel from './SheetSettingsPanel';
import MainTabs from './MainTabs';
import { createTranslator } from './i18n';

export default function App() {
  const [boardL, setBoardL] = useLocalStorageState<number>('boardL', 2800);
  const [boardW, setBoardW] = useLocalStorageState<number>('boardW', 2070);
  const [boardKerf, setBoardKerf] = useLocalStorageState<number>('boardKerf', 3);
  const [boardHasGrain, setBoardHasGrain] = useLocalStorageState<boolean>('boardHasGrain', true);

  const store = usePlannerStore();
  const [tab, setTab] = useState<'cab' | 'room' | 'costs' | 'cut'>('cab');
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE);
  const [kind, setKind] = useState<Kind | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [selWall, setSelWall] = useState(0);
  const [addCountertop] = useState(true);
  const threeRef = useRef<any>({});

  const { t, i18n } = createTranslator();
  const [lang, setLang] = useState(localStorage.getItem('lang') || i18n.language);
  useEffect(() => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  }, [lang, i18n]);

  const {
    cfgTab,
    setCfgTab,
    widthMM,
    setWidthMM,
    setAdv,
    gLocal,
    onAdd,
    doAutoOnSelectedWall,
  }: {
    cfgTab: 'basic' | 'adv';
    setCfgTab: (t: 'basic' | 'adv') => void;
    widthMM: number;
    setWidthMM: (n: number) => void;
    setAdv: (v: CabinetConfig) => void;
    gLocal: CabinetConfig;
    onAdd: (width: number, adv: CabinetConfig) => void;
    doAutoOnSelectedWall: () => void;
  } = useCabinetConfig(family, kind, variant, selWall, setVariant);

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

  return (
    <div className="app">
      <div className="canvasWrap">
        <SceneViewer threeRef={threeRef} addCountertop={addCountertop} />
        <TopBar
          t={t}
          store={store}
          setVariant={setVariant}
          setKind={setKind}
          selWall={selWall}
          setSelWall={setSelWall}
          doAutoOnSelectedWall={doAutoOnSelectedWall}
          lang={lang}
          setLang={setLang}
        />
      </div>
      <aside className="sidebar">
        <SheetSettingsPanel
          t={t}
          boardL={boardL}
          setBoardL={setBoardL}
          boardW={boardW}
          setBoardW={setBoardW}
          boardKerf={boardKerf}
          setBoardKerf={setBoardKerf}
          boardHasGrain={boardHasGrain}
          setBoardHasGrain={setBoardHasGrain}
        />

        <GlobalSettings />

        <MainTabs
          t={t}
          tab={tab}
          setTab={setTab}
          family={family}
          setFamily={setFamily}
          kind={kind}
          setKind={setKind}
          variant={variant}
          setVariant={setVariant}
          cfgTab={cfgTab}
          setCfgTab={setCfgTab}
          widthMM={widthMM}
          setWidthMM={setWidthMM}
          gLocal={gLocal}
          setAdv={setAdv}
          onAdd={onAdd}
          threeRef={threeRef}
        />
      </aside>
    </div>
  );
}
