import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import RoomUploader from '../RoomUploader';

export default function RoomTab({
  three,
}: {
  three: React.MutableRefObject<any>;
}) {
  const store = usePlannerStore();
  const { t } = useTranslation();
  const [isDrawingWalls, setIsDrawingWalls] = useState(false);
  const onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setRoom({ height: Number((e.target as HTMLInputElement).value) || 0 });
  };
  const onAddWindow = () => store.addOpening({ kind: 0 });
  const onAddDoor = () => store.addOpening({ kind: 1 });
  const onDrawWalls = () => {
    three.current?.enterTopDownMode?.();
    setIsDrawingWalls(true);
  };
  const onFinishDrawing = () => {
    three.current?.exitTopDownMode?.();
    setIsDrawingWalls(false);
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
    let cursor = new THREE.Vector2(0, 0);
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
        new THREE.BoxGeometry(len, h, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db }),
      );
      box.position.set(mid.x, h / 2, mid.y);
      box.rotation.y = -ang;
      (box as any).userData.kind = 'room';
      group.add(box);
      cursor = next;
    });
  }, [store.room, three]);
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
        </div>
      </div>
      <RoomUploader three={three} />
    </>
  );
}
