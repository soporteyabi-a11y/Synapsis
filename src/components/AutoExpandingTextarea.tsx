import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

interface AutoExpandingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange?: (val: string) => void;
  minHeight?: number;
}

export const AutoExpandingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoExpandingTextareaProps
>(
  (
    {
      value,
      onChange,
      onValueChange,
      className = '',
      rows = 1,
      minHeight,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;

      // 1. Force strict overflow & resize styles
      el.style.overflow = 'hidden';
      el.style.overflowY = 'hidden';
      el.style.overflowX = 'hidden';
      el.style.resize = 'none';

      // 2. Temporarily collapse to 0px to accurately re-measure scrollHeight
      el.style.height = '0px';

      // 3. Read scrollHeight (content + padding)
      const scrollH = el.scrollHeight;

      // 4. Calculate border box metrics
      const computed = window.getComputedStyle(el);
      const borderTop = parseFloat(computed.borderTopWidth) || 0;
      const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
      const boxSizing = computed.boxSizing;
      const totalBorder = boxSizing === 'border-box' ? (borderTop + borderBottom) : 0;

      // 5. Add safety buffer for font ascenders/descenders, uppercase accents (Á, É, Í, Ó, Ú)
      // and sub-pixel fractional rounding
      const finalHeight = Math.max(scrollH + totalBorder + 4, minHeight || 0);

      // 6. Set calculated height
      el.style.height = `${finalHeight}px`;

      // 7. Ensure scrollTop is reset so top line is never clipped
      el.scrollTop = 0;
    }, [minHeight]);

    // Update synchronously before browser paint
    useLayoutEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Also update on initial mount, window resize, container resize, and font loading
    useEffect(() => {
      adjustHeight();

      // Ensure post-paint and animation frame recalculation
      const rafId = requestAnimationFrame(() => {
        adjustHeight();
      });

      const timer1 = setTimeout(adjustHeight, 50);
      const timer2 = setTimeout(adjustHeight, 200);

      // Trigger after web fonts (like Inter) finish downloading
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          adjustHeight();
        });
      }

      const handleResize = () => adjustHeight();
      window.addEventListener('resize', handleResize);

      let resizeObserver: ResizeObserver | null = null;
      const el = internalRef.current;
      if (typeof ResizeObserver !== 'undefined' && el) {
        resizeObserver = new ResizeObserver(() => {
          adjustHeight();
        });
        resizeObserver.observe(el);
        if (el.parentElement) {
          resizeObserver.observe(el.parentElement);
        }
      }

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer1);
        clearTimeout(timer2);
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }, [adjustHeight]);

    return (
      <textarea
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
        }}
        rows={rows}
        value={value ?? ''}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.value);
          adjustHeight();
        }}
        onInput={(e) => {
          props.onInput?.(e);
          adjustHeight();
        }}
        onFocus={(e) => {
          props.onFocus?.(e);
          adjustHeight();
        }}
        className={`auto-expand-textarea overflow-hidden resize-none block w-full ${className}`}
        style={{
          ...style,
          overflow: 'hidden',
          overflowY: 'hidden',
          overflowX: 'hidden',
          resize: 'none',
          minHeight: minHeight ? `${minHeight}px` : undefined,
        }}
        {...props}
      />
    );
  }
);

AutoExpandingTextarea.displayName = 'AutoExpandingTextarea';
export default AutoExpandingTextarea;
