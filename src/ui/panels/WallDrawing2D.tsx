import React, { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../state/store';

type Pt = { x: number; y: number };

export default function WallDrawing2D({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const addWall = usePlannerStore((s) => s.addWall);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Pt[]>([{ x: 0, y: 0 }]);
  const [temp, setTemp] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState(false);
  const scale = 10; // mm per pixel

  const getPos = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    setDragging(true);
    setTemp(getPos(e));
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!dragging) return;
    setTemp(getPos(e));
  };
  const onMouseUp = () => {
    if (!dragging || !temp) return;
    const last = points[points.length - 1];
    const dx = temp.x - last.x;
    const dy = temp.y - last.y;
    const length = Math.sqrt(dx * dx + dy * dy) * scale;
    const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
    addWall({ length, angle });
    setPoints([...points, temp]);
    setDragging(false);
    setTemp(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    let prev = points[0];
    for (let i = 1; i < points.length; i += 1) {
      const p = points[i];
      ctx.beginPath();
      ctx.moveTo(originX + prev.x, originY + prev.y);
      ctx.lineTo(originX + p.x, originY + p.y);
      ctx.stroke();
      prev = p;
    }
    if (dragging && temp) {
      ctx.strokeStyle = '#3b82f6';
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(originX + last.x, originY + last.y);
      ctx.lineTo(originX + temp.x, originY + temp.y);
      ctx.stroke();
    }
  }, [points, temp, dragging]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ background: '#fff', cursor: 'crosshair' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
    </div>
  );
}

