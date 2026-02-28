import React from 'react';
import './Select.scss';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;

  includePlaceholder?: boolean;
  placeholderLabel?: string;
  placeholderValue?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  error,
  required,
  className = '',
  includePlaceholder = true,
  placeholderLabel = 'Выберите...',
  placeholderValue = '',
  ...props
}) => {
  const selectClass = `select__field ${error ? 'select__field--error' : ''} ${className}`.trim();

  return (
    <div className="select">
      {label && (
        <label className="select__label">
          {label}
          {required && <span className="select__required">*</span>}
        </label>
      )}
      <select className={selectClass} {...props}>
        {includePlaceholder && <option value={placeholderValue}>{placeholderLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select__error">{error}</span>}
    </div>
  );
};
