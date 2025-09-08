import React from 'react';
import { getWallSegments } from '../utils/walls';
import type { Kind, Variant } from '../core/catalog';
import { FaCube, FaRegSquare } from 'react-icons/fa';
import { wallRanges, usePlannerStore } from '../state/store';

interface TopBarProps {
  t: (key: string, opts?: any) => string;
  store: any;
  setVariant: (v: Variant | null) => void;
  setKind: (k: Kind | null) => void;
  selWall: string;
  setSelWall: (n: string) => void;
  doAutoOnSelectedWall: () => void;
  lang: string;
  setLang: (l: string) => void;
  threeRef: React.MutableRefObject<any>;
  isTopDown: boolean;
}

export default function TopBar({ t, store, setVariant, setKind, selWall, setSelWall, doAutoOnSelectedWall, lang, setLang, threeRef, isTopDown }: TopBarProps) {
  const onRemoveWall = () => {
    store.removeWall(selWall);
    const first = usePlannerStore.getState().room.walls[0];
    setSelWall(first ? first.id : '');
  };
  const onEditWall = () => {
    const w = store.room.walls.find((ww: any) => ww.id === selWall);
    if (!w) return;
    const length = Number(prompt('Length (mm)', String(w.length))) || w.length;
    const angle = Number(prompt('Angle (deg)', String(w.angle))) || w.angle;
    const thickness =
      Number(prompt('Thickness (mm)', String(w.thickness))) || w.thickness;
    const { min, max } = wallRanges[store.wallType];
    if (thickness < min || thickness > max) {
      alert(`Thickness must be between ${min} and ${max}mm`);
      return;
    }
    store.updateWall(selWall, { length, angle, thickness });
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
        onChange={e => setSelWall((e.target as HTMLSelectElement).value)}
      >
        {getWallSegments(store.room).map((s, i) => (
          <option key={store.room.walls[i]?.id} value={store.room.walls[i]?.id}>
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
      <button
        className="btnGhost"
        onClick={() =>
          isTopDown
            ? threeRef.current?.exitTopDownMode?.()
            : threeRef.current?.enterTopDownMode?.()
        }
        title={isTopDown ? t('app.view3D') : t('app.view2D')}
      >
        {isTopDown ? <FaCube /> : <FaRegSquare />}
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
