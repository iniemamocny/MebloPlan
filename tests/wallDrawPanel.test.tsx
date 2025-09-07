/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import WallDrawPanel from '../src/ui/WallDrawPanel';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('WallDrawPanel callbacks', () => {
  it('cleans up and reattaches callbacks when reopened', async () => {
    const three: any = {};
    const threeRef = { current: three } as React.MutableRefObject<any>;
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<WallDrawPanel threeRef={threeRef} isOpen isDrawing={false} />);
    });

    const firstLength = three.onLengthChange;
    const firstAngle = three.onAngleChange;
    expect(typeof firstLength).toBe('function');
    expect(typeof firstAngle).toBe('function');

    await act(async () => {
      root.render(null);
    });

    expect(three.onLengthChange).toBeUndefined();
    expect(three.onAngleChange).toBeUndefined();

    await act(async () => {
      root.render(<WallDrawPanel threeRef={threeRef} isOpen isDrawing={false} />);
    });

    const secondLength = three.onLengthChange;
    const secondAngle = three.onAngleChange;
    expect(typeof secondLength).toBe('function');
    expect(typeof secondAngle).toBe('function');
    expect(secondLength).not.toBe(firstLength);
    expect(secondAngle).not.toBe(firstAngle);

    await act(async () => {
      secondLength?.(123);
      secondAngle?.(45);
    });
    expect(container.textContent).toContain('123 mm');
    expect(container.textContent).toContain('45°');

    await act(async () => {
      firstLength?.(999);
      firstAngle?.(999);
    });
    expect(container.textContent).toContain('123 mm');
    expect(container.textContent).toContain('45°');

    await act(async () => {
      root.unmount();
    });
  });
});
