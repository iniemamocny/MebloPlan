import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Group, Hammer } from 'lucide-react';
import SingleMMInput from '../components/SingleMMInput';
import { usePlannerStore } from '../../state/store';

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
              <SingleMMInput value={wallT} onChange={setWallT} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <button
                className="btnGhost"
                title={t('room.pencil')}
                onClick={() => store.drawWalls(wallH, wallT)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="btnGhost"
                title={t('room.group')}
                onClick={() => store.setSelectedTool('group')}
              >
                <Group size={16} />
              </button>
              <button
                className="btnGhost"
                title={t('room.hammer')}
                onClick={() => store.setSelectedTool('hammer')}
              >
                <Hammer size={16} />
              </button>
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
