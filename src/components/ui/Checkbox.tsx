import React from "react";
import "./Checkbox.scss";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = "",
  ...props
}) => {
  return (
    <label className={`checkbox ${className}`.trim()}>
      <input type="checkbox" className="checkbox__input" {...props} />
      <span className="checkbox__checkmark"></span>
      {label && <span className="checkbox__label">{label}</span>}
    </label>
  );
};
