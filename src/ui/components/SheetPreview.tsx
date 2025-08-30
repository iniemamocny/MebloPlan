import React from 'react';
import { packIntoSheets, type Part, type Board } from '../../core/format';

type Agg = {
  w: number;
  h: number;
  part?: string;
  material?: string;
  qty?: number;
  requireGrain?: boolean;
};
type Props = {
  L: number;
  W: number;
  kerf: number;
  hasGrain: boolean;
  items: Agg[];
};

export default function SheetPreview({ L, W, kerf, hasGrain, items }: Props) {
  const board: Board = { L, W, kerf, hasGrain };
  const parts: Part[] = items.map((r, idx) => ({
    w: Math.round(r.w || 0),
    h: Math.round(r.h || 0),
    name: r.part || r.material || `elem-${idx + 1}`,
    qty: Math.max(1, Math.round(r.qty || 1)),
    requireGrain: /wieniec|półka/i.test(r.part || ''),
  }));
  const sheets = packIntoSheets(board, parts);

  return (
    <div className="card" style={{ padding: 8 }}>
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <div className="h2">
          Podgląd arkuszy {W}×{L} mm
        </div>
        <div className="small">Liczba arkuszy: {sheets.length}</div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {sheets.map((s) => {
          const vb = `0 0 ${W} ${L}`;
          return (
            <div key={s.index} className="card" style={{ padding: 6 }}>
              <div className="small" style={{ marginBottom: 6 }}>
                Arkusz {s.index}
              </div>
              <svg
                viewBox={vb}
                width="100%"
                style={{
                  maxHeight: 360,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={W}
                  height={L}
                  fill="#fafafa"
                  stroke="#94a3b8"
                />
                {s.placed.map((p, i) => (
                  <g key={i}>
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p._w}
                      height={p._h}
                      fill="#dbeafe"
                      stroke="#1e40af"
                    />
                    <text x={p.x + 4} y={p.y + 14} fontSize="12" fill="#1e3a8a">
                      {p.name}
                    </text>
                    <text x={p.x + 4} y={p.y + 28} fontSize="11" fill="#334155">
                      {p._w}×{p._h}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        Rozmieszczenie poglądowe (strip nesting). Pełny optimizer wdrożymy
        później.
      </div>
    </div>
  );
}
