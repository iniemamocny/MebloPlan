export type Lang = 'pl' | 'en'

const translations: Record<Lang, Record<string, string>> = {
  pl: {
    'app.mode': 'Tryb',
    'app.roles.stolarz': 'Stolarz',
    'app.roles.klient': 'Klient',
    'app.resetSelection': 'Reset wyboru',
    'app.undo': 'Cofnij',
    'app.redo': 'Ponów',
    'app.clear': 'Wyczyść',
    'app.wallLabel': 'Ściana {{num}} ({{len}} mm)',
    'app.autoWall': 'Auto pod ścianę',
    'app.material.title': 'Materiał (arkusz)',
    'app.material.boardHeight': 'Wysokość arkusza L (mm)',
    'app.material.boardWidth': 'Szerokość arkusza W (mm)',
    'app.material.kerf': 'Kerf (mm)',
    'app.material.grain': 'Płyta ma usłojenie',
    'app.material.info': 'Bez usłojenia: formatki można obracać (muszą się zmieścić w {{l}}×{{w}} lub {{w}}×{{l}}). Z usłojeniem: elementy wymagające słojów bez rotacji (h≤{{l}}, w≤{{w}}).',
    'app.tabs.cab': 'Kuchnia',
    'app.tabs.room': 'Pomieszczenie',
    'app.tabs.costs': 'Koszty',
    'app.tabs.cut': 'Formatki'
  },
  en: {
    'app.mode': 'Mode',
    'app.roles.stolarz': 'Carpenter',
    'app.roles.klient': 'Client',
    'app.resetSelection': 'Reset selection',
    'app.undo': 'Undo',
    'app.redo': 'Redo',
    'app.clear': 'Clear',
    'app.wallLabel': 'Wall {{num}} ({{len}} mm)',
    'app.autoWall': 'Auto wall',
    'app.material.title': 'Material (sheet)',
    'app.material.boardHeight': 'Board height L (mm)',
    'app.material.boardWidth': 'Board width W (mm)',
    'app.material.kerf': 'Kerf (mm)',
    'app.material.grain': 'Board has grain',
    'app.material.info': 'Without grain: parts may rotate (must fit within {{l}}×{{w}} or {{w}}×{{l}}). With grain: parts requiring grain must not rotate (h≤{{l}}, w≤{{w}}).',
    'app.tabs.cab': 'Cabinets',
    'app.tabs.room': 'Room',
    'app.tabs.costs': 'Costs',
    'app.tabs.cut': 'Cut list'
  }
}

export function createTranslator(lang: Lang){
  return (key: string, vars: Record<string, any> = {}) => {
    const template = translations[lang]?.[key] ?? key
    return template.replace(/\{\{(\w+)\}\}/g, (_, v) => String(vars[v] ?? ''))
  }
}
