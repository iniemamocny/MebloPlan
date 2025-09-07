import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import RoomUploader from '../RoomUploader';
import { createWallGeometry } from '../../viewer/wall';
import { Opening } from '../../types';

interface RoomTabProps {
  three: React.MutableRefObject<any>;
  isDrawingWalls: boolean;
  setWallPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RoomTab({
  three,
  isDrawingWalls,
  setWallPanelOpen,
}: RoomTabProps) {
  const store = usePlannerStore();
  const { t } = useTranslation();
  const onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setRoom({
      height: Number((e.target as HTMLInputElement).value) || 0,
    });
  };
  const [opening, setOpening] = useState<Omit<Opening, 'id'>>({
    wallId: '',
    offset: 0,
    width: 0,
    height: 0,
    bottom: 0,
    kind: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    if (!opening.wallId && store.room.walls[0]) {
      setOpening((o) => ({ ...o, wallId: store.room.walls[0].id }));
    }
  }, [store.room.walls]);
  const onAddOpening = () => {
    if (!opening.wallId) return;
    const data = {
      wallId: opening.wallId,
      offset: Number(opening.offset) || 0,
      width: Number(opening.width) || 0,
      height: Number(opening.height) || 0,
      bottom: Number(opening.bottom) || 0,
      kind: Number(opening.kind) || 0,
    };
    if (editingId) {
      store.updateOpening(editingId, data);
      setEditingId(null);
    } else {
      store.addOpening(data);
    }
    setOpening({
      wallId: store.room.walls[0]?.id || '',
      offset: 0,
      width: 0,
      height: 0,
      bottom: 0,
      kind: 0,
    });
  };
  const onDrawWalls = () => {
    setWallPanelOpen(true);
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
    const h = store.room.height || 2700;
    store.room.walls.forEach((w) => {
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
      const geom = createWallGeometry(
        w.length || 0,
        h,
        w.thickness || 0,
        store.room.openings.filter((o) => o.wallId === w.id),
      );
      const box = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({ color: 0xd1d5db }),
      );
      box.position.set(mid.x, h / 2000, mid.y);
      box.rotation.y = -ang;
      (box as any).userData.kind = 'room';
      group.add(box);
      cursor = next;
    });
  }, [store.room.walls, store.room.height, store.room.openings, three]);
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
            <div>
              <div className="small">Type</div>
              <select
                className="input"
                value={opening.kind}
                onChange={(e) =>
                  setOpening({ ...opening, kind: Number((e.target as HTMLSelectElement).value) })
                }
              >
                <option value={0}>{t('room.addWindow')}</option>
                <option value={1}>{t('room.addDoor')}</option>
              </select>
            </div>
            <div>
              <div className="small">Wall</div>
              <select
                className="input"
                value={opening.wallId}
                onChange={(e) =>
                  setOpening({ ...opening, wallId: (e.target as HTMLSelectElement).value })
                }
              >
                {store.room.walls.map((w, i) => (
                  <option key={w.id} value={w.id}>
                    {t('app.wallLabel', { num: i + 1, len: w.length })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="small">Offset</div>
              <input
                className="input"
                type="number"
                value={opening.offset}
                onChange={(e) =>
                  setOpening({ ...opening, offset: Number((e.target as HTMLInputElement).value) })
                }
                style={{ width: 60 }}
              />
            </div>
            <div>
              <div className="small">Width</div>
              <input
                className="input"
                type="number"
                value={opening.width}
                onChange={(e) =>
                  setOpening({ ...opening, width: Number((e.target as HTMLInputElement).value) })
                }
                style={{ width: 60 }}
              />
            </div>
            <div>
              <div className="small">Height</div>
              <input
                className="input"
                type="number"
                value={opening.height}
                onChange={(e) =>
                  setOpening({ ...opening, height: Number((e.target as HTMLInputElement).value) })
                }
                style={{ width: 60 }}
              />
            </div>
            <div>
              <div className="small">Bottom</div>
              <input
                className="input"
                type="number"
                value={opening.bottom}
                onChange={(e) =>
                  setOpening({ ...opening, bottom: Number((e.target as HTMLInputElement).value) })
                }
                style={{ width: 60 }}
              />
            </div>
            <button className="btnGhost" onClick={onAddOpening} disabled={!opening.wallId}>
              {editingId ? 'Save opening' : 'Add opening'}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {store.room.openings.length === 0 ? (
              <div>No openings</div>
            ) : (
              <ul>
                {store.room.openings.map((o, i) => (
                  <li key={o.id}>
                    {(o.kind === 0 ? t('room.addWindow') : t('room.addDoor'))}{' '}
                    - {o.width}x{o.height}mm - {o.offset}mm
                    <button
                      className="btnGhost"
                      style={{ marginLeft: 4 }}
                      onClick={() => {
                        setEditingId(o.id);
                        setOpening({
                          wallId: o.wallId,
                          offset: o.offset,
                          width: o.width,
                          height: o.height,
                          bottom: o.bottom,
                          kind: o.kind,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btnGhost"
                      style={{ marginLeft: 4 }}
                      onClick={() => store.removeOpening(o.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btnGhost"
              onClick={onDrawWalls}
              disabled={isDrawingWalls}
            >
              {t('room.drawWalls')}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {store.room.walls.length === 0 ? (
              <div>{t('room.noWalls')}</div>
            ) : (
                <ul>
                  {store.room.walls.map((w, i) => (
                    <li key={w.id}>
                      {t('app.wallLabel', { num: i + 1, len: w.length })} – {w.angle}° –
                      <input
                        type="number"
                        value={w.thickness}
                        onChange={(e) =>
                          store.updateWall(w.id, {
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
    </>
  );
}
