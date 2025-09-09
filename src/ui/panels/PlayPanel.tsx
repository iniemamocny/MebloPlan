import React from 'react';
import { usePlannerStore } from '../../state/store';
import { PlayerMode, PlayerSubMode, PLAYER_MODES } from '../types';

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
    setIsRoomDrawing,
    setSelectedTool,
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

  const startDrawing = () => {
    setIsRoomDrawing(true);
    setSelectedTool('wall');
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
          <button className="btnGhost" onClick={startDrawing}>
            {t('room.draw')}
          </button>
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
    </>
  );
}
