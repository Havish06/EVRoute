import React, { FC } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Zap, 
  Battery, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  MapPin,
  Navigation
} from 'lucide-react';
import { RouteOption, VehicleSpec } from '../types';

interface RouteComparisonProps {
  routes: RouteOption[];
  activeRoute: RouteOption;
  onSelectRoute: (route: RouteOption) => void;
  selectedVehicle: VehicleSpec;
  minimumReserveSoc: number;
}

export const RouteComparison: FC<RouteComparisonProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  selectedVehicle,
  minimumReserveSoc,
}) => {
  if (routes.length === 0) return null;

  // Find baseline fastest route to calculate savings
  const fastestRoute = routes.find(r => r.type === 'fastest') || routes[0];
  const efficientRoute = routes.find(r => r.type === 'energy_efficient') || routes[0];
  const energySavedKwh = Number(Math.max(0, fastestRoute.totalEnergyKwh - efficientRoute.totalEnergyKwh).toFixed(1));
  const batteryPercentSaved = Math.round((energySavedKwh / selectedVehicle.usableCapacityKwh) * 100);

  return (
    <div className="space-y-4">
      {/* Route Cards Comparison Matrix */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
              A* Route Evaluation & Comparison
            </h3>
          </div>
          {energySavedKwh > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Saves {energySavedKwh} kWh ({batteryPercentSaved}% battery)</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routes.map((route) => {
            const isSelected = route.id === activeRoute.id;
            const hours = Math.floor(route.totalTravelTimeMin / 60);
            const mins = route.totalTravelTimeMin % 60;
            const isBelowReserve = route.arrivalSoc < minimumReserveSoc;

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route)}
                className={`relative rounded-xl p-4 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selected</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: route.color }}
                  />
                  <h4 className="text-xs font-bold text-slate-100 truncate pr-16">
                    {route.name.replace(' (Time Baseline)', '')}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      Travel Time
                    </span>
                    <span className="text-slate-100 font-bold text-sm">
                      {hours}h {mins}m
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Predicted Energy
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {route.totalEnergyKwh} kWh
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                      <Battery className="w-3 h-3 text-emerald-400" />
                      Arrival SOC
                    </span>
                    <span className={`font-bold text-sm ${isBelowReserve ? 'text-rose-400' : 'text-slate-100'}`}>
                      {route.arrivalSoc}%
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Distance / Wh/km</span>
                    <span className="text-slate-300 font-bold text-sm">
                      {route.totalDistanceKm} km
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({route.averageWhPerKm} Wh/km)
                    </span>
                  </div>
                </div>

                {/* Charging stop badge & station locations */}
                <div className="pt-2 border-t border-slate-750 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Charging Requirements:</span>
                    {route.chargingStops.length === 0 ? (
                      <span className="text-emerald-400 font-medium">None required</span>
                    ) : (
                      <span className="text-amber-400 font-bold font-mono">
                        {route.chargingStops.length} Fast DC Stop ({route.chargingStops.reduce((acc, s) => acc + s.chargingTimeMin, 0)}m)
                      </span>
                    )}
                  </div>
                  {route.chargingStops.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-medium truncate">
                      <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">
                        {route.chargingStops.map(s => `${s.station.name} (${s.station.powerKw}kW)`).join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explainable Route Selection (Section 33: "Why This Route?") & Charging Station Locations */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
              {activeRoute.explanation.title}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Target Reserve: {minimumReserveSoc}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-2">
            {activeRoute.explanation.points.map((point, index) => (
              <div key={index} className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{point}</span>
              </div>
            ))}
          </div>

          {/* Charging Stops Details Card with Highlighted Station Locations */}
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-750 flex flex-col justify-between">
            {activeRoute.chargingStops.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Injected Mandatory Charging Station Locations
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    {activeRoute.chargingStops.length} Injected Stop{activeRoute.chargingStops.length > 1 ? 's' : ''}
                  </span>
                </div>
                {activeRoute.chargingStops.map((stop, sIdx) => (
                  <div key={sIdx} className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/40 text-[11px] space-y-1.5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-100">{stop.station.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>GPS: {stop.station.lat.toFixed(4)}°N, {stop.station.lng.toFixed(4)}°E</span>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">{stop.station.operator}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                        {stop.station.powerKw} kW DC
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 font-mono text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Arrival Battery</span>
                        <span className="font-bold text-amber-400">{stop.arrivalSoc}%</span>
                      </div>
                      <div className="text-slate-500">➔</div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Target (CC/CV)</span>
                        <span className="font-bold text-emerald-400">{stop.targetSoc}%</span>
                      </div>
                      <div className="text-slate-500">➔</div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Energy Added</span>
                        <span className="font-bold text-cyan-300">+{stop.energyAddedKwh} kWh</span>
                      </div>
                    </div>

                    <div className="text-slate-400 flex justify-between text-[10px] pt-1">
                      <span>Plugs: {stop.station.connectorTypes.join(', ')} ({stop.station.availablePorts}/{stop.station.totalPorts} available)</span>
                      <span className="font-mono text-slate-300">Est. ₹{stop.stopCostInr} · {stop.chargingTimeMin}m</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-slate-200 text-xs">Direct Trip Feasible</h5>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your vehicle&apos;s available capacity ({((selectedVehicle.usableCapacityKwh * activeRoute.startSoc) / 100).toFixed(1)} kWh) comfortably exceeds the predicted requirement ({activeRoute.totalEnergyKwh} kWh).
                </p>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Arrival Battery Margin:</span>
              <span className="font-bold text-emerald-400">
                +{Math.max(0, activeRoute.arrivalSoc - minimumReserveSoc)}% above reserve
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
