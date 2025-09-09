import React from 'react';
import { usePlannerStore } from '../../state/store';
import { PlayerMode } from '../types';

type PlayerSubMode = Exclude<PlayerMode, null>;

interface Props {
  threeRef: React.MutableRefObject<any>;
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
          {(
            [
              { key: 'build', label: t('play.mode.build') },
              { key: 'furnish', label: t('play.mode.furnish') },
              { key: 'decorate', label: t('play.mode.decorate') },
            ] as { key: PlayerSubMode; label: string }[]
          ).map(({ key, label }) => (
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
              {label}
            </button>
          ))}
        </div>
        <button
          className="btnGhost"
          onClick={() => {
            setMode(startMode);
            onClose();
          }}
        >
          Enter play mode
        </button>
      </div>
    </div>
  );
}
