import React from "react";
import "./Card.scss";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  onClick,
  className = "",
  hoverable = false,
  selected = false,
}) => {
  const cardClass = `card ${hoverable ? "card--hoverable" : ""} ${
    selected ? "card--selected" : ""
  } ${className}`.trim();

  return (
    <div className={cardClass} onClick={onClick}>
      {title && <h3 className="card__title">{title}</h3>}
      <div className="card__content">{children}</div>
    </div>
  );
};
