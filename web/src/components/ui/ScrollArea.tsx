import React, { forwardRef } from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  maxHeight?: string | number;
  minHeight?: string | number;
  height?: string | number;
  contentClassName?: string;
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
      style,
      ...props
    },
    ref
  ) => {
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

    return (
      <div
        ref={ref}
        style={customStyle}
        className={`custom-scrollbar ${overflowClass} ${className}`}
        {...props}
      >
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
