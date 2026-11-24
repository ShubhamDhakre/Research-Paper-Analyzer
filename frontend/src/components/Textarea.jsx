import React from 'react';

/**
 * Reusable Form Textarea Component
 */
export function Textarea({
  label,
  id,
  error,
  helperText,
  required = false,
  rows = 4,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label}</span>
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`form-textarea ${error ? 'has-error' : ''} ${className}`}
        required={required}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {!error && helperText && <span className="form-help">{helperText}</span>}
    </div>
  );
}

export default Textarea;
