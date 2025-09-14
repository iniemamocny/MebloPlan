import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SingleMMInput from '../components/SingleMMInput';
import { usePlannerStore } from '../../state/store';

export default function RoomTab() {
  const { t } = useTranslation();
  const store = usePlannerStore();

  const [openH, setOpenH] = useState(1000);
  const [openW, setOpenW] = useState(1000);
  const [openF, setOpenF] = useState(0);

  const [ceilL, setCeilL] = useState(1000);
  const [ceilW, setCeilW] = useState(1000);
  const [ceilH, setCeilH] = useState(100);

  const iconUrl = (name: string) => `${import.meta.env.BASE_URL}icons/${name}.svg`;

  return (
    <>
      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.windows')}</div></div></div>
        <div className="bd">
          <div className="grid3" style={{ gap: 8 }}>
            <button className="btn" onClick={() => store.selectWindow('single')} title={t('room.windowSingle')}>
              <img src={iconUrl('window-single')} alt={t('room.windowSingle')} />
            </button>
            <button className="btn" onClick={() => store.selectWindow('double')} title={t('room.windowDouble')}>
              <img src={iconUrl('window-double')} alt={t('room.windowDouble')} />
            </button>
            <button className="btn" onClick={() => store.selectWindow('triple')} title={t('room.windowTriple')}>
              <img src={iconUrl('window-triple')} alt={t('room.windowTriple')} />
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="hd"><div><div className="h1">{t('room.doors')}</div></div></div>
        <div className="bd">
          <div className="grid3" style={{ gap: 8 }}>
            <button className="btn" onClick={() => store.selectDoor('single')} title={t('room.doorSingle')}>
              <img src={iconUrl('door-single')} alt={t('room.doorSingle')} />
            </button>
            <button className="btn" onClick={() => store.selectDoor('double')} title={t('room.doorDouble')}>
              <img src={iconUrl('door-double')} alt={t('room.doorDouble')} />
            </button>
            <button className="btn" onClick={() => store.selectDoor('sliding')} title={t('room.doorSliding')}>
              <img src={iconUrl('door-sliding')} alt={t('room.doorSliding')} />
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
