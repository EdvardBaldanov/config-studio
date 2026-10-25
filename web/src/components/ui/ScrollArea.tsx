import React, { forwardRef, useRef, useCallback } from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  maxHeight?: string | number;
  minHeight?: string | number;
  height?: string | number;
  contentClassName?: string;
  horizontalWheel?: boolean;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      children,
      orientation = 'vertical',
      className = '',
      contentClassName = '',
      maxHeight,
      minHeight,
      height,
      horizontalWheel,
      style,
      onWheel,
      ...props
    },
    ref
  ) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    let overflowClass = 'overflow-y-auto overflow-x-hidden';
    if (orientation === 'horizontal') {
      overflowClass = 'overflow-x-auto overflow-y-hidden';
    } else if (orientation === 'both') {
      overflowClass = 'overflow-auto';
    }

    const customStyle: React.CSSProperties = {
      ...style,
      ...(maxHeight ? { maxHeight } : {}),
      ...(minHeight ? { minHeight } : {}),
      ...(height ? { height } : {}),
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      onWheel?.(e);
      if (e.defaultPrevented) return;

      const shouldScrollHorizontally =
        horizontalWheel ?? (orientation === 'horizontal');

      if (shouldScrollHorizontally && localRef.current) {
        // If user rolls the mouse wheel vertically (deltaY != 0) without horizontal delta,
        // map it to horizontal scroll position
        if (e.deltaY !== 0 && e.deltaX === 0) {
          localRef.current.scrollLeft += e.deltaY;
        }
      }
    };

    return (
      <div
        ref={setRef}
        style={customStyle}
        onWheel={handleWheel}
        className={`custom-scrollbar ${overflowClass} ${className}`}
        {...props}
      >
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
