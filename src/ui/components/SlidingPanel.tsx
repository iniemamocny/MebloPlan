import React, { useEffect, useRef } from 'react';

interface SlidingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function SlidingPanel({
  isOpen,
  onClose,
  children,
  className = '',
}: SlidingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={panelRef} className={`slidingPanel ${className}`}>
      <button className="slidingPanelClose" onClick={onClose}>
        ×
      </button>
      {children}
    </div>
  );
}

