import React from 'react';
import { Pencil, Hammer, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import SingleMMInput from './SingleMMInput';

const RoomToolBar: React.FC = () => {
  const { t } = useTranslation();
  const drawWalls = usePlannerStore((s) => s.drawWalls);
  const wallDefaults = usePlannerStore((s) => s.wallDefaults);
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);
  const selectedTool = usePlannerStore((s) => s.selectedTool);
  const snapLength = usePlannerStore((s) => s.snapLength);
  const setSnapLength = usePlannerStore((s) => s.setSnapLength);

  const handlePencilClick = () => {
    if (selectedTool === 'wall') {
      setSelectedTool(null);
    } else {
      drawWalls(wallDefaults.height, wallDefaults.thickness);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        <button
        className="btnGhost"
        style={
          selectedTool === 'wall'
            ? { background: 'var(--accent)', color: 'var(--white)' }
            : undefined
        }
        title={t('room.pencil')}
        onClick={handlePencilClick}
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
          title={t('room.group')}
          onClick={() => setSelectedTool('group')}
        >
          <Users size={16} />
        </button>
      </div>
      {selectedTool === 'wall' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 4,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <div>
            <div className="small">{t('room.height')}</div>
            <SingleMMInput
              value={wallDefaults.height}
              onChange={(v) => drawWalls(v, wallDefaults.thickness)}
            />
          </div>
          <div>
            <div className="small">{t('room.thickness')}</div>
            <SingleMMInput
              value={wallDefaults.thickness}
              onChange={(v) => drawWalls(wallDefaults.height, v)}
            />
          </div>
          <div>
            <div className="small">{t('room.length')}</div>
            <SingleMMInput value={snapLength} onChange={setSnapLength} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomToolBar;
