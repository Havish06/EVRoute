import React, { FC, useState } from 'react';
import { Mountain, ArrowUpRight, ArrowDownRight, Zap, Info } from 'lucide-react';
import { RouteOption, GraphNode } from '../types';

interface ElevationProfileProps {
  route: RouteOption;
  nodes: GraphNode[];
}

export const ElevationProfile: FC<ElevationProfileProps> = ({ route, nodes }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build elevation data points along route
  interface ElevationPoint {
    distanceKm: number;
    elevationM: number;
    gradientPercent: number;
    nodeName: string;
    speedKmh: number;
    segmentEnergyKwh: number;
    regenKwh: number;
  }

  const points: ElevationPoint[] = [];
  let cumDistance = 0;

  for (let i = 0; i < route.pathNodeIds.length; i++) {
    const nodeId = route.pathNodeIds[i];
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    if (i === 0) {
      points.push({
        distanceKm: 0,
        elevationM: node.elevationM,
        gradientPercent: 0,
        nodeName: node.name,
        speedKmh: 60,
        segmentEnergyKwh: 0,
        regenKwh: 0,
      });
    } else {
      const seg = route.segments[i - 1];
      cumDistance += seg ? seg.distanceKm : 10;
      points.push({
        distanceKm: Number(cumDistance.toFixed(1)),
        elevationM: node.elevationM,
        gradientPercent: seg ? seg.gradientPercent : 0,
        nodeName: node.name,
        speedKmh: seg ? seg.speedKmh : 60,
        segmentEnergyKwh: seg ? Number(seg.mlPredictedEnergyKwh.toFixed(2)) : 0,
        regenKwh: seg ? Number(seg.regeneratedEnergyKwh.toFixed(2)) : 0,
      });
    }
  }

  if (points.length < 2) return null;

  // Calculate stats
  const minElev = Math.min(...points.map((p) => p.elevationM));
  const maxElev = Math.max(...points.map((p) => p.elevationM));
  const totalDist = points[points.length - 1].distanceKm;

  let totalAscentM = 0;
  let totalDescentM = 0;
  let maxGradient = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevationM - points[i - 1].elevationM;
    if (diff > 0) totalAscentM += diff;
    else totalDescentM += Math.abs(diff);

    if (Math.abs(points[i].gradientPercent) > Math.abs(maxGradient)) {
      maxGradient = points[i].gradientPercent;
    }
  }

  // SVG dimensions
  const svgWidth = 720;
  const svgHeight = 160;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const elevRange = Math.max(100, maxElev - minElev);
  const elevBaseline = Math.max(0, minElev - 20);

  const getX = (dist: number) => paddingLeft + (dist / (totalDist || 1)) * innerWidth;
  const getY = (elev: number) => paddingTop + innerHeight - ((elev - elevBaseline) / elevRange) * innerHeight;

  // Build SVG path
  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(pt.distanceKm);
    const y = getY(pt.elevationM);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Fill area path (closing at bottom)
  const bottomY = getY(elevBaseline);
  const areaD = `${pathD} L ${getX(totalDist)} ${bottomY} L ${getX(0)} ${bottomY} Z`;

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Mountain className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Terrain & Elevation Profile
          </h3>
          <span className="text-xs text-slate-400 font-normal">
            ({route.name.split(' (')[0]})
          </span>
        </div>

        {/* Stats badges */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center text-amber-400 gap-1 bg-slate-800/60 px-2 py-0.5 rounded">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Ascent: +{totalAscentM}m</span>
          </div>
          <div className="flex items-center text-cyan-400 gap-1 bg-slate-800/60 px-2 py-0.5 rounded">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Descent: -{totalDescentM}m</span>
          </div>
          <div className="flex items-center text-purple-400 gap-1 bg-slate-800/60 px-2 py-0.5 rounded hidden sm:flex">
            <span>Peak: {maxElev}m</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 text-slate-400 font-mono text-[10px]"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Terrain area gradient */}
            <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.0" />
            </linearGradient>

            {/* Path gradient */}
            <linearGradient id="elevationLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal elevation lines) */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const elev = Math.round(elevBaseline + ratio * elevRange);
            const y = getY(elev);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#64748b">
                  {elev}m
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#elevationAreaGrad)" />

          {/* Core elevation stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#elevationLineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points / markers along route */}
          {points.map((pt, idx) => {
            const x = getX(pt.distanceKm);
            const y = getY(pt.elevationM);
            const isHovered = hoverIndex === idx;
            const isGhatClimb = pt.gradientPercent > 2.5;
            const isRegenZone = pt.gradientPercent < -0.5;

            return (
              <g
                key={idx}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 3.5}
                  fill={isGhatClimb ? '#f59e0b' : isRegenZone ? '#06b6d4' : '#10b981'}
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Distance labels for key nodes */}
                {(idx === 0 || idx === points.length - 1 || idx % 2 === 0) && (
                  <text
                    x={x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="#64748b"
                    className="text-[9px]"
                  >
                    {pt.distanceKm} km
                  </text>
                )}
              </g>
            );
          })}

          {/* Active Hover crosshair */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.distanceKm)}
                y1={paddingTop}
                x2={getX(hoveredPoint.distanceKm)}
                y2={svgHeight - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>

        {/* Dynamic Tooltip on hover */}
        {hoveredPoint && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-100 block">{hoveredPoint.nodeName}</span>
              <span className="text-slate-400 text-[11px] font-mono">
                Distance: {hoveredPoint.distanceKm} km · Elevation: {hoveredPoint.elevationM} m
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Gradient</span>
                <span className={`font-bold ${hoveredPoint.gradientPercent > 0 ? 'text-amber-400' : hoveredPoint.gradientPercent < 0 ? 'text-cyan-400' : 'text-slate-200'}`}>
                  {hoveredPoint.gradientPercent > 0 ? `+${hoveredPoint.gradientPercent.toFixed(1)}%` : `${hoveredPoint.gradientPercent.toFixed(1)}%`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Segment Energy</span>
                <span className="text-emerald-400 font-bold">{hoveredPoint.segmentEnergyKwh} kWh</span>
              </div>
              {hoveredPoint.regenKwh > 0 && (
                <div className="flex items-center gap-1 text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                  <Zap className="w-3 h-3" />
                  <span>Regen Harvest: {hoveredPoint.regenKwh} kWh</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Physics note */}
      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
        <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <span>
          Gradient force $F_{'{grade}'} = m \cdot g \cdot \sin(\theta)$ is evaluated per segment. The final 28 km Yercaud Ghat ascent (+1,237m at 4.4% average gradient) requires ~5.2 kWh of gravitational mechanical climbing energy alone.
        </span>
      </div>
    </div>
  );
};
