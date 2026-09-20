import React from 'react';
import { getButtonColors } from './buttonUtils';

interface PushButton6mmProps {
  buttonColor?: string;
  isPressed?: boolean;
}

export const PushButton6mmShape: React.FC<PushButton6mmProps> = ({
  buttonColor = 'green',
  isPressed = false,
}) => {
  const btnColor = getButtonColors(buttonColor, isPressed);

  return (
    <g>
      {/* 4 Stamped Metal Terminals */}
      <rect x="1.25" y="11.5" width="5.5" height="34" fill="#475569" opacity="0.4" />
      <rect x="35.25" y="11.5" width="5.5" height="34" fill="#475569" opacity="0.4" />

      {/* Top Left Lead */}
      <rect x="1.25" y="1.5" width="5.5" height="15" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      {/* Top Right Lead */}
      <rect x="35.25" y="1.5" width="5.5" height="15" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      {/* Bottom Left Lead */}
      <rect x="1.25" y="40.5" width="5.5" height="15" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      {/* Bottom Right Lead */}
      <rect x="35.25" y="40.5" width="5.5" height="15" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.2" />

      {/* Main 6x6 mm Square Housing Plate */}
      <rect x="4" y="11.5" width="34" height="34" rx="3" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      <rect x="7" y="14.5" width="28" height="28" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

      {/* 4 Corner Rivets */}
      <circle cx="8.5" cy="16" r="1.2" fill="#1e293b" />
      <circle cx="33.5" cy="16" r="1.2" fill="#1e293b" />
      <circle cx="8.5" cy="41" r="1.2" fill="#1e293b" />
      <circle cx="33.5" cy="41" r="1.2" fill="#1e293b" />

      {/* Tactile Button Well & Collar */}
      <circle cx="21" cy="28.5" r="10.5" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
      <circle cx="21" cy="28.5" r="9.5" fill={btnColor.dark} />

      {/* Button Cap with 3D Bevel & Press State */}
      <circle
        cx="21"
        cy="28.5"
        r={isPressed ? '7.5' : '8.5'}
        fill={btnColor.base}
        stroke={btnColor.border}
        strokeWidth="1"
      />
      <ellipse
        cx="21"
        cy="25.5"
        rx="4"
        ry="1.8"
        fill="#ffffff"
        opacity={isPressed ? '0.15' : '0.35'}
      />
    </g>
  );
};

interface PushButton12mmProps {
  buttonColor?: string;
  isPressed?: boolean;
}

export const PushButton12mmShape: React.FC<PushButton12mmProps> = ({
  buttonColor = 'green',
  isPressed = false,
}) => {
  const btnColor = getButtonColors(buttonColor, isPressed);

  return (
    <g>
      {/* Internal bus strips */}
      <rect x="15.75" y="29.5" width="6.5" height="68" fill="#475569" opacity="0.35" />
      <rect x="49.75" y="29.5" width="6.5" height="68" fill="#475569" opacity="0.35" />

      {/* Top Left Lead */}
      <rect x="14.5" y="23" width="9" height="9" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      <rect x="15.75" y="2" width="6.5" height="28" rx="2.5" fill="#64748b" stroke="#334155" strokeWidth="1.4" />

      {/* Top Right Lead */}
      <rect x="48.5" y="23" width="9" height="9" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      <rect x="49.75" y="2" width="6.5" height="28" rx="2.5" fill="#64748b" stroke="#334155" strokeWidth="1.4" />

      {/* Bottom Left Lead */}
      <rect x="14.5" y="95" width="9" height="9" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      <rect x="15.75" y="97" width="6.5" height="28" rx="2.5" fill="#64748b" stroke="#334155" strokeWidth="1.4" />

      {/* Bottom Right Lead */}
      <rect x="48.5" y="95" width="9" height="9" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
      <rect x="49.75" y="97" width="6.5" height="28" rx="2.5" fill="#64748b" stroke="#334155" strokeWidth="1.4" />

      {/* Heavy 12x12 mm Square Housing Plate */}
      <rect x="2" y="29.5" width="68" height="68" rx="4" fill="#f1f5f9" stroke="#334155" strokeWidth="3" />
      <rect x="6" y="33.5" width="60" height="60" rx="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* 4 Corner Rivet Dots */}
      <circle cx="10" cy="37.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <circle cx="62" cy="37.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <circle cx="10" cy="89.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <circle cx="62" cy="89.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />

      {/* Center Tactile Round Collar / Well */}
      <circle cx="36" cy="63.5" r="23" fill="#0f172a" stroke="#334155" strokeWidth="1.8" />
      <circle cx="36" cy="63.5" r="21.5" fill={btnColor.dark} />

      {/* Tactile Big Button Cap */}
      <circle
        cx="36"
        cy="63.5"
        r={isPressed ? '18' : '19.5'}
        fill={btnColor.base}
        stroke={btnColor.border}
        strokeWidth="1.2"
      />
      <ellipse
        cx="36"
        cy="55.5"
        rx="9"
        ry="4"
        fill="#ffffff"
        opacity={isPressed ? '0.15' : '0.32'}
      />
    </g>
  );
};
