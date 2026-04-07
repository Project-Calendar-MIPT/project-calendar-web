import React from 'react';
import './Input.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isTextarea?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required,
  isTextarea = false,
  className = '',
  ...props
}) => {
  const inputClass = `input__field ${error ? 'input__field--error' : ''} ${className}`.trim();

  return (
    <div className="input">
      {label && (
        <label className="input__label">
          {label}
          {required && <span className="input__required">*</span>}
        </label>
      )}
      {isTextarea ? (
        <textarea className={inputClass} {...(props as any)} />
      ) : (
        <input className={inputClass} {...(props as any)} />
      )}
      {error && <span className="input__error">{error}</span>}
    </div>
  );
};
