import React, { useRef, useState } from 'react';

interface Props {
  onMove: (x: number, y: number, active: boolean) => void;
  style?: React.CSSProperties;
}

const TouchJoystick: React.FC<Props> = ({ onMove, style }) => {
  const active = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const radius = 40;
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const reset = () => {
    setPos({ x: 0, y: 0 });
    onMove(0, 0, false);
    active.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    active.current = e.pointerId;
    start.current = { x: e.clientX, y: e.clientY };
    onMove(0, 0, true);
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (active.current !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const clampedLen = Math.min(len, radius);
    const nx = len === 0 ? 0 : (dx / len) * clampedLen;
    const ny = len === 0 ? 0 : (dy / len) * clampedLen;
    setPos({ x: nx, y: ny });
    onMove(nx / radius, ny / radius, true);
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (active.current !== e.pointerId) return;
    reset();
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        border: '2px solid #999',
        touchAction: 'none',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{
          position: 'absolute',
          left: radius + pos.x - 20,
          top: radius + pos.y - 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          background: '#ccc',
        }}
      />
    </div>
  );
};

export default TouchJoystick;
