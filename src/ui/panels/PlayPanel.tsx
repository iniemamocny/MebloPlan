import React from 'react';
import { usePlannerStore } from '../../state/store';
import { PlayerMode } from '../types';

interface Props {
  threeRef: React.MutableRefObject<any>;
  t: (key: string, opts?: any) => string;
  setMode: (v: PlayerMode) => void;
  onClose: () => void;
}

export default function PlayPanel({ threeRef, t, setMode, onClose }: Props) {
  const {
    playerHeight,
    playerSpeed,
    setPlayerHeight,
    setPlayerSpeed,
  } = usePlannerStore();

  const onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number((e.target as HTMLInputElement).value) || 0;
    setPlayerHeight(v);
    threeRef.current?.setPlayerParams?.({ height: v });
  };

  const onSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number((e.target as HTMLInputElement).value) || 0;
    setPlayerSpeed(v);
    threeRef.current?.setPlayerParams?.({ speed: v });
  };

  return (
    <div className="section">
      <div className="hd">
        <div><div className="h1">{t('app.tabs.play')}</div></div>
      </div>
      <div className="bd" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div className="small">{t('play.height')}</div>
          <input
            className="input"
            type="number"
            step="0.1"
            value={playerHeight}
            onChange={onHeightChange}
          />
        </div>
        <div>
          <div className="small">{t('play.speed')}</div>
          <input
            className="input"
            type="number"
            step="0.01"
            value={playerSpeed}
            onChange={onSpeedChange}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btnGhost"
            onClick={() => {
              setMode('build');
              onClose();
            }}
          >
            {t('play.mode.build')}
          </button>
          <button
            className="btnGhost"
            onClick={() => {
              setMode('furnish');
              onClose();
            }}
          >
            {t('play.mode.furnish')}
          </button>
          <button
            className="btnGhost"
            onClick={() => {
              setMode('decorate');
              onClose();
            }}
          >
            {t('play.mode.decorate')}
          </button>
          <button
            className="btnGhost"
            onClick={() => {
              setMode(null);
              onClose();
            }}
          >
            Exit play mode
          </button>
        </div>
      </div>
    </div>
  );
}
