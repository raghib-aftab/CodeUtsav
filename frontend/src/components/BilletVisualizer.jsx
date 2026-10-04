import React from 'react';
import { Box, Layers, Maximize } from 'lucide-react';

export default function BilletVisualizer({ 
  measured, 
  target, 
  verdict, 
  deltas 
}) {
  const L = measured?.L || target?.L || 100.0;
  const B = measured?.B || target?.B || 25.0;
  const H = measured?.H || target?.H || 25.0;

  // Scale dimensions to fit neatly in 300x200 SVG viewport
  // Typical L: 100-150mm, B/H: 25-40mm
  const scale = 1.2;
  const lengthPx = Math.max(80, Math.min(180, L * scale));
  const breadthPx = Math.max(30, Math.min(65, B * scale));
  const heightPx = Math.max(25, Math.min(55, H * scale));

  // Isometric projection angles (30 degrees)
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  // Center coordinate of the bottom-front vertex
  const originX = 145;
  const originY = 125;

  // Compute 3D vertices
  // Front face: bottom-left (p0), bottom-right (p1), top-right (p2), top-left (p3)
  // X axis goes down-right, Y axis goes down-left, Z axis goes straight UP
  const dxL = lengthPx * cos30;
  const dyL = lengthPx * sin30;
  const dxB = breadthPx * cos30;
  const dyB = breadthPx * sin30;
  const dzH = heightPx;

  // Front bottom corner (closest to viewer)
  const pFrontBottom = { x: originX, y: originY };
  // Front top corner
  const pFrontTop = { x: originX, y: originY - dzH };
  // Right bottom corner (along Length axis)
  const pRightBottom = { x: originX + dxL, y: originY - dyL };
  // Right top corner
  const pRightTop = { x: originX + dxL, y: originY - dyL - dzH };
  // Left bottom corner (along Breadth axis)
  const pLeftBottom = { x: originX - dxB, y: originY - dyB };
  // Left top corner
  const pLeftTop = { x: originX - dxB, y: originY - dyB - dzH };
  // Back top corner
  const pBackTop = { x: originX + dxL - dxB, y: originY - dyL - dyB - dzH };

  // Face path strings
  const pathTop = `M ${pFrontTop.x} ${pFrontTop.y} L ${pRightTop.x} ${pRightTop.y} L ${pBackTop.x} ${pBackTop.y} L ${pLeftTop.x} ${pLeftTop.y} Z`;
  const pathRight = `M ${pFrontBottom.x} ${pFrontBottom.y} L ${pRightBottom.x} ${pRightBottom.y} L ${pRightTop.x} ${pRightTop.y} L ${pFrontTop.x} ${pFrontTop.y} Z`;
  const pathLeft = `M ${pFrontBottom.x} ${pFrontBottom.y} L ${pLeftBottom.x} ${pLeftBottom.y} L ${pLeftTop.x} ${pLeftTop.y} L ${pFrontTop.x} ${pFrontTop.y} Z`;

  // Verdict accent colors
  let primaryStroke = '#06b6d4';
  let faceColorTop = '#475569';
  let faceColorRight = '#334155';
  let faceColorLeft = '#1e293b';

  if (verdict === 'PASS') {
    primaryStroke = '#10b981';
    faceColorTop = '#065f46';
    faceColorRight = '#047857';
    faceColorLeft = '#064e3b';
  } else if (verdict === 'REWORK') {
    primaryStroke = '#f59e0b';
    faceColorTop = '#78350f';
    faceColorRight = '#92400e';
    faceColorLeft = '#451a03';
  } else if (verdict === 'REJECT') {
    primaryStroke = '#f43f5e';
    faceColorTop = '#881337';
    faceColorRight = '#9f1239';
    faceColorLeft = '#4c0519';
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 relative overflow-hidden">
      
      {/* SVG Canvas */}
      <svg 
        viewBox="0 0 320 180" 
        className="w-full h-40 max-w-[340px] drop-shadow-xl select-none"
      >
        <defs>
          <linearGradient id="topShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Shadow Polygon */}
        <polygon
          points={`${pFrontBottom.x},${pFrontBottom.y + 4} ${pRightBottom.x},${pRightBottom.y + 4} ${pRightBottom.x - dxB},${pRightBottom.y - dyB + 4} ${pLeftBottom.x},${pLeftBottom.y + 4}`}
          fill="#020617"
          opacity="0.6"
        />

        {/* Left Face (Breadth x Height) */}
        <path
          d={pathLeft}
          fill={faceColorLeft}
          stroke={primaryStroke}
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Right Face (Length x Height) */}
        <path
          d={pathRight}
          fill={faceColorRight}
          stroke={primaryStroke}
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Top Face (Length x Breadth) */}
        <path
          d={pathTop}
          fill={faceColorTop}
          stroke={primaryStroke}
          strokeWidth="1.8"
        />

        {/* Surface Highlight */}
        <path
          d={pathTop}
          fill="url(#topShine)"
        />

        {/* Dimension Callout - Length (L) along right bottom edge */}
        <text
          x={originX + dxL / 2 + 10}
          y={originY - dyL / 2 + 16}
          fill="#38bdf8"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          L: {L.toFixed(1)} mm
        </text>

        {/* Dimension Callout - Breadth (B) along left bottom edge */}
        <text
          x={originX - dxB / 2 - 14}
          y={originY - dyB / 2 + 14}
          fill="#38bdf8"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          B: {B.toFixed(1)} mm
        </text>

        {/* Dimension Callout - Height (H) along front vertical edge */}
        <text
          x={originX - 18}
          y={originY - dzH / 2}
          fill="#38bdf8"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="end"
        >
          H: {H.toFixed(1)} mm
        </text>
      </svg>

      <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 mt-1 border-t border-slate-800/80 pt-1.5">
        <span>3D Wireframe Reconstruction</span>
        <span className="text-cyan-400 font-semibold">
          {L.toFixed(1)} x {B.toFixed(1)} x {H.toFixed(1)} mm
        </span>
      </div>

    </div>
  );
}
