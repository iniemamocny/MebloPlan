import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePlannerStore } from '../../state/store';

export const hotbarItems: (string | null)[] = [
  'cup',
  'plate',
  'bottle',
  null,
  null,
  null,
  null,
  null,
  null,
];

const ItemHotbar: React.FC = () => {
  const { t } = useTranslation();
  const selected = usePlannerStore((s) => s.selectedItemSlot);
  const setSelected = usePlannerStore((s) => s.setSelectedItemSlot);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 4,
      }}
    >
      {hotbarItems.map((item, idx) => (
        <div
          key={idx}
          onClick={() => setSelected(idx + 1)}
          style={{
            width: 40,
            height: 40,
            border: '1px solid #fff',
            background:
              selected === idx + 1
                ? 'rgba(255,255,255,0.3)'
                : 'rgba(0,0,0,0.3)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 10 }}>
            {idx + 1}
          </span>
          <span style={{ fontSize: 12 }}>
            {item ? t(`items.${item}`) : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ItemHotbar;
