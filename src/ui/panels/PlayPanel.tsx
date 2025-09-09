import React from 'react';
import { usePlannerStore } from '../../state/store';

interface Props {
  threeRef: React.MutableRefObject<any>;
  t: (key: string, opts?: any) => string;
}

export default function PlayPanel({ threeRef, t }: Props) {
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btnGhost" onClick={() => threeRef.current?.setPlayerMode?.(true)}>
            Enter play mode
          </button>
          <button className="btnGhost" onClick={() => threeRef.current?.setPlayerMode?.(false)}>
            Exit play mode
          </button>
        </div>
      </div>
    </div>
  );
}
