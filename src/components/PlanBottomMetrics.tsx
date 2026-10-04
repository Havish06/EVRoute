import React, { FC } from 'react';
import { BatteryMedium, Mountain, Activity, Zap, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { RouteOption } from '../types';

interface PlanBottomMetricsProps {
  activeRoute: RouteOption;
  startSoc: number;
  minimumReserveSoc: number;
  rerouteSuggested?: boolean;
}

export const PlanBottomMetrics: FC<PlanBottomMetricsProps> = ({
  activeRoute,
  startSoc,
  minimumReserveSoc,
  rerouteSuggested = false,
}) => {
  const arrivalSoc = activeRoute.arrivalSoc;
  const isReserveMaintained = arrivalSoc >= minimumReserveSoc;
  const isFeasible = activeRoute.isFeasible;
  const totalClimbM = activeRoute.segments.reduce((sum, s) => {
    return sum + (s.gradientPercent > 0 ? (s.distanceKm * 1000 * (s.gradientPercent / 100)) : 0);
  }, 0);

  const chargingCount = activeRoute.chargingStops.length;

  // Determine route status badge
  let statusText = 'ROUTE FEASIBLE';
  let statusSubtext = 'Battery reserve maintained';
  let statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let dotColor = 'bg-emerald-400';

  if (rerouteSuggested) {
    statusText = 'ENERGY DEVIATION DETECTED';
    statusSubtext = 'Consumption exceeding model baseline';
    statusColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    dotColor = 'bg-rose-400 animate-ping';
  } else if (!isFeasible) {
    statusText = 'DESTINATION UNREACHABLE';
    statusSubtext = 'Exhausts battery before destination';
    statusColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    dotColor = 'bg-rose-400';
  } else if (chargingCount > 0) {
    statusText = 'CHARGING RECOMMENDED';
    statusSubtext = `${chargingCount} fast charging stop(s) scheduled`;
    statusColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    dotColor = 'bg-amber-400';
  }

  return (
    <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-3.5 shadow-xl grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
      {/* 1. BATTERY */}
      <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] flex items-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <BatteryMedium className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">BATTERY</span>
          <div className="text-xs font-bold text-slate-100">
            {startSoc}% → {arrivalSoc}%
          </div>
          <span className="text-[10px] text-slate-400 font-sans block">
            {isReserveMaintained ? 'Reserve maintained' : 'Below reserve'}
          </span>
        </div>
      </div>

      {/* 2. TERRAIN */}
      <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] flex items-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
          <Mountain className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">TERRAIN</span>
          <div className="text-xs font-bold text-slate-100">
            +{Math.round(totalClimbM)}m Ascent
          </div>
          <span className="text-[10px] text-slate-400 font-sans block">
            {totalClimbM > 800 ? 'Ghat climb' : 'Rolling highway'}
          </span>
        </div>
      </div>

      {/* 3. TRAFFIC */}
      <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] flex items-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">TRAFFIC</span>
          <div className="text-xs font-bold text-slate-100">
            Moderate
          </div>
          <span className="text-[10px] text-slate-400 font-sans block">
            Current impact ~1.03x
          </span>
        </div>
      </div>

      {/* 4. CHARGING */}
      <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] flex items-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">CHARGING</span>
          <div className="text-xs font-bold text-slate-100">
            {chargingCount === 0 ? '0 required' : `${chargingCount} Stop Required`}
          </div>
          <span className="text-[10px] text-slate-400 font-sans block">
            {chargingCount === 0 ? 'Direct journey' : `+${activeRoute.totalRechargeTimeMin || 25}m DC fast`}
          </span>
        </div>
      </div>

      {/* 5. ROUTE STATUS INDICATOR */}
      <div className={`p-2.5 rounded-lg border flex flex-col justify-center ${statusColor}`}>
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider font-sans">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span>{statusText}</span>
        </div>
        <span className="text-[10px] font-sans text-slate-300 mt-0.5">
          {statusSubtext}
        </span>
      </div>
    </div>
  );
};
