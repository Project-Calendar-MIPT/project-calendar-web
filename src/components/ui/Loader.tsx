import React from "react";
import "./Loader.scss";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = "md", text }) => {
  return (
    <div className="loader">
      <div className={`loader__spinner loader__spinner--${size}`}></div>
      {text && <p className="loader__text">{text}</p>}
    </div>
  );
};
