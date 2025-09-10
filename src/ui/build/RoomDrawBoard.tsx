import React, { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../state/store';
import type { RoomShape, ShapePoint, ShapeSegment } from '../../types';
import uuid from '../../utils/uuid';
import {
  addSegmentToShape,
  removeSegmentFromShape,
  pointsEqual,
  EPSILON,
} from '../../utils/roomShape';
import ItemHotbar, {
  hotbarItems,
  furnishHotbarItems,
  buildHotbarItems,
} from '../components/ItemHotbar';
import WallToolSelector from '../components/WallToolSelector';
import type { PlayerMode } from '../types';

interface Props {
  width?: number;
  height?: number;
  mode?: PlayerMode | null;
}

const RoomDrawBoard: React.FC<Props> = ({
  width = 600,
  height = 400,
  mode = 'build',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = usePlannerStore();
  const {
    roomShape,
    setRoomShape,
    gridSize,
    snapToGrid,
    snapAngle,
    snapLength,
    snapRightAngles,
    measurementUnit,
  } = store;
  const [start, setStart] = useState<ShapePoint | null>(null);
  const [preview, setPreview] = useState<ShapePoint | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pointerAngleRef = useRef(0);
  const inputRef = useRef('');
  const [selectedPoint, setSelectedPoint] = useState<ShapePoint | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<ShapeSegment | null>(
    null,
  );
  const [history, setHistory] = useState<RoomShape[]>([]);
  const [future, setFuture] = useState<RoomShape[]>([]);
  const movingPointRef = useRef<ShapePoint | null>(null);
  const movingSegmentRef = useRef<{
    segment: ShapeSegment;
    last: ShapePoint;
  } | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const formatLength = (len: number) =>
    measurementUnit === 'cm'
      ? `${Math.round(len / 10)} cm`
      : `${Math.round(len)} mm`;

  const updateLabel = (pos: ShapePoint, len: number, ang: number) => {
    if (!labelRef.current) return;
    const deg = (ang * 180) / Math.PI;
    labelRef.current.style.left = `${pos.x}px`;
    labelRef.current.style.top = `${pos.y}px`;
    labelRef.current.textContent = `${formatLength(len)} / ${Math.round(deg)}°`;
    labelRef.current.style.display = 'block';
  };

  const hideLabel = () => {
    if (labelRef.current) labelRef.current.style.display = 'none';
  };

  const items =
    mode === 'build'
      ? buildHotbarItems()
      : mode === 'furnish'
        ? furnishHotbarItems
        : hotbarItems;

  useEffect(() => {
    const tool = items[store.selectedItemSlot - 1];
    if (tool === 'wall' || tool === 'window' || tool === 'door') {
      if (store.selectedTool !== tool) store.setSelectedTool(tool);
    } else if (store.selectedTool) {
      store.setSelectedTool(null);
    }
  }, [items, store.selectedItemSlot, store.selectedTool, store]);

  useEffect(() => {
    if (!mode) return;

    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        return;
      }
      if (drawingRef.current) return;
      if (e.type === 'keydown') {
        const n = Number(e.key);
        if (n >= 1 && n <= 9) {
          store.setSelectedItemSlot(n);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [store, mode]);

  const snap = (v: number) =>
    snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const getPoint = (e: React.PointerEvent): ShapePoint => {
    const rect = (
      canvasRef.current as HTMLCanvasElement
    ).getBoundingClientRect();
    let x = snap(e.clientX - rect.left);
    let y = snap(e.clientY - rect.top);
    if (drawingRef.current && start) {
      const dx = x - start.x;
      const dy = y - start.y;
      let angle = Math.atan2(dy, dx);
      const rad = (snapAngle * Math.PI) / 180;
      if (rad > 0) {
        if (snapRightAngles && roomShape.segments.length > 0) {
          const last = roomShape.segments[roomShape.segments.length - 1];
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
      x = start.x + Math.cos(angle) * len;
      y = start.y + Math.sin(angle) * len;
    }
    return { x, y };
  };

  const cloneShape = (shape: RoomShape): RoomShape => ({
    points: shape.points.map((p) => ({ ...p })),
    segments: shape.segments.map((s) => ({
      start: { ...s.start },
      end: { ...s.end },
    })),
  });

  const pushHistory = () => {
    setHistory((h) => [...h, cloneShape(roomShape)]);
    setFuture([]);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [cloneShape(roomShape), ...f]);
      setRoomShape(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, cloneShape(roomShape)]);
      setRoomShape(next);
      return f.slice(1);
    });
  };

  const deleteSelected = () => {
    if (!selectedSegment) return;
    pushHistory();
    setRoomShape(removeSegmentFromShape(roomShape, selectedSegment));
    setSelectedSegment(null);
    setSelectedPoint(null);
  };

  const pointAt = (p: ShapePoint): ShapePoint | null =>
    roomShape.points.find((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) <= 5) ||
    null;

  const segmentAt = (p: ShapePoint): ShapeSegment | null => {
    const distToSeg = (seg: ShapeSegment) => {
      const { start, end } = seg;
      const A = p.x - start.x;
      const B = p.y - start.y;
      const C = end.x - start.x;
      const D = end.y - start.y;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      let xx, yy;
      if (param < 0) {
        xx = start.x;
        yy = start.y;
      } else if (param > 1) {
        xx = end.x;
        yy = end.y;
      } else {
        xx = start.x + param * C;
        yy = start.y + param * D;
      }
      const dx = p.x - xx;
      const dy = p.y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };
    return roomShape.segments.find((seg) => distToSeg(seg) <= 5) || null;
  };

  const mergePointIfNeeded = (pt: ShapePoint): ShapePoint[] => {
    const match = roomShape.points.find(
      (p) => p !== pt && pointsEqual(p, pt, EPSILON),
    );
    if (!match) return roomShape.points;
    roomShape.segments.forEach((seg) => {
      if (seg.start === pt) seg.start = match;
      if (seg.end === pt) seg.end = match;
    });
    if (selectedPoint === pt) setSelectedPoint(match);
    movingPointRef.current = match;
    return roomShape.points.filter((p) => p !== pt);
  };

  const parseInput = (str: string) => {
    const cleaned = str.replace(/°/g, '').trim();
    const [lenStr, angleStr] = cleaned.split(/\s+/);
    const raw = parseFloat(lenStr);
    const length = measurementUnit === 'cm' ? raw * 10 : raw;
    let angle: number | undefined = undefined;
    if (angleStr !== undefined) {
      const a = parseFloat(angleStr);
      if (!isNaN(a)) angle = a;
    }
    return { length, angle };
  };

  const updatePreviewFromInput = () => {
    if (!start) return;
    const { length, angle } = parseInput(inputRef.current);
    if (isNaN(length)) {
      hideLabel();
      return;
    }
    const ang =
      angle !== undefined
        ? (angle * Math.PI) / 180
        : pointerAngleRef.current;
    const end = {
      x: start.x + Math.cos(ang) * length,
      y: start.y + Math.sin(ang) * length,
    };
    setPreview(end);
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    updateLabel(end, len, Math.atan2(end.y - start.y, end.x - start.x));
  };

  const finalizeSegment = (end: ShapePoint) => {
    if (!start) return;
    if (pointerIdRef.current !== null) {
      canvasRef.current?.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance >= 1) {
      pushHistory();
      const segment = { start, end };
      setRoomShape(addSegmentToShape(roomShape, segment));
    }
    drawingRef.current = false;
    setStart(null);
    setPreview(null);
    inputRef.current = '';
    hideLabel();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;
    if (typeof ctx.scale === 'function') {
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }
    // segments
    ctx.lineWidth = 2;
    roomShape.segments.forEach((seg) => {
      ctx.beginPath();
      ctx.strokeStyle = seg === selectedSegment ? '#f00' : '#000';
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
    });
    // selected point
    if (selectedPoint) {
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.arc(selectedPoint.x, selectedPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // preview
    if (drawingRef.current && start && preview) {
      ctx.strokeStyle = '#888';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(preview.x, preview.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    draw();
  }, [
    roomShape,
    preview,
    gridSize,
    snapToGrid,
    selectedPoint,
    selectedSegment,
  ]);

  useEffect(() => {
    if (drawingRef.current && start && preview) {
      const len = Math.hypot(preview.x - start.x, preview.y - start.y);
      const ang = Math.atan2(preview.y - start.y, preview.x - start.x);
      updateLabel(preview, len, ang);
    }
  }, [preview, start, measurementUnit]);

  const onPointerDown = (e: React.PointerEvent) => {
    hideLabel();
    const p = getPoint(e);
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const tool = store.selectedTool;
    const itemType = items[store.selectedItemSlot - 1];
    if (tool !== 'wall') {
      if (
        itemType &&
        itemType !== 'wall' &&
        itemType !== 'window' &&
        itemType !== 'door'
      ) {
        store.addItem({
          id: uuid(),
          type: itemType,
          position: [p.x, 0, p.y],
          rotation: [0, 0, 0],
        });
      }
      return;
    }

    const pt = pointAt(p);
    if (pt) {
      setSelectedPoint(pt);
      setSelectedSegment(null);
      movingPointRef.current = pt;
      pushHistory();
      return;
    }
    const seg = segmentAt(p);
    if (seg) {
      if (e.altKey || e.detail > 1) {
        pushHistory();
        const newPoint: ShapePoint = { id: uuid(), x: p.x, y: p.y };
        const segments = roomShape.segments.flatMap((s) =>
          s === seg
            ? [
                { start: seg.start, end: newPoint },
                { start: newPoint, end: seg.end },
              ]
            : [s],
        );
        setRoomShape({ points: [...roomShape.points, newPoint], segments });
        setSelectedPoint(newPoint);
        setSelectedSegment(null);
      } else {
        setSelectedSegment(seg);
        setSelectedPoint(null);
        movingSegmentRef.current = { segment: seg, last: p };
        pushHistory();
      }
      return;
    }

    setSelectedPoint(null);
    setSelectedSegment(null);
    setStart(p);
    drawingRef.current = true;
    pointerAngleRef.current = 0;
    inputRef.current = '';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (movingPointRef.current) {
      const p = getPoint(e);
      movingPointRef.current.x = p.x;
      movingPointRef.current.y = p.y;
      const points = mergePointIfNeeded(movingPointRef.current);
      setRoomShape(
        {
          points: [...points],
          segments: [...roomShape.segments],
        },
        { pushHistory: false },
      );
      return;
    }
    if (movingSegmentRef.current) {
      const p = getPoint(e);
      const { segment, last } = movingSegmentRef.current;
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      segment.start.x += dx;
      segment.start.y += dy;
      segment.end.x += dx;
      segment.end.y += dy;
      movingSegmentRef.current.last = p;
      setRoomShape(
        {
          points: [...roomShape.points],
          segments: [...roomShape.segments],
        },
        { pushHistory: false },
      );
      return;
    }
    if (!drawingRef.current || !start) {
      hideLabel();
      return;
    }
    const p = getPoint(e);
    pointerAngleRef.current = Math.atan2(p.y - start.y, p.x - start.x);
    const len = Math.hypot(p.x - start.x, p.y - start.y);
    if (inputRef.current) inputRef.current = '';
    setPreview(p);
    updateLabel(p, len, pointerAngleRef.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) {
      e.currentTarget.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
    if (movingPointRef.current) {
      const points = mergePointIfNeeded(movingPointRef.current);
      setRoomShape(
        {
          points: [...points],
          segments: [...roomShape.segments],
        },
        { pushHistory: true },
      );
      movingPointRef.current = null;
      return;
    }
    if (movingSegmentRef.current) {
      setRoomShape(
        {
          points: [...roomShape.points],
          segments: [...roomShape.segments],
        },
        { pushHistory: true },
      );
      movingSegmentRef.current = null;
      return;
    }
    if (!drawingRef.current || !start) {
      drawingRef.current = false;
      setStart(null);
      setPreview(null);
      inputRef.current = '';
      hideLabel();
      return;
    }
    const end = getPoint(e);
    finalizeSegment(end);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) {
      e.currentTarget.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
    movingPointRef.current = null;
    movingSegmentRef.current = null;
    drawingRef.current = false;
    setStart(null);
    setPreview(null);
    inputRef.current = '';
    hideLabel();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!drawingRef.current || !start) return;
      if (e.key === 'Enter') {
        if (!inputRef.current) return;
        e.preventDefault();
        const { length, angle } = parseInput(inputRef.current);
        if (isNaN(length)) return;
        const ang =
          angle !== undefined
            ? (angle * Math.PI) / 180
            : pointerAngleRef.current;
        const end = {
          x: start.x + Math.cos(ang) * length,
          y: start.y + Math.sin(ang) * length,
        };
        finalizeSegment(end);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        inputRef.current = inputRef.current.slice(0, -1);
        updatePreviewFromInput();
      } else if (/^[0-9]$/.test(e.key) || e.key === ' ' || e.key === '°') {
        e.preventDefault();
        inputRef.current += e.key;
        updatePreviewFromInput();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [start, roomShape]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (history.length > 0) {
          if (e.shiftKey) redo();
          else undo();
        } else {
          if (e.shiftKey) store.redo();
          else store.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (future.length > 0) redo();
        else store.redo();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteSelected, history.length, future.length, store]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: 4 }}>
        <button onClick={undo} disabled={!history.length}>
          Undo
        </button>
        <button onClick={redo} disabled={!future.length}>
          Redo
        </button>
        {selectedSegment && <button onClick={deleteSelected}>Delete</button>}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      <div
        ref={labelRef}
        data-testid="draw-label"
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
      {mode === 'build' && <WallToolSelector />}
      {mode && <ItemHotbar mode={mode} />}
    </div>
  );
};

export default RoomDrawBoard;
