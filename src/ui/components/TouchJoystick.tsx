import React, { useRef } from 'react';

interface Move {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface Props {
  onMove: (m: Move) => void;
}

const TouchJoystick: React.FC<Props> = ({ onMove }) => {
  const activeId = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const reset = () => {
    onMove({ forward: false, backward: false, left: false, right: false });
    activeId.current = null;
    start.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activeId.current = e.pointerId;
    start.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current || !start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    const t = 20;
    onMove({
      forward: dy < -t,
      backward: dy > t,
      left: dx < -t,
      right: dx > t,
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return;
    reset();
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          pointerEvents: 'auto',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default TouchJoystick;
