import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPencilAlt } from 'react-icons/fa';
import { usePlannerStore } from '../state/store';
import SlidingPanel from './components/SlidingPanel';

interface WallDrawPanelProps {
  threeRef: React.MutableRefObject<any>;
  isOpen: boolean;
  isDrawing: boolean;
  wallLength: number;
  setWallLength: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function WallDrawPanel({
  threeRef,
  isOpen,
  isDrawing,
  wallLength,
  setWallLength,
  setIsOpen,
}: WallDrawPanelProps) {
  const { t } = useTranslation();
  const store = usePlannerStore();
  return (
    <SlidingPanel
      isOpen={isOpen}
      onClose={() => {
        threeRef.current?.exitTopDownMode?.();
        setIsOpen(false);
      }}
      className={`bottom ${isOpen ? 'open' : ''}`}
      locked={isDrawing}
    >
      <div
        className="row"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
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
        />
        <div>{Math.round(store.snappedLengthMm)} mm</div>
      </div>
      <div
        className="row"
        style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
      >
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
          />
        </div>
        <div>{Math.round(store.snappedAngleDeg)}°</div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
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
    </SlidingPanel>
  );
}
