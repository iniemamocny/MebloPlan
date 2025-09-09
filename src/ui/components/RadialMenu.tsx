import React from 'react';
import { useTranslation } from 'react-i18next';

interface SubMenu {
  items: (string | null)[];
  selected: number;
  onSelect: (slot: number) => void;
}

interface Props {
  items: (string | null)[];
  selected: number;
  onSelect: (slot: number) => void;
  visible: boolean;
  subMenu?: SubMenu;
}

const RadialMenu: React.FC<Props> = ({
  items,
  selected,
  onSelect,
  visible,
  subMenu,
}) => {
  const { t } = useTranslation();

  if (!visible) return null;

  const size = 200;
  const radius = size / 2;
  const angle = (2 * Math.PI) / items.length;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <svg width={size} height={size} style={{ pointerEvents: 'auto' }}>
        {items.map((item, idx) => {
          const start = idx * angle - Math.PI / 2;
          const end = start + angle;
          const x1 = radius + radius * Math.cos(start);
          const y1 = radius + radius * Math.sin(start);
          const x2 = radius + radius * Math.cos(end);
          const y2 = radius + radius * Math.sin(end);
          const largeArc = angle > Math.PI ? 1 : 0;
          const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const mid = start + angle / 2;
          const tx = radius + radius * 0.6 * Math.cos(mid);
          const ty = radius + radius * 0.6 * Math.sin(mid);
          const label = item ? t(`radial.${item}`) : '';
          const isSelected = selected === idx + 1;
          return (
            <g key={idx}>
              <path
                d={path}
                fill={isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                stroke="#fff"
                onMouseEnter={() => onSelect(idx + 1)}
                onClick={() => onSelect(idx + 1)}
                onTouchStart={() => onSelect(idx + 1)}
              />
              {label && (
                <text
                  x={tx}
                  y={ty}
                  fill="#fff"
                  fontSize={12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {items[selected - 1] === 'wall' && subMenu && (
        <svg
          width={size * 1.5}
          height={size * 1.5}
          style={{
            position: 'absolute',
            top: -(size * 0.25),
            left: -(size * 0.25),
            pointerEvents: 'auto',
          }}
        >
          {subMenu.items.map((item, idx) => {
            const subAngle = (2 * Math.PI) / subMenu.items.length;
            const subRadius = (size * 1.5) / 2;
            const start = idx * subAngle - Math.PI / 2;
            const end = start + subAngle;
            const x1 = subRadius + subRadius * Math.cos(start);
            const y1 = subRadius + subRadius * Math.sin(start);
            const x2 = subRadius + subRadius * Math.cos(end);
            const y2 = subRadius + subRadius * Math.sin(end);
            const largeArc = subAngle > Math.PI ? 1 : 0;
            const path = `M ${subRadius} ${subRadius} L ${x1} ${y1} A ${subRadius} ${subRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            const mid = start + subAngle / 2;
            const tx = subRadius + subRadius * 0.6 * Math.cos(mid);
            const ty = subRadius + subRadius * 0.6 * Math.sin(mid);
            const label = item ? t(`radial.${item}`) : '';
            const isSelected = subMenu.selected === idx + 1;
            return (
              <g key={idx}>
                <path
                  d={path}
                  fill={
                    isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                  }
                  stroke="#fff"
                  onMouseEnter={() => subMenu.onSelect(idx + 1)}
                  onClick={() => subMenu.onSelect(idx + 1)}
                  onTouchStart={() => subMenu.onSelect(idx + 1)}
                />
                {label && (
                  <text
                    x={tx}
                    y={ty}
                    fill="#fff"
                    fontSize={12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default RadialMenu;
