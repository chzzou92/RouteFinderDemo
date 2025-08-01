import React from 'react';

export default function PadButton({ className, svgPath, children, onClick }) {
  return (
    <div className="btn">
      <button className={className} onClick={onClick}>
        {svgPath ? (
          <svg viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" className={className.replace("button", "svg")}>
            <path d={svgPath} />
          </svg>
        ) : (
          <span className="button_text">{children}</span>
        )}
      </button>
    </div>
  );
}
