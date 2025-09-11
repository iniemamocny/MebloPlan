import React from 'react';
import { usePlannerStore } from '../../state/store';

const WallToolSelector: React.FC = () => {
  const thickness =
    usePlannerStore((s) => s.selectedWall?.thickness) ?? 0.1;
  const setThickness = usePlannerStore((s) => s.setSelectedWallThickness);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          onPointerDown={(e) => e.stopPropagation()}
          type="range"
          min={0.08}
          max={0.25}
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
