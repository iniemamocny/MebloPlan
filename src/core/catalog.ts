export enum FAMILY { BASE='BASE', TALL='TALL', WALL='WALL', PAWLACZ='PAWLACZ' }
export const FAMILY_LABELS: Record<FAMILY,string> = {
  [FAMILY.BASE]:'Dolna',[FAMILY.TALL]:'Słupek',[FAMILY.WALL]:'Górna',[FAMILY.PAWLACZ]:'Pawlacz'
}
export const FAMILY_COLORS: Record<FAMILY,string> = {
  [FAMILY.BASE]:'#3B82F6',[FAMILY.TALL]:'#10B981',[FAMILY.WALL]:'#6B7280',[FAMILY.PAWLACZ]:'#8B5CF6'
}
export type Variant = { key:string; label:string }
export type Kind = { key:string; label:string; variants: Variant[] }
export const KIND_SETS: Record<FAMILY, Kind[]> = {
  [FAMILY.BASE]: [
    {
      key:'doors',
      label:'Drzwiczki',
      variants:[
        { key:'doors', label:'Drzwiczki' }
      ]
    },
    {
      key:'drawers',
      label:'Szuflady',
      variants:[
        { key:'drawers', label:'Szuflady' }
      ]
    },
    {
      key:'corner',
      label:'Narożne',
      variants:[
        { key:'blind-L', label:'Ślepa L' },
        { key:'blind-R', label:'Ślepa P' }
      ]
    },
    {
      key:'sink',
      label:'Zlewy',
      variants:[
        { key:'sink1', label:'1 komora' },
        { key:'sink2', label:'2 komory' }
      ]
    },
    {
      key:'cargo',
      label:'Cargo dolne',
      variants:[
        { key:'cargo150', label:'Cargo 150' },
        { key:'cargo200', label:'Cargo 200' },
        { key:'cargo300', label:'Cargo 300' }
      ]
    },
    {
      key:'appliance',
      label:'AGD dolne',
      variants:[
        { key:'hob', label:'Pod płytę' },
        { key:'dishwasher', label:'Zmywarka' }
      ]
    },
    {
      key:'countertop',
      label:'Blaty',
      variants:[
        { key:'default', label:'Blat' }
      ]
    }
  ],
  [FAMILY.TALL]: [
    {
      key:'tall',
      label:'Słupki',
      variants:[
        { key:'t1', label:'1 drzwi' },
        { key:'t2', label:'2 drzwi' }
      ]
    },
    {
      key:'appliance',
      label:'AGD',
      variants:[
        { key:'oven', label:'Piekarnik' },
        { key:'oven+mw', label:'Piekarnik + MW' },
        { key:'fridge', label:'Lodówka' }
      ]
    }
  ],
  [FAMILY.WALL]: [
    { key:'doors', label:'Drzwiczki', variants:[
      { key:'wd1', label:'1 drzwiczki' },
      { key:'wd2', label:'2 drzwiczki' },
      { key:'hood', label:'Okapowa' },
      { key:'avHK', label:'Aventos HK' },
      { key:'avHS', label:'Aventos HS' }
    ]}
  ],
  [FAMILY.PAWLACZ]: [
    { key:'doors', label:'Drzwiczki', variants:[
      { key:'p1', label:'1 drzwiczki' },
      { key:'p2', label:'2 drzwiczki' },
      { key:'p3', label:'3 drzwiczki' }
    ]}
  ]
}
