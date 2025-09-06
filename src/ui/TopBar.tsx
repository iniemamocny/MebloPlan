import React from 'react';
import { getWallSegments } from '../utils/walls';
import type { Kind, Variant } from '../core/catalog';

interface TopBarProps {
  t: (key: string, opts?: any) => string;
  store: any;
  setVariant: (v: Variant | null) => void;
  setKind: (k: Kind | null) => void;
  selWall: number;
  setSelWall: (n: number) => void;
  doAutoOnSelectedWall: () => void;
  lang: string;
  setLang: (l: string) => void;
}

export default function TopBar({ t, store, setVariant, setKind, selWall, setSelWall, doAutoOnSelectedWall, lang, setLang }: TopBarProps) {
  const onRemoveWall = () => {
    store.removeWall(selWall);
    setSelWall(0);
  };
  const onEditWall = () => {
    const w = store.room.walls[selWall];
    if (!w) return;
    const length = Number(prompt('Length (mm)', String(w.length))) || w.length;
    const angle = Number(prompt('Angle (deg)', String(w.angle))) || w.angle;
    store.updateWall(selWall, { length, angle });
  };
  return (
    <div className="topbar row">
      <button className="btnGhost" onClick={() => store.setRole(store.role === 'stolarz' ? 'klient' : 'stolarz')}>
        {t('app.mode')}: {t(`app.roles.${store.role}`)}
      </button>
      <button className="btnGhost" onClick={() => { setVariant(null); setKind(null); }}>
        {t('app.resetSelection')}
      </button>
      <button className="btnGhost" onClick={() => store.undo()} disabled={store.past.length === 0}>
        {t('app.undo')}
      </button>
      <button className="btnGhost" onClick={() => store.redo()} disabled={store.future.length === 0}>
        {t('app.redo')}
      </button>
      <button className="btnGhost" onClick={() => store.clear()}>
        {t('app.clear')}
      </button>
      <select
        className="btnGhost"
        value={selWall}
        onChange={e => setSelWall(Number((e.target as HTMLSelectElement).value) || 0)}
      >
        {getWallSegments().map((s, i) => (
          <option key={i} value={i}>
            {t('app.wallLabel', { num: i + 1, len: Math.round(s.length) })}
          </option>
        ))}
      </select>
      <button
        className="btnGhost"
        onClick={onRemoveWall}
        disabled={store.room.walls.length === 0}
      >
        {t('app.removeWall')}
      </button>
      <button
        className="btnGhost"
        onClick={onEditWall}
        disabled={store.room.walls.length === 0}
      >
        {t('app.editWall')}
      </button>
      <button className="btn" onClick={doAutoOnSelectedWall}>
        {t('app.autoWall')}
      </button>
      <select className="btnGhost" value={lang} onChange={e => setLang((e.target as HTMLSelectElement).value)}>
        <option value="pl">PL</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
