import React, { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../state/store';
import type { RoomShape, ShapePoint, ShapeSegment, Wall } from '../../types';
import uuid from '../../utils/uuid';
import { addSegmentToShape, removeSegmentFromShape } from '../../utils/roomShape';

interface Props {
  width?: number;
  height?: number;
}

const RoomDrawBoard: React.FC<Props> = ({ width = 600, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { roomShape, setRoomShape, gridSize, snapToGrid } = usePlannerStore();
  const [start, setStart] = useState<ShapePoint | null>(null);
  const [preview, setPreview] = useState<ShapePoint | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
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

  const snap = (v: number) =>
    snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const getPoint = (e: React.PointerEvent): ShapePoint => {
    const rect = (
      canvasRef.current as HTMLCanvasElement
    ).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x: snap(x), y: snap(y) };
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
  }, [roomShape, preview, gridSize, snapToGrid, selectedPoint, selectedSegment]);

  const onPointerDown = (e: React.PointerEvent) => {
    const p = getPoint(e);
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

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
      setSelectedSegment(seg);
      setSelectedPoint(null);
      movingSegmentRef.current = { segment: seg, last: p };
      pushHistory();
      return;
    }

    setSelectedPoint(null);
    setSelectedSegment(null);
    setStart(p);
    drawingRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (movingPointRef.current) {
      const p = getPoint(e);
      movingPointRef.current.x = p.x;
      movingPointRef.current.y = p.y;
      setRoomShape({
        points: [...roomShape.points],
        segments: [...roomShape.segments],
      });
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
      setRoomShape({
        points: [...roomShape.points],
        segments: [...roomShape.segments],
      });
      return;
    }
    if (!drawingRef.current) return;
    const p = getPoint(e);
    setPreview(p);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) {
      e.currentTarget.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
    if (movingPointRef.current) {
      movingPointRef.current = null;
      return;
    }
    if (movingSegmentRef.current) {
      movingSegmentRef.current = null;
      return;
    }
    if (!drawingRef.current || !start) {
      drawingRef.current = false;
      setStart(null);
      setPreview(null);
      return;
    }
    const end = getPoint(e);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance >= 1) {
      pushHistory();
      const segment = { start, end };
      setRoomShape(addSegmentToShape(roomShape, segment));
    }
    drawingRef.current = false;
    setStart(null);
    setPreview(null);
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
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' && e.ctrlKey) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'y' && e.ctrlKey) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteSelected]);

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <button onClick={undo} disabled={!history.length}>
          Undo
        </button>
        <button onClick={redo} disabled={!future.length}>
          Redo
        </button>
        {selectedSegment && (
          <button onClick={deleteSelected}>Delete</button>
        )}
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
    </div>
  );
};

export default RoomDrawBoard;

export const shapeToWalls = (
  shape: RoomShape,
  opts?: { height?: number; thickness?: number },
): Wall[] => {
  const { height = 2700, thickness = 0.1 } = opts || {};
  return shape.segments.map((seg) => ({
    id: uuid(),
    start: { ...seg.start },
    end: { ...seg.end },
    height,
    thickness,
  }));
};
