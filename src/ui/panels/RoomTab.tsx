import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SingleMMInput from '../components/SingleMMInput';
import { usePlannerStore } from '../../state/store';

const thicknessOptions = [
  50, 60, 70, 80, 90, 100, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250,
];

export default function RoomTab() {
  const { t } = useTranslation();
  const store = usePlannerStore();

  const [wallH, setWallH] = useState(2700);
  const [wallT, setWallT] = useState(120);

  const [openH, setOpenH] = useState(1000);
  const [openW, setOpenW] = useState(1000);
  const [openF, setOpenF] = useState(0);

  const [ceilL, setCeilL] = useState(1000);
  const [ceilW, setCeilW] = useState(1000);
  const [ceilH, setCeilH] = useState(100);

  return (
    <>
      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.walls')}</div></div></div>
        <div className="bd">
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div className="small">{t('room.height')}</div>
              <SingleMMInput value={wallH} onChange={setWallH} />
            </div>
            <div>
              <div className="small">{t('room.thickness')}</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  className="btn"
                  onClick={() => setWallT((t) => Math.max(1, t - 1))}
                  title="-"
                >
                  -
                </button>
                <select
                  className="input"
                  value={wallT}
                  onChange={(e) => setWallT(Number(e.target.value))}
                >
                  {[...new Set([...thicknessOptions, wallT])]
                    .sort((a, b) => a - b)
                    .map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                </select>
                <button
                  className="btn"
                  onClick={() => setWallT((t) => t + 1)}
                  title="+"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.windows')}</div></div></div>
        <div className="bd">
          <div className="grid3" style={{ gap: 8 }}>
            <button className="btn" onClick={() => store.selectWindow('single')} title={t('room.windowSingle')}>
              <img src="/icons/window-single.svg" alt={t('room.windowSingle')} />
            </button>
            <button className="btn" onClick={() => store.selectWindow('double')} title={t('room.windowDouble')}>
              <img src="/icons/window-double.svg" alt={t('room.windowDouble')} />
            </button>
            <button className="btn" onClick={() => store.selectWindow('triple')} title={t('room.windowTriple')}>
              <img src="/icons/window-triple.svg" alt={t('room.windowTriple')} />
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.doors')}</div></div></div>
        <div className="bd">
          <div className="grid3" style={{ gap: 8 }}>
            <button className="btn" onClick={() => store.selectDoor('single')} title={t('room.doorSingle')}>
              <img src="/icons/door-single.svg" alt={t('room.doorSingle')} />
            </button>
            <button className="btn" onClick={() => store.selectDoor('double')} title={t('room.doorDouble')}>
              <img src="/icons/door-double.svg" alt={t('room.doorDouble')} />
            </button>
            <button className="btn" onClick={() => store.selectDoor('sliding')} title={t('room.doorSliding')}>
              <img src="/icons/door-sliding.svg" alt={t('room.doorSliding')} />
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.openings')}</div></div></div>
        <div className="bd">
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div className="small">{t('room.height')}</div>
              <SingleMMInput value={openH} onChange={setOpenH} />
            </div>
            <div>
              <div className="small">{t('room.width')}</div>
              <SingleMMInput value={openW} onChange={setOpenW} />
            </div>
            <div>
              <div className="small">{t('room.floorHeight')}</div>
              <SingleMMInput value={openF} onChange={setOpenF} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => {
                  store.insertOpening(openH, openW, openF);
                }}
              >
                {t('room.insert')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.dropCeiling')}</div></div></div>
        <div className="bd">
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div className="small">{t('room.length')}</div>
              <SingleMMInput value={ceilL} onChange={setCeilL} />
            </div>
            <div>
              <div className="small">{t('room.width')}</div>
              <SingleMMInput value={ceilW} onChange={setCeilW} />
            </div>
            <div>
              <div className="small">{t('room.height')}</div>
              <SingleMMInput value={ceilH} onChange={setCeilH} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => {
                  store.placeDropCeiling(ceilL, ceilW, ceilH);
                }}
              >
                {t('room.place')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
