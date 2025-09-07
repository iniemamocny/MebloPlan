/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import WallDrawPanel from '../src/ui/WallDrawPanel';
import i18n from '../src/i18n';

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

  it('toggles drawing state when pencil is clicked', async () => {
    const three: any = {};
    const threeRef = { current: three } as React.MutableRefObject<any>;
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);

    const Wrapper = () => {
      const [isDrawing, setIsDrawing] = React.useState(false);
      three.enterTopDownMode = () => three.onEnterTopDownMode?.();
      three.exitTopDownMode = () => three.onExitTopDownMode?.();
      three.onEnterTopDownMode = () => setIsDrawing(true);
      three.onExitTopDownMode = () => setIsDrawing(false);
      return <WallDrawPanel threeRef={threeRef} isOpen isDrawing={isDrawing} />;
    };

    await act(async () => {
      root.render(<Wrapper />);
    });

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.className.includes('active')).toBe(false);

    await act(async () => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(btn.className.includes('active')).toBe(true);

    await act(async () => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(btn.className.includes('active')).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });

  it('cancels drawing when Finish drawing is clicked', async () => {
    const three: any = {};
    const threeRef = { current: three } as React.MutableRefObject<any>;
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);

    const exitSpy = vi.fn(() => three.onExitTopDownMode?.());

    const Wrapper = () => {
      const [isDrawing, setIsDrawing] = React.useState(true);
      three.enterTopDownMode = () => three.onEnterTopDownMode?.();
      three.exitTopDownMode = exitSpy;
      three.onEnterTopDownMode = () => setIsDrawing(true);
      three.onExitTopDownMode = () => setIsDrawing(false);
      return <WallDrawPanel threeRef={threeRef} isOpen isDrawing={isDrawing} />;
    };

    await act(async () => {
      root.render(<Wrapper />);
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    const finishBtn = buttons[1] as HTMLButtonElement;
    expect(finishBtn.textContent).toBe(i18n.t('room.finishDrawing'));

    await act(async () => {
      finishBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(three.exitTopDownMode).toHaveBeenCalled();
    expect(container.querySelectorAll('button').length).toBe(1);

    await act(async () => {
      root.unmount();
    });
  });
});
