import React, { FC } from 'react';
import { 
  Zap, 
  X, 
  Plus, 
  Check, 
  Clock, 
  BatteryCharging, 
  Compass, 
  ShieldCheck, 
  Coins, 
  Coffee, 
  Info,
  ArrowRight
} from 'lucide-react';
import { ChargingStation, ChargingStop, VehicleSpec } from '../types';

interface ChargingStationCardProps {
  station: ChargingStation;
  activeStop?: ChargingStop;
  selectedVehicle: VehicleSpec;
  currentSoc: number;
  onClose: () => void;
  onToggleStop?: (station: ChargingStation) => void;
  isPlannedStop?: boolean;
}

export const ChargingStationCard: FC<ChargingStationCardProps> = ({
  station,
  activeStop,
  selectedVehicle,
  currentSoc,
  onClose,
  onToggleStop,
  isPlannedStop = false,
}) => {
  // Approximate power curve and estimate charging duration to 80%
  const effectiveMaxPowerKw = Math.min(station.powerKw, selectedVehicle.maxDcChargingPowerKw);
  const targetSoc = activeStop ? activeStop.targetSoc : 80;
  const arrivalSoc = activeStop ? activeStop.arrivalSoc : Math.max(10, Math.min(currentSoc, 35));
  const deltaSoc = Math.max(0, targetSoc - arrivalSoc);
  const energyKwhNeeded = (deltaSoc / 100) * selectedVehicle.usableCapacityKwh;
  const avgChargingPowerKw = effectiveMaxPowerKw * 0.78; // tapering curve
  const estimatedDurationMin = activeStop 
    ? activeStop.chargingTimeMin 
    : Math.max(15, Math.round((energyKwhNeeded / Math.max(20, avgChargingPowerKw)) * 60));
  const estimatedCostInr = Math.round(energyKwhNeeded * station.pricePerKwh);

  // Availability styling
  const availRatio = station.availablePorts / Math.max(1, station.totalPorts);
  const availColor = availRatio > 0.4 ? 'text-emerald-400' : availRatio > 0 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="cockpit-panel rounded-2xl p-4 sm:p-5 w-full max-w-md shadow-2xl border border-white/[0.1] text-slate-100 font-sans animate-fade-in relative z-30 select-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.25)] flex-shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[210px] sm:max-w-[240px]">
                {station.name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {station.operator} · {station.isFastCharger ? 'Ultra DC Fast Hub' : 'DC Fast Station'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Close station details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3.5 text-xs font-mono">
        {/* Charging Speed */}
        <div className="cockpit-inset p-2.5 rounded-xl">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Charging Speed</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-amber-400">{station.powerKw}</span>
            <span className="text-[10px] text-slate-400 font-sans">kW DC</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5 font-sans truncate">
            Car max: {selectedVehicle.maxDcChargingPowerKw} kW
          </span>
        </div>

        {/* Available Chargers */}
        <div className="cockpit-inset p-2.5 rounded-xl">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Availability</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${availColor}`}>{station.availablePorts}</span>
            <span className="text-slate-400 text-xs">/ {station.totalPorts} free</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5 font-sans">
            Real-time status
          </span>
        </div>

        {/* Distance from Route */}
        <div className="cockpit-inset p-2.5 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Route Detour</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-slate-100">0.4</span>
            <span className="text-[10px] text-slate-400 font-sans">km off</span>
          </div>
          <span className="text-[9px] text-emerald-400 block mt-0.5 font-sans">
            Highway access
          </span>
        </div>
      </div>

      {/* Connectors & Tariff */}
      <div className="cockpit-inset p-2.5 rounded-xl mb-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Connectors</span>
          <span className="font-semibold text-slate-200 mt-0.5 block font-mono text-[11px]">
            {station.connectorTypes.join(' · ')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Tariff</span>
          <span className="font-bold text-slate-200 font-mono text-xs">₹{station.pricePerKwh}/kWh</span>
        </div>
      </div>

      {/* Charging Projection Box */}
      <div className="cockpit-bezel p-3 rounded-xl mb-3.5 space-y-2 border border-white/[0.08]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            Charge Session Projection
          </span>
          <span className="text-emerald-400 font-mono font-bold">
            {arrivalSoc}% → {targetSoc}% SOC
          </span>
        </div>

        {/* Battery Bar */}
        <div className="w-full h-2 rounded-full bg-slate-900 border border-white/[0.08] overflow-hidden flex">
          <div style={{ width: `${arrivalSoc}%` }} className="bg-slate-500 h-full" />
          <div style={{ width: `${deltaSoc}%` }} className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full animate-pulse" />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Duration: <strong className="text-slate-200">{estimatedDurationMin} min</strong>
          </span>
          <span>
            Added: <strong className="text-amber-400">+{energyKwhNeeded.toFixed(1)} kWh</strong> (~₹{estimatedCostInr})
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex items-center gap-2">
        {onToggleStop && (
          <button
            type="button"
            onClick={() => onToggleStop(station)}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              isPlannedStop
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isPlannedStop ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Remove Stop from Route</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charging Stop to Route</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
