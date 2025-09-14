import React from 'react';
import { Hammer, Users, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';

const RoomToolBar: React.FC = () => {
  const { t } = useTranslation();
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);
  const selectedTool = usePlannerStore((s) => s.selectedTool);

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
          title={t('room.pencil')}
          onClick={() => setSelectedTool('pencil')}
          style={
            selectedTool === 'pencil'
              ? { background: 'var(--accent)', color: 'var(--white)' }
              : undefined
          }
        >
          <Pencil size={16} />
        </button>
        <button
          className="btnGhost"
          title={t('room.hammer')}
          onClick={() => setSelectedTool('hammer')}
          style={
            selectedTool === 'hammer'
              ? { background: 'var(--accent)', color: 'var(--white)' }
              : undefined
          }
        >
          <Hammer size={16} />
        </button>
        <button
          className="btnGhost"
          title={t('room.group')}
          onClick={() => setSelectedTool('group')}
          style={
            selectedTool === 'group'
              ? { background: 'var(--accent)', color: 'var(--white)' }
              : undefined
          }
        >
          <Users size={16} />
        </button>
      </div>
    </div>
  );
};

export default RoomToolBar;
