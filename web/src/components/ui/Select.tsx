import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, description, options, error, className = '', id, ...props }, ref) => {
    const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none px-3.5 py-2 bg-gray-100 dark:bg-black/30 border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none transition-colors pr-9 cursor-pointer ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-base-border focus:border-accent'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="absolute right-3 text-gray-400 pointer-events-none"
          />
        </div>

        {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
        {description && !error && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
