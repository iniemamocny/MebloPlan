import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FAMILY, Kind, Variant, KIND_SETS } from '../core/catalog';
import { computeModuleCost } from '../core/pricing';
import { usePlannerStore } from '../state/store';
import { getWallSegments, projectPointToSegment } from '../utils/walls';
import { autoWidthsForRun, placeAlongWall } from '../utils/auto';
import { Module3D, ModuleAdv } from '../types';
import { CabinetConfig } from './types';

export function useCabinetConfig(
  family: FAMILY,
  kind: Kind | null,
  variant: Variant | null,
  selWall: number,
  setVariant: (v: Variant | null) => void,
) {
  const store = usePlannerStore();
  const [cfgTab, setCfgTab] = useState<'basic' | 'adv'>('basic');
  const [widthMM, setWidthMM] = useState(600);
  const [adv, setAdvState] = useState<CabinetConfig | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const g = store.globals[family];
    const defaultShelves = family === FAMILY.TALL ? 4 : 1;
    setAdvState({
      height: g.height,
      depth: g.depth,
      boardType: g.boardType,
      frontType: g.frontType,
      gaps: { ...g.gaps },
      shelves: g.shelves ?? defaultShelves,
      backPanel: g.backPanel,
    });
  }, [family, store.globals]);

  const snapToWalls = (
    mSize: { w: number; h: number; d: number },
    fam: FAMILY,
  ) => {
    const segs = getWallSegments();
    if (segs.length === 0)
      return {
        pos: [
          store.modules.reduce((s, x) => s + x.size.w, 0) + mSize.w / 2,
          mSize.h / 2,
          0,
        ] as [number, number, number],
        rot: 0,
        segIndex: null as number | null,
      };
    let best: {
      seg: ReturnType<typeof getWallSegments>[number];
      pr: ReturnType<typeof projectPointToSegment>;
      i: number;
    } | null = null;
    const guess = { x: 0, y: 0 };
    segs.forEach((seg, i) => {
      const pr = projectPointToSegment(guess.x, guess.y, seg);
      if (!best || pr.dist < best.pr.dist) best = { seg, pr, i };
    });
    const gl = store.globals[fam];
    const offset = (gl.offsetWall || 0) / 1000;
    const nx = best.seg.b.y - best.seg.a.y;
    const ny = -(best.seg.b.x - best.seg.a.x);
    const nlen = Math.hypot(nx, ny) || 1;
    const ux = nx / nlen,
      uy = ny / nlen;
    const x = best.pr.x / 1000 + ux * offset;
    const z = best.pr.y / 1000 + uy * offset;
    const rot = -best.seg.angle;
    const y = mSize.h / 2;
    return {
      pos: [x, y, z] as [number, number, number],
      rot,
      segIndex: best.i,
    };
  };

  const collides = (a: Module3D, b: Module3D) => {
    const dx = Math.abs(a.position[0] - b.position[0]);
    const dz = Math.abs(a.position[2] - b.position[2]);
    return dx < (a.size.w + b.size.w) / 2 && dz < (a.size.d + b.size.d) / 2;
  };

  const resolveCollisions = (mod: Module3D): Module3D => {
    const tryMod: Module3D = { ...mod };
    let loops = 0;
    const step = 0.02;
    const segs = getWallSegments();
    const seg = typeof mod.segIndex === 'number' ? segs[mod.segIndex] : null;
    const tangent = seg
      ? {
          x: (seg.b.x - seg.a.x) / seg.length,
          y: (seg.b.y - seg.a.y) / seg.length,
        }
      : { x: 1, y: 0 };
    while (store.modules.some((m) => collides(tryMod, m)) && loops < 500) {
      tryMod.position = [
        tryMod.position[0] + tangent.x * step,
        tryMod.position[1],
        tryMod.position[2] + tangent.y * step,
      ];
      loops++;
    }
    const { segIndex, ...rest } = tryMod;
    return rest as Module3D;
  };

  const onAdd = (widthLocal: number, advLocal: CabinetConfig) => {
    if (!kind || !variant) return;
    const g: CabinetConfig = {
      ...store.globals[family],
      ...advLocal,
      gaps: { ...store.globals[family].gaps, ...(advLocal?.gaps || {}) },
    } as CabinetConfig;
    const h = g.height / 1000,
      d = g.depth / 1000,
      w = widthLocal / 1000;
    const id = `mod_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const price = computeModuleCost(
      {
        family,
        kind: kind.key,
        variant: variant.key,
        width: widthLocal,
        adv: {
          height: g.height,
          depth: g.depth,
          boardType: g.boardType,
          frontType: g.frontType,
          gaps: g.gaps,
          backPanel: g.backPanel,
        },
      },
      { prices: store.prices, globals: store.globals },
    );
    const snap = snapToWalls({ w, h, d }, family);
    const advAugmented: ModuleAdv & {
      hinge?: string;
      drawerSlide?: string;
      animationSpeed?: number;
      doorCount?: number;
    } = { ...g };
    if (!advAugmented.hinge) advAugmented.hinge = 'left';
    if (!advAugmented.drawerSlide) advAugmented.drawerSlide = 'BLUM LEGRABOX';
    if (advAugmented.animationSpeed === undefined)
      advAugmented.animationSpeed = 0.15;
    let impliedDrawers = 0;
    if (variant && variant.key) {
      const vkey = variant.key;
      if (vkey.startsWith('s')) {
        const num = Number(vkey.slice(1));
        if (!isNaN(num)) impliedDrawers = num;
      } else if (vkey.includes('+drawer')) {
        impliedDrawers = 1;
      }
    }
    let impliedDoors = 1;
    if (variant && variant.key) {
      const vkey = variant.key;
      const m = vkey.match(/^(?:d|wd|p)(\d+)/);
      if (m && m[1]) {
        const n = Number(m[1]);
        if (!isNaN(n) && n > 0) impliedDoors = n;
      } else if (vkey.startsWith('sink') || vkey.startsWith('hob')) {
        impliedDoors = 2;
      }
      if (vkey.includes('+drawer')) {
        impliedDoors = 1;
      }
    }
    if (
      (!Array.isArray(advAugmented.drawerFronts) ||
        advAugmented.drawerFronts.length === 0) &&
      impliedDrawers > 0
    ) {
      const totalFrontMM = Math.max(
        50,
        Math.round(g.height - ((g.gaps.top || 0) + (g.gaps.bottom || 0))),
      );
      const heights: number[] = [];
      for (let i = 0; i < impliedDrawers; i++) {
        heights.push(Math.floor(totalFrontMM / impliedDrawers));
      }
      const sum = heights.reduce((a, b) => a + b, 0);
      if (sum !== totalFrontMM)
        heights[heights.length - 1] += totalFrontMM - sum;
      advAugmented.drawerFronts = heights;
    }
    advAugmented.doorCount = impliedDoors;
    let mod: Module3D = {
      id,
      label: variant.label,
      family,
      kind: kind.key,
      size: { w, h, d },
      position: snap.pos,
      rotationY: snap.rot,
      segIndex: snap.segIndex,
      price,
      adv: advAugmented,
    };
    const nFrontsInit =
      Array.isArray(advAugmented.drawerFronts) &&
      advAugmented.drawerFronts.length > 0
        ? advAugmented.drawerFronts.length
        : advAugmented.doorCount || 1;
    mod.openStates = new Array(nFrontsInit).fill(false);
    mod = resolveCollisions(mod);
    store.addModule(mod);
    setVariant(null);
  };

  const doAutoOnSelectedWall = () => {
    const segs = getWallSegments();
    if (segs.length === 0) return alert(t('room.noWalls'));
    const seg = segs[0 + (selWall % segs.length)];
    const len = seg.length;
    const widths = autoWidthsForRun(len);
    const g = store.globals[family];
    const h = g.height / 1000,
      d = g.depth / 1000;
    const placed = placeAlongWall(widths, seg, 5);
    placed.forEach((pl, i) => {
      const wmm = widths[i];
      const w = wmm / 1000;
      const id = `auto_${Date.now()}_${i}_${Math.floor(Math.random() * 1e6)}`;
      const price = computeModuleCost(
        {
          family,
          kind: KIND_SETS[family][0]?.key || 'doors',
          variant: 'd1',
          width: wmm,
          adv: {
            height: g.height,
            depth: g.depth,
            boardType: g.boardType,
            frontType: g.frontType,
            gaps: g.gaps,
            backPanel: g.backPanel,
          },
        },
        { prices: store.prices, globals: store.globals },
      );
      let mod: Module3D = {
        id,
        label: t('app.auto'),
        family,
        kind: KIND_SETS[family][0]?.key || 'doors',
        size: { w, h, d },
        position: [pl.center[0] / 1000, h / 2, pl.center[1] / 1000],
        rotationY: pl.rot,
        segIndex: selWall,
        price,
        adv: g as ModuleAdv,
      };
      mod = resolveCollisions(mod);
      store.addModule(mod);
    });
  };

  const gLocal: CabinetConfig = adv || (store.globals[family] as CabinetConfig);

  return {
    cfgTab,
    setCfgTab,
    widthMM,
    setWidthMM,
    adv,
    setAdv: (v: CabinetConfig) => setAdvState(v),
    gLocal,
    onAdd,
    doAutoOnSelectedWall,
  };
}

export default useCabinetConfig;
