import React from 'react';

export interface TreeAsciiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  accentColor?: string;
}

export const TreeAsciiIcon: React.FC<TreeAsciiIconProps> = ({
  size = 18,
  className = '',
  accentColor,
  ...props
}) => {
  const accent = accentColor || 'var(--color-accent, #00d2b4)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Root prompt > with accent highlight */}
      <path d="M3 5l3 2.5-3 2.5" stroke={accent} strokeWidth="2.2" />
      {/* Root line --- */}
      <path d="M9 7.5h12" strokeWidth="2.2" />
      {/* Vertical trunk | */}
      <path d="M5 10v10" strokeWidth="2" />
      {/* Branch 1: |--> __ */}
      <path d="M5 14h5l-1.5-1.5m1.5 1.5l-1.5 1.5" strokeWidth="2" />
      <path d="M13 14h8" stroke={accent} strokeWidth="2.2" />
      {/* Branch 2: |--> __ */}
      <path d="M5 20h5l-1.5-1.5m1.5 1.5l-1.5 1.5" strokeWidth="2" />
      <path d="M13 20h5" stroke={accent} strokeWidth="2.2" />
    </svg>
  );
};
