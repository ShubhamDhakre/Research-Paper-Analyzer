import React from 'react';
import { Button } from './Button';

/**
 * Reusable Empty State Component
 */
export function EmptyState({
  icon = '📂',
  title = 'No items found',
  description = 'Get started by creating your first item.',
  actionLabel,
  onAction
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
