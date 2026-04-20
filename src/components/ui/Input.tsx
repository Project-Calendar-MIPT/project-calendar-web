import React from "react";
import "./Input.scss";

interface InputProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  label?: string;
  error?: string;
  isTextarea?: boolean;
  rightAdornment?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required,
  isTextarea = false,
  rightAdornment,
  className = "",
  ...props
}) => {
  const inputClass =
    `input__field ${error ? "input__field--error" : ""} ${rightAdornment && !isTextarea ? "input__field--with-right-adornment" : ""} ${className}`.trim();
  const controlClass =
    `input__control ${error ? "input__control--error" : ""}`.trim();

  return (
    <div className="input">
      {label && (
        <label className="input__label">
          {label}
          {required && <span className="input__required">*</span>}
        </label>
      )}
      <div className={controlClass}>
        {isTextarea ? (
          <textarea className={inputClass} {...(props as any)} />
        ) : (
          <input className={inputClass} {...(props as any)} />
        )}
        {rightAdornment && !isTextarea && (
          <span className="input__right-adornment">{rightAdornment}</span>
        )}
      </div>
      {error && <span className="input__error">{error}</span>}
    </div>
  );
};
