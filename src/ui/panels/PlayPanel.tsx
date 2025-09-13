import React from 'react';
import { usePlannerStore } from '../../state/store';
import { PlayerMode, PlayerSubMode, PLAYER_MODES } from '../types';
import type { ThreeEngine } from '../../scene/engine';

interface Props {
  threeRef: React.MutableRefObject<ThreeEngine | null>;
  t: (key: string, opts?: any) => string;
  setMode: (v: PlayerMode) => void;
  startMode: PlayerSubMode;
  setStartMode: (v: PlayerSubMode) => void;
  onClose: () => void;
}

export default function PlayPanel({
  threeRef,
  t,
  setMode,
  startMode,
  setStartMode,
  onClose,
}: Props) {
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
    <>
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
          {PLAYER_MODES.map((key) => (
            <button
              key={key}
              className="btnGhost"
              style={
                startMode === key
                  ? { background: 'var(--accent)', color: 'var(--white)' }
                  : undefined
              }
              onClick={() => setStartMode(key)}
            >
              {t(`play.mode.${key}`)}
            </button>
          ))}
        </div>
        <button
          data-testid="enter-play-mode"
          className="btnGhost"
          onClick={() => {
            if ('pointerLockElement' in document) {
              threeRef.current?.playerControls.lock();
              setMode(startMode);
              onClose();
            } else {
              threeRef.current?.showPointerLockError?.('Pointer lock not supported');
            }
          }}
        >
          Enter play mode
        </button>
      </div>
    </div>
  </>
  );
}
