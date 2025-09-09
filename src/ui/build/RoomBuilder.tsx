import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePlannerStore } from '../../state/store';
import type { Wall, WallOpening } from '../../types';

interface Props {
  threeRef: React.MutableRefObject<any>;
}

/**
 * Simple room builder that draws walls, windows and doors based on the
 * `room` structure in the store. Allows basic editing such as adding walls
 * and changing wall colors.
 */
const RoomBuilder: React.FC<Props> = ({ threeRef }) => {
  const room = usePlannerStore((s) => s.room);
  const setRoom = usePlannerStore((s) => s.setRoom);
  const selectedTool = usePlannerStore((s) => s.selectedTool);
  const selectedWall = usePlannerStore((s) => s.selectedWall);
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);
  const groupRef = useRef<THREE.Group | null>(null);
  const previewRef = useRef<THREE.Mesh | null>(null);

  // draw room elements whenever data changes
  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    if (!groupRef.current) {
      groupRef.current = new THREE.Group();
      groupRef.current.userData.kind = 'room';
      three.group.add(groupRef.current);
    }
    const g = groupRef.current;
    // clear previous meshes
    while (g.children.length > 0) {
      const c = g.children.pop() as THREE.Object3D;
      g.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    const wallHeight = room.height / 1000;
    // draw walls
    room.walls.forEach((w) => {
      const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
      const geom = new THREE.BoxGeometry(len, w.height || wallHeight, w.thickness);
      const mat = new THREE.MeshStandardMaterial({ color: w.color || '#ffffff' });
      const mesh = new THREE.Mesh(geom, mat);
      const midx = (w.start.x + w.end.x) / 2;
      const midy = (w.start.y + w.end.y) / 2;
      mesh.position.set(midx, (w.height || wallHeight) / 2, midy);
      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      mesh.rotation.y = -angle;
      mesh.userData.wallId = w.id;
      g.add(mesh);
    });
    // helper to draw openings (windows/doors)
    const drawOpening = (op: WallOpening, color: number) => {
      const wall = room.walls.find((w) => w.id === op.wallId);
      if (!wall) return;
      const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const geom = new THREE.BoxGeometry(op.width, op.height, wall.thickness + 0.01);
      const mat = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geom, mat);
      const ratio = op.offset / len;
      const px = wall.start.x + (wall.end.x - wall.start.x) * ratio;
      const py = wall.start.y + (wall.end.y - wall.start.y) * ratio;
      mesh.position.set(px, op.bottom + op.height / 2, py);
      mesh.rotation.y = -angle;
      g.add(mesh);
    };
    room.windows.forEach((w) => drawOpening(w, 0x87cefa));
    room.doors.forEach((d) => drawOpening(d, 0x8b4513));
  }, [room, threeRef]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      const three = threeRef.current;
      if (three && groupRef.current) {
        three.group.remove(groupRef.current);
      }
    };
  }, [threeRef]);

  const addWall = () => {
    const wallHeight = room.height / 1000;
    const newWall: Wall = {
      id: Math.random().toString(36).slice(2),
      start: { x: 0, y: 0 },
      end: { x: 2, y: 0 },
      height: wallHeight,
      thickness: 0.1,
      color: '#ffffff',
    };
    setRoom({ walls: [...room.walls, newWall] });
  };

  const updateWallColor = (id: string, color: string) => {
    setRoom({ walls: room.walls.map((w) => (w.id === id ? { ...w, color } : w)) });
  };

  const addWindow = (wallId: string) => {
    const wall = room.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const win: WallOpening = {
      id: Math.random().toString(36).slice(2),
      wallId,
      offset: len / 2,
      width: 1,
      height: 1,
      bottom: 1,
    };
    setRoom({ windows: [...room.windows, win] });
  };

  const addDoor = (wallId: string) => {
    const wall = room.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const door: WallOpening = {
      id: Math.random().toString(36).slice(2),
      wallId,
      offset: len / 3,
      width: 0.9,
      height: 2,
      bottom: 0,
    };
    setRoom({ doors: [...room.doors, door] });
  };

  useEffect(() => {
    if (!selectedTool) return;
    if (selectedTool === 'wall') {
      addWall();
      setSelectedTool(null);
    } else if (selectedTool === 'window') {
      const lastWall = room.walls[room.walls.length - 1];
      if (lastWall) addWindow(lastWall.id);
      setSelectedTool(null);
    } else if (selectedTool === 'door') {
      const lastWall = room.walls[room.walls.length - 1];
      if (lastWall) addDoor(lastWall.id);
      setSelectedTool(null);
    }
  }, [selectedTool]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.camera || !three.group) return;
    const camera = three.camera as THREE.PerspectiveCamera;
    const group = three.group as THREE.Group;

    if (selectedTool === 'bearingWall' || selectedTool === 'partitionWall') {
      if (!selectedWall?.thickness) return;

      if (!previewRef.current) {
        const geom = new THREE.PlaneGeometry(
          selectedWall.thickness,
          selectedWall.thickness,
        );
        const mat = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        previewRef.current = mesh;
      }

      let animId: number;
      const update = () => {
        if (!previewRef.current) return;
        const origin = camera.getWorldPosition(new THREE.Vector3());
        const dir = camera.getWorldDirection(new THREE.Vector3());
        const denom = dir.y;
        if (denom !== 0) {
          const t = -origin.y / denom;
          const pos = origin.add(dir.multiplyScalar(t));
          previewRef.current.position.set(pos.x, 0.001, pos.z);
        }
        animId = requestAnimationFrame(update);
      };
      update();

      return () => {
        cancelAnimationFrame(animId);
        if (previewRef.current) {
          group.remove(previewRef.current);
          previewRef.current.geometry.dispose();
          (previewRef.current.material as THREE.Material).dispose();
          previewRef.current = null;
        }
      };
    }

    if (previewRef.current) {
      group.remove(previewRef.current);
      previewRef.current.geometry.dispose();
      (previewRef.current.material as THREE.Material).dispose();
      previewRef.current = null;
    }
  }, [selectedTool, selectedWall, threeRef]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: '#fff',
        padding: 8,
        borderRadius: 4,
      }}
    >
      <button className="btnGhost" onClick={addWall}>
        Dodaj ścianę
      </button>
      {room.walls.map((w) => (
        <div key={w.id} style={{ marginTop: 4 }}>
          <span>Ściana</span>
          <input
            type="color"
            value={w.color || '#ffffff'}
            onChange={(e) => updateWallColor(w.id, e.target.value)}
            style={{ marginLeft: 4 }}
          />
          <button
            className="btnGhost"
            style={{ marginLeft: 4 }}
            onClick={() => addWindow(w.id)}
          >
            +Okno
          </button>
          <button
            className="btnGhost"
            style={{ marginLeft: 4 }}
            onClick={() => addDoor(w.id)}
          >
            +Drzwi
          </button>
        </div>
      ))}
    </div>
  );
};

export default RoomBuilder;
