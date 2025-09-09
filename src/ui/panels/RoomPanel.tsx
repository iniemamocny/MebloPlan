import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function RoomPanel() {
  const { t } = useTranslation();
  const [wallsOpen, setWallsOpen] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);

  const Section = ({
    title,
    open,
    setOpen,
  }: {
    title: string;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
      {open && (
        <div className="bd">
          <button className="btnGhost">{t('room.draw')}</button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Section
        title={t('room.walls')}
        open={wallsOpen}
        setOpen={setWallsOpen}
      />
      <Section
        title={t('room.windowsDoors')}
        open={windowsOpen}
        setOpen={setWindowsOpen}
      />
      <Section
        title={t('room.decor')}
        open={decorOpen}
        setOpen={setDecorOpen}
      />
    </>
  );
}
