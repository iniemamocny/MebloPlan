import { FAMILY } from './catalog';
import { Parts, Price, PricingData, ModuleAdv, PriceCounts } from '../types';
import { variantRules } from './variantRules';

function hingeCountPerDoor(doorHeightMM: number) {
  if (doorHeightMM <= 900) return 2;
  if (doorHeightMM <= 1500) return 3;
  return 4;
}
type AdvParams = Required<
  Pick<ModuleAdv, 'height' | 'depth' | 'boardType' | 'frontType'>
> &
  Omit<ModuleAdv, 'height' | 'depth' | 'boardType' | 'frontType'>;

export function computeModuleCost(
  params: {
    family: FAMILY;
    kind: string;
    variant: string;
    width: number;
    adv: AdvParams;
  },
  data: PricingData,
): Price {
  const P = data.prices;
  const base = data.globals[params.family];
  const g = {
    ...base,
    ...params.adv,
    gaps: { ...base.gaps, ...(params.adv.gaps || {}) },
  };
  const hMM = g.height;
  const dMM = g.depth;
  const wMM = params.width;
  const h = hMM / 1000;
  const d = dMM / 1000;
  const w = wMM / 1000;
  const boardPrice = P.board[g.boardType] || 0;
  const frontPrice = P.front[g.frontType] || 0;
  const edgingPrice = P.edging['ABS 1mm'] || 0;
  let doors = 0;
  let drawers = 0;
  let cargoW: '150' | '200' | '300' | null = null;
  let aventosType: 'HK' | 'HS' | null = null;
  let kits = 0;

  const rule = variantRules[params.family]?.[params.variant];
  if (rule) {
    doors = rule.doors ?? 0;
    drawers = rule.drawers ?? 0;
    cargoW = rule.cargo ?? null;
    aventosType = rule.aventos ?? null;
    kits = (rule.kits || []).reduce((sum, k) => sum + (P[k] || 0), 0);
  }
  const doorHeightMM = hMM - 100;
  const hingesPerDoor = hingeCountPerDoor(doorHeightMM);
  const hingesCost = (P.hinges['Blum ClipTop'] || 0) * hingesPerDoor * doors;
  const slidesCost = (P.drawerSlide['BLUM LEGRABOX'] || 0) * drawers;
  const legsCount =
    params.family === FAMILY.BASE ? Math.max(4, Math.ceil(wMM / 300) * 2) : 0;
  const legsCost = legsCount * (P.legs['Standard 10cm'] || 0);
  const hangersCount =
    params.family === FAMILY.WALL || params.family === FAMILY.PAWLACZ ? 2 : 0;
  const hangersCost = hangersCount * (P.hangers.Standard || 0);
  const aventosCost = aventosType ? P.aventos[aventosType] || 0 : 0;
  const cargoCost = cargoW ? P.cargo[cargoW] || 0 : 0;
  const backFactor =
    g.backPanel === 'none' ? 0 : g.backPanel === 'split' ? 2 : 1;
  const boardArea =
    2 * (h * d) + 2 * (w * d) + 1 * (w * d) + 0.4 * backFactor * (w * h);
  const boardCost = boardArea * boardPrice;
  const frontArea = w * h;
  const frontCost = frontArea * frontPrice;
  const edgeMeters = 2 * w + 2 * h + 2 * h + 2 * d;
  const edgingCost = edgeMeters * (edgingPrice || 0);
  const cutCost = edgeMeters * (P.cut || 4);
  const labor = P.labor || 0;
  const parts: Parts = {
    board: Math.round(boardCost),
    front: Math.round(frontCost),
    edging: Math.round(edgingCost),
    cut: Math.round(cutCost),
    hinges: Math.round(hingesCost),
    slides: Math.round(slidesCost),
    legs: Math.round(legsCost),
    hangers: Math.round(hangersCost),
    aventos: Math.round(aventosCost),
    cargo: Math.round(cargoCost),
    kits: Math.round(kits),
    labor: Math.round(labor),
  };
  const subtotal = Object.values(parts).reduce((s, n) => s + (n || 0), 0);
  const total = Math.round(subtotal * (1 + (P.margin || 0)));
  const counts: PriceCounts = {
    doors,
    drawers,
    legs: legsCount,
    hangers: hangersCount,
    hinges: hingesPerDoor * doors,
  };
  return { total, parts, counts };
}
