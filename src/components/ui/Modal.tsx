import React, { useEffect } from "react";
import "./Modal.scss";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const getContentPadding = (size: "sm" | "md" | "lg") => {
  switch (size) {
    case "sm":
      return "6px 20px 18px";
    case "lg":
      return "6px 32px 24px";
    case "md":
    default:
      return "6px 24px 20px";
  }
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          {title && <h2 className="modal__title">{title}</h2>}
          <button className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div
          className="modal__content"
          style={{ padding: getContentPadding(size) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
