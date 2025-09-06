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
  wallLength: number;
  setWallLength: React.Dispatch<React.SetStateAction<number>>;
}

export default function WallDrawPanel({
  threeRef,
  isOpen,
  isDrawing,
  wallLength,
  setWallLength,
}: WallDrawPanelProps) {
  const { t } = useTranslation();
  const store = usePlannerStore();
  const range = ranges[store.wallType];
  if (!isOpen) {
    threeRef.current?.exitTopDownMode?.();
    return null;
  }
  return (
    <div className="bottombar row">
      <button
        className="btnGhost"
        onClick={() => threeRef.current?.enterTopDownMode?.()}
        disabled={isDrawing}
      >
        <FaPencilAlt />
      </button>
      <input
        className="input"
        type="number"
        value={wallLength}
        onChange={(e) =>
          setWallLength(Number((e.target as HTMLInputElement).value) || 0)
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            threeRef.current?.applyWallLength?.(wallLength);
          }
        }}
        maxLength={5}
        style={{ width: 70 }}
      />
      <div>{Math.round(store.snappedLengthMm)} mm</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <div className="small">{t('room.angleToPrev')}</div>
          <input
            className="input"
            type="number"
            value={store.angleToPrev}
            onChange={(e) =>
              store.setAngleToPrev(
                Number((e.target as HTMLInputElement).value) || 0,
              )
            }
            disabled={store.snapRightAngles}
            style={{ width: 50 }}
            min={0}
            max={360}
          />
        </div>
        <div>{Math.round(store.snappedAngleDeg)}°</div>
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
    </div>
  );
}
