import React from 'react';
import { usePlannerStore } from '../../state/store';

const WallToolSelector: React.FC = () => {
  const selectedWall = usePlannerStore((s) => s.selectedWall);
  const setKind = usePlannerStore((s) => s.setSelectedWallKind);
  const setThickness = usePlannerStore((s) => s.setSelectedWallThickness);

  const kind = selectedWall?.kind ?? 'partition';
  const thickness = selectedWall?.thickness ?? (kind === 'bearing' ? 0.3 : 0.1);
  const min = kind === 'bearing' ? 0.2 : 0.05;
  const max = kind === 'bearing' ? 0.5 : 0.15;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        padding: 8,
        borderRadius: 4,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          className="btnGhost"
          onClick={() => setKind('bearing')}
          style={{
            background: kind === 'bearing' ? 'rgba(255,255,255,0.3)' : 'transparent',
          }}
        >
          Load-bearing
        </button>
        <button
          className="btnGhost"
          onClick={() => setKind('partition')}
          style={{
            background: kind === 'partition' ? 'rgba(255,255,255,0.3)' : 'transparent',
          }}
        >
          Partition
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={0.01}
          value={thickness}
          onChange={(e) => setThickness(parseFloat(e.target.value))}
        />
        <span>{(thickness * 1000).toFixed(0)} mm</span>
      </div>
    </div>
  );
};

export default WallToolSelector;
