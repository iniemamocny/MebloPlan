import React from 'react';
import SingleMMInput from './components/SingleMMInput';

interface SheetSettingsPanelProps {
  t: (key: string, opts?: any) => string;
  boardL: number;
  setBoardL: (v: number) => void;
  boardW: number;
  setBoardW: (v: number) => void;
  boardKerf: number;
  setBoardKerf: (v: number) => void;
  boardHasGrain: boolean;
  setBoardHasGrain: (v: boolean) => void;
}

export default function SheetSettingsPanel({
  t,
  boardL,
  setBoardL,
  boardW,
  setBoardW,
  boardKerf,
  setBoardKerf,
  boardHasGrain,
  setBoardHasGrain,
}: SheetSettingsPanelProps) {
  return (
    <div className="section card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="h2">{t('app.material.title')}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 12, marginTop: 10 }}>
        <div>
          <div className="small">{t('app.material.boardHeight')}</div>
          <SingleMMInput value={boardL} onChange={v => setBoardL(v)} max={4000} />
        </div>
        <div>
          <div className="small">{t('app.material.boardWidth')}</div>
          <SingleMMInput value={boardW} onChange={v => setBoardW(v)} max={4000} />
        </div>
        <div>
          <div className="small">{t('app.material.kerf')}</div>
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={boardKerf}
            onChange={e => setBoardKerf(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={boardHasGrain} onChange={e => setBoardHasGrain(e.target.checked)} />
            {t('app.material.grain')}
          </label>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        {t('app.material.info', { l: boardL, w: boardW })}
      </div>
    </div>
  );
}
