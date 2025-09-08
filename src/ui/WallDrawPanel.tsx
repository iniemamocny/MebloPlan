import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPencilAlt } from 'react-icons/fa';
import { usePlannerStore } from '../state/store';
import { getAreaAndPerimeter, getWallSegments } from '../utils/walls';

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
  const [mode, setMode] = React.useState<'draw' | 'edit' | 'move' | 'opening'>('draw');
  const { area, perimeter } = React.useMemo(() => {
    const segs = getWallSegments(store.room, undefined, undefined, true);
    return getAreaAndPerimeter(segs);
  }, [store.room.walls]);
  React.useEffect(() => {
    threeRef.current.onLengthChange = setWallLength;
    threeRef.current.onAngleChange = setWallAngle;
    return () => {
      threeRef.current.onLengthChange = undefined;
      threeRef.current.onAngleChange = undefined;
    };
  }, [threeRef]);
  React.useEffect(() => {
    threeRef.current?.setWallMode?.(mode);
  }, [mode, threeRef]);
  React.useEffect(() => {
    if (!isOpen) {
      threeRef.current?.exitTopDownMode?.();
    }
  }, [isOpen, threeRef]);
  React.useEffect(() => {
    if (!isOpen) return;
    const overlay = document.querySelector(
      'input.wall-overlay',
    ) as HTMLInputElement | null;
    if (!overlay) return;
    overlay.value = `${wallLength}`;
    const onInput = () => {
      const val = Number(overlay.value);
      if (!Number.isNaN(val)) {
        setWallLength(val);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const val = Number(overlay.value);
        if (!Number.isNaN(val)) {
          threeRef.current?.applyWallLength?.(val);
          setWallLength(val);
        }
      }
    };
    overlay.addEventListener('input', onInput);
    overlay.addEventListener('keydown', onKey);
    return () => {
      overlay.removeEventListener('input', onInput);
      overlay.removeEventListener('keydown', onKey);
    };
  }, [wallLength, isOpen, threeRef]);
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
      <div>
        <div className="small">{t('app.mode')}</div>
        <select
          className="input"
          value={mode}
          onChange={(e) =>
            setMode(
              (e.target as HTMLSelectElement).value as
                | 'draw'
                | 'edit'
                | 'move'
                | 'opening',
            )
          }
          style={{ width: 120 }}
        >
          <option value="draw">{t('room.drawWalls')}</option>
          <option value="edit">{t('app.editWall')}</option>
          <option value="move">{t('app.moveWall')}</option>
          <option value="opening">Opening</option>
        </select>
      </div>
      {mode === 'opening' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div>
            <div className="small">Width</div>
            <input
              className="input"
              type="number"
              value={store.openingDefaults.width}
              onChange={(e) =>
                store.setOpeningDefaults({
                  width: Number((e.target as HTMLInputElement).value),
                })
              }
              style={{ width: 60 }}
              min={0}
            />
          </div>
          <div>
            <div className="small">Height</div>
            <input
              className="input"
              type="number"
              value={store.openingDefaults.height}
              onChange={(e) =>
                store.setOpeningDefaults({
                  height: Number((e.target as HTMLInputElement).value),
                })
              }
              style={{ width: 60 }}
              min={0}
            />
          </div>
          <div>
            <div className="small">Bottom</div>
            <input
              className="input"
              type="number"
              value={store.openingDefaults.bottom}
              onChange={(e) =>
                store.setOpeningDefaults({
                  bottom: Number((e.target as HTMLInputElement).value),
                })
              }
              style={{ width: 60 }}
              min={0}
            />
          </div>
        </div>
      )}
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
          <div className="small">Square angle</div>
          <input
            className="input"
            type="number"
            value={store.defaultSquareAngle}
            onChange={(e) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(val) && val >= 0 && val <= 360) {
                store.setDefaultSquareAngle(val);
              }
            }}
            style={{ width: 50 }}
            min={0}
            max={360}
            maxLength={3}
          />
        </div>
      </div>
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
      </div>
      <label
        className="small"
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={store.snapToGrid}
          onChange={(e) =>
            store.setSnapToGrid((e.target as HTMLInputElement).checked)
          }
        />
        {t('room.snapToGrid')}
      </label>
      {store.snapToGrid && (
        <div>
          <div className="small">{t('room.gridSize')}</div>
          <input
            className="input"
            type="number"
            value={store.gridSize}
            onChange={(e) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(val) && val > 0) {
                store.setGridSize(val);
              }
            }}
            style={{ width: 60 }}
            min={1}
          />
        </div>
      )}
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
          checked={store.autoCloseWalls}
          onChange={(e) =>
            store.setAutoCloseWalls((e.target as HTMLInputElement).checked)
          }
        />
        {t('room.autoClose')}
      </label>
      <div>
        <div className="small">{t('room.area')}</div>
        <div>{Math.round(area)} mm²</div>
      </div>
      <div>
        <div className="small">{t('room.perimeter')}</div>
        <div>{Math.round(perimeter)} mm</div>
      </div>
    </div>
  );
}
