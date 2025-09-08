import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FAMILY, Kind, Variant, KIND_SETS } from '../core/catalog';
import { computeModuleCost } from '../core/pricing';
import { usePlannerStore, legCategories } from '../state/store';
import { getWallSegments, projectPointToSegment } from '../utils/walls';
import { autoWidthsForRun, placeAlongWall } from '../utils/auto';
import { Module3D, ModuleAdv } from '../types';
import { CabinetConfig } from './types';

export function useCabinetConfig(
  family: FAMILY,
  kind: Kind | null,
  variant: Variant | null,
  selWall: string,
  setVariant: (v: Variant | null) => void,
) {
  const store = usePlannerStore();
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
      frontFoldable: false,
      gaps: { ...g.gaps },
      shelves: g.shelves ?? defaultShelves,
      backPanel: g.backPanel,
      topPanel: g.topPanel,
      bottomPanel: g.bottomPanel,
      topPanelEdgeBanding: {},
      bottomPanelEdgeBanding: {},
      rightSideEdgeBanding: {
        front: true,
        back: true,
      },
      leftSideEdgeBanding: {
        front: true,
        back: true,
      },
      shelfEdgeBanding: {},
      traverseEdgeBanding: {},
      backEdgeBanding: {},
      sidePanels: {},
      legs: {
        type: g.legsType,
        height: g.legsHeight,
        category: legCategories[g.legsType],
        legsOffset: g.legsOffset,
      },
      carcassType: g.carcassType,
    });
  }, [family, store.globals]);

  const snapToWalls = (
    mSize: { w: number; h: number; d: number },
    fam: FAMILY,
  ) => {
    const segs = getWallSegments(store.room);
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
    const guess = store.room.origin || { x: 0, y: 0 };
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
    const segs = getWallSegments(store.room);
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

  const onAdd = (
    widthLocal: number,
    advLocal: CabinetConfig,
    doorsCount: number,
    drawersCount: number,
  ) => {
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
    const selectedLegsType = advLocal.legs?.type ?? store.globals[family].legsType;
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
          frontFoldable: g.frontFoldable,
          gaps: g.gaps,
          backPanel: g.backPanel,
          topPanel: g.topPanel,
          bottomPanel: g.bottomPanel,
          rightSideEdgeBanding: g.rightSideEdgeBanding,
          leftSideEdgeBanding: g.leftSideEdgeBanding,
          traverseEdgeBanding: g.traverseEdgeBanding,
          backEdgeBanding: g.backEdgeBanding,
          carcassType: g.carcassType,
          legsType: selectedLegsType,
        },
        doorsCount,
        drawersCount,
      },
      { prices: store.prices, globals: store.globals },
    );
    const snap = snapToWalls({ w, h, d }, family);
    const advAugmented: ModuleAdv & {
      hinge?: string;
      drawerSlide?: string;
      animationSpeed?: number;
      doorCount?: number;
    } = {
      ...g,
      legsType: selectedLegsType,
      legs: {
        category: legCategories[selectedLegsType],
        legsOffset: g.legsOffset,
        ...(advLocal.legs || {}),
      },
    };
    if (!advAugmented.hinge) advAugmented.hinge = 'left';
    if (!advAugmented.drawerSlide) advAugmented.drawerSlide = 'BLUM LEGRABOX';
    if (advAugmented.animationSpeed === undefined)
      advAugmented.animationSpeed = 0.15;
    if (
      (!Array.isArray(advAugmented.drawerFronts) ||
        advAugmented.drawerFronts.length === 0) &&
      drawersCount > 0
    ) {
      const totalFrontMM = Math.max(
        50,
        Math.round(g.height - ((g.gaps.top || 0) + (g.gaps.bottom || 0))),
      );
      const heights: number[] = [];
      for (let i = 0; i < drawersCount; i++) {
        heights.push(Math.floor(totalFrontMM / drawersCount));
      }
      const sum = heights.reduce((a, b) => a + b, 0);
      if (sum !== totalFrontMM)
        heights[heights.length - 1] += totalFrontMM - sum;
      advAugmented.drawerFronts = heights;
    }
    advAugmented.doorCount = doorsCount;
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
    const segs = getWallSegments(store.room);
    if (segs.length === 0) return alert(t('room.noWalls'));
    const wallIndex = store.room.walls.findIndex(w => w.id === selWall);
    const seg = segs[0 + ((wallIndex >= 0 ? wallIndex : 0) % segs.length)];
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
          variant: 'doors',
          width: wmm,
          adv: {
            height: g.height,
            depth: g.depth,
            boardType: g.boardType,
            frontType: g.frontType,
            frontFoldable: g.frontFoldable,
            gaps: g.gaps,
            backPanel: g.backPanel,
            topPanel: g.topPanel,
            bottomPanel: g.bottomPanel,
            topPanelEdgeBanding: {},
            bottomPanelEdgeBanding: {},
            rightSideEdgeBanding: {
              front: true,
              back: true,
            },
            leftSideEdgeBanding: {
              front: true,
              back: true,
            },
            shelfEdgeBanding: {},
            sidePanels: {},
            carcassType: g.carcassType,
            legsType: g.legsType,
          },
          doorsCount: 1,
          drawersCount: 0,
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
        segIndex: wallIndex >= 0 ? wallIndex : 0,
        price,
        adv: {
          ...g,
          doorCount: 1,
          topPanelEdgeBanding: {},
          bottomPanelEdgeBanding: {},
          rightSideEdgeBanding: {
            front: true,
            back: true,
          },
          leftSideEdgeBanding: {
            front: true,
            back: true,
          },
          shelfEdgeBanding: {},
          sidePanels: {},
        } as ModuleAdv,
      };
      mod = resolveCollisions(mod);
      store.addModule(mod);
    });
  };

  const gLocal: CabinetConfig = (() => {
    const g = store.globals[family];
    const base = adv ? { ...adv } : ({ ...g } as CabinetConfig);
    if (!base.legs)
      base.legs = {
        type: g.legsType,
        height: g.legsHeight,
        category: legCategories[g.legsType],
        legsOffset: g.legsOffset,
      };
    return base;
  })();

  const setAdv = (patch: Partial<CabinetConfig>) =>
    setAdvState((prev) => {
      const g = store.globals[family];
      const base = prev
        ? {
            ...prev,
            legs:
              prev.legs || {
                type: g.legsType,
                height: g.legsHeight,
                category: legCategories[g.legsType],
                legsOffset: g.legsOffset,
              },
          }
        : ({
            ...g,
            legs: {
              type: g.legsType,
              height: g.legsHeight,
              category: legCategories[g.legsType],
              legsOffset: g.legsOffset,
            },
          } as CabinetConfig);
      return { ...base, ...patch };
    });

  const initSidePanel = (side: 'left' | 'right') => {
    setAdvState((prev) => {
      const cfg = prev || (store.globals[family] as CabinetConfig);
      const height = cfg.height - (cfg.gaps.top || 0) - (cfg.gaps.bottom || 0);
      const sidePanels = { ...(cfg.sidePanels || {}) } as CabinetConfig['sidePanels'];
      const sideCfg = { ...(sidePanels?.[side] || {}) };
      sidePanels![side] = {
        ...sideCfg,
        panel: true,
        width: sideCfg.width ?? cfg.depth,
        height: sideCfg.height ?? height,
        dropToFloor: false,
      };
      return { ...cfg, sidePanels };
    });
  };

  const initBlenda = (side: 'left' | 'right') => {
    setAdvState((prev) => {
      const cfg = prev || (store.globals[family] as CabinetConfig);
      const h = cfg.height - (cfg.gaps.top || 0) - (cfg.gaps.bottom || 0);
      const sidePanels = { ...(cfg.sidePanels || {}) } as CabinetConfig['sidePanels'];
      const sideCfg = { ...(sidePanels?.[side] || {}) };
      sidePanels![side] = {
        ...sideCfg,
        blenda: { width: 50, height: h },
      };
      return { ...cfg, sidePanels };
    });
  };

  return {
    widthMM,
    setWidthMM,
    adv,
    setAdv,
    gLocal,
    onAdd,
    doAutoOnSelectedWall,
    initSidePanel,
    initBlenda,
  };
}

export default useCabinetConfig;
