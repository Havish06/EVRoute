import { FC } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Zap, 
  Battery, 
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  MapPin,
  Route as RouteIcon,
  Sun,
  CloudRain,
  Compass
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

  // Baseline energy comparison
  const fastestRoute = routes.find(r => r.type === 'fastest') || routes[0];
  const efficientRoute = routes.find(r => r.type === 'energy_efficient') || routes[0];
  const energySavedKwh = Number(Math.max(0, fastestRoute.totalEnergyKwh - efficientRoute.totalEnergyKwh).toFixed(1));
  const batteryPercentSaved = Math.round((energySavedKwh / selectedVehicle.usableCapacityKwh) * 100);

  return (
    <div className="space-y-4">
      {/* Route Cards Selection */}
      <div className="bg-[#0e121a] rounded-2xl border border-white/[0.08] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
          <div className="flex items-center space-x-2.5">
            <RouteIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-100">
              Select Drive Mode
            </h3>
          </div>
          {energySavedKwh > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
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

            const modeLabel = route.type === 'energy_efficient' 
              ? 'Eco Tour' 
              : route.type === 'fastest' 
              ? 'Expressway' 
              : 'Balanced';

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route)}
                className={`relative rounded-xl p-4 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#141a27] border-emerald-500/60 shadow-xl ring-1 ring-emerald-500/30'
                    : 'bg-[#111520] border-white/[0.06] hover:bg-[#141924] hover:border-white/10'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selected</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: route.color }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white truncate pr-16">
                      {modeLabel}
                    </h4>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {route.name.replace(' (Time Baseline)', '')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 my-2.5 text-xs font-mono">
                  <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px] flex items-center gap-1 uppercase tracking-wider">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      Travel Time
                    </span>
                    <span className="text-white font-bold text-xs mt-0.5 block tabular-nums">
                      {hours}h {mins}m
                    </span>
                  </div>

                  <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px] flex items-center gap-1 uppercase tracking-wider">
                      <Battery className="w-2.5 h-2.5 text-slate-400" />
                      Arrival Battery
                    </span>
                    <span className={`font-bold text-xs mt-0.5 block tabular-nums ${isBelowReserve ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {route.arrivalSoc}%
                    </span>
                  </div>

                  <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Distance</span>
                    <span className="text-slate-200 font-semibold text-xs mt-0.5 block tabular-nums">
                      {route.totalDistanceKm} km
                    </span>
                  </div>

                  <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px] flex items-center gap-1 uppercase tracking-wider">
                      <Zap className="w-2.5 h-2.5 text-slate-400" />
                      Energy
                    </span>
                    <span className="text-slate-200 font-semibold text-xs mt-0.5 block tabular-nums">
                      {route.totalEnergyKwh} kWh
                    </span>
                  </div>
                </div>

                {/* Charging requirement row */}
                <div className="pt-2.5 border-t border-white/[0.06] text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Charging:</span>
                    {route.chargingStops.length === 0 ? (
                      <span className="text-emerald-400 font-semibold">Direct Non-Stop</span>
                    ) : (
                      <span className="text-amber-400 font-mono font-semibold">
                        {route.chargingStops.length} Fast DC ({route.chargingStops.reduce((acc, s) => acc + s.chargingTimeMin, 0)}m)
                      </span>
                    )}
                  </div>
                  {route.chargingStops.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] px-2 py-1 rounded border border-white/[0.05] truncate">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
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

      {/* Range Resilience & Weather Forecast */}
      {activeRoute.quantile && (
        <div className="bg-[#0e121a] rounded-2xl border border-white/[0.08] p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3.5">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-100">
                Range Resilience & Weather Scenarios
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Safe arrival guaranteed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#111520] border border-white/[0.06]">
              <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" /> Favorable Weather
                </span>
                <span className="text-slate-400 font-normal">Mild Winds</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{activeRoute.quantile.p10Soc}%</span>
                <span className="text-slate-400 text-xs font-mono">arrival battery</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                Maximum kinetic coasting & optimal ambient temperatures.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141924] border border-emerald-500/20 shadow-md">
              <div className="text-[10px] text-slate-200 uppercase font-bold mb-1 flex items-center justify-between">
                <span>Standard Driving</span>
                <span className="text-emerald-400 font-semibold font-mono">Expected</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-white tabular-nums">{activeRoute.quantile.p50Soc}%</span>
                <span className="text-slate-400 text-xs font-mono">arrival battery</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1.5">
                Normal motorway flow & standard cabin comfort.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111520] border border-white/[0.06]">
              <div className="text-[10px] text-amber-400 uppercase font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5" /> Adverse Conditions
                </span>
                <span className="text-slate-400 font-normal">Headwinds</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">{activeRoute.quantile.p90Soc}%</span>
                <span className="text-slate-400 text-xs font-mono">arrival battery</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                Heavy HVAC draw or sudden expressway stop-and-go.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Highlights & Charging Stops */}
      <div className="bg-[#0e121a] rounded-2xl border border-white/[0.08] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-100">
              {activeRoute.explanation.title.replace(' (Section 23)', '')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Reserve Buffer: {minimumReserveSoc}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Key Route Insights */}
          <div className="space-y-2.5">
            {activeRoute.explanation.points.map((point, index) => (
              <div key={index} className="flex items-start gap-2.5 bg-[#121622] p-3 rounded-xl border border-white/[0.05]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-200 text-xs leading-relaxed">{point}</span>
              </div>
            ))}
          </div>

          {/* Charging Stops or Direct Non-Stop Display */}
          <div className="bg-[#121622] p-4 rounded-xl border border-white/[0.06] flex flex-col justify-between">
            {activeRoute.chargingStops.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    <Zap className="w-3.5 h-3.5" />
                    Charging Stops
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/20">
                    {activeRoute.chargingStops.length} Stop{activeRoute.chargingStops.length > 1 ? 's' : ''}
                  </span>
                </div>
                {activeRoute.chargingStops.map((stop, sIdx) => (
                  <div key={sIdx} className="bg-[#0b0e14] p-3 rounded-xl border border-white/[0.08] text-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-white text-xs">{stop.station.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {stop.station.operator}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                        {stop.station.powerKw} kW DC
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#141924] rounded-lg border border-white/[0.06] font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Arrival</span>
                        <span className="font-bold text-amber-400 tabular-nums">{stop.arrivalSoc}%</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <span className="text-slate-400 block text-[9px]">Target</span>
                        <span className="font-bold text-emerald-400 tabular-nums">{stop.targetSoc}%</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <span className="text-slate-400 block text-[9px]">Charge Time</span>
                        <span className="font-bold text-white tabular-nums">{stop.chargingTimeMin}m</span>
                      </div>
                    </div>

                    <div className="text-slate-400 flex items-center justify-between text-[10px] pt-1">
                      <span>Reliability: {stop.reliabilityScorePercent || 98}%</span>
                      <span className="font-mono text-slate-200 font-semibold">Est. ₹{stop.stopCostInr}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h5 className="font-bold text-white text-xs">Direct Non-Stop Transit</h5>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your battery provides ample range to reach the destination directly without charging stops.
                </p>
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between">
              <span>Arrival Buffer:</span>
              <span className="font-bold text-emerald-400">
                +{Math.max(0, activeRoute.arrivalSoc - minimumReserveSoc)}% above safety buffer
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
