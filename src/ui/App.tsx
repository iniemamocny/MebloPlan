import React, { useEffect, useRef, useState } from 'react';
import { FAMILY, Kind, Variant } from '../core/catalog';
import { usePlannerStore } from '../state/store';
import SceneViewer from './SceneViewer';
import useCabinetConfig from './useCabinetConfig';
import TopBar from './TopBar';
import { createTranslator } from './i18n';
import MainTabs from './MainTabs';
import { safeSetItem } from '../utils/storage';

export default function App() {
  const store = usePlannerStore();
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE);
  const [kind, setKind] = useState<Kind | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
    const [selWall, setSelWall] = useState(() => usePlannerStore.getState().room.walls[0]?.id || '');
  const [addCountertop, setAddCountertop] = useState(true);
  const threeRef = useRef<any>({});

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
    doAutoOnSelectedWall,
    initBlenda,
    initSidePanel,
    } = useCabinetConfig(family, kind, variant, selWall, setVariant);

  const [tab, setTab] = useState<'cab' | 'costs' | 'cut' | 'global' | null>(null);
  const [boardL, setBoardL] = useState(2800);
  const [boardW, setBoardW] = useState(2070);
  const [boardKerf, setBoardKerf] = useState(3);
  const [boardHasGrain, setBoardHasGrain] = useState(false);

  const undo = store.undo;
  const redo = store.redo;
  const removeWall = store.removeWall;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
          if (selWall) {
            removeWall(selWall);
            const first = usePlannerStore.getState().room.walls[0];
            setSelWall(first ? first.id : '');
          }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, removeWall, selWall]);

  return (
    <div className="app">
      <div className="mainTabs">
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
        />
      </div>
      <div className="canvasWrap">
        <SceneViewer
          threeRef={threeRef}
          addCountertop={addCountertop}
        />
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
    </div>
  );
}
