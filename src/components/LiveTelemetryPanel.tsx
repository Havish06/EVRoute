import React, { FC } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  BatteryCharging, 
  AlertCircle, 
  RefreshCw, 
  Wind, 
  Flame, 
  Radio,
  CheckCircle,
  Activity
} from 'lucide-react';
import { TelemetryState, RouteOption, VehicleSpec } from '../types';

interface LiveTelemetryPanelProps {
  telemetry: TelemetryState;
  activeRoute: RouteOption;
  selectedVehicle: VehicleSpec;
  isDriving: boolean;
  onToggleDriving: () => void;
  onResetDriving: () => void;
  onChangeSpeedMultiplier: (mult: number) => void;
  onInjectDisturbance: (type: 'headwind' | 'ac_blast' | 'traffic_shock') => void;
  onTriggerDynamicReroute: () => void;
}

export const LiveTelemetryPanel: FC<LiveTelemetryPanelProps> = ({
  telemetry,
  activeRoute,
  selectedVehicle,
  isDriving,
  onToggleDriving,
  onResetDriving,
  onChangeSpeedMultiplier,
  onInjectDisturbance,
  onTriggerDynamicReroute,
}) => {
  const isErrorSignificant = Math.abs(telemetry.socErrorPercent) >= 3.5;
  const isTripComplete = telemetry.progressPercent >= 99.5;

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-3">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Radio className={`w-4 h-4 ${isDriving ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            {isDriving && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
              Real-Time EV Telemetry & Dynamic Rerouting Engine
            </h3>
            <p className="text-[11px] text-slate-400">
              Sections 22 & 23: Closed-Loop SOC Tracking vs ML Prediction
            </p>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-2">
          {/* Speed Multiplier */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-mono">
            {[1, 5, 20].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => onChangeSpeedMultiplier(mult)}
                className={`px-2 py-1 rounded text-[11px] transition-all ${
                  telemetry.simSpeedMultiplier === mult
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleDriving}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md ${
              isDriving
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isDriving ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{telemetry.progressPercent > 0 ? 'Resume' : 'Drive Route'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onResetDriving}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar along route */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono mb-1 text-slate-300">
          <span>Progress: {telemetry.progressPercent.toFixed(1)}%</span>
          <span>
            {telemetry.currentDistanceKm.toFixed(1)} / {activeRoute.totalDistanceKm} km
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-200"
            style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Telemetry Virtual Instruments Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Speed */}
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            Speed
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold font-mono text-slate-100">
              {Math.round(telemetry.currentSpeedKmh)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">km/h</span>
          </div>
        </div>

        {/* Altitude */}
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400" />
            Elevation
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold font-mono text-purple-300">
              {Math.round(telemetry.currentElevationM)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">m MSL</span>
          </div>
        </div>

        {/* Actual SOC */}
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-emerald-400" />
            Live Actual SOC
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={`text-xl font-bold font-mono ${telemetry.currentActualSoc <= 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {telemetry.currentActualSoc.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({((selectedVehicle.usableCapacityKwh * telemetry.currentActualSoc) / 100).toFixed(1)} kWh)
            </span>
          </div>
        </div>

        {/* Prediction Error Delta */}
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block flex items-center gap-1">
            <AlertCircle className={`w-3 h-3 ${isErrorSignificant ? 'text-rose-400' : 'text-slate-400'}`} />
            Prediction Δ (Error)
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={`text-xl font-bold font-mono ${isErrorSignificant ? 'text-rose-400' : 'text-slate-200'}`}>
              {telemetry.socErrorPercent > 0 ? `+${telemetry.socErrorPercent.toFixed(1)}%` : `${telemetry.socErrorPercent.toFixed(1)}%`}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              (Pred: {telemetry.predictedSocAtThisPoint.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Environmental Disturbance Injectors (Section 22 & 23 demo) */}
      <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 mb-3">
        <span className="text-[11px] font-semibold text-slate-300 block mb-2">
          Simulate Unforeseen Real-World Disturbances:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onInjectDisturbance('headwind')}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-750"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Heavy 45 km/h Headwind</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectDisturbance('traffic_shock')}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-750"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Sudden Congestion / Jam</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectDisturbance('ac_blast')}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-750"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Max Climate Chill (2.5kW)</span>
          </button>
        </div>
      </div>

      {/* Dynamic Recalculation Alert Banner if SOC is in deficit */}
      {telemetry.rerouteSuggested && (
        <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-pulse">
          <div className="flex items-start gap-2 max-w-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-200 block">Dynamic Rerouting Advisory Triggered!</strong>
              <span className="text-rose-300/80 text-[11px]">
                Actual consumption is +{Math.abs(telemetry.socErrorPercent).toFixed(1)}% higher than predicted. Remaining reserve to {activeRoute.pathNodeIds[activeRoute.pathNodeIds.length - 1]} will breach the 10% safety buffer.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerDynamicReroute}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-all shadow-md shadow-rose-950 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Recalculate A* from GPS Position</span>
          </button>
        </div>
      )}

      {isTripComplete && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Trip Complete! Vehicle arrived safely at destination with {telemetry.currentActualSoc.toFixed(1)}% battery remaining.
          </span>
        </div>
      )}
    </div>
  );
};
