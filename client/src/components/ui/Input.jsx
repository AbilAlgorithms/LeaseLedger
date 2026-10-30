import React, { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      type = 'text',
      className = '',
      id,
      name,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline"
          >
            {label} {required && <span className="text-error">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          className={clsx(
            'w-full px-3 py-2 text-sm bg-surface-container-lowest border rounded transition-colors duration-150',
            'focus:outline-none focus:ring-1 text-on-surface placeholder:text-outline-variant',
            error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-outline-variant/60 focus:border-primary focus:ring-primary',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-on-surface-variant/80">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
