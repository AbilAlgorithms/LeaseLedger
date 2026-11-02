import React, { forwardRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

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
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

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
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={computedType}
            className={clsx(
              'w-full px-3 py-2 text-sm bg-surface-container-lowest border rounded transition-colors duration-150',
              'focus:outline-none focus:ring-1 text-on-surface placeholder:text-outline-variant',
              isPassword && 'pr-10',
              error
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-outline-variant/60 focus:border-primary focus:ring-primary',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 focus:outline-none focus:text-primary transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
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
