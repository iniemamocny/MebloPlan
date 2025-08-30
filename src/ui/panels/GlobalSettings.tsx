import React, { useState } from 'react';
import { usePlannerStore } from '../../state/store';
import { FAMILY } from '../../core/catalog';

const FamList = [FAMILY.BASE, FAMILY.WALL, FAMILY.PAWLACZ, FAMILY.TALL];

export default function GlobalSettings() {
  const store = usePlannerStore();
  const [open, setOpen] = useState(false);
  const [openFam, setOpenFam] = useState(FAMILY.BASE);

  function Field({
    label,
    value,
    onChange,
    type = 'number',
    step = '1',
    options,
  }: {
    label: string;
    value: any;
    onChange: (v: any) => void;
    type?: 'number' | 'select';
    step?: string;
    options?: string[];
  }) {
    return (
      <div>
        <div className="small">{label}</div>
        {type === 'select' ? (
          <select
            className="input"
            value={value}
            onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
          >
            {options!.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            type="number"
            step={step}
            value={value}
            onChange={(e) =>
              onChange(Number((e.target as HTMLInputElement).value) || 0)
            }
          />
        )}
      </div>
    );
  }

  function SectionGroup({ fam }: { fam: any }) {
    const g = store.globals[fam];
    const isOpen = openFam === fam;
    const set = (patch: any) => store.updateGlobals(fam, patch);
    return (
      <div className="section" style={{ marginTop: 8 }}>
        <div
          className="hd"
          onClick={() => setOpenFam((prev) => (prev === fam ? null : fam))}
        >
          <div>
            <div className="h1">Ustawienia — {fam}</div>
          </div>
          <button className="btnGhost">{isOpen ? 'Zwiń' : 'Rozwiń'}</button>
        </div>
        {isOpen && (
          <div className="bd">
            <div className="grid3">
              <Field
                label="Wysokość (mm)"
                value={g.height}
                onChange={(v) => set({ height: v })}
              />
              <Field
                label="Głębokość (mm)"
                value={g.depth}
                onChange={(v) => set({ depth: v })}
              />
              <Field
                label="Rodzaj płyty"
                type="select"
                value={g.boardType}
                onChange={(v) => set({ boardType: v })}
                options={Object.keys(store.prices.board)}
              />
              <Field
                label="Rodzaj frontu"
                type="select"
                value={g.frontType}
                onChange={(v) => set({ frontType: v })}
                options={Object.keys(store.prices.front)}
              />
              <Field
                label="Plecy"
                type="select"
                value={g.backPanel || 'full'}
                onChange={(v) => set({ backPanel: v })}
                options={['full', 'split', 'none']}
              />
              {fam === FAMILY.BASE && (
                <>
                  <Field
                    label="Nóżki"
                    type="select"
                    value={g.legsType}
                    onChange={(v) => set({ legsType: v })}
                    options={Object.keys(store.prices.legs)}
                  />
                  <Field
                    label="Odsunięcie od ściany (mm)"
                    value={g.offsetWall || 0}
                    onChange={(v) => set({ offsetWall: v })}
                  />
                </>
              )}
              {(fam === FAMILY.WALL || fam === FAMILY.PAWLACZ) && (
                <>
                  <Field
                    label="Zawieszki"
                    type="select"
                    value={g.hangerType}
                    onChange={(v) => set({ hangerType: v })}
                    options={Object.keys(store.prices.hangers)}
                  />
                  <Field
                    label="Odsunięcie od ściany (mm)"
                    value={g.offsetWall || 0}
                    onChange={(v) => set({ offsetWall: v })}
                  />
                </>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="h1" style={{ fontSize: 14, marginBottom: 6 }}>
                Szczeliny (mm)
              </div>
              <div className="grid3">
                <Field
                  label="Szczelina lewa"
                  value={g.gaps.left}
                  onChange={(v) => set({ gaps: { ...g.gaps, left: v } })}
                  step="0.5"
                />
                <Field
                  label="Szczelina prawa"
                  value={g.gaps.right}
                  onChange={(v) => set({ gaps: { ...g.gaps, right: v } })}
                  step="0.5"
                />
                <Field
                  label="Szczelina górna"
                  value={g.gaps.top}
                  onChange={(v) => set({ gaps: { ...g.gaps, top: v } })}
                  step="0.5"
                />
                <Field
                  label="Szczelina dolna"
                  value={g.gaps.bottom}
                  onChange={(v) => set({ gaps: { ...g.gaps, bottom: v } })}
                  step="0.5"
                />
                <Field
                  label="Szczelina między frontami"
                  value={g.gaps.between}
                  onChange={(v) => set({ gaps: { ...g.gaps, between: v } })}
                  step="0.5"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="section">
      <div className="hd" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="h1">Ustawienia ogólne</div>
        </div>
        <button className="btnGhost">{open ? 'Zwiń' : 'Rozwiń'}</button>
      </div>
      {open && (
        <div className="bd">
          {FamList.map((f) => (
            <SectionGroup key={f} fam={f} />
          ))}
          <div className="section" style={{ marginTop: 8 }}>
            <div className="hd">
              <div className="h1">Cennik</div>
            </div>
            <div className="bd grid3">
              <div>
                <div className="small">Marża (0–1)</div>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={store.prices.margin}
                  onChange={(e) =>
                    store.updatePrices({
                      margin: Math.max(
                        0,
                        Math.min(
                          1,
                          Number((e.target as HTMLInputElement).value) || 0,
                        ),
                      ),
                    })
                  }
                />
              </div>
              <div>
                <div className="small">Robocizna (zł)</div>
                <input
                  className="input"
                  type="number"
                  step="1"
                  value={store.prices.labor}
                  onChange={(e) =>
                    store.updatePrices({
                      labor: Number((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <div className="small">Cięcie (zł/mb)</div>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={store.prices.cut}
                  onChange={(e) =>
                    store.updatePrices({
                      cut: Number((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
