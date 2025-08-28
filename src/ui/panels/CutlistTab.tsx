import { validateParts, type Part } from '../../core/format'
import MultiMaterialPreview from '../components/MultiMaterialPreview'
import React, { useMemo } from 'react'
import { usePlannerStore } from '../../state/store'
import { cutlistForModule, aggregateCutlist, toCSV, aggregateEdgebanding } from '../../core/cutlist'
import jsPDF from 'jspdf'

export default function CutlistTab(){
  const store = usePlannerStore()
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
    doc.setFontSize(14); line('Lista formatek — szczegółowa (z frontami i szufladami)')
    doc.setFontSize(10); line('Moduł | Materiał | Element | Ilość | W (mm) | H (mm)')
    detailed.forEach(it=> line(`${it.moduleLabel} (${it.moduleId}) | ${it.material} | ${it.part} | ${it.qty} | ${it.w} | ${it.h}`))
    doc.addPage(); y=12
    doc.setFontSize(14); line('Lista formatek — agregowana')
    doc.setFontSize(10); line('Materiał | Element | Ilość | W (mm) | H (mm)')
    aggregated.forEach(it=> line(`${it.material} | ${it.part} | ${it.qty} | ${it.w} | ${it.h}`))
    doc.addPage(); y=12
    doc.setFontSize(14); line('Okleina — podsumowanie')
    doc.setFontSize(10); line('Materiał | Długość (mm) | Długość (mb)')
    edgeAgg.forEach(e=> line(`${e.material} | ${Math.round(e.length)} | ${(e.length/1000).toFixed(2)}`))
    doc.save('cutlist.pdf')
  }

  
  const board = {
    L: Number(localStorage.getItem('boardL')||2800),
    // Default board width changed from 2100 mm to 2070 mm to reflect updated sheet dimensions
    W: Number(localStorage.getItem('boardW')||2070),
    kerf: Number(localStorage.getItem('boardKerf')||3),
    hasGrain: (localStorage.getItem('boardHasGrain')||'1')==='1'
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
          <div className="h2">Walidacja formatu {board.W}×{board.L}</div>
          <div className="small">{ plan.ok ? `Arkusze: ${plan.sheets}` : 'Uwaga: formatka nie mieści się' }</div>
        </div>
        <div className="small">
          { board.hasGrain
            ? 'Materiał ma usłojenie: elementy wymagające słojów bez rotacji (h≤L, w≤W).'
            : 'Materiał bez usłojenia: rotacja dozwolona dla wszystkich elementów.' }
        </div>
        { !plan.ok && <div className="small" style={{marginTop:4}}>{plan.reason}</div> }
      </div>

      <MultiMaterialPreview L={board.L} W={board.W} kerf={board.kerf} hasGrain={board.hasGrain} items={items} />

      <div className="hd"><div><div className="h1">Formatki (rozkrój)</div></div></div>
      <div className="bd">
        <div className="row" style={{marginBottom:8}}>
          <button className="btn" onClick={exportCSV}>Eksport CSV — szczegółowy</button>
          <button className="btnGhost" onClick={exportCSVagg}>Eksport CSV — agregowany</button>
          <button className="btnGhost" onClick={exportPDF}>Eksport PDF</button>
        </div>
        <div className="h1" style={{margin:'8px 0'}}>Podgląd (agregowany)</div>
        <table className="table" style={{marginBottom:12}}>
          <thead><tr><th>Materiał</th><th>Element</th><th>Ilość</th><th>W (mm)</th><th>H (mm)</th></tr></thead>
          <tbody>
            {aggregated.map((it,i)=> <tr key={i}><td>{it.material}</td><td>{it.part}</td><td>{it.qty}</td><td>{it.w}</td><td>{it.h}</td></tr>)}
          </tbody>
        </table>
        <div className="h1" style={{margin:'8px 0'}}>Okleina (ABS 1mm/2mm)</div>
        <table className="table">
          <thead><tr><th>Materiał</th><th>Długość (mm)</th><th>Długość (mb)</th></tr></thead>
          <tbody>
            {edgeAgg.map((e,i)=> <tr key={i}><td>{e.material}</td><td>{Math.round(e.length)}</td><td>{(e.length/1000).toFixed(2)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
