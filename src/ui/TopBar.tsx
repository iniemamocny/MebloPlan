import React from 'react';
import type { Kind, Variant } from '../core/catalog';

interface TopBarProps {
  t: (key: string, opts?: any) => string;
  store: any;
  setVariant: (v: Variant | null) => void;
  setKind: (k: Kind | null) => void;
  lang: string;
  setLang: (l: string) => void;
}

export default function TopBar({ t, store, setVariant, setKind, lang, setLang }: TopBarProps) {
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
      <select className="btnGhost" value={lang} onChange={e => setLang((e.target as HTMLSelectElement).value)}>
        <option value="pl">PL</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
