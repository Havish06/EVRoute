import React, { FC } from 'react';
import { 
  Navigation, 
  Clock, 
  BatteryMedium, 
  Zap, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Layers
} from 'lucide-react';
import { RouteOption, VehicleSpec, ChargingStation } from '../types';

interface RouteInfoFloatingCardProps {
  routes: RouteOption[];
  activeRoute: RouteOption;
  onSelectRoute: (route: RouteOption) => void;
  selectedVehicle: VehicleSpec;
  startSoc: number;
  minimumReserveSoc: number;
  onSelectChargingStation?: (station: ChargingStation) => void;
  onStartDrive?: () => void;
  className?: string;
}

export const RouteInfoFloatingCard: FC<RouteInfoFloatingCardProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  selectedVehicle,
  startSoc,
  minimumReserveSoc,
  onSelectChargingStation,
  onStartDrive,
  className = '',
}) => {
  const arrivalSoc = activeRoute.arrivalSoc;
  const isReserveMaintained = arrivalSoc >= minimumReserveSoc;
  const totalStops = activeRoute.chargingStops.length;
  const rechargeTimeMin = activeRoute.totalRechargeTimeMin || 0;
  const totalTripTimeMin = activeRoute.totalTripTimeWithChargingMin || activeRoute.totalTravelTimeMin;

  const hours = Math.floor(activeRoute.totalTravelTimeMin / 60);
  const minutes = activeRoute.totalTravelTimeMin % 60;
  const totalHours = Math.floor(totalTripTimeMin / 60);
  const totalMins = totalTripTimeMin % 60;

  // Feasibility status badge
  const getStatus = () => {
    if (activeRoute.explanation.points.some(p => p.includes('DESTINATION UNREACHABLE'))) {
      return {
        label: 'BATTERY DEFICIT · EXTRA CHARGE NEEDED',
        color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        dot: 'bg-rose-400',
      };
    }
    if (totalStops > 0) {
      return {
        label: `${totalStops} CHARGING STOP${totalStops > 1 ? 'S' : ''} SCHEDULED`,
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    if (isReserveMaintained) {
      return {
        label: 'ROUTE FEASIBLE · RESERVE MAINTAINED',
        color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    return {
      label: 'LOW ARRIVAL RESERVE BUFFER',
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      dot: 'bg-amber-400',
    };
  };

  const status = getStatus();

  return (
    <div className={`cockpit-panel rounded-2xl p-4 sm:p-5 shadow-2xl border border-white/[0.1] text-slate-100 font-sans select-none max-w-sm sm:max-w-md w-full ${className}`}>
      {/* Header with Feasibility Status */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block">
            Recommended EV Trajectory
          </span>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{activeRoute.name}</span>
          </h2>
        </div>

        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className="truncate max-w-[130px] sm:max-w-none">{status.label}</span>
        </span>
      </div>

      {/* Primary Automotive Telemetry Metrics */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
        {/* Distance & Travel Time */}
        <div className="cockpit-inset p-3 rounded-xl flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">Distance & Motion</span>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-100 font-mono tracking-tight">
              {activeRoute.totalDistanceKm} <span className="text-xs text-slate-400 font-normal">km</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Drive: {hours}h {minutes}m</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-500 font-sans truncate">
            Avg: {Math.round(activeRoute.totalDistanceKm / Math.max(0.5, activeRoute.totalTravelTimeMin / 60))} km/h
          </span>
        </div>

        {/* Energy & Consumption */}
        <div className="cockpit-inset p-3 rounded-xl flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">Energy & Drain</span>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {activeRoute.totalEnergyKwh} <span className="text-xs text-slate-400 font-normal">kWh</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
              {activeRoute.averageWhPerKm} Wh/km
            </div>
          </div>
          <span className="text-[9px] text-slate-500 font-sans truncate">
            Pack: {activeRoute.effectiveCapacityKwh || selectedVehicle.usableCapacityKwh} kWh net
          </span>
        </div>
      </div>

      {/* Battery State Transition Visualization */}
      <div className="cockpit-bezel p-3 rounded-xl mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-slate-100">{startSoc}%</span>
            <span className="text-slate-500 text-[10px] font-sans">START</span>
          </div>

          <ArrowRight className="w-3 h-3 text-slate-500" />

          <div className="flex items-center gap-1.5 font-mono">
            <span className={`font-bold ${isReserveMaintained ? 'text-emerald-400' : 'text-amber-400'}`}>
              {arrivalSoc}%
            </span>
            <span className="text-slate-500 text-[10px] font-sans">ARRIVAL</span>
          </div>
        </div>

        {/* Segmented Dual Fill Battery Meter */}
        <div className="relative w-full h-2 rounded-full bg-slate-950 border border-white/[0.08] overflow-hidden">
          {/* Starting bar */}
          <div 
            style={{ width: `${startSoc}%` }} 
            className="absolute left-0 top-0 bottom-0 bg-slate-700/60"
          />
          {/* Arrival level */}
          <div 
            style={{ width: `${arrivalSoc}%` }} 
            className={`absolute left-0 top-0 bottom-0 ${
              isReserveMaintained ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          {/* Minimum Reserve Marker */}
          <div 
            style={{ left: `${minimumReserveSoc}%` }} 
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
            title={`Minimum reserve threshold: ${minimumReserveSoc}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Min Reserve: <strong className="text-rose-400">{minimumReserveSoc}%</strong></span>
          <span>Safety Margin: <strong className="text-cyan-400">+{Math.max(0, arrivalSoc - minimumReserveSoc)}%</strong></span>
        </div>
      </div>

      {/* Charging Stops & Total Trip Time */}
      <div className="cockpit-inset p-2.5 rounded-xl mb-3.5 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Charging Sessions</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-bold text-amber-400">
              {totalStops === 0 ? '0 Stops' : `${totalStops} Stop${totalStops > 1 ? 's' : ''}`}
            </span>
            {totalStops > 0 && (
              <span className="text-[10px] text-slate-400">({rechargeTimeMin}m charge)</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Total Trip Time</span>
          <span className="font-bold text-slate-100 mt-0.5 block">
            {totalHours}h {totalMins}m
          </span>
        </div>
      </div>

      {/* Charging Stops Interactive Pills (if any) */}
      {totalStops > 0 && (
        <div className="mb-3 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans block">
            En-Route Charging Hubs
          </span>
          <div className="space-y-1">
            {activeRoute.chargingStops.map((stop, i) => (
              <button
                key={stop.station.id}
                type="button"
                onClick={() => onSelectChargingStation && onSelectChargingStation(stop.station)}
                className="w-full text-left p-2 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.05] transition-colors flex items-center justify-between text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-200 truncate group-hover:text-amber-400">
                    {stop.station.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 flex-shrink-0">
                  <span className="text-amber-300 font-bold">+{stop.energyAddedKwh} kWh</span>
                  <span>{stop.chargingTimeMin}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Route Selectors (Energy, Balanced, Fastest) */}
      <div className="pt-2 border-t border-white/[0.08]">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans block mb-1.5">
          Route Profiles
        </span>
        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
          {routes.map((r) => {
            const isSelected = r.id === activeRoute.id;
            const shortLabel = r.type === 'energy_efficient' ? 'ENERGY' : r.type === 'fastest' ? 'FASTEST' : 'BALANCED';
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRoute(r)}
                className={`p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border border-emerald-500 text-slate-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'cockpit-inset hover:border-white/20 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-sans font-bold">
                  <span style={{ color: isSelected ? '#10b981' : undefined }}>{shortLabel}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <div className="text-xs font-bold text-slate-200 mt-0.5">
                  {r.totalEnergyKwh} <span className="text-[9px] text-slate-400 font-normal">kWh</span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                  <span>{Math.floor(r.totalTravelTimeMin / 60)}h{r.totalTravelTimeMin % 60}m</span>
                  <span className={r.arrivalSoc < minimumReserveSoc ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {r.arrivalSoc}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Drive Action Button */}
      {onStartDrive && (
        <button
          type="button"
          onClick={onStartDrive}
          className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4 fill-current" />
          <span>Start Navigation & Live Drive</span>
        </button>
      )}
    </div>
  );
};
