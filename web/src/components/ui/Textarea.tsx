import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, description, error, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full px-3.5 py-2.5 bg-gray-100 dark:bg-black/30 border rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-colors font-mono custom-scrollbar ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-base-border focus:border-accent'
          } ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
