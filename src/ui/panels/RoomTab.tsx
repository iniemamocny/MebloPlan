import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import RoomUploader from '../RoomUploader';
import SlidingPanel from '../components/SlidingPanel';

interface RoomTabProps {
  three: React.MutableRefObject<any>;
  isDrawingWalls: boolean;
  wallLength: number;
  setWallLength: React.Dispatch<React.SetStateAction<number>>;
}

export default function RoomTab({
  three,
  isDrawingWalls,
  wallLength,
  setWallLength,
}: RoomTabProps) {
  const store = usePlannerStore();
  const { t } = useTranslation();
  const onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setRoom({ height: Number((e.target as HTMLInputElement).value) || 0 });
  };
  const onAddWindow = () => store.addOpening({ kind: 0 });
  const onAddDoor = () => store.addOpening({ kind: 1 });
  const onDrawWalls = () => {
    three.current?.enterTopDownMode?.();
  };
  const onFinishDrawing = () => {
    three.current?.exitTopDownMode?.();
  };
  useEffect(() => {
    const group = three.current?.group;
    if (!group) return;
    const toRemove = group.children.filter(
      (c: any) => c.userData?.kind === 'room',
    );
    toRemove.forEach((m: any) => {
      group.remove(m);
      (m as any).geometry?.dispose?.();
      if (Array.isArray((m as any).material)) {
        (m as any).material.forEach((mm: any) => mm.dispose());
      } else {
        (m as any).material?.dispose?.();
      }
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    (floor as any).userData.kind = 'room';
    group.add(floor);
    const origin = store.room.origin || { x: 0, y: 0 };
    let cursor = new THREE.Vector2(origin.x / 1000, origin.y / 1000);
    const h = (store.room.height || 2700) / 1000;
    store.room.walls.forEach((w, i) => {
      const len = (w.length || 0) / 1000;
      const ang = ((w.angle || 0) * Math.PI) / 180;
      const dir = new THREE.Vector2(Math.cos(ang), Math.sin(ang));
      const next = new THREE.Vector2(
        cursor.x + dir.x * len,
        cursor.y + dir.y * len,
      );
      const mid = new THREE.Vector2(
        (cursor.x + next.x) / 2,
        (cursor.y + next.y) / 2,
      );
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(len, h, (w.thickness || 0) / 1000),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db }),
      );
      box.position.set(mid.x, h / 2, mid.y);
      box.rotation.y = -ang;
      (box as any).userData.kind = 'room';
      group.add(box);
      cursor = next;
    });
  }, [store.room.walls, store.room.height, three]);
  return (
    <>
      <div className="section">
        <div className="hd">
          <div>
            <div className="h1">{t('room.title')}</div>
          </div>
        </div>
        <div className="bd">
          <div className="row">
            <div>
              <div className="small">{t('room.height')}</div>
              <input
                className="input"
                type="number"
                value={store.room.height || 0}
                onChange={onHeightChange}
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <div className="small">{t('room.wallThickness')}</div>
              <input
                className="input"
                type="number"
                value={store.wallThickness}
                onChange={(e) =>
                  store.setWallThickness(
                    Number((e.target as HTMLInputElement).value) || 0,
                  )
                }
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btnGhost" onClick={onAddWindow}>
              {t('room.addWindow')}
            </button>
            <button className="btnGhost" onClick={onAddDoor}>
              {t('room.addDoor')}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btnGhost"
              onClick={onDrawWalls}
              disabled={isDrawingWalls}
            >
              {t('room.drawWalls')}
            </button>
            {isDrawingWalls && (
              <button className="btnGhost" onClick={onFinishDrawing}>
                {t('room.finishDrawing')}
              </button>
            )}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {store.room.walls.length === 0 ? (
              <div>{t('room.noWalls')}</div>
            ) : (
              <ul>
                {store.room.walls.map((w, i) => (
                  <li key={i}>
                    {t('app.wallLabel', { num: i + 1, len: w.length })} – {w.angle}° –
                    <input
                      type="number"
                      value={w.thickness}
                      onChange={(e) =>
                        store.updateWall(i, {
                          thickness:
                            Number((e.target as HTMLInputElement).value) || 0,
                        })
                      }
                      style={{ width: 60, marginLeft: 4 }}
                    />
                    mm
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <RoomUploader three={three} />
      <SlidingPanel
        isOpen={isDrawingWalls}
        onClose={() => three.current?.exitTopDownMode?.()}
        className={`bottom ${isDrawingWalls ? 'open' : ''}`}
        locked
      >
        <div
          className="row"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <input
            className="input"
            type="number"
            value={wallLength}
            onChange={(e) =>
              setWallLength(Number((e.target as HTMLInputElement).value) || 0)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                three.current?.applyWallLength?.(wallLength);
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
                store.setSnapRightAngles(
                  !(e.target as HTMLInputElement).checked,
                )
              }
            />
            {t('room.noRightAngles')}
          </label>
        </div>
      </SlidingPanel>
    </>
  );
}
