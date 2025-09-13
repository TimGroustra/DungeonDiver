"use client";

import React from 'react';

interface SkeletonWithLegsProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

const SkeletonWithLegs: React.FC<SkeletonWithLegsProps> = ({ x, y, width = 32, height = 32, color = 'white' }) => {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Head */}
      <circle cx="12" cy="4" r="2" />

      {/* Spine */}
      <line x1="12" y1="6" x2="12" y2="12" />

      {/* Ribcage (simplified) */}
      <path d="M9 8h6M9 10h6M9 12h6" />

      {/* Left Arm */}
      <line x1="12" y1="8" x2="8" y2="10" />
      <line x1="8" y1="10" x2="6" y2="14" />

      {/* Right Arm */}
      <line x1="12" y1="8" x2="16" y2="10" />
      <line x1="16" y1="10" x2="18" y2="14" />

      {/* Pelvis */}
      <line x1="9" y1="12" x2="15" y2="12" />

      {/* Left Leg */}
      <line x1="10" y1="12" x2="10" y2="18" /> {/* Thigh */}
      <line x1="10" y1="18" x2="8" y2="22" />  {/* Shin */}
      <line x1="8" y1="22" x2="6" y2="22" />  {/* Foot */}

      {/* Right Leg */}
      <line x1="14" y1="12" x2="14" y2="18" /> {/* Thigh */}
      <line x1="14" y1="18" x2="16" y2="22" /> {/* Shin */}
      <line x1="16" y1="22" x2="18" y2="22" /> {/* Foot */}
    </svg>
  );
};

export default SkeletonWithLegs;