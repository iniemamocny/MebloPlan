import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Eraser, Hammer } from 'lucide-react';
import { usePlannerStore } from '../../state/store';

const WallDrawToolbar: React.FC = () => {
  const wallTool = usePlannerStore((s) => s.wallTool);
  const setWallTool = usePlannerStore((s) => s.setWallTool);
  const { t } = useTranslation();

  const tools: {
    id: 'draw' | 'erase' | 'edit';
    icon: React.ReactNode;
    label: string;
  }[] = [
    { id: 'draw', icon: <Pencil size={16} />, label: t('drawWall') },
    { id: 'erase', icon: <Eraser size={16} />, label: t('eraseWall') },
    { id: 'edit', icon: <Hammer size={16} />, label: t('editWall') },
  ];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
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
          onPointerDown={(e) => e.stopPropagation()}
          key={t.id}
          data-tool={t.id}
          className="btnGhost"
          aria-label={t.label}
          title={t.label}
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
