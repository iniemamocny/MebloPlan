import React, { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../state/store';
import type { RoomShape, ShapePoint, Wall } from '../../types';

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

  const snap = (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : v);

  const getPoint = (e: React.PointerEvent): ShapePoint => {
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x: snap(x), y: snap(y) };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }
    // segments
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    roomShape.segments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
    });
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
  }, [roomShape, preview, gridSize, snapToGrid]);

  const onPointerDown = (e: React.PointerEvent) => {
    const p = getPoint(e);
    setStart(p);
    drawingRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    setPreview(p);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current || !start) return;
    const end = getPoint(e);
    const segment = { start, end };
    setRoomShape({
      points: [...roomShape.points, start, end],
      segments: [...roomShape.segments, segment],
    });
    drawingRef.current = false;
    setStart(null);
    setPreview(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ccc', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
};

export default RoomDrawBoard;

export const shapeToWalls = (
  shape: RoomShape,
  opts?: { height?: number; thickness?: number },
): Wall[] => {
  const { height = 2700, thickness = 0.1 } = opts || {};
  return shape.segments.map((seg, i) => ({
    id: `w${i}`,
    start: { ...seg.start },
    end: { ...seg.end },
    height,
    thickness,
  }));
};
