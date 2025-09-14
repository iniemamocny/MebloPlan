import React from 'react';
import { Hammer, Users, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import SingleMMInput from './SingleMMInput';

const RoomToolBar: React.FC = () => {
  const { t } = useTranslation();
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);
  const startWallPlacement = usePlannerStore((s) => s.startWallPlacement);
  const selectedTool = usePlannerStore((s) => s.selectedTool);
  const wallDefaults = usePlannerStore((s) => s.wallDefaults);
  const setWallDefaults = usePlannerStore((s) => s.setWallDefaults);

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
          onClick={() => startWallPlacement()}
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
      {selectedTool === 'pencil' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 8,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div className="small">{t('room.height')}</div>
              <SingleMMInput
                value={wallDefaults.height}
                onChange={(v) => setWallDefaults({ height: v })}
              />
            </div>
            <div>
              <div className="small">{t('room.thickness')}</div>
              <SingleMMInput
                value={wallDefaults.thickness}
                onChange={(v) => setWallDefaults({ thickness: v })}
              />
            </div>
          </div>
          <div>
            <div className="small">{t('room.length')}</div>
            <SingleMMInput
              value={wallDefaults.length}
              onChange={(v) => setWallDefaults({ length: v })}
            />
          </div>
        </div>
      )}
      <div
        style={{
          padding: '4px 8px',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        {selectedTool === 'pencil'
          ? t('room.pressEscToFinish')
          : t('room.pressPToStart')}
      </div>
    </div>
  );
};

export default RoomToolBar;
