import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { usePlannerStore } from '../../state/store';

export default function RoomTab({
  three,
}: {
  three: React.MutableRefObject<any>;
}) {
  const store = usePlannerStore();
  const [len, setLen] = useState(3000);
  const [angle, setAngle] = useState(0);
  const [height, setHeight] = useState(store.room.height || 2700);
  useEffect(() => {
    store.setRoom({ height });
  }, [height]);
  useEffect(() => {
    const group = three.current?.group;
    if (!group) return;
    const toRemove = group.children.filter(
      (c: any) => c.userData?.kind === 'room',
    );
    toRemove.forEach((m: any) => {
      group.remove(m);
      (m as any).geometry?.dispose?.();
      Array.isArray((m as any).material)
        ? (m as any).material.forEach((mm: any) => mm.dispose())
        : (m as any).material?.dispose?.();
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
  const addWall = () =>
    store.addWall({ length: Number(len) || 0, angle: Number(angle) || 0 });
  const addWindow = () =>
    store.addOpening({
      type: 'window',
      wall: 0,
      offset: 500,
      width: 900,
      height: 1200,
      sill: 900,
    });
  const addDoor = () =>
    store.addOpening({
      type: 'door',
      wall: 0,
      offset: 100,
      width: 900,
      height: 2100,
    });
  return (
    <div className="section">
      <div className="hd">
        <div>
          <div className="h1">Pomieszczenie — ściany</div>
        </div>
      </div>
      <div className="bd">
        <div className="grid3">
          <div>
            <div className="small">Wysokość (mm)</div>
            <input
              className="input"
              type="number"
              step="1"
              value={height}
              onChange={(e) =>
                setHeight(Number((e.target as HTMLInputElement).value) || 0)
              }
            />
          </div>
          <div>
            <div className="small">Długość ściany (mm)</div>
            <input
              className="input"
              type="number"
              step="1"
              value={len}
              onChange={(e) =>
                setLen(Number((e.target as HTMLInputElement).value) || 0)
              }
            />
          </div>
          <div>
            <div className="small">Kąt (°)</div>
            <input
              className="input"
              type="number"
              step="1"
              value={angle}
              onChange={(e) =>
                setAngle(Number((e.target as HTMLInputElement).value) || 0)
              }
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={addWall}>
            Dodaj ścianę
          </button>
          <button className="btnGhost" onClick={addWindow}>
            Dodaj okno
          </button>
          <button className="btnGhost" onClick={addDoor}>
            Dodaj drzwi
          </button>
        </div>
      </div>
    </div>
  );
}
