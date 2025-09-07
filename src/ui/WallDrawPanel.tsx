import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPencilAlt } from 'react-icons/fa';
import { usePlannerStore } from '../state/store';

const ranges = {
  nosna: { min: 150, max: 250 },
  dzialowa: { min: 60, max: 120 },
};

interface WallDrawPanelProps {
  threeRef: React.MutableRefObject<any>;
  isOpen: boolean;
  isDrawing: boolean;
}

export default function WallDrawPanel({
  threeRef,
  isOpen,
  isDrawing,
}: WallDrawPanelProps) {
  const { t } = useTranslation();
  const store = usePlannerStore();
  const range = ranges[store.wallType];
  const [wallLength, setWallLength] = React.useState(0);
  const [wallAngle, setWallAngle] = React.useState(0);
  const [lengthError, setLengthError] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  React.useEffect(() => {
    threeRef.current.onLengthChange = setWallLength;
    threeRef.current.onAngleChange = setWallAngle;
    return () => {
      threeRef.current.onLengthChange = undefined;
      threeRef.current.onAngleChange = undefined;
    };
  }, [threeRef]);
  React.useEffect(() => {
    threeRef.current?.setWallMode?.(editMode ? 'edit' : 'draw');
  }, [editMode, threeRef]);
  React.useEffect(() => {
    if (!isOpen) {
      threeRef.current?.exitTopDownMode?.();
    }
  }, [isOpen, threeRef]);
  if (!isOpen) {
    return null;
  }
  return (
    <div className="bottombar row">
      <button
        className={`btnGhost${isDrawing ? ' active' : ''}`}
        onClick={() =>
          isDrawing
            ? threeRef.current?.exitTopDownMode?.()
            : threeRef.current?.enterTopDownMode?.()
        }
      >
        <FaPencilAlt />
      </button>
      {isDrawing && (
        <button
          className="btnGhost"
          onClick={() => threeRef.current?.exitTopDownMode?.()}
        >
          {t('room.finishDrawing')}
        </button>
      )}
      <label
        className="small"
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={editMode}
          onChange={(e) =>
            setEditMode((e.target as HTMLInputElement).checked)
          }
        />
        {t('app.editWall')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          className="input"
          type="number"
          min={0}
          value={wallLength}
          onChange={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            if (val >= 0) {
              setWallLength(val);
              setLengthError(false);
            } else {
              setLengthError(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              threeRef.current?.applyWallLength?.(wallLength);
            }
          }}
          maxLength={5}
          style={{ width: 70 }}
        />
        {lengthError && (
          <div className="small" style={{ color: 'red' }}>
            {t('room.invalidLength')}
          </div>
        )}
      </div>
      <div>{Math.round(wallLength).toString().slice(0, 5)} mm</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <div className="small">{t('room.angleToPrev')}</div>
          <input
            className="input"
            type="number"
            value={store.angleToPrev}
            onChange={(e) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(val) && val >= 0 && val <= 360) {
                store.setAngleToPrev(val);
              }
            }}
            disabled={store.snapRightAngles}
            style={{ width: 50 }}
            min={0}
            max={360}
            maxLength={3}
          />
        </div>
        <div>{Math.round(wallAngle)}°</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <div className="small">{t('room.snapLength')}</div>
          <input
            className="input"
            type="number"
            value={store.snapLength}
            onChange={(e) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(val) && val >= 0) {
                store.setSnapLength(val);
              }
            }}
            style={{ width: 50 }}
            min={0}
          />
        </div>
        {!store.snapRightAngles && (
          <div>
            <div className="small">{t('room.snapAngle')}</div>
            <input
              className="input"
              type="number"
              value={store.snapAngle}
              onChange={(e) => {
                const val = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(val) && val >= 0 && val <= 360) {
                  store.setSnapAngle(val);
                }
              }}
              style={{ width: 50 }}
              min={0}
              max={360}
              maxLength={3}
            />
          </div>
        )}
      </div>
      <div>
        <div className="small">{t('room.wallType')}</div>
        <select
          className="input"
          value={store.wallType}
          onChange={(e) =>
            store.setWallType(
              (e.target as HTMLSelectElement).value as 'nosna' | 'dzialowa',
            )
          }
        >
          <option value="nosna">{t('room.wallTypes.nosna')}</option>
          <option value="dzialowa">{t('room.wallTypes.dzialowa')}</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <div className="small">{t('room.wallThickness')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={range.min}
            max={range.max}
            value={store.wallThickness}
            onChange={(e) =>
              store.setWallThickness(
                Number((e.target as HTMLInputElement).value) || 0,
              )
            }
            style={{ flex: 1 }}
          />
          <input
            className="input"
            type="number"
            min={range.min}
            max={range.max}
            value={store.wallThickness}
            onChange={(e) =>
              store.setWallThickness(
                Number((e.target as HTMLInputElement).value) || 0,
              )
            }
            style={{ width: 60 }}
          />
        </div>
      </div>
      <label
        className="small"
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={!store.snapRightAngles}
          onChange={(e) =>
            store.setSnapRightAngles(!(e.target as HTMLInputElement).checked)
          }
        />
        {t('room.noRightAngles')}
      </label>
      <label
        className="small"
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={store.autoCloseWalls}
          onChange={(e) =>
            store.setAutoCloseWalls((e.target as HTMLInputElement).checked)
          }
        />
        {t('room.autoClose')}
      </label>
    </div>
  );
}
