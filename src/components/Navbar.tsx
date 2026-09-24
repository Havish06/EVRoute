import { FC } from 'react';
import { Zap, Compass, Cpu, Car, CloudSun, BarChart3, RefreshCw } from 'lucide-react';
import { VehicleSpec, WeatherCondition } from '../types';
import { ROUTE_PRESETS, RoutePreset } from '../data/sampleRoutes';

interface NavbarProps {
  activePreset: RoutePreset;
  onSelectPreset: (preset: RoutePreset) => void;
  selectedVehicle: VehicleSpec;
  weather: WeatherCondition;
  onOpenMLModal: () => void;
  isDriving: boolean;
  onRefreshWeather?: () => void;
  isRefreshingWeather?: boolean;
}

export const Navbar: FC<NavbarProps> = ({
  activePreset,
  onSelectPreset,
  selectedVehicle,
  weather,
  onOpenMLModal,
  isDriving,
  onRefreshWeather,
  isRefreshingWeather,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Zap className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">EVRoute</span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ML + A* Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Energy-Constrained EV Route Planning
            </p>
          </div>
        </div>

        {/* Preset scenario selector */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
          <Compass className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-slate-400 font-medium hidden md:inline">Preset:</span>
          <select
            value={activePreset.id}
            onChange={(e) => {
              const found = ROUTE_PRESETS.find(p => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            disabled={isDriving}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-2"
          >
            {ROUTE_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-800 text-slate-200">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Active vehicle, real-time weather & refresh actions */}
        <div className="flex items-center space-x-2.5 text-xs">
          <div className="hidden lg:flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-100">{selectedVehicle.manufacturer} {selectedVehicle.model}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-mono font-medium">{selectedVehicle.batteryCapacityKwh} kWh</span>
          </div>

          {/* Real-time Weather Indicator with Interactive Refresh Button */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-slate-300">
            <CloudSun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-mono font-bold text-amber-300">{weather.temperatureC}°C</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="font-mono hidden sm:inline">{weather.windSpeedKmh} km/h</span>

            {onRefreshWeather && (
              <button
                type="button"
                onClick={onRefreshWeather}
                disabled={isRefreshingWeather}
                className="ml-1 p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                title="Refresh real-time weather telemetry for route corridor"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingWeather ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            )}
          </div>

          <button
            onClick={onOpenMLModal}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
            title="Inspect ML Prediction Features & Research Comparison"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ML Engine & Research</span>
            <BarChart3 className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
