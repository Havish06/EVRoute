import React, { FC } from 'react';
import { 
  Compass, 
  Car, 
  CloudSun, 
  RefreshCw, 
  Activity, 
  Sliders, 
  Cpu, 
  BarChart3, 
  Navigation,
  Radio,
  Settings
} from 'lucide-react';
import { VehicleSpec, WeatherCondition } from '../types';
import { ROUTE_PRESETS, RoutePreset } from '../data/sampleRoutes';
import { VEHICLE_DATABASE } from '../data/vehicles';

export type AppMode = 'plan' | 'drive' | 'analyze' | 'engine';

interface NavbarProps {
  activeMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activePreset: RoutePreset;
  onSelectPreset: (preset: RoutePreset) => void;
  selectedVehicle: VehicleSpec;
  onSelectVehicle?: (vehicle: VehicleSpec) => void;
  currentSoc: number;
  batteryHealthPercent?: number;
  weather: WeatherCondition;
  isDriving: boolean;
  onRefreshWeather?: () => void;
  isRefreshingWeather?: boolean;
  onOpenMLModal?: () => void;
  onOpenIsochrones?: () => void;
  onOpenModelLearningModal?: () => void;
  onOpenVehicleSettings?: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  activePreset,
  onSelectPreset,
  selectedVehicle,
  onSelectVehicle,
  currentSoc,
  batteryHealthPercent = 100,
  weather,
  isDriving,
  onRefreshWeather,
  isRefreshingWeather,
  onOpenMLModal,
  onOpenIsochrones,
  onOpenModelLearningModal,
  onOpenVehicleSettings,
}) => {
  const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
    { id: 'plan', label: 'PLAN', icon: <Navigation className="w-3.5 h-3.5" /> },
    { id: 'drive', label: 'DRIVE', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'analyze', label: 'ANALYZE', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'engine', label: 'ENGINE', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  const socColor = currentSoc <= 20 
    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' 
    : currentSoc <= 45 
    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' 
    : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  return (
    <header className="bg-[#090b10] border-b border-white/[0.08] text-slate-100 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Mode Tabs */}
        <div className="flex items-center gap-6">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-white font-mono">EVROUTE</span>
            </div>
          </div>

          {/* Core Mode Navigation */}
          <nav className="flex items-center bg-[#12151e] p-1 rounded-lg border border-white/[0.08]">
            {modes.map((mode) => {
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onSelectMode(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                  {mode.id === 'drive' && isDriving && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping ml-0.5" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center: Source → Destination corridor search & Vehicle profile */}
        <div className="hidden md:flex items-center gap-2">
          {/* Source → Destination Search */}
          <div className="flex items-center gap-1.5 bg-[#12151e] px-2.5 py-1 rounded-lg border border-white/[0.08] text-xs">
            <Compass className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <select
              value={activePreset.id}
              onChange={(e) => {
                const found = ROUTE_PRESETS.find(p => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              disabled={isDriving}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {ROUTE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121620] text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Profile Selector */}
          {onSelectVehicle && (
            <div className="hidden lg:flex items-center gap-1.5 bg-[#12151e] px-2.5 py-1 rounded-lg border border-white/[0.08] text-xs">
              <Car className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const v = VEHICLE_DATABASE.find(item => item.id === e.target.value);
                  if (v) onSelectVehicle(v);
                }}
                disabled={isDriving}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                {VEHICLE_DATABASE.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#121620] text-slate-200">
                    {v.manufacturer} {v.model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Global Status Telemetry */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {/* Battery SOC Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${socColor}`}>
            <span className="text-[10px] text-slate-400 font-sans uppercase">SOC</span>
            <span>{Math.round(currentSoc)}%</span>
          </div>

          {/* Temperature Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.08] bg-[#12151e] text-slate-300">
            <CloudSun className="w-3.5 h-3.5 text-amber-400/90" />
            <span>{weather.temperatureC}°C</span>
            {onRefreshWeather && (
              <button
                type="button"
                onClick={onRefreshWeather}
                disabled={isRefreshingWeather}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
                title="Refresh real-time weather"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingWeather ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.08] bg-[#12151e] text-slate-300 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isDriving ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="hidden lg:inline text-slate-400">{isDriving ? 'SIM DRIVING' : 'ONLINE'}</span>
          </div>

          {/* Quick Technical Modals Menu */}
          <div className="flex items-center gap-1 pl-1">
            {onOpenMLModal && (
              <button
                type="button"
                onClick={onOpenMLModal}
                className="p-1.5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title="ML Energy Model Architecture"
              >
                <Cpu className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenIsochrones && (
              <button
                type="button"
                onClick={onOpenIsochrones}
                className="p-1.5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title="Range Isochrones & Contours"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenVehicleSettings && (
              <button
                type="button"
                onClick={onOpenVehicleSettings}
                className={`p-1.5 rounded-md transition-colors cursor-pointer relative ${
                  batteryHealthPercent < 100
                    ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.08]'
                }`}
                title={`Vehicle Spec & Battery Health Settings (${batteryHealthPercent}% SoH)`}
              >
                <Settings className="w-3.5 h-3.5" />
                {batteryHealthPercent < 100 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
