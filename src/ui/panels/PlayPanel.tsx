import React from 'react';

interface Props {
  threeRef: React.MutableRefObject<any>;
  t: (key: string, opts?: any) => string;
}

export default function PlayPanel({ threeRef, t }: Props) {
  return (
    <div className="section">
      <div className="hd">
        <div><div className="h1">{t('app.tabs.play')}</div></div>
      </div>
      <div className="bd" style={{ display: 'flex', gap: 8 }}>
        <button className="btnGhost" onClick={() => threeRef.current?.setPlayerMode?.(true)}>
          Enter play mode
        </button>
        <button className="btnGhost" onClick={() => threeRef.current?.setPlayerMode?.(false)}>
          Exit play mode
        </button>
      </div>
    </div>
  );
}
