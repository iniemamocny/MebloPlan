import { FAMILY } from './catalog';
import { Module3D, Globals, PriceCounts, EdgeBanding } from '../types';

function parseThickness(boardType: string): number {
  const m = boardType?.match(/(\d+)(?=\s*mm)/i);
  return m ? Number(m[1]) : 18;
}

export type CutItem = {
  moduleId: string;
  moduleLabel: string;
  material: string;
  part: string;
  qty: number;
  w: number;
  h: number;
};
export type EdgeItem = {
  material: 'ABS 1mm' | 'ABS 2mm';
  length: number;
  part: string;
};

function clampPos(n: number) {
  return Math.max(50, Math.round(n));
}

const tol = {
  backGroove: 10,
  assembly: 1,
  shelfFrontSetback: 0,
} as const;

export function cutlistForModule(
  m: Module3D,
  globals: Globals,
): { items: CutItem[]; edges: EdgeItem[] } {
  const base = globals[m.family] || {};
  const g = m.adv
    ? { ...base, ...m.adv, gaps: { ...base.gaps, ...(m.adv.gaps || {}) } }
    : base;
  const gaps = g.gaps || { left: 2, right: 2, top: 2, bottom: 2, between: 3 };
  const t = parseThickness(g.boardType || 'Płyta 18mm');
  const frontMat = `Front ${g.frontType || 'Laminat'}${g.frontFoldable ? ' stowalna' : ''}`;
  const backT = 3;
  const items: CutItem[] = [];
  const edges: EdgeItem[] = [];
  const W = Math.round(m.size.w * 1000);
  const H = Math.round(m.size.h * 1000);
  const D = Math.round(m.size.d * 1000);
  const boardMat = `Płyta ${t}mm`;
  const leftBanding = g.leftSideEdgeBanding || {};
  const rightBanding = g.rightSideEdgeBanding || {};
  const topBanding = g.topPanelEdgeBanding || {};
  const bottomBanding = g.bottomPanelEdgeBanding || {};
  const fillerBanding: EdgeBanding = {
    front: leftBanding.front || rightBanding.front,
    back: leftBanding.back || rightBanding.back,
    top: leftBanding.top || rightBanding.top,
    bottom: leftBanding.bottom || rightBanding.bottom,
  };

  const add = (it: CutItem) => {
    items.push(it);
  };
  const addEdge = (
    banding: EdgeBanding | undefined,
    edge: keyof EdgeBanding,
    edgeMat: 'ABS 1mm' | 'ABS 2mm',
    len: number,
    part: string,
    boardMat: string,
  ) => {
    if (!banding?.[edge]) return;
    const skip =
      boardMat.startsWith('Front') ||
      boardMat.includes('Blenda') ||
      boardMat.includes('Cokół') ||
      boardMat.includes('HDF');
    if (skip) return;
    edges.push({
      material: edgeMat,
      length: Math.max(0, Math.round(len)),
      part,
    });
  };

  // Box
  const addStandardBox = () => {
    add({
      moduleId: m.id,
      moduleLabel: m.label,
      material: boardMat,
      part: 'Bok',
      qty: 2,
      w: clampPos(D),
      h: clampPos(H),
    });
    addEdge(leftBanding, 'front', 'ABS 1mm', H, 'Bok lewy — krawędź frontowa', boardMat);
    addEdge(rightBanding, 'front', 'ABS 1mm', H, 'Bok prawy — krawędź frontowa', boardMat);
    addEdge(leftBanding, 'back', 'ABS 1mm', H, 'Bok lewy — krawędź tylna', boardMat);
    addEdge(rightBanding, 'back', 'ABS 1mm', H, 'Bok prawy — krawędź tylna', boardMat);
    addEdge(leftBanding, 'top', 'ABS 1mm', D, 'Bok lewy — krawędź górna', boardMat);
    addEdge(rightBanding, 'top', 'ABS 1mm', D, 'Bok prawy — krawędź górna', boardMat);
    addEdge(leftBanding, 'bottom', 'ABS 1mm', D, 'Bok lewy — krawędź dolna', boardMat);
    addEdge(rightBanding, 'bottom', 'ABS 1mm', D, 'Bok prawy — krawędź dolna', boardMat);
    add({
      moduleId: m.id,
      moduleLabel: m.label,
      material: boardMat,
      part: 'Wieniec górny',
      qty: 1,
      w: clampPos(W - 2 * t - tol.assembly),
      h: clampPos(D),
    });
    addEdge(
      topBanding,
      'front',
      'ABS 1mm',
      W - 2 * t - tol.assembly,
      'Wieniec górny — przód',
      boardMat,
    );
    addEdge(
      topBanding,
      'back',
      'ABS 1mm',
      W - 2 * t - tol.assembly,
      'Wieniec górny — tył',
      boardMat,
    );
    addEdge(topBanding, 'left', 'ABS 1mm', D, 'Wieniec górny — lewa', boardMat);
    addEdge(topBanding, 'right', 'ABS 1mm', D, 'Wieniec górny — prawa', boardMat);
    add({
      moduleId: m.id,
      moduleLabel: m.label,
      material: boardMat,
      part: 'Wieniec dolny',
      qty: 1,
      w: clampPos(W - 2 * t - tol.assembly),
      h: clampPos(D),
    });
    addEdge(
      bottomBanding,
      'front',
      'ABS 1mm',
      W - 2 * t - tol.assembly,
      'Wieniec dolny — przód',
      boardMat,
    );
    addEdge(
      bottomBanding,
      'back',
      'ABS 1mm',
      W - 2 * t - tol.assembly,
      'Wieniec dolny — tył',
      boardMat,
    );
    addEdge(bottomBanding, 'left', 'ABS 1mm', D, 'Wieniec dolny — lewa', boardMat);
    addEdge(bottomBanding, 'right', 'ABS 1mm', D, 'Wieniec dolny — prawa', boardMat);
    if ((g.backPanel || 'full') !== 'none') {
      if ((g.backPanel || 'full') === 'split') {
        const hPiece = clampPos((H - tol.backGroove) / 2);
        add({
          moduleId: m.id,
          moduleLabel: m.label,
          material: `HDF ${backT}mm`,
          part: 'Plecy',
          qty: 2,
          w: clampPos(W - 2 * t - tol.backGroove),
          h: hPiece,
        });
      } else {
        add({
          moduleId: m.id,
          moduleLabel: m.label,
          material: `HDF ${backT}mm`,
          part: 'Plecy',
          qty: 1,
          w: clampPos(W - 2 * t - tol.backGroove),
          h: clampPos(H - tol.backGroove),
        });
      }
    }
  };

  const addShelves = () => {
    const shelfW = clampPos(W - 2 * t - tol.assembly);
    const shelfD = clampPos(D - backT - tol.shelfFrontSetback);
    let defaultShelves = 0;
    if (m.family === FAMILY.BASE && m.kind === 'doors') defaultShelves = 1;
    else if (m.family === FAMILY.WALL) defaultShelves = 1;
    else if (m.family === FAMILY.TALL) defaultShelves = 4;
    const shelfQty = g.shelves !== undefined ? g.shelves : defaultShelves;
    if (shelfQty > 0) {
      add({
        moduleId: m.id,
        moduleLabel: m.label,
        material: boardMat,
        part: 'Półka',
        qty: shelfQty,
        w: shelfW,
        h: shelfD,
      });
      addEdge(
        g.shelfEdgeBanding,
        'front',
        'ABS 1mm',
        shelfW * shelfQty,
        shelfQty > 1 ? 'Półki — przód sumarycznie' : 'Półka — przód',
        boardMat,
      );
      addEdge(
        g.shelfEdgeBanding,
        'back',
        'ABS 1mm',
        shelfW * shelfQty,
        shelfQty > 1 ? 'Półki — tył sumarycznie' : 'Półka — tył',
        boardMat,
      );
      addEdge(
        g.shelfEdgeBanding,
        'left',
        'ABS 1mm',
        shelfD * shelfQty,
        shelfQty > 1 ? 'Półki — lewa sumarycznie' : 'Półka — lewa',
        boardMat,
      );
      addEdge(
        g.shelfEdgeBanding,
        'right',
        'ABS 1mm',
        shelfD * shelfQty,
        shelfQty > 1 ? 'Półki — prawa sumarycznie' : 'Półka — prawa',
        boardMat,
      );
    }
  };

  if (m.family === FAMILY.BASE && m.kind === 'corner') {
    const filler = 70;
    add({
      moduleId: m.id,
      moduleLabel: m.label,
      material: boardMat,
      part: 'Zaślepka narożna',
      qty: 1,
      w: clampPos(filler),
      h: clampPos(H),
    });
    addEdge(
      fillerBanding,
      'front',
      'ABS 1mm',
      H,
      'Zaślepka narożna — krawędź frontowa',
      boardMat,
    );
    addEdge(
      fillerBanding,
      'back',
      'ABS 1mm',
      H,
      'Zaślepka narożna — krawędź tylna',
      boardMat,
    );
    addEdge(
      fillerBanding,
      'top',
      'ABS 1mm',
      filler,
      'Zaślepka narożna — krawędź górna',
      boardMat,
    );
    addEdge(
      fillerBanding,
      'bottom',
      'ABS 1mm',
      filler,
      'Zaślepka narożna — krawędź dolna',
      boardMat,
    );
    addStandardBox();
    addShelves();
  } else {
    addStandardBox();
    addShelves();
  }

  const counts: PriceCounts = m.price?.counts || {
    doors: 0,
    drawers: 0,
    legs: 0,
    hangers: 0,
    hinges: 0,
  };
  const availWforFront = W - gaps.left - gaps.right;
  const availHforFront = H - gaps.top - gaps.bottom;

  if (counts.doors > 0) {
    const totalBetween = counts.doors > 1 ? gaps.between : 0;
    const leafW = clampPos((availWforFront - totalBetween) / counts.doors);
    const leafH = clampPos(availHforFront);
    add({
      moduleId: m.id,
      moduleLabel: m.label,
      material: frontMat,
      part: 'Front drzwi',
      qty: counts.doors,
      w: leafW,
      h: leafH,
    });
  }

  if (counts.drawers > 0) {
    const adv = m.adv || {};
    const fronts: number[] | undefined = adv.drawerFronts;
    if (counts.doors > 0) {
      const drawerFrontH = clampPos(
        fronts && fronts.length > 0
          ? fronts[0]
          : Math.min(180, Math.max(120, Math.floor(availHforFront * 0.25))),
      );
      add({
        moduleId: m.id,
        moduleLabel: m.label,
        material: frontMat,
        part: 'Front szuflady',
        qty: 1,
        w: clampPos(availWforFront),
        h: drawerFrontH,
      });
    } else {
      if (fronts && fronts.length === counts.drawers) {
        fronts.forEach((hF) =>
          add({
            moduleId: m.id,
            moduleLabel: m.label,
            material: frontMat,
            part: 'Front szuflady',
            qty: 1,
            w: clampPos(availWforFront),
            h: clampPos(hF),
          }),
        );
      } else {
        const baseH = Math.floor(availHforFront / counts.drawers);
        const rem = availHforFront - baseH * counts.drawers;
        for (let i = 0; i < counts.drawers; i++) {
          const hF = clampPos(baseH + (i === counts.drawers - 1 ? rem : 0));
          add({
            moduleId: m.id,
            moduleLabel: m.label,
            material: frontMat,
            part: 'Front szuflady',
            qty: 1,
            w: clampPos(availWforFront),
            h: hF,
          });
        }
      }
    }
  }

  if (counts.drawers > 0) {
    const slideClear = 26;
    const boxW = clampPos(availWforFront - slideClear);
    const boxD = clampPos(D - 50);
    const boxH = clampPos(110);
    for (let i = 0; i < counts.drawers; i++) {
      add({
        moduleId: m.id,
        moduleLabel: m.label,
        material: boardMat,
        part: 'Szuflada bok',
        qty: 2,
        w: boxD,
        h: boxH,
      });
      add({
        moduleId: m.id,
        moduleLabel: m.label,
        material: boardMat,
        part: 'Szuflada przód/tył',
        qty: 2,
        w: clampPos(boxW - 2 * t),
        h: boxH,
      });
      add({
        moduleId: m.id,
        moduleLabel: m.label,
        material: `HDF 3mm`,
        part: 'Szuflada dno',
        qty: 1,
        w: boxW,
        h: boxD,
      });
      addEdge(
        fillerBanding,
        'top',
        'ABS 1mm',
        (boxW - 2 * t) * 2,
        'Szuflada przód/tył — górna krawędź',
        boardMat,
      );
    }
  }

  return { items, edges };
}

export function aggregateCutlist(items: CutItem[]): CutItem[] {
  const map = new Map<string, CutItem>();
  items.forEach((it) => {
    // Ujednolicamy orientację — formy o identycznych wymiarach niezależnie od rotacji agregujemy razem
    const dims: [number, number] = it.w <= it.h ? [it.w, it.h] : [it.h, it.w];
    const key = `${it.material}|${it.part}|${dims[0]}x${dims[1]}`;
    const prev = map.get(key);
    if (prev) prev.qty += it.qty;
    else {
      // zapisujemy mniejszą wymiar w polu w, a większą w h aby zachować spójność
      const newIt: CutItem = { ...it, w: dims[0], h: dims[1] };
      map.set(key, newIt);
    }
  });
  return Array.from(map.values());
}

export function aggregateEdgebanding(
  edges: EdgeItem[],
): { material: string; length: number }[] {
  const map = new Map<string, number>();
  edges.forEach((e) =>
    map.set(e.material, (map.get(e.material) || 0) + e.length),
  );
  return Array.from(map.entries()).map(([material, length]) => ({
    material,
    length: Math.round(length),
  }));
}

export function toCSV(items: CutItem[], sep = ';'): string {
  const rows = [['Moduł', 'Materiał', 'Element', 'Ilość', 'W (mm)', 'H (mm)']];
  items.forEach((it) =>
    rows.push([
      `${it.moduleLabel} (${it.moduleId})`,
      it.material,
      it.part,
      String(it.qty),
      String(it.w),
      String(it.h),
    ]),
  );
  return rows.map((r) => r.join(sep)).join('\n');
}
