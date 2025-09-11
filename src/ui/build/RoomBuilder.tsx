import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePlannerStore } from '../../state/store';
import type { Wall, WallOpening } from '../../types';
import uuid from '../../utils/uuid';

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
  const wallTool = usePlannerStore((s) => s.wallTool);
  const setWallTool = usePlannerStore((s) => s.setWallTool);
  const setIsRoomDrawing = usePlannerStore((s) => s.setIsRoomDrawing);
  const snapAngle = usePlannerStore((s) => s.snapAngle);
  const snapLength = usePlannerStore((s) => s.snapLength);
  const snapRightAngles = usePlannerStore((s) => s.snapRightAngles);
  const measurementUnit = usePlannerStore((s) => s.measurementUnit);
  const groupRef = useRef<THREE.Group | null>(null);
  const roomRef = useRef(room);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<THREE.Mesh | null>(null);
  const wallPreviewRef = useRef<THREE.Mesh | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const lengthRef = useRef(0);
  const inputRef = useRef('');
  const dirRef = useRef({ dx: 1, dy: 0 });

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

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
    for (const c of [...g.children]) {
      if (!c || !(c instanceof THREE.Object3D)) continue;
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
      const geom = new THREE.BoxGeometry(
        len,
        w.height || wallHeight,
        w.thickness,
      );
      const mat = new THREE.MeshStandardMaterial({
        color: w.color || '#ffffff',
      });
      const mesh = new THREE.Mesh(geom, mat);
      const midx = (w.start.x + w.end.x) / 2;
      const midy = (w.start.y + w.end.y) / 2;
      mesh.position.set(midx, (w.height || wallHeight) / 2, midy);
      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      mesh.rotation.y = -angle;
      mesh.userData.wallId = w.id;
      g.add(mesh);

      const createHandle = (
        p: { x: number; y: number },
        handle: 'start' | 'end' | 'mid',
      ) => {
        const hGeom = new THREE.SphereGeometry(0.05, 16, 16);
        const hMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const hMesh = new THREE.Mesh(hGeom, hMat);
        hMesh.position.set(p.x, (w.height || wallHeight) / 2, p.y);
        hMesh.userData = { wallId: w.id, handle };
        g.add(hMesh);
      };
      createHandle(w.start, 'start');
      createHandle(w.end, 'end');
      createHandle({ x: midx, y: midy }, 'mid');
    });
    // helper to draw openings (windows/doors)
    const drawOpening = (op: WallOpening, color: number) => {
      const wall = room.walls.find((w) => w.id === op.wallId);
      if (!wall) return;
      const len = Math.hypot(
        wall.end.x - wall.start.x,
        wall.end.y - wall.start.y,
      );
      const angle = Math.atan2(
        wall.end.y - wall.start.y,
        wall.end.x - wall.start.x,
      );
      const geom = new THREE.BoxGeometry(
        op.width,
        op.height,
        wall.thickness + 0.01,
      );
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

  useEffect(() => {
    const three = threeRef.current;
    if (!three || wallTool !== 'edit' || selectedTool) return;
    const dom: HTMLElement = three.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointer = new THREE.Vector2();
    let drag: { wallId: string; handle: 'start' | 'end' | 'mid' } | null = null;

    const getPoint = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, three.camera);
      const pos = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, pos);
      return { x: pos.x, y: pos.z };
    };

    const onDown = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, three.camera);
      const intersects = raycaster.intersectObjects(
        groupRef.current?.children || [],
        true,
      );
      const hit = intersects.find((i) => i.object.userData?.handle);
      if (!hit) return;
      drag = {
        wallId: hit.object.userData.wallId,
        handle: hit.object.userData.handle,
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const p = getPoint(e);
      setRoom(
        {
          walls: roomRef.current.walls.map((w) => {
            if (w.id !== drag!.wallId) return w;
            if (drag!.handle === 'start') {
              return { ...w, start: { x: p.x, y: p.y } };
            }
            if (drag!.handle === 'end') {
              return { ...w, end: { x: p.x, y: p.y } };
            }
            const midx = (w.start.x + w.end.x) / 2;
            const midy = (w.start.y + w.end.y) / 2;
            const dx = p.x - midx;
            const dy = p.y - midy;
            return {
              ...w,
              start: { x: w.start.x + dx, y: w.start.y + dy },
              end: { x: w.end.x + dx, y: w.end.y + dy },
            };
          }),
        },
        { pushHistory: false },
      );
    };

    const onUp = () => {
      if (drag) {
        setRoom(
          { walls: [...roomRef.current.walls] },
          { pushHistory: true },
        );
      }
      drag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [selectedTool, setRoom, threeRef, wallTool]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || wallTool !== 'draw') return;

    const size = selectedWall?.thickness ?? 0.1;
    const geom = new THREE.BoxGeometry(size, 0.01, size);
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      opacity: 0.5,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.005;
    wallPreviewRef.current = mesh;
    three.group.add(mesh);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const pos = new THREE.Vector3();

    const update = () => {
      three.camera.getWorldDirection(dir);
      raycaster.set(three.camera.position, dir);
      raycaster.ray.intersectPlane(plane, pos);
      mesh.position.set(pos.x, 0.005, pos.z);
      mesh.rotation.y = Math.atan2(dir.x, dir.z);
    };

    update();
    window.addEventListener('pointermove', update);

    return () => {
      window.removeEventListener('pointermove', update);
      if (wallPreviewRef.current) {
        three.group.remove(wallPreviewRef.current);
        wallPreviewRef.current.geometry.dispose();
        if (Array.isArray(wallPreviewRef.current.material)) {
          wallPreviewRef.current.material.forEach((m) => m.dispose());
        } else {
          wallPreviewRef.current.material.dispose();
        }
        wallPreviewRef.current = null;
      }
    };
  }, [wallTool, selectedWall?.thickness, threeRef]);

  const addWall = () => {
    const wallHeight = roomRef.current.height / 1000;
    const newWall: Wall = {
      id: uuid(),
      start: { x: 0, y: 0 },
      end: { x: 2, y: 0 },
      height: wallHeight,
      thickness: selectedWall?.thickness ?? 0.1,
      color: '#ffffff',
    };
    setRoom({ walls: [...roomRef.current.walls, newWall] });
  };

  const updateWallColor = (id: string, color: string) => {
    setRoom({
      walls: roomRef.current.walls.map((w) =>
        w.id === id ? { ...w, color } : w,
      ),
    });
  };

  const addWindow = (wallId: string) => {
    const wall = roomRef.current.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = Math.hypot(
      wall.end.x - wall.start.x,
      wall.end.y - wall.start.y,
    );
    const win: WallOpening = {
      id: uuid(),
      wallId,
      offset: len / 2,
      width: 1,
      height: 1,
      bottom: 1,
    };
    setRoom({ windows: [...roomRef.current.windows, win] });
  };

  const addDoor = (wallId: string) => {
    const wall = roomRef.current.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = Math.hypot(
      wall.end.x - wall.start.x,
      wall.end.y - wall.start.y,
    );
    const door: WallOpening = {
      id: uuid(),
      wallId,
      offset: len / 3,
      width: 0.9,
      height: 2,
      bottom: 0,
    };
    setRoom({ doors: [...roomRef.current.doors, door] });
  };

  useEffect(() => {
    const three = threeRef.current;
    if (!three || wallTool !== 'draw') return;
    const dom: HTMLElement = three.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointer = new THREE.Vector2();

    const getPoint = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, three.camera);
      const pos = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, pos);
      return { x: pos.x, y: pos.z };
    };

    const applySnap = (p: { x: number; y: number }) => {
      if (!startRef.current) return p;
      const { x: sx, y: sy } = startRef.current;
      const dx = p.x - sx;
      const dy = p.y - sy;
      let angle = Math.atan2(dy, dx);
      const rad = (snapAngle * Math.PI) / 180;
      if (rad > 0) {
        if (snapRightAngles && roomRef.current.walls.length > 0) {
          const last = roomRef.current.walls[roomRef.current.walls.length - 1];
          const lastAngle = Math.atan2(
            last.end.y - last.start.y,
            last.end.x - last.start.x,
          );
          angle = lastAngle + Math.round((angle - lastAngle) / rad) * rad;
        } else {
          angle = Math.round(angle / rad) * rad;
        }
      }
      let len = Math.hypot(dx, dy);
      if (snapLength > 0) len = Math.round(len / snapLength) * snapLength;
      return { x: sx + Math.cos(angle) * len, y: sy + Math.sin(angle) * len };
    };

    const updateLabel = (
      midx: number,
      wallHeight: number,
      midy: number,
      len: number,
    ) => {
      if (
        !labelRef.current ||
        !three.camera ||
        !(three.camera as any).projectionMatrix ||
        !(three.camera as any).matrixWorldInverse
      )
        return;
      const pos = new THREE.Vector3(midx, wallHeight, midy);
      pos.project(three.camera);
      const rect = dom.getBoundingClientRect();
      const x = rect.left + ((pos.x + 1) / 2) * rect.width;
      const y = rect.top + ((-pos.y + 1) / 2) * rect.height;
      labelRef.current.style.left = `${x}px`;
      labelRef.current.style.top = `${y}px`;
      const displayLen =
        measurementUnit === 'cm' ? len * 100 : len * 1000;
      labelRef.current.textContent = `${Math.round(displayLen)} ${measurementUnit}`;
      labelRef.current.style.display = 'block';
    };

    const updatePreview = (len: number) => {
      if (!startRef.current) return;
      const { x: sx, y: sy } = startRef.current;
      const wallHeight = room.height / 1000;
      let mesh = previewRef.current;
      if (!mesh) {
        const geom = new THREE.BoxGeometry(
          len,
          wallHeight,
          selectedWall?.thickness ?? 0.1,
        );
        const mat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          opacity: 0.5,
          transparent: true,
        });
        mesh = new THREE.Mesh(geom, mat);
        previewRef.current = mesh;
        mesh.position.y = wallHeight / 2;
        groupRef.current?.add(mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BoxGeometry(
          len,
          wallHeight,
          selectedWall?.thickness ?? 0.1,
        );
      }
      const { dx, dy } = dirRef.current;
      const midx = sx + (dx * len) / 2;
      const midy = sy + (dy * len) / 2;
      mesh.position.set(midx, wallHeight / 2, midy);
      const angle = Math.atan2(dy, dx);
      mesh.rotation.y = -angle;
      lengthRef.current = len;
      updateLabel(midx, wallHeight, midy, len);
    };

    function cleanup() {
      setIsRoomDrawing(false);
      if (previewRef.current) {
        groupRef.current?.remove(previewRef.current);
        previewRef.current.geometry.dispose();
        if (Array.isArray(previewRef.current.material))
          previewRef.current.material.forEach((m) => m.dispose());
        else previewRef.current.material.dispose();
        previewRef.current = null;
      }
      if (labelRef.current) {
        labelRef.current.style.display = 'none';
      }
      startRef.current = null;
      inputRef.current = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    }

    function finalize(end: { x: number; y: number }) {
      if (!startRef.current) return;
      const { x: sx, y: sy } = startRef.current;
      const dx = end.x - sx;
      const dy = end.y - sy;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        cleanup();
        return;
      }
      const wallHeight = room.height / 1000;
      const newWall: Wall = {
        id: uuid(),
        start: { x: sx, y: sy },
        end,
        height: wallHeight,
        thickness: selectedWall?.thickness ?? 0.1,
        color: '#ffffff',
      };
      setRoom({ walls: [...roomRef.current.walls, newWall] });
      cleanup();
    }

    function onMove(e: PointerEvent) {
      if (!startRef.current) return;
      const raw = getPoint(e);
      const end = applySnap(raw);
      const { x: sx, y: sy } = startRef.current;
      const dx = end.x - sx;
      const dy = end.y - sy;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dirRef.current = { dx: dx / len, dy: dy / len };
      }
      if (inputRef.current) updatePreview(lengthRef.current);
      else updatePreview(len);
    }

    function onUp(e: PointerEvent) {
      if (!startRef.current) return;
      const end = applySnap(getPoint(e));
      finalize(end);
    }

    function onKey(e: KeyboardEvent) {
      if (!startRef.current) return;
      if (e.key >= '0' && e.key <= '9') {
        inputRef.current += e.key;
        const len =
          parseFloat(inputRef.current) /
          (measurementUnit === 'cm' ? 100 : 1000);
        updatePreview(len);
      } else if (e.key === 'Enter') {
        const { x: sx, y: sy } = startRef.current;
        const { dx, dy } = dirRef.current;
        const len = lengthRef.current;
        const end = { x: sx + dx * len, y: sy + dy * len };
        finalize(end);
      } else if (e.key === 'Escape') {
        setWallTool('edit');
        setIsRoomDrawing(false);
        cleanup();
      }
    }

    const onDown = (e: PointerEvent) => {
      if (wallTool !== 'draw' || e.button !== 0) return;
      startRef.current = getPoint(e);
      inputRef.current = '';
      lengthRef.current = 0;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('keydown', onKey);
    };

    dom.addEventListener('pointerdown', onDown);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [
    room.height,
    wallTool,
    selectedWall?.thickness,
    setRoom,
    threeRef,
    snapAngle,
    snapLength,
    snapRightAngles,
    setWallTool,
    setIsRoomDrawing,
  ]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three || wallTool !== 'erase') return;
    const dom: HTMLElement = three.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, three.camera);
      const intersects = raycaster.intersectObjects(
        groupRef.current?.children || [],
        true,
      );
      const hit = intersects.find(
        (i) => i.object.userData?.wallId && !i.object.userData?.handle,
      );
      if (hit) {
        const id = hit.object.userData.wallId;
        setRoom({
          walls: roomRef.current.walls.filter((w) => w.id !== id),
        });
      }
    };

    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('pointerdown', onDown);
    };
  }, [wallTool, setRoom, threeRef]);

  useEffect(() => {
    if (!selectedTool) return;
    if (selectedTool === 'window') {
      const lastWall = room.walls[room.walls.length - 1];
      if (lastWall) {
        addWindow(lastWall.id);
        setSelectedTool(null);
      }
    } else if (selectedTool === 'door') {
      const lastWall = room.walls[room.walls.length - 1];
      if (lastWall) {
        addDoor(lastWall.id);
        setSelectedTool(null);
      }
    }
  }, [selectedTool, room.walls, setSelectedTool]);

  return (
    <>
      <div
        ref={labelRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          background: '#000',
          color: '#fff',
          padding: '2px 4px',
          borderRadius: 4,
          fontSize: 12,
          transform: 'translate(-50%, -50%)',
          display: 'none',
        }}
      />
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
    </>
  );
};

export default RoomBuilder;
