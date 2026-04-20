import React from "react";
import "./Button.scss";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) => {
  const classNames =
    `button button--${variant} button--${size} ${className}`.trim();

  return (
    <button className={classNames} disabled={disabled || loading} {...props}>
      {loading ? <span className="button__spinner"></span> : children}
    </button>
  );
};
