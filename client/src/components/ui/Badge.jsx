import React from 'react';
import clsx from 'clsx';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
}) {
  const variants = {
    default: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40',
    verified: 'bg-emerald-50 text-verified border border-emerald-200',
    pending: 'bg-amber-50 text-pending border border-amber-200',
    disputed: 'bg-rose-50 text-damage border border-rose-200',
    deteriorated: 'bg-rose-100 text-error font-medium border border-rose-300',
    improved: 'bg-teal-50 text-primary-container border border-teal-200',
    unchanged: 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40',
    landlord: 'bg-primary text-on-primary font-mono font-bold',
    tenant: 'bg-secondary-container text-on-secondary-container font-mono font-bold',
    admin: 'bg-tertiary-fixed text-tertiary font-mono font-bold',
    brass: 'bg-amber-100 text-amber-900 border border-amber-300',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 rounded-sm gap-1',
    md: 'text-xs px-2.5 py-1 rounded gap-1.5',
    lg: 'text-sm px-3 py-1.5 rounded-md gap-2',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium tracking-tight',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

// Dual verification badge pairing Landlord and Tenant
export function DualVerificationBadge({ landlordConfirmed, tenantConfirmed }) {
  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-surface-container-low rounded border border-outline-variant/30 text-xs">
      <span
        className={clsx(
          'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1',
          landlordConfirmed
            ? 'bg-emerald-100 text-verified'
            : 'bg-surface-container-highest text-on-surface-variant/70'
        )}
      >
        <span>LL</span>
        <span>{landlordConfirmed ? '✓' : '—'}</span>
      </span>
      <span
        className={clsx(
          'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1',
          tenantConfirmed
            ? 'bg-emerald-100 text-verified'
            : 'bg-surface-container-highest text-on-surface-variant/70'
        )}
      >
        <span>TN</span>
        <span>{tenantConfirmed ? '✓' : '—'}</span>
      </span>
    </div>
  );
}
