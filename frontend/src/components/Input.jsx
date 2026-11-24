import React from 'react';

/**
 * Reusable Form Input Component
 */
export function Input({
  label,
  id,
  error,
  helperText,
  required = false,
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
      <input
        id={inputId}
        className={`form-input ${error ? 'has-error' : ''} ${className}`}
        required={required}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {!error && helperText && <span className="form-help">{helperText}</span>}
    </div>
  );
}

export default Input;
