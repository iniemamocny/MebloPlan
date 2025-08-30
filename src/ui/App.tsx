import React, { useEffect, useRef, useState } from 'react';
import { FAMILY, Kind, Variant } from '../core/catalog';
import { usePlannerStore } from '../state/store';
import GlobalSettings from './panels/GlobalSettings';
import SceneViewer from './SceneViewer';
import useCabinetConfig from './useCabinetConfig';
import TopBar from './TopBar';
import { createTranslator } from './i18n';

export default function App() {
  const store = usePlannerStore();
  const [family] = useState<FAMILY>(FAMILY.BASE);
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

  const { doAutoOnSelectedWall } = useCabinetConfig(
    family,
    kind,
    variant,
    selWall,
    setVariant,
  );

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
      <GlobalSettings />
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
    </div>
  );
}
