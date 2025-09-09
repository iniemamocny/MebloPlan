import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';
import RoomDrawBoard, { shapeToWalls } from '../build/RoomDrawBoard';

export default function RoomPanel() {
  const { t } = useTranslation();
  const [wallsOpen, setWallsOpen] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);

  const Section = ({
    title,
    open,
    setOpen,
    children,
  }: {
    title: string;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    children?: React.ReactNode;
  }) => (
    <div className="section">
      <div className="hd" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="h1">{title}</div>
        </div>
        <button className="btnGhost">
          {open ? t('global.collapse') : t('global.expand')}
        </button>
      </div>
      {open && <div className="bd">{children}</div>}
    </div>
  );

  const room = usePlannerStore((s) => s.room);
  const setRoom = usePlannerStore((s) => s.setRoom);
  const windows = usePlannerStore((s) => s.room.windows);
  const doors = usePlannerStore((s) => s.room.doors);
  const items = usePlannerStore((s) => s.items);
  const wallThickness =
    usePlannerStore((s) => s.selectedWall?.thickness) ?? 0.1;
  const setThickness = usePlannerStore((s) => s.setSelectedWallThickness);
  const setIsRoomDrawing = usePlannerStore((s) => s.setIsRoomDrawing);
  const setSelectedTool = usePlannerStore((s) => s.setSelectedTool);
  const isRoomDrawing = usePlannerStore((s) => s.isRoomDrawing);
  const roomShape = usePlannerStore((s) => s.roomShape);

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoom({ height: parseInt(e.target.value, 10) });
  };

  const handleThicknessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThickness(parseFloat(e.target.value));
  };

  const startDrawing = () => {
    setIsRoomDrawing(true);
    setSelectedTool('wall');
  };

  const closeDrawing = () => {
    const walls = shapeToWalls(roomShape, {
      height: room.height,
      thickness: wallThickness,
    });
    setRoom({ walls });
    setIsRoomDrawing(false);
    setSelectedTool(null);
  };

  return (
    <>
      {isRoomDrawing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ position: 'relative' }}>
            <RoomDrawBoard />
            <button
              className="btnGhost"
              style={{ position: 'absolute', top: 10, right: 10 }}
              onClick={closeDrawing}
            >
              {t('global.close')}
            </button>
          </div>
        </div>
      )}
      <Section
        title={t('room.walls')}
        open={wallsOpen}
        setOpen={setWallsOpen}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            {t('room.height')}
            <input
              type="number"
              value={room.height}
              onChange={handleHeightChange}
            />
          </label>
          <label>
            {t('room.wallThickness')}
            <input
              type="range"
              min={0.08}
              max={0.25}
              step={0.01}
              value={wallThickness}
              onChange={handleThicknessChange}
            />
            <span>{Math.round(wallThickness * 1000)} mm</span>
          </label>
          <button className="btnGhost" onClick={startDrawing}>
            {t('room.draw')}
          </button>
        </div>
      </Section>
      <Section
        title={t('room.windowsDoors')}
        open={windowsOpen}
        setOpen={setWindowsOpen}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            {windows.length + doors.length === 0 ? (
              <div>{t('room.noWindows')}</div>
            ) : (
              <ul>
                {windows.map((_, idx) => (
                  <li key={`w-${idx}`}>{t('items.window')} {idx + 1}</li>
                ))}
                {doors.map((_, idx) => (
                  <li key={`d-${idx}`}>{t('items.door')} {idx + 1}</li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btnGhost">{t('room.addWindow')}</button>
              <button className="btnGhost">{t('room.addDoor')}</button>
            </div>
          </div>
        </div>
      </Section>
      <Section
        title={t('room.decor')}
        open={decorOpen}
        setOpen={setDecorOpen}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <div>{t('room.noDecor')}</div>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.id}>{t(`items.${it.type}`)}</li>
              ))}
            </ul>
          )}
          <button className="btnGhost">{t('room.addDecor')}</button>
        </div>
      </Section>
    </>
  );
}
