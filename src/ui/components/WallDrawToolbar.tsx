import React from 'react';
import { usePlannerStore } from '../../state/store';

const WallDrawToolbar: React.FC = () => {
  const wallTool = usePlannerStore((s) => s.wallTool);
  const setWallTool = usePlannerStore((s) => s.setWallTool);

  const tools: { id: 'draw' | 'erase' | 'edit'; icon: string }[] = [
    { id: 'draw', icon: '✏️' },
    { id: 'erase', icon: '🧽' },
    { id: 'edit', icon: '🔨' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        padding: 8,
        borderRadius: 4,
        display: 'flex',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {tools.map((t) => (
        <button
          key={t.id}
          data-tool={t.id}
          className="btnGhost"
          style={
            wallTool === t.id
              ? { background: 'var(--accent)', color: 'var(--white)' }
              : undefined
          }
          onClick={() => setWallTool(t.id)}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};

export default WallDrawToolbar;
