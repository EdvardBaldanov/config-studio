import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, icon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-gray-400 pointer-events-none shrink-0">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3.5 py-2 bg-gray-100 dark:bg-black/30 border rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-colors ${
              icon ? 'pl-9' : ''
            } ${rightElement ? 'pr-10' : ''} ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-base-border focus:border-accent'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2.5 flex items-center">{rightElement}</div>
          )}
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

Input.displayName = 'Input';
