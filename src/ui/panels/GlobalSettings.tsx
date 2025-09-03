import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlannerStore } from '../../state/store'
import { FAMILY } from '../../core/catalog'

const FamList = [FAMILY.BASE, FAMILY.WALL, FAMILY.PAWLACZ, FAMILY.TALL]

export default function GlobalSettings(){
  const store = usePlannerStore()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [openFam, setOpenFam] = useState(FAMILY.BASE)

  const Field = ({label, value, onChange, type='number', step='1', options}:{label:string; value:any; onChange:(v:any)=>void; type?:'number'|'select'; step?:string; options?:(string|{value:string; label:string})[]}) => (
    <div>
      <div className="small">{label}</div>
      {type==='select'
        ? (
          <select className="input" value={value} onChange={e=>onChange((e.target as HTMLSelectElement).value)}>
            {options!.map(opt =>
              typeof opt === 'string'
                ? <option key={opt} value={opt}>{opt}</option>
                : <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
          </select>
        )
        : <input className="input" type="number" step={step} value={value} onChange={e=>onChange(Number((e.target as HTMLInputElement).value)||0)} />
      }
    </div>
  )

  const SectionGroup = ({fam}:{fam:any}) => {
    const g = store.globals[fam]
    const isOpen = openFam===fam
    const set = (patch:any)=>store.updateGlobals(fam, patch)
    return (
      <div className="section" style={{marginTop:8}}>
        <div className="hd" onClick={()=>setOpenFam(prev=> prev===fam ? null : fam)}>
          <div><div className="h1">{t('global.settings',{family:fam})}</div></div>
          <button className="btnGhost">{isOpen?t('global.collapse'):t('global.expand')}</button>
        </div>
        {isOpen && <div className="bd">
          <div className="grid3">
            <Field label={t('global.height')} value={g.height} onChange={(v)=>set({height:v})} />
            <Field label={t('global.depth')} value={g.depth} onChange={(v)=>set({depth:v})} />
            <Field label={t('global.boardType')} type="select" value={g.boardType} onChange={(v)=>set({boardType:v})} options={Object.keys(store.prices.board)} />
            <Field
              label={t('global.frontType')}
              type="select"
              value={g.frontType}
              onChange={(v)=>set({frontType:v})}
              options={Object.keys(store.prices.front).filter(k => !k.includes('stowalna'))}
            />
            <Field
              label={t('configurator.carcassType')}
              type="select"
              value={g.carcassType}
              onChange={(v)=>set({carcassType:v})}
              options={[
                { value: 'type1', label: t('configurator.carcassTypes.type1') },
                { value: 'type2', label: t('configurator.carcassTypes.type2') },
                { value: 'type3', label: t('configurator.carcassTypes.type3') },
                { value: 'type4', label: t('configurator.carcassTypes.type4') },
                { value: 'type5', label: t('configurator.carcassTypes.type5') }
              ]}
            />
            <Field
              label={t('global.backPanel')}
              type="select"
              value={g.backPanel||'full'}
              onChange={(v)=>set({backPanel:v})}
              options={[
                { value: 'full', label: t('configurator.backOptions.full') },
                { value: 'split', label: t('configurator.backOptions.split') },
                { value: 'none', label: t('configurator.backOptions.none') }
              ]}
            />
            {fam===FAMILY.BASE && (<>
              <Field label={t('global.legs')} type="select" value={g.legsType} onChange={(v)=>set({legsType:v})} options={Object.keys(store.prices.legs)} />
              <Field label={t('global.legsHeight')} value={g.legsHeight||0} onChange={(v)=>set({legsHeight:v})} />
              <Field label={t('global.offsetWall')} value={g.offsetWall||0} onChange={(v)=>set({offsetWall:v})} />
            </>)}
            {(fam===FAMILY.WALL || fam===FAMILY.PAWLACZ) && (<>
              <Field label={t('global.hanger')} type="select" value={g.hangerType} onChange={(v)=>set({hangerType:v})} options={Object.keys(store.prices.hangers)} />
              <Field label={t('global.offsetWall')} value={g.offsetWall||0} onChange={(v)=>set({offsetWall:v})} />
            </>)}
          </div>
          <div style={{marginTop:8}}>
            <div className="h1" style={{fontSize:14, marginBottom:6}}>{t('global.gapsTitle')}</div>
            <div className="grid3">
              <Field label={t('global.gapLeft')} value={g.gaps.left} onChange={(v)=>set({ gaps:{ ...g.gaps, left:v } })} step="0.5" />
              <Field label={t('global.gapRight')} value={g.gaps.right} onChange={(v)=>set({ gaps:{ ...g.gaps, right:v } })} step="0.5" />
              <Field label={t('global.gapTop')} value={g.gaps.top} onChange={(v)=>set({ gaps:{ ...g.gaps, top:v } })} step="0.5" />
              <Field label={t('global.gapBottom')} value={g.gaps.bottom} onChange={(v)=>set({ gaps:{ ...g.gaps, bottom:v } })} step="0.5" />
              <Field label={t('global.gapBetween')} value={g.gaps.between} onChange={(v)=>set({ gaps:{ ...g.gaps, between:v } })} step="0.5" />
            </div>
          </div>
        </div>}
      </div>
    )
  }

  return (
    <div className="section">
      <div className="hd" onClick={()=>setOpen(o=>!o)}>
        <div><div className="h1">{t('global.title')}</div></div>
        <button className="btnGhost">{open?t('global.collapse'):t('global.expand')}</button>
      </div>
      {open && <div className="bd">
        {FamList.map(f=><SectionGroup key={f} fam={f} />)}
        <div className="section" style={{marginTop:8}}>
          <div className="hd"><div className="h1">{t('global.pricing')}</div></div>
          <div className="bd grid3">
            <div><div className="small">{t('global.margin')}</div><input className="input" type="number" step="0.01" value={store.prices.margin} onChange={e=>store.updatePrices({margin: Math.max(0,Math.min(1, Number((e.target as HTMLInputElement).value)||0))})}/></div>
            <div><div className="small">{t('global.labor')}</div><input className="input" type="number" step="1" value={store.prices.labor} onChange={e=>store.updatePrices({labor: Number((e.target as HTMLInputElement).value)||0})}/></div>
            <div><div className="small">{t('global.cut')}</div><input className="input" type="number" step="0.1" value={store.prices.cut} onChange={e=>store.updatePrices({cut: Number((e.target as HTMLInputElement).value)||0})}/></div>
          </div>
        </div>
      </div>}
    </div>
  )
}
