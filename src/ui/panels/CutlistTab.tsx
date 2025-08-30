import { validateParts, type Part } from '../../core/format'
import MultiMaterialPreview from '../components/MultiMaterialPreview'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlannerStore } from '../../state/store'
import { cutlistForModule, aggregateCutlist, toCSV, aggregateEdgebanding } from '../../core/cutlist'
import jsPDF from 'jspdf'
import useLocalStorageState from '../hooks/useLocalStorageState'

export default function CutlistTab(){
  const store = usePlannerStore()
  const { t } = useTranslation()
  const detailedPack = useMemo(()=> store.modules.map(m=>cutlistForModule(m, store.globals)), [store.modules, store.globals])
  const detailed = useMemo(()=> detailedPack.flatMap(p=>p.items), [detailedPack])
  const edgeAll = useMemo(()=> detailedPack.flatMap(p=>p.edges), [detailedPack])
  const aggregated = useMemo(()=> aggregateCutlist(detailed), [detailed])
  const edgeAgg = useMemo(()=> aggregateEdgebanding(edgeAll), [edgeAll])

  const download = (filename:string, data:string, mime='text/plain') => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([data], { type:mime }))
    a.download = filename
    a.click()
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000)
  }

  const exportCSV = () => { download('cutlist_detailed.csv', toCSV(detailed), 'text/csv') }
  const exportCSVagg = () => { download('cutlist_aggregated.csv', toCSV(aggregated), 'text/csv') }
  const exportPDF = () => {
    const doc = new jsPDF({ unit:'mm', format:'a4' })
    let y = 12
    const line = (txt:string) => { doc.text(txt, 12, y); y+=6; if (y>280){ doc.addPage(); y=12 } }
    doc.setFontSize(14); line(t('cutlist.title') + ' — ' + t('cutlist.exportCsv'))
    doc.setFontSize(10); line(t('costs.table.module') + ' | ' + t('cutlist.headers.material') + ' | ' + t('cutlist.headers.part') + ' | ' + t('cutlist.headers.qty') + ' | ' + t('cutlist.headers.w') + ' | ' + t('cutlist.headers.h'))
    detailed.forEach(it=> line(`${it.moduleLabel} (${it.moduleId}) | ${it.material} | ${it.part} | ${it.qty} | ${it.w} | ${it.h}`))
    doc.addPage(); y=12
    doc.setFontSize(14); line(t('cutlist.preview'))
    doc.setFontSize(10); line(t('cutlist.headers.material') + ' | ' + t('cutlist.headers.part') + ' | ' + t('cutlist.headers.qty') + ' | ' + t('cutlist.headers.w') + ' | ' + t('cutlist.headers.h'))
    aggregated.forEach(it=> line(`${it.material} | ${it.part} | ${it.qty} | ${it.w} | ${it.h}`))
    doc.addPage(); y=12
    doc.setFontSize(14); line(t('cutlist.edge'))
    doc.setFontSize(10); line(t('cutlist.headers.material') + ' | ' + t('cutlist.headers.length') + ' | ' + t('cutlist.headers.lengthMb'))
    edgeAgg.forEach(e=> line(`${e.material} | ${Math.round(e.length)} | ${(e.length/1000).toFixed(2)}`))
    doc.save('cutlist.pdf')
  }

  
  const [boardL] = useLocalStorageState<number>('boardL', 2800)
  // Default board width changed from 2100 mm to 2070 mm to reflect updated sheet dimensions
  const [boardW] = useLocalStorageState<number>('boardW', 2070)
  const [boardKerf] = useLocalStorageState<number>('boardKerf', 3)
  const [boardHasGrain] = useLocalStorageState<boolean>('boardHasGrain', true)

  const board = {
    L: boardL,
    W: boardW,
    kerf: boardKerf,
    hasGrain: boardHasGrain
  }
  const items = aggregated.map((row: any) => ({
    w: Math.round(row.w || 0),
    h: Math.round(row.h || 0),
    qty: Math.max(1, Math.round(row.qty || 1)),
    part: row.part || row.material || 'elem',
    requireGrain: /wieniec|półka/i.test(row.part || '')
  }))
  const plan = validateParts(board as any, items as any)
  const packedSheets = (window as any).__packedSheetsLen as number ?? undefined;(window as any).__lastPlan = plan

return (
<div className="section">
      <div className={`card ${plan.ok ? '' : 'danger'}`} style={{ marginBottom: 8 }}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'baseline' }}>
          <div className="h2">{t('cutlist.validation',{width:board.W,height:board.L})}</div>
          <div className="small">{ plan.ok ? t('cutlist.sheets',{sheets:plan.sheets}) : t('cutlist.warning') }</div>
        </div>
        <div className="small">
          { board.hasGrain
            ? t('cutlist.grainInfo.with',{l:board.L,w:board.W})
            : t('cutlist.grainInfo.without') }
        </div>
        { !plan.ok && <div className="small" style={{marginTop:4}}>{plan.reason}</div> }
      </div>

      <MultiMaterialPreview L={board.L} W={board.W} kerf={board.kerf} hasGrain={board.hasGrain} items={items} />

      <div className="hd"><div><div className="h1">{t('cutlist.title')}</div></div></div>
      <div className="bd">
        <div className="row" style={{marginBottom:8}}>
          <button className="btn" onClick={exportCSV}>{t('cutlist.exportCsv')}</button>
          <button className="btnGhost" onClick={exportCSVagg}>{t('cutlist.exportCsvAgg')}</button>
          <button className="btnGhost" onClick={exportPDF}>{t('cutlist.exportPdf')}</button>
        </div>
        <div className="h1" style={{margin:'8px 0'}}>{t('cutlist.preview')}</div>
        <table className="table" style={{marginBottom:12}}>
          <thead><tr><th>{t('cutlist.headers.material')}</th><th>{t('cutlist.headers.part')}</th><th>{t('cutlist.headers.qty')}</th><th>{t('cutlist.headers.w')}</th><th>{t('cutlist.headers.h')}</th></tr></thead>
          <tbody>
            {aggregated.map((it,i)=> <tr key={i}><td>{it.material}</td><td>{it.part}</td><td>{it.qty}</td><td>{it.w}</td><td>{it.h}</td></tr>)}
          </tbody>
        </table>
        <div className="h1" style={{margin:'8px 0'}}>{t('cutlist.edge')}</div>
        <table className="table">
          <thead><tr><th>{t('cutlist.headers.material')}</th><th>{t('cutlist.headers.length')}</th><th>{t('cutlist.headers.lengthMb')}</th></tr></thead>
          <tbody>
            {edgeAgg.map((e,i)=> <tr key={i}><td>{e.material}</td><td>{Math.round(e.length)}</td><td>{(e.length/1000).toFixed(2)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
