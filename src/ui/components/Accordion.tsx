import React, { useState } from 'react';

interface AccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="hd" onClick={() => setOpen(!open)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>{title}</div>
        <div>{open ? '-' : '+'}</div>
      </div>
      {open && <div className="bd">{children}</div>}
    </div>
  );
};

export default Accordion;
