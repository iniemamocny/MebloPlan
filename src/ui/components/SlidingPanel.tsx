import React from 'react';

interface SlidingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SlidingPanel({ isOpen, onClose, children }: SlidingPanelProps) {
  if (!isOpen) return null;
  return (
    <div className="slidingPanelOverlay" onClick={onClose}>
      <div className="slidingPanel" onClick={(e) => e.stopPropagation()}>
        <button className="slidingPanelClose" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

