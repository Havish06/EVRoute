import React, { FC, useMemo } from 'react';
import { 
  BatteryMedium, 
  Zap, 
  Gauge, 
  TrendingDown, 
  Leaf, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { RouteOption, VehicleSpec, TripInputs } from '../types';

interface EvEnergyPanelProps {
  activeRoute: RouteOption;
  selectedVehicle: VehicleSpec;
  currentSoc: number;
  minimumReserveSoc: number;
  onOpenVehicleSettings?: () => void;
  className?: string;
}

export const EvEnergyPanel: FC<EvEnergyPanelProps> = ({
  activeRoute,
  selectedVehicle,
  currentSoc,
  minimumReserveSoc,
  onOpenVehicleSettings,
  className = '',
}) => {
  const effectiveCapacity = activeRoute.effectiveCapacityKwh || selectedVehicle.usableCapacityKwh;
  const currentKwh = Number(((effectiveCapacity * currentSoc) / 100).toFixed(1));
  const arrivalSoc = activeRoute.arrivalSoc;
  const arrivalKwh = Number(((effectiveCapacity * arrivalSoc) / 100).toFixed(1));

  // Range estimation based on current SOC and average consumption Wh/km
  const avgWhPerKm = Math.max(90, activeRoute.averageWhPerKm || selectedVehicle.baseWhPerKm);
  const remainingRangeKm = Math.round((currentKwh * 1000) / avgWhPerKm);

  // Regenerative efficiency data
  const totalRegenKwh = activeRoute.segments.reduce((acc, s) => acc + (s.regeneratedEnergyKwh || 0), 0);
  const regenPercent = Math.round(selectedVehicle.regenEfficiency * 100);

  // Status color
  const isReserveViolated = arrivalSoc < minimumReserveSoc;
  const statusColor = isReserveViolated 
    ? 'text-rose-400' 
    : arrivalSoc < minimumReserveSoc + 10 
    ? 'text-amber-400' 
    : 'text-emerald-400';

  // Battery bar segments (10 ticks)
  const ticks = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className={`cockpit-panel rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-white/[0.1] text-slate-100 font-sans select-none ${className}`}>
      {/* Top Instrument Bezel Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 font-mono">
            EV Energy Instrument
          </span>
        </div>

        {onOpenVehicleSettings && (
          <button
            type="button"
            onClick={onOpenVehicleSettings}
            className="text-[10px] font-mono text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
            title="Inspect Battery State-of-Health"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{activeRoute.batteryHealthPercent || 100}% SoH</span>
          </button>
        )}
      </div>

      {/* Main Dual Gauge Display */}
      <div className="grid grid-cols-2 gap-3 my-3">
        {/* Current Battery Gauge */}
        <div className="cockpit-inset p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">Current Pack</span>
            <BatteryMedium className={`w-3.5 h-3.5 ${currentSoc <= 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
                {Math.round(currentSoc)}
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">%</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {currentKwh} / {effectiveCapacity.toFixed(1)} kWh
            </div>
          </div>
          {/* Segmented meter */}
          <div className="flex gap-0.5 h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden p-0.5">
            {ticks.map((t) => (
              <div
                key={t}
                className={`flex-1 rounded-[1px] transition-colors ${
                  currentSoc >= t 
                    ? t <= 20 ? 'bg-rose-500' : t <= 40 ? 'bg-amber-400' : 'bg-emerald-400'
                    : 'bg-white/[0.06]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Arrival Battery Prediction */}
        <div className="cockpit-inset p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">Arrival SOC</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
              isReserveViolated ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {arrivalSoc >= minimumReserveSoc ? 'Reserve OK' : 'Low Buffer'}
            </span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${statusColor}`}>
                {arrivalSoc}
              </span>
              <span className={`text-xs font-bold font-mono ${statusColor}`}>%</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              ~{arrivalKwh} kWh remaining
            </div>
          </div>
          {/* Progress bar to reserve */}
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(100, arrivalSoc)}%` }} 
              className={`h-full ${isReserveViolated ? 'bg-rose-500' : 'bg-emerald-400'}`} 
            />
          </div>
        </div>
      </div>

      {/* Tri-Metric Cockpit Bar */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        {/* Estimated Range */}
        <div className="cockpit-bezel p-2 rounded-xl text-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Est. Range</span>
          <div className="font-bold text-slate-100 text-sm mt-0.5">
            {remainingRangeKm} <span className="text-[10px] text-slate-400 font-normal">km</span>
          </div>
          <span className="text-[8px] text-emerald-400 block font-sans">Dynamic</span>
        </div>

        {/* Consumption Wh/km */}
        <div className="cockpit-bezel p-2 rounded-xl text-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Rate</span>
          <div className="font-bold text-cyan-400 text-sm mt-0.5">
            {avgWhPerKm} <span className="text-[10px] text-slate-400 font-normal">Wh/km</span>
          </div>
          <span className="text-[8px] text-slate-400 block font-sans">ML Predicted</span>
        </div>

        {/* Regenerative Recovery */}
        <div className="cockpit-bezel p-2 rounded-xl text-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Regen Rec.</span>
          <div className="font-bold text-emerald-300 text-sm mt-0.5">
            +{totalRegenKwh.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">kWh</span>
          </div>
          <span className="text-[8px] text-slate-400 block font-sans">{regenPercent}% kinetic</span>
        </div>
      </div>
    </div>
  );
};
