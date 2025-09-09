import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FAMILY, Kind, Variant, KIND_SETS } from '../core/catalog';
import { computeModuleCost } from '../core/pricing';
import { usePlannerStore, legCategories } from '../state/store';
import { Module3D, ModuleAdv } from '../types';
import { CabinetConfig } from './types';

export function useCabinetConfig(
  family: FAMILY,
  kind: Kind | null,
  variant: Variant | null,
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

  const computePlacement = (
    mSize: { w: number; h: number; d: number },
    _fam: FAMILY,
  ) => {
    return {
      pos: [
        store.modules.reduce((s, x) => s + x.size.w, 0) + mSize.w / 2,
        mSize.h / 2,
        0,
      ] as [number, number, number],
      rot: 0,
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
    const tangent = { x: 1, y: 0 };
    while (store.modules.some((m) => collides(tryMod, m)) && loops < 500) {
      tryMod.position = [
        tryMod.position[0] + tangent.x * step,
        tryMod.position[1],
        tryMod.position[2] + tangent.y * step,
      ];
      loops++;
    }
    return tryMod as Module3D;
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
    const placement = computePlacement({ w, h, d }, family);
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
      position: placement.pos,
      rotationY: placement.rot,
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
    initSidePanel,
    initBlenda,
  };
}

export default useCabinetConfig;
