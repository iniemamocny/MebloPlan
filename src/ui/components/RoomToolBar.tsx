import React from 'react';
import { Pencil, Hammer, Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';

const RoomToolBar: React.FC = () => {
  const { t } = useTranslation();
  const drawWalls = usePlannerStore((s) => s.drawWalls);
  const wallDefaults = usePlannerStore((s) => s.wallDefaults);
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 4,
      }}
    >
      <button
        className="btnGhost"
        title={t('room.pencil')}
        onClick={() => drawWalls(wallDefaults.height, wallDefaults.thickness)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="btnGhost"
        title={t('room.hammer')}
        onClick={() => setSelectedTool('hammer')}
      >
        <Hammer size={16} />
      </button>
      <button
        className="btnGhost"
        title={t('room.eraser')}
        onClick={() => setSelectedTool('eraser')}
      >
        <Eraser size={16} />
      </button>
    </div>
  );
};

export default RoomToolBar;
