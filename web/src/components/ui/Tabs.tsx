import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  accentColor?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
  accentColor,
}) => {
  return (
    <div
      className={`flex border-b border-base-border bg-gray-50/50 dark:bg-black/10 overflow-x-auto gap-1 custom-scrollbar shrink-0 select-none ${className}`}
    >
      {items.map((item) => {
        const isSelected = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              color: isSelected && accentColor ? accentColor : undefined,
              borderBottomColor: isSelected && accentColor ? accentColor : undefined,
            }}
            className={`flex items-center space-x-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && <span className="shrink-0 ml-1">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
