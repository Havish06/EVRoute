import { FC, useState } from 'react';
import { Mountain, ArrowUpRight, ArrowDownRight, Zap, Info } from 'lucide-react';
import { RouteOption, GraphNode } from '../types';

interface ElevationProfileProps {
  route: RouteOption;
  nodes: GraphNode[];
}

export const ElevationProfile: FC<ElevationProfileProps> = ({ route, nodes }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeInspectIndex = hoverIndex !== null ? hoverIndex : selectedIndex;

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

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

  const minElev = Math.min(...points.map((p) => p.elevationM));
  const maxElev = Math.max(...points.map((p) => p.elevationM));
  const totalDist = points[points.length - 1].distanceKm;

  let totalAscentM = 0;
  let totalDescentM = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevationM - points[i - 1].elevationM;
    if (diff > 0) totalAscentM += diff;
    else totalDescentM += Math.abs(diff);
  }

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

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(pt.distanceKm);
    const y = getY(pt.elevationM);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const bottomY = getY(elevBaseline);
  const areaD = `${pathD} L ${getX(totalDist)} ${bottomY} L ${getX(0)} ${bottomY} Z`;

  const inspectedPoint = activeInspectIndex !== null ? points[activeInspectIndex] : null;

  return (
    <div className="bg-[#0e1118] rounded-xl border border-white/[0.08] p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/[0.06] mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Mountain className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
            Topographic & Elevation Profile
          </h3>
          <span className="text-[11px] text-slate-500 font-normal">
            ({route.name.split(' (')[0]})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center text-slate-300 gap-1 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06] text-[11px]">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Ascent: +{totalAscentM}m</span>
          </div>
          <div className="flex items-center text-slate-300 gap-1 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06] text-[11px]">
            <ArrowDownRight className="w-3 h-3 text-slate-400" />
            <span>Descent: -{totalDescentM}m</span>
          </div>
          <div className="flex items-center text-slate-400 gap-1 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06] text-[11px] hidden sm:flex">
            <span>Peak: {maxElev}m</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-40 text-slate-400 font-mono text-[10px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#10b981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#080a0f" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="elevationLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
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
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#64748b" className="text-[9px]">
                  {elev}m
                </text>
              </g>
            );
          })}

          <path d={areaD} fill="url(#elevationAreaGrad)" />

          <path
            d={pathD}
            fill="none"
            stroke="url(#elevationLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((pt, idx) => {
            const x = getX(pt.distanceKm);
            const y = getY(pt.elevationM);
            const isInspected = activeInspectIndex === idx;
            const isClimb = pt.gradientPercent > 2.5;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onClick={() => setSelectedIndex(prev => prev === idx ? null : idx)}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isInspected ? 6 : 3.5}
                  fill={isClimb ? '#fbbf24' : '#10b981'}
                  stroke={isInspected ? '#38bdf8' : '#0e1118'}
                  strokeWidth={isInspected ? 2.5 : 1.5}
                />

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

          {inspectedPoint && (
            <g>
              <line
                x1={getX(inspectedPoint.distanceKm)}
                y1={paddingTop}
                x2={getX(inspectedPoint.distanceKm)}
                y2={svgHeight - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>

        {inspectedPoint && (
          <div className="mt-2 p-3 rounded-lg bg-[#141822] border border-cyan-500/30 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-xs">{inspectedPoint.nodeName}</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {selectedIndex === activeInspectIndex ? 'Selected Section' : 'Inspecting Section'}
                </span>
              </div>
              <span className="text-slate-400 text-[10px] font-mono mt-0.5 block">
                Distance: {inspectedPoint.distanceKm} km · Elevation: {inspectedPoint.elevationM} m MSL
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans">GRADIENT</span>
                <span className={`font-bold ${inspectedPoint.gradientPercent > 2 ? 'text-amber-400' : inspectedPoint.gradientPercent < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {inspectedPoint.gradientPercent > 0 ? `+${inspectedPoint.gradientPercent.toFixed(1)}%` : `${inspectedPoint.gradientPercent.toFixed(1)}%`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans">CLIMB ENERGY</span>
                <span className="text-amber-300 font-semibold">
                  {inspectedPoint.gradientPercent > 0
                    ? `Predicted additional energy: +${Math.max(0.2, Number(((inspectedPoint.gradientPercent * 0.23)).toFixed(1)))} kWh`
                    : 'Level / Descent terrain'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans">SEGMENT DRAW</span>
                <span className="text-emerald-400 font-bold">{inspectedPoint.segmentEnergyKwh} kWh</span>
              </div>
              {inspectedPoint.regenKwh > 0 && (
                <div className="flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-[10px]">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Regen Harvest: -{inspectedPoint.regenKwh} kWh</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
        <Info className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
        <span>
          Gradient force F_grade = m · g · sin(θ) computed across each segment. Mechanical hill climb demands gravitational potential energy directly modeled by physics equations.
        </span>
      </div>
    </div>
  );
};
