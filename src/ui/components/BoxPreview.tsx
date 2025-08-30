import React from 'react';

export default function BoxPreview({
  w,
  h,
  gaps,
  splits,
}: {
  w: number;
  h: number;
  gaps: { left: number; right: number; top: number; bottom: number };
  splits?: { vertical?: boolean; horizontal?: boolean };
}) {
  const W = 180;
  const H = 120;
  const gxL = (gaps?.left || 2) / 4;
  const gxR = (gaps?.right || 2) / 4;
  const gyT = (gaps?.top || 2) / 4;
  const gyB = (gaps?.bottom || 2) / 4;
  return (
    <svg width={W} height={H}>
      <rect
        x={1}
        y={1}
        width={W - 2}
        height={H - 2}
        rx={6}
        ry={6}
        fill="#fff"
        stroke="#e5e7eb"
      />
      <rect
        x={8}
        y={8}
        width={W - 16}
        height={H - 16}
        fill="#f9fafb"
        stroke="#d1d5db"
      />
      <rect
        x={8 + gxL}
        y={8 + gyT}
        width={W - 16 - gxL - gxR}
        height={H - 16 - gyT - gyB}
        fill="#e5e7eb"
      />
      {splits?.vertical && (
        <line
          x1={W / 2}
          y1={8 + gyT}
          x2={W / 2}
          y2={H - 8 - gyB}
          stroke="#fff"
          strokeWidth={2}
        />
      )}
      {splits?.horizontal && (
        <line
          x1={8 + gxL}
          y1={H / 2}
          x2={W - 8 - gxR}
          y2={H / 2}
          stroke="#fff"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
