import React from "react";
import { Button } from "./ui/Button";
import "./EmptyState.scss";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state__content">
        <h2 className="empty-state__title">{title}</h2>
        {description && (
          <p className="empty-state__description">{description}</p>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
