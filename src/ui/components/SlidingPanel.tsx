import React, { useEffect, useRef } from 'react';

interface SlidingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  locked?: boolean;
}

export default function SlidingPanel({
  isOpen,
  onClose,
  children,
  className = '',
  locked = false,
}: SlidingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || locked) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose, locked]);

  return (
    <div ref={panelRef} className={`slidingPanel ${className}`}>
      {!locked && (
        <button className="slidingPanelClose" onClick={onClose}>
          ×
        </button>
      )}
      {children}
    </div>
  );
}

