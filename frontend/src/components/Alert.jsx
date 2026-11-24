import React from 'react';

/**
 * Reusable Alert Component for feedback and system notifications
 */
export function Alert({
  type = 'info',
  title,
  children,
  onClose,
  className = ''
}) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    danger: '🛑'
  };

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <span className="alert-icon">{icons[type] || 'ℹ️'}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          aria-label="Close alert"
        >
          &times;
        </button>
      )}
    </div>
  );
}

export default Alert;
