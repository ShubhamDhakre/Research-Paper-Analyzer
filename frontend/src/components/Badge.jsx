import React from 'react';

/**
 * Reusable Badge Component for tags and statuses
 */
export function Badge({
  children,
  variant = 'blue',
  className = '',
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;
