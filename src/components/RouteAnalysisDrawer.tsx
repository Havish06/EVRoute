import React, { FC, useState } from 'react';
import { 
  Mountain, 
  CloudSun, 
  Car, 
  Gauge, 
  BarChart3, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Wind, 
  Layers, 
  Users, 
  Luggage, 
  Zap, 
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';
import { RouteOption, GraphNode, VehicleSpec, WeatherCondition, TripInputs } from '../types';
import { ElevationProfile } from './ElevationProfile';

interface RouteAnalysisDrawerProps {
  activeRoute: RouteOption;
  nodes: GraphNode[];
  selectedVehicle: VehicleSpec;
  weather: WeatherCondition;
  inputs: TripInputs;
  isOpen: boolean;
  onToggleOpen: () => void;
  className?: string;
}

type AnalysisTab = 'elevation' | 'weather' | 'traffic' | 'vehicle' | 'energy';

export const RouteAnalysisDrawer: FC<RouteAnalysisDrawerProps> = ({
  activeRoute,
  nodes,
  selectedVehicle,
  weather,
  inputs,
  isOpen,
  onToggleOpen,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('elevation');

  const segments = activeRoute.segments;
  const totalAero = segments.reduce((sum, s) => sum + s.aerodynamicEnergyKwh, 0);
  const totalRolling = segments.reduce((sum, s) => sum + s.rollingResistanceEnergyKwh, 0);
  const totalGradient = segments.reduce((sum, s) => sum + (s.gradientEnergyKwh > 0 ? s.gradientEnergyKwh : 0), 0);
  const totalInertia = segments.reduce((sum, s) => sum + s.accelerationEnergyKwh, 0);
  const totalAux = segments.reduce((sum, s) => sum + s.auxiliaryEnergyKwh, 0);
  const totalRegen = segments.reduce((sum, s) => sum + s.regeneratedEnergyKwh, 0);
  const grossSum = Math.max(0.1, totalAero + totalRolling + totalGradient + totalInertia + totalAux);

  const totalMassKg = selectedVehicle.kerbWeightKg + (inputs.passengers * inputs.passengerWeightKg) + inputs.cargoWeightKg;

  const tabs: { id: AnalysisTab; label: string; icon: React.ReactNode }[] = [
    { id: 'elevation', label: 'Elevation Profile', icon: <Mountain className="w-3.5 h-3.5" /> },
    { id: 'weather', label: 'Weather & Aero', icon: <CloudSun className="w-3.5 h-3.5" /> },
    { id: 'traffic', label: 'Traffic & Surface', icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: 'vehicle', label: 'Vehicle Payload', icon: <Car className="w-3.5 h-3.5" /> },
    { id: 'energy', label: 'ML Energy Breakdown', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`cockpit-panel rounded-2xl shadow-2xl border border-white/[0.1] text-slate-100 font-sans transition-all duration-300 overflow-hidden ${className}`}>
      {/* Drawer Control Bar */}
      <div 
        onClick={onToggleOpen}
        className="flex items-center justify-between p-3 sm:px-4 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Technical Route Analysis
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                · {activeRoute.totalDistanceKm} km · {activeRoute.totalEnergyKwh} kWh
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isOpen ? 'Click to minimize analysis dock' : 'Expand elevation profile, weather overlay, traffic, payload & ML energy breakdown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Tab Preview when collapsed */}
          {!isOpen && (
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400 mr-2">
              <span className="flex items-center gap-1 text-cyan-400">
                <Mountain className="w-3 h-3" />
                <span>Topo Profile</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Zap className="w-3 h-3" />
                <span>{activeRoute.averageWhPerKm} Wh/km</span>
              </span>
            </div>
          )}

          <div className="p-1 rounded-lg bg-white/[0.06] text-slate-300">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="border-t border-white/[0.08] p-3 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Segmented Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/[0.06]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'cockpit-inset text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Elevation Profile */}
          {activeTab === 'elevation' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  Topographic Profile & Road Gradients
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Hover to inspect gradient % and segment drain
                </span>
              </div>
              <ElevationProfile route={activeRoute} nodes={nodes} />
            </div>
          )}

          {/* TAB 2: Weather & Aerodynamics */}
          {activeTab === 'weather' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Ambient Temperature</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{weather.temperatureC}°C</span>
                <span className="text-[10px] text-slate-400 font-sans">
                  {weather.temperatureC > 30 ? 'Active AC chilling' : 'Comfort range'}
                </span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Wind Vector</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold text-cyan-400">{weather.windSpeedKmh}</span>
                  <span className="text-[10px] text-slate-400">km/h</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Heading {weather.windDirectionDeg}° (Crosswind)
                </span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Air Density (ρ)</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{weather.airDensityKgM3} kg/m³</span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Aerodynamic drag scale: 1.0x
                </span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Precipitation & Rain</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{weather.rainfallMm} mm/h</span>
                <span className="text-[10px] text-emerald-400 font-sans">
                  Dry highway adhesion
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Traffic & Surface Conditions */}
          {activeTab === 'traffic' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Road Classification</span>
                <span className="text-base font-bold text-slate-100 mt-1 block">National Highway</span>
                <span className="text-[10px] text-slate-400 font-sans">Divided multi-lane corridor</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Surface Rolling Quality</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">Smooth Asphalt</span>
                <span className="text-[10px] text-slate-400 font-sans">Crr rolling coeff: {selectedVehicle.rollingResistanceCoeff}</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Traffic Impact</span>
                <span className="text-base font-bold text-amber-400 mt-1 block">Moderate Delay</span>
                <span className="text-[10px] text-slate-400 font-sans">+6 min throttle hunting</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Speed Distribution</span>
                <span className="text-base font-bold text-cyan-400 mt-1 block">65 - 90 km/h</span>
                <span className="text-[10px] text-slate-400 font-sans">Aero-optimal highway speed</span>
              </div>
            </div>
          )}

          {/* TAB 4: Vehicle Payload & Mass */}
          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Vehicle Curb Weight</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{selectedVehicle.kerbWeightKg} kg</span>
                <span className="text-[10px] text-slate-400 font-sans">{selectedVehicle.manufacturer} {selectedVehicle.model}</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Passengers & Crew</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{inputs.passengers} People</span>
                <span className="text-[10px] text-slate-400 font-sans">~{inputs.passengers * inputs.passengerWeightKg} kg passenger mass</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans block">Cargo / Luggage</span>
                <span className="text-lg font-bold text-slate-100 mt-1 block">{inputs.cargoWeightKg} kg</span>
                <span className="text-[10px] text-slate-400 font-sans">Trunk & roof payload</span>
              </div>

              <div className="cockpit-inset p-3 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-sans block font-semibold">Total Gross Weight</span>
                <span className="text-lg font-bold text-emerald-300 mt-1 block">{totalMassKg} kg</span>
                <span className="text-[10px] text-slate-400 font-sans">Affects rolling and climb energy</span>
              </div>
            </div>
          )}

          {/* TAB 5: ML Energy Breakdown */}
          {activeTab === 'energy' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div className="cockpit-inset p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Aerodynamic Drag</span>
                  <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{totalAero.toFixed(1)} kWh</span>
                  <span className="text-[9px] text-slate-400 font-sans">{Math.round((totalAero / grossSum) * 100)}% of gross</span>
                </div>

                <div className="cockpit-inset p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Rolling Resistance</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">{totalRolling.toFixed(1)} kWh</span>
                  <span className="text-[9px] text-slate-400 font-sans">{Math.round((totalRolling / grossSum) * 100)}% of gross</span>
                </div>

                <div className="cockpit-inset p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Elevation Climb</span>
                  <span className="text-sm font-bold text-amber-400 mt-0.5 block">+{totalGradient.toFixed(1)} kWh</span>
                  <span className="text-[9px] text-slate-400 font-sans">Gravitational work</span>
                </div>

                <div className="cockpit-inset p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Auxiliary & HVAC</span>
                  <span className="text-sm font-bold text-slate-300 mt-0.5 block">{totalAux.toFixed(1)} kWh</span>
                  <span className="text-[9px] text-slate-400 font-sans">Cabin {inputs.cabinTempC}°C</span>
                </div>

                <div className="cockpit-inset p-2.5 rounded-xl">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-sans font-semibold">Regen Recovered</span>
                  <span className="text-sm font-bold text-emerald-300 mt-0.5 block">-{totalRegen.toFixed(1)} kWh</span>
                  <span className="text-[9px] text-emerald-400/80 font-sans">Kinetic recapture</span>
                </div>
              </div>

              {/* Energy Physics Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Physical Energy Distribution</span>
                  <span className="text-slate-200">Net: <strong className="text-emerald-400">{activeRoute.totalEnergyKwh} kWh</strong></span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden flex">
                  <div style={{ width: `${(totalAero / grossSum) * 100}%` }} className="bg-cyan-500 h-full" title="Aerodynamics" />
                  <div style={{ width: `${(totalRolling / grossSum) * 100}%` }} className="bg-slate-400 h-full" title="Rolling" />
                  <div style={{ width: `${(totalGradient / grossSum) * 100}%` }} className="bg-amber-400 h-full" title="Gradient" />
                  <div style={{ width: `${(totalAux / grossSum) * 100}%` }} className="bg-blue-400 h-full" title="HVAC" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
