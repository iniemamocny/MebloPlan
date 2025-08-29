import { describe, it, expect } from 'vitest';
import { aggregateCutlist, cutlistForModule, type CutItem } from '../src/core/cutlist';
import { defaultGlobal } from '../src/state/store';
import { FAMILY } from '../src/core/catalog';

describe('aggregateCutlist', () => {
  it('aggregates items regardless of rotation', () => {
    const items: CutItem[] = [
      { moduleId: 'm1', moduleLabel: 'M1', material: 'Mat', part: 'Panel', qty: 1, w: 100, h: 50 },
      { moduleId: 'm1', moduleLabel: 'M1', material: 'Mat', part: 'Panel', qty: 2, w: 50, h: 100 },
    ];
    const result = aggregateCutlist(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ material: 'Mat', part: 'Panel', w: 50, h: 100, qty: 3 });
  });
});

describe('cutlistForModule partitions and shelves', () => {
  it('includes partitions and custom shelves in cutlist', () => {
    const mod:any = {
      id:'m1', label:'Test', family:FAMILY.BASE, kind:'doors',
      size:{ w:0.6, h:0.8, d:0.55 },
      adv:{ partitions:[{pos:300, thick:18}], shelfLocs:[300,600] },
      price:{ counts:{ doors:1, drawers:0 } }
    }
    const { items } = cutlistForModule(mod, defaultGlobal)
    const part = items.find(i=>i.part==='Przegroda pionowa')
    expect(part?.qty).toBe(1)
    const shelf = items.find(i=>i.part==='Półka')
    expect(shelf?.qty).toBe(2)
  })
})
