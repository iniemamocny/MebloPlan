import React from 'react';
import { packByMaterial, type Part, type Board } from '../../core/format';

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

export default function MultiMaterialPreview({
  L,
  W,
  kerf,
  hasGrain,
  items,
}: Props) {
  const board: Board = { L, W, kerf, hasGrain };
  // przygotuj listę części wraz z wymaganiem usłojenia
  const parts: (Part & { material?: string })[] = items.map((r, idx) => ({
    w: Math.round(r.w || 0),
    h: Math.round(r.h || 0),
    name: r.part || r.material || `elem-${idx + 1}`,
    qty: Math.max(1, Math.round(r.qty || 1)),
    requireGrain: /wieniec|półka/i.test(r.part || ''),
    material: r.material,
  }));
  const groups = packByMaterial(board, parts);

  return (
    <div className="card" style={{ padding: 8 }}>
      <div className="h2" style={{ marginBottom: 8 }}>
        Podgląd rozkroju — grupowanie wg materiału
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {groups.map((g, gi) => (
          <div key={gi} className="card" style={{ padding: 8 }}>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <div className="h2">{g.material}</div>
              <div className="small">Arkuszy: {g.sheets.length}</div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {g.sheets.map((s: any) => {
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
                        maxHeight: 380,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                      }}
                    >
                      {/* definicje wzorów do wizualizacji usłojenia */}
                      <defs>
                        <pattern
                          id="grain-vert"
                          width="8"
                          height="8"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="4" height="8" fill="#e0e7ff" />
                          <rect x="4" width="4" height="8" fill="#c7d2fe" />
                        </pattern>
                        <pattern
                          id="grain-horiz"
                          width="8"
                          height="8"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="8" height="4" fill="#e0e7ff" />
                          <rect y="4" width="8" height="4" fill="#c7d2fe" />
                        </pattern>
                        <pattern
                          id="plain"
                          width="1"
                          height="1"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="1" height="1" fill="#dbeafe" />
                        </pattern>
                      </defs>
                      <rect
                        x={0}
                        y={0}
                        width={W}
                        height={L}
                        fill="#fafafa"
                        stroke="#94a3b8"
                      />
                      {s.placed.map((p: any, i: number) => {
                        // określ wypełnienie: jeśli materiał ma usłojenie i element wymaga usłojenia,
                        // użyj pionowych pasków dla elementów nie obróconych, poziomych dla obróconych.
                        let fillId = 'plain';
                        if (hasGrain && p.requireGrain) {
                          // porównaj oryginalne wymiary (w,h) z orientacją (_w,_h) aby wykryć rotację
                          const rotated = !(p.w === p._w && p.h === p._h);
                          fillId = rotated ? 'grain-horiz' : 'grain-vert';
                        }
                        return (
                          <g key={i}>
                            <rect
                              x={p.x}
                              y={p.y}
                              width={p._w}
                              height={p._h}
                              fill={`url(#${fillId})`}
                              stroke="#1e40af"
                            />
                            <circle
                              cx={p.x + 14}
                              cy={p.y + 14}
                              r={11}
                              fill="#111827"
                            />
                            <text
                              x={p.x + 14}
                              y={p.y + 14}
                              fontSize="12"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#fff"
                            >
                              {p.idx ?? i + 1}
                            </text>
                            <text
                              x={p.x + 4}
                              y={p.y + p._h - 6}
                              fontSize="11"
                              fill="#334155"
                            >
                              {p._w}×{p._h}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    <div className="tiny muted" style={{ marginTop: 6 }}>
                      Legenda:
                      <span> </span>
                      {s.placed.map((p: any, i: number) => (
                        <span key={i} style={{ marginRight: 10 }}>
                          #{p.idx ?? i + 1} {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        Heurystyka „guillotine” (poglądowa). Dokładny nesting dodamy później.
      </div>
    </div>
  );
}
