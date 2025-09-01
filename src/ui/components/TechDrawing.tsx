import React, { useMemo, useState } from 'react';

type Gaps = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  between: number;
};
type Props = {
  mode: 'view' | 'edit';
  widthMM: number;
  heightMM: number;
  depthMM: number;
  boardType?: string;
  gaps: Gaps;
  doorsCount: number;
  drawersCount: number;
  drawerFronts?: number[];
  dividerPosition?: 'left' | 'right' | 'center';
  onChangeGaps?: (g: Gaps) => void;
  onChangeDrawerFronts?: (arr: number[]) => void;
  edgeBanding?: {
    length: boolean;
    width: boolean;
  };
};

function parseThickness(boardType?: string) {
  const m = boardType?.match(/(\d+)(?=\s*mm)/i);
  return m ? Number(m[1]) : 18;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function DimH({
  x1,
  y,
  x2,
  label,
}: {
  x1: number;
  y: number;
  x2: number;
  label: string;
}) {
  const arrow = 4;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#111" strokeWidth={1} />
      <polyline
        points={`${x1},${y} ${x1 + arrow},${y - arrow} ${x1 + arrow},${y + arrow}`}
        fill="#111"
      />
      <polyline
        points={`${x2},${y} ${x2 - arrow},${y - arrow} ${x2 - arrow},${y + arrow}`}
        fill="#111"
      />
      <text
        x={(x1 + x2) / 2}
        y={y - 6}
        fontSize="11"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#111"
      >
        {label}
      </text>
    </g>
  );
}
function DimV({
  x,
  y1,
  y2,
  label,
  left = false,
}: {
  x: number;
  y1: number;
  y2: number;
  label: string;
  left?: boolean;
}) {
  const arrow = 4;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#111" strokeWidth={1} />
      <polyline
        points={`${x},${y1} ${x - arrow},${y1 + arrow} ${x + arrow},${y1 + arrow}`}
        fill="#111"
      />
      <polyline
        points={`${x},${y2} ${x - arrow},${y2 - arrow} ${x + arrow},${y2 - arrow}`}
        fill="#111"
      />
      <text
        x={left ? x - 8 : x + 8}
        y={(y1 + y2) / 2}
        fontSize="11"
        textAnchor={left ? 'end' : 'start'}
        dominantBaseline="middle"
        fill="#111"
      >
        {label}
      </text>
    </g>
  );
}

export default function TechDrawing({
  mode,
  widthMM,
  heightMM,
  depthMM,
  boardType,
  gaps,
  doorsCount,
  drawersCount,
  drawerFronts,
  dividerPosition,
  onChangeGaps,
  onChangeDrawerFronts,
  edgeBanding,
}: Props) {
  const W = 360,
    H = 230;
  const pad = 14;
  const t = parseThickness(boardType);
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;
  const [drag, setDrag] = useState<{
    tag: string;
    startY: number;
    startVals: any;
  } | null>(null);

  const front = useMemo(() => {
    const x = pad + (gaps.left / widthMM) * innerW;
    const y = pad + (gaps.top / heightMM) * innerH;
    const w = innerW - ((gaps.left + gaps.right) / widthMM) * innerW;
    const h = innerH - ((gaps.top + gaps.bottom) / heightMM) * innerH;
    return { x, y, w, h };
  }, [gaps, widthMM, heightMM]);

  const drawerSplits = useMemo(() => {
    if (drawersCount <= 1) return [];
    const availFrontH = heightMM - (gaps.top + gaps.bottom);
    const arr =
      drawerFronts && drawerFronts.length === drawersCount
        ? drawerFronts
        : Array.from({ length: drawersCount }, () =>
            Math.floor(availFrontH / drawersCount),
          );
    const sum = arr.reduce((a, b) => a + b, 0);
    const pxPerMM = front.h / Math.max(1, sum);
    let cum = 0;
    const ys: number[] = [];
    for (let i = 0; i < drawersCount - 1; i++) {
      cum += arr[i];
      ys.push(front.y + cum * pxPerMM);
    }
    return ys;
  }, [drawersCount, drawerFronts, gaps, heightMM, front.h, front.y]);

  const doorSplits = useMemo(() => {
    if (doorsCount <= 1) return [];
    const step = front.w / doorsCount;
    const xs: number[] = [];
    for (let i = 1; i < doorsCount; i++) {
      xs.push(front.x + step * i);
    }
    return xs;
  }, [doorsCount, front.w, front.x]);

  const dividerX = useMemo(() => {
    if (!dividerPosition || doorsCount < 3) return null
    if (dividerPosition === 'center') return front.x + front.w / 2
    const step = front.w / doorsCount
    return dividerPosition === 'left'
      ? front.x + step
      : front.x + front.w - step
  }, [dividerPosition, doorsCount, front.x, front.w])

  const dividerSectionX = useMemo(() => {
    if (!dividerPosition || doorsCount < 3) return null
    const avail = innerW - 20
    let ratio = 0.5
    if (dividerPosition === 'left') ratio = 1 / doorsCount
    else if (dividerPosition === 'right') ratio = (doorsCount - 1) / doorsCount
    return pad + 10 + avail * ratio - 4
  }, [dividerPosition, doorsCount, innerW])

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (mode !== 'edit') return;
    const tag = (e.target as any).getAttribute?.('data-tag');
    if (!tag) return;
    setDrag({
      tag,
      startY: e.clientY,
      startVals: { gaps: { ...gaps }, splits: drawerSplits.slice() },
    });
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!drag || mode !== 'edit') return;
    const dy = e.clientY - drag.startY;
    if (drag.tag === 'gap-top') {
      const deltaMM = Math.round((dy / innerH) * heightMM);
      const val = clamp(drag.startVals.gaps.top + deltaMM, 0, 10000);
      onChangeGaps?.({ ...gaps, top: val });
    } else if (drag.tag === 'gap-bottom') {
      const deltaMM = Math.round((-dy / innerH) * heightMM);
      const val = clamp(drag.startVals.gaps.bottom + deltaMM, 0, 10000);
      onChangeGaps?.({ ...gaps, bottom: val });
    } else if (drag.tag.startsWith('split-')) {
      const idx = Number(drag.tag.split('-')[1]);
      const availFrontH = heightMM - (gaps.top + gaps.bottom);
      const arr =
        drawerFronts && drawerFronts.length === drawersCount
          ? drawerFronts.slice()
          : Array.from({ length: drawersCount }, () =>
              Math.floor(availFrontH / drawersCount),
            );
      const sum = arr.reduce((a, b) => a + b, 0);
      const pxPerMM = front.h / Math.max(1, sum);
      const moveMM = Math.round(dy / (pxPerMM || 1));
      const minFront = 60;
      let a = clamp(arr[idx] + moveMM, minFront, 5000);
      let b = clamp(arr[idx + 1] - moveMM, minFront, 5000);
      const rest = arr.reduce(
        (s, n, i) => (i === idx || i === idx + 1 ? s : s + n),
        0,
      );
      const total = rest + a + b;
      const scale = (sum - rest) / (a + b);
      a = Math.round(a * scale);
      b = Math.round(b * scale);
      const res = arr.slice();
      res[idx] = a;
      res[idx + 1] = b;
      onChangeDrawerFronts?.(res);
    }
  };
  const onMouseUp = () => setDrag(null);

  const outerW = Math.round(widthMM);
  const innerClearW = Math.round(widthMM - (gaps.left + gaps.right));
  const outerH = Math.round(heightMM);
  const eb = {
    front: edgeBanding?.length ?? false,
    back: edgeBanding?.length ?? false,
    left: edgeBanding?.width ?? false,
    right: edgeBanding?.width ?? false,
  };

  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
      {/* FRONT */}
      <svg
        width={W}
        height={H}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#bbb" strokeWidth="1" />
          </pattern>
        </defs>
        {/* korpus */}
        <rect
          x={pad}
          y={pad}
          width={innerW}
          height={innerH}
          fill="url(#hatch)"
          stroke="#999"
        />
        {eb.front && (
          <>
            <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="#f00" strokeWidth={2} />
            <line
              x1={pad}
              y1={H - pad}
              x2={W - pad}
              y2={H - pad}
              stroke="#f00"
              strokeWidth={2}
            />
          </>
        )}
        {eb.left && (
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#f00" strokeWidth={2} />
        )}
        {eb.right && (
          <line
            x1={W - pad}
            y1={pad}
            x2={W - pad}
            y2={H - pad}
            stroke="#f00"
            strokeWidth={2}
          />
        )}
        {/* front */}
        <rect
          x={front.x}
          y={front.y}
          width={front.w}
          height={front.h}
          fill="#e5e7eb"
          stroke="#666"
        />
        {/* podziały drzwi */}
        {doorSplits.map((x, i) => (
          <line
            key={`door-${i}`}
            x1={x}
            y1={front.y}
            x2={x}
            y2={front.y + front.h}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
        {dividerX !== null && (
          <line
            x1={dividerX}
            y1={front.y}
            x2={dividerX}
            y2={front.y + front.h}
            stroke="#999"
            strokeWidth={1}
          />
        )}
        {/* podziały szuflad */}
        {drawerSplits.map((y, i) => (
          <g key={i}>
            <line
              x1={front.x}
              y1={y}
              x2={front.x + front.w}
              y2={y}
              stroke="#fff"
              strokeWidth={2}
            />
            {mode === 'edit' && (
              <rect
                data-tag={`split-${i}`}
                x={front.x}
                y={y - 4}
                width={front.w}
                height={8}
                fill="transparent"
                cursor="ns-resize"
              />
            )}
          </g>
        ))}
        {/* uchwyty do zmiany szczeliny G/D */}
        {mode === 'edit' && (
          <>
            <rect
              data-tag="gap-top"
              x={front.x}
              y={front.y - 6}
              width={front.w}
              height={6}
              fill="#bfdbfe"
              cursor="ns-resize"
            />
            <rect
              data-tag="gap-bottom"
              x={front.x}
              y={front.y + front.h}
              width={front.w}
              height={6}
              fill="#bfdbfe"
              cursor="ns-resize"
            />
          </>
        )}
        {/* wymiary */}
        <DimH x1={pad} y={pad - 10} x2={W - pad} label={`${outerW}`} />
        <DimH
          x1={front.x}
          y={pad - 24}
          x2={front.x + front.w}
          label={`${innerClearW}`}
        />
        <DimV x={pad - 10} y1={pad} y2={H - pad} label={`${outerH}`} left />
      </svg>

      {/* SECTION */}
      <svg
        width={W}
        height={H}
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <defs>
          <pattern
            id="hatch2"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#bbb" strokeWidth="1" />
          </pattern>
        </defs>
        {/* puste tło */}
        <rect x={pad} y={pad} width={innerW} height={innerH} fill="#fff" />
        {eb.back && (
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#f00" strokeWidth={2} />
        )}
        {eb.front && (
          <line
            x1={W - pad}
            y1={pad}
            x2={W - pad}
            y2={H - pad}
            stroke="#f00"
            strokeWidth={2}
          />
        )}
        {/* boki */}
        <rect
          x={pad}
          y={pad}
          width={8}
          height={innerH}
          fill="url(#hatch2)"
          stroke="#999"
        />
        <rect
          x={W - pad - 8}
          y={pad}
          width={8}
          height={innerH}
          fill="url(#hatch2)"
          stroke="#999"
        />
        {dividerSectionX !== null && (
          <rect
            x={dividerSectionX}
            y={pad}
            width={8}
            height={innerH}
            fill="url(#hatch2)"
            stroke="#999"
          />
        )}
        {/* plecy */}
        <rect
          x={pad + 8}
          y={pad}
          width={2}
          height={innerH}
          fill="#999"
          opacity="0.5"
        />
        {/* wieńce */}
        <rect
          x={pad + 10}
          y={pad}
          width={innerW - 20}
          height={8}
          fill="url(#hatch2)"
          stroke="#999"
        />
        <rect
          x={pad + 10}
          y={H - pad - 8}
          width={innerW - 20}
          height={8}
          fill="url(#hatch2)"
          stroke="#999"
        />
        {/* pomocnicze półki (symbolicznie) */}
        {drawersCount > 0 && (
          <>
            <rect
              x={pad + 12}
              y={pad + innerH * 0.35}
              width={innerW - 24}
              height={6}
              fill="#d1d5db"
            />
            <rect
              x={pad + 12}
              y={pad + innerH * 0.65}
              width={innerW - 24}
              height={6}
              fill="#d1d5db"
            />
          </>
        )}
        {/* wymiary głębokości */}
        <DimH
          x1={pad + 10}
          y={pad - 10}
          x2={W - pad - 10}
          label={`${Math.round(depthMM)}`}
        />
        <DimH
          x1={pad + 12}
          y={pad - 24}
          x2={W - pad - 12 - 2}
          label={`${Math.round(depthMM - (2 + t))}`}
        />
      </svg>
    </div>
  );
}
