"use client";

import React, { useMemo } from "react";

interface WheelOption {
  id: string;
  text: string;
  isPicked: boolean;
  colorIndex: number;
}

interface WheelProps {
  options: WheelOption[];
  rotation: number;
  isSpinning: boolean;
}

const COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#facc15", "#a3e635", 
  "#4ade80", "#34d399", "#2dd4bf", "#22d3ee", "#38bdf8",
  "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9",
  "#f472b6", "#fb7185"
];

const GRAY_COLOR = "#9ca3af"; // zinc-400

const Wheel: React.FC<WheelProps> = ({ options, rotation, isSpinning }) => {
  const size = 500;
  const center = size / 2;
  const radius = center - 10;
  
  const segments = useMemo(() => {
    const anglePerSegment = 360 / options.length;
    return options.map((option, i) => {
      const startAngle = i * anglePerSegment;
      const endAngle = (i + 1) * anglePerSegment;
      
      // Convert angles to radians
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);
      
      // Calculate coordinates
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      
      // SVG path for a slice
      const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
      const pathData = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;
      
      return {
        pathData,
        color: option.isPicked ? GRAY_COLOR : COLORS[option.colorIndex % COLORS.length],
        label: option.text,
        labelAngle: startAngle + anglePerSegment / 2,
        isPicked: option.isPicked
      };
    });
  }, [options, center, radius]);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[500px] aspect-square mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 -translate-y-[10%] w-[8%] h-[8%]">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M20 40L35 10H5L20 40Z" fill="currentColor" className="text-zinc-900 dark:text-zinc-100 drop-shadow-md" />
        </svg>
      </div>
      
      {/* Wheel SVG */}
      <div
        className={`w-full h-full transition-transform duration-[5000ms] cubic-bezier(0.1, 0, 0, 1) ${isSpinning ? "blur-[0.5px]" : "blur-0"}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {segments.map((seg, i) => (
            <g key={i}>
              <path d={seg.pathData} fill={seg.color} stroke="white" strokeWidth="2" />
              <text
                x={center + (radius * 0.85) * Math.cos((seg.labelAngle - 90) * (Math.PI / 180))}
                y={center + (radius * 0.85) * Math.sin((seg.labelAngle - 90) * (Math.PI / 180))}
                fill="white"
                fontSize="12"
                fontWeight="bold"
                fontFamily="var(--font-playfair)"
                textAnchor="start"
                transform={`rotate(${seg.labelAngle + 90}, ${center + (radius * 0.85) * Math.cos((seg.labelAngle - 90) * (Math.PI / 180))}, ${center + (radius * 0.85) * Math.sin((seg.labelAngle - 90) * (Math.PI / 180))})`}
                className="select-none pointer-events-none drop-shadow-sm"
              >
                {seg.label.length > 20 ? seg.label.slice(0, 17) + "..." : seg.label}
              </text>
            </g>
          ))}
          {/* Inner Circle */}
          <circle cx={center} cy={center} r="20" fill="white" stroke="#e2e8f0" strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
};

export default Wheel;
