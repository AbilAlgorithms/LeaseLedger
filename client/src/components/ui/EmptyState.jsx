import React from 'react';
import Button from './Button';

export default function EmptyState({
  title,
  description,
  icon: Icon,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`p-10 border border-dashed border-outline-variant/60 rounded-lg text-center bg-surface-container-low/30 max-w-lg mx-auto ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-primary mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="font-headline font-semibold text-base text-primary">{title}</h4>
      {description && <p className="text-sm text-on-surface-variant mt-1">{description}</p>}
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
