import React, { FC } from 'react';
import { 
  CheckCircle2, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Battery, 
  Check, 
  ChevronRight,
  TrendingDown,
  Navigation
} from 'lucide-react';
import { RouteOption, VehicleSpec } from '../types';

interface RouteIntelligencePanelProps {
  routes: RouteOption[];
  activeRoute: RouteOption;
  onSelectRoute: (route: RouteOption) => void;
  selectedVehicle: VehicleSpec;
  startSoc: number;
  minimumReserveSoc: number;
}

export const RouteIntelligencePanel: FC<RouteIntelligencePanelProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  selectedVehicle,
  startSoc,
  minimumReserveSoc,
}) => {
  const arrivalSoc = activeRoute.arrivalSoc;
  const safetyMargin = Math.max(0, arrivalSoc - minimumReserveSoc);

  // Group routes by type
  const energyRoute = routes.find(r => r.type === 'energy_efficient') || routes[0];
  const balancedRoute = routes.find(r => r.type === 'balanced') || routes[1] || routes[0];
  const fastestRoute = routes.find(r => r.type === 'fastest') || routes[2] || routes[0];

  // Visual battery bar percentage calculations
  const batteryLeftPercent = Math.max(0, Math.min(100, arrivalSoc));
  const reservePercent = Math.max(0, Math.min(100, minimumReserveSoc));

  return (
    <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Recommended Route
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            A* Optimal
          </span>
        </div>

        {/* Hero Route Key Metrics */}
        <div className="grid grid-cols-2 gap-2 text-slate-100">
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Distance</span>
            <span className="text-base font-bold font-mono text-slate-100">{activeRoute.totalDistanceKm} km</span>
          </div>
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Estimated Time</span>
            <span className="text-base font-bold font-mono text-slate-100">
              {Math.floor(activeRoute.totalTravelTimeMin / 60)}h {activeRoute.totalTravelTimeMin % 60}m
            </span>
          </div>
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Predicted Energy</span>
            <span className="text-base font-bold font-mono text-emerald-400">{activeRoute.totalEnergyKwh} kWh</span>
          </div>
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Arrival SOC</span>
            <span className={`text-base font-bold font-mono ${arrivalSoc < minimumReserveSoc ? 'text-amber-400' : 'text-emerald-400'}`}>
              {arrivalSoc}%
            </span>
          </div>
        </div>

        {/* Battery SOC Visualization */}
        <div className="mt-3.5 bg-[#141822] p-3 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400 font-sans text-[11px]">Start {startSoc}%</span>
            <span className="text-emerald-400 font-bold font-sans text-[11px]">Arrival {arrivalSoc}%</span>
          </div>

          {/* Graphical Battery Bar */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
            {/* Minimum reserve threshold line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-20"
              style={{ left: `${reservePercent}%` }}
              title={`Minimum reserve threshold (${minimumReserveSoc}%)`}
            />
            {/* Usable remaining battery fill */}
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${batteryLeftPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>Minimum reserve: <strong className="text-amber-300 font-semibold">{minimumReserveSoc}%</strong></span>
            <span>Safety margin: <strong className="text-emerald-300 font-semibold">+{safetyMargin}%</strong></span>
          </div>
        </div>

        {/* WHY THIS ROUTE? */}
        <div className="mt-3.5 bg-[#141822] p-3 rounded-lg border border-white/[0.06]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Why This Route?
          </span>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>Lower predicted net energy consumption vs highway expressway baseline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>Maintains cruising speeds around 70-80 km/h avoiding high-speed aerodynamic drag</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>Preserves minimum {minimumReserveSoc}% safety battery reserve at summit</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>
                {activeRoute.chargingStops.length === 0 
                  ? 'Zero charging stops required for this vehicle pack' 
                  : `${activeRoute.chargingStops.length} fast DC charging stop(s) scheduled`}
              </span>
            </li>
          </ul>
        </div>

        {/* CHARGING REQUIRED SECTION */}
        {activeRoute.chargingStops.length > 0 && (
          <div className="mt-3 bg-[#141822] p-3 rounded-lg border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-sans">
                <Zap className="w-3.5 h-3.5 fill-current" />
                CHARGING REQUIRED ({activeRoute.chargingStops.length} STOP)
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                +{activeRoute.totalRechargeTimeMin}m
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              {activeRoute.chargingStops.map((stop, sIdx) => (
                <div key={sIdx} className="bg-white/[0.03] p-2 rounded border border-white/[0.05]">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span className="truncate max-w-[160px]">{stop.station.name}</span>
                    <span className="text-amber-400 font-bold">{stop.station.powerKw} kW DC</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-sans">
                    <span>Arrive: <strong className="text-slate-200 font-mono">{stop.arrivalSoc}%</strong> → Exit: <strong className="text-emerald-400 font-mono">{stop.targetSoc}%</strong></span>
                    <span className="font-mono text-slate-300">+{stop.energyAddedKwh} kWh ({stop.chargingTimeMin}m)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3 Selectable Compact Route Options */}
      <div className="pt-3 border-t border-white/[0.06]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
          Route Options
        </span>
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          {/* ENERGY */}
          {energyRoute && (
            <button
              type="button"
              onClick={() => onSelectRoute(energyRoute)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeRoute.id === energyRoute.id
                  ? 'bg-emerald-500/15 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/40'
                  : 'bg-[#141822] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between font-sans text-[11px] font-bold text-emerald-400 uppercase mb-1">
                <span>ENERGY</span>
                {activeRoute.id === energyRoute.id && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className="font-semibold text-slate-200">{energyRoute.totalEnergyKwh} kWh</div>
              <div className="text-[10px] text-slate-400">
                {Math.floor(energyRoute.totalTravelTimeMin / 60)}h {energyRoute.totalTravelTimeMin % 60}m
              </div>
              <div className="text-[10px] text-emerald-300 font-semibold">{energyRoute.arrivalSoc}% SOC</div>
            </button>
          )}

          {/* BALANCED */}
          {balancedRoute && (
            <button
              type="button"
              onClick={() => onSelectRoute(balancedRoute)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeRoute.id === balancedRoute.id
                  ? 'bg-sky-500/15 border-sky-400 text-slate-100 ring-1 ring-sky-400/40'
                  : 'bg-[#141822] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between font-sans text-[11px] font-bold text-sky-400 uppercase mb-1">
                <span>BALANCED</span>
                {activeRoute.id === balancedRoute.id && <Check className="w-3 h-3 text-sky-400" />}
              </div>
              <div className="font-semibold text-slate-200">{balancedRoute.totalEnergyKwh} kWh</div>
              <div className="text-[10px] text-slate-400">
                {Math.floor(balancedRoute.totalTravelTimeMin / 60)}h {balancedRoute.totalTravelTimeMin % 60}m
              </div>
              <div className="text-[10px] text-sky-300 font-semibold">{balancedRoute.arrivalSoc}% SOC</div>
            </button>
          )}

          {/* FASTEST */}
          {fastestRoute && (
            <button
              type="button"
              onClick={() => onSelectRoute(fastestRoute)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeRoute.id === fastestRoute.id
                  ? 'bg-cyan-500/15 border-cyan-400 text-slate-100 ring-1 ring-cyan-400/40'
                  : 'bg-[#141822] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between font-sans text-[11px] font-bold text-cyan-400 uppercase mb-1">
                <span>FASTEST</span>
                {activeRoute.id === fastestRoute.id && <Check className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className="font-semibold text-slate-200">{fastestRoute.totalEnergyKwh} kWh</div>
              <div className="text-[10px] text-slate-400">
                {Math.floor(fastestRoute.totalTravelTimeMin / 60)}h {fastestRoute.totalTravelTimeMin % 60}m
              </div>
              <div className="text-[10px] text-cyan-300 font-semibold">{fastestRoute.arrivalSoc}% SOC</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
