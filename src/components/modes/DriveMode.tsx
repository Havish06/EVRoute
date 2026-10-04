import React, { FC, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  AlertTriangle, 
  Wind, 
  Activity, 
  Snowflake, 
  RefreshCw, 
  ShieldAlert, 
  Compass, 
  Mountain, 
  Gauge, 
  Zap,
  CheckCircle,
  Navigation
} from 'lucide-react';
import { TelemetryState, RouteOption, VehicleSpec, GraphNode } from '../../types';
import { RouteMap } from '../RouteMap';

interface DriveModeProps {
  telemetry: TelemetryState;
  activeRoute: RouteOption;
  routes: RouteOption[];
  onSelectRoute: (route: RouteOption) => void;
  nodes: GraphNode[];
  selectedVehicle: VehicleSpec;
  isDriving: boolean;
  onToggleDriving: () => void;
  onResetDriving: () => void;
  onChangeSpeedMultiplier: (mult: number) => void;
  onInjectDisturbance: (type: 'headwind' | 'ac_blast' | 'traffic_shock') => void;
  onTriggerDynamicReroute: () => void;
}

export const DriveMode: FC<DriveModeProps> = ({
  telemetry,
  activeRoute,
  routes,
  onSelectRoute,
  nodes,
  selectedVehicle,
  isDriving,
  onToggleDriving,
  onResetDriving,
  onChangeSpeedMultiplier,
  onInjectDisturbance,
  onTriggerDynamicReroute,
}) => {
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const socError = telemetry.socErrorPercent;
  const isDeviationSignificant = Math.abs(socError) >= 2.5 || activeEvent !== null || telemetry.rerouteSuggested;

  // Active segment info
  const segmentIdx = telemetry.activeSegmentIndex;
  const currentSeg = activeRoute.segments[segmentIdx] || activeRoute.segments[0];

  const handleSimulateEvent = (type: 'headwind' | 'ac_blast' | 'traffic_shock', label: string) => {
    setActiveEvent(label);
    onInjectDisturbance(type);
  };

  const handleExecuteReroute = () => {
    setIsRerouting(true);
    setTimeout(() => {
      onTriggerDynamicReroute();
      setIsRerouting(false);
      setActiveEvent(null);
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Top Automotive HUD Banner */}
      <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${isDriving ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <h2 className="text-xs font-bold tracking-widest uppercase font-mono text-slate-100">
              LIVE DRIVE COCKPIT
            </h2>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {selectedVehicle.manufacturer} {selectedVehicle.model}
            </span>
          </div>

          {/* Drive & Simulation Controls */}
          <div className="flex items-center gap-2">
            {/* Speed Multiplier */}
            <div className="flex bg-[#141822] p-0.5 rounded-lg border border-white/[0.08] text-xs font-mono">
              {[1, 5, 20].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => onChangeSpeedMultiplier(mult)}
                  className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
                    telemetry.simSpeedMultiplier === mult
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={onToggleDriving}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isDriving
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              }`}
            >
              {isDriving ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START DRIVE</span>
                </>
              )}
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={onResetDriving}
              className="p-1.5 rounded-lg bg-[#141822] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Reset Drive Progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* HUD Primary Gauge Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono">
          {/* Current Speed */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center col-span-2 sm:col-span-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Speed</span>
            <div className="text-2xl font-bold text-slate-100 my-0.5">
              {isDriving ? telemetry.currentSpeedKmh : 0} <span className="text-xs text-slate-500 font-normal">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans">Cruising</span>
          </div>

          {/* Current SOC */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Current SOC</span>
            <div className={`text-2xl font-bold my-0.5 ${telemetry.currentActualSoc <= 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {telemetry.currentActualSoc.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-400 font-sans">Pack Sensor</span>
          </div>

          {/* Predicted SOC */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Predicted SOC</span>
            <div className="text-2xl font-bold text-cyan-400 my-0.5">
              {telemetry.predictedSocAtThisPoint.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-400 font-sans">ML Baseline</span>
          </div>

          {/* SOC Deviation */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Deviation</span>
            <div className={`text-2xl font-bold my-0.5 ${Math.abs(socError) >= 3 ? 'text-amber-400' : 'text-slate-200'}`}>
              {socError > 0 ? `+${socError}%` : `${socError}%`}
            </div>
            <span className="text-[10px] text-slate-400 font-sans">Error delta</span>
          </div>

          {/* Distance Travelled */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Progress</span>
            <div className="text-xl font-bold text-slate-100 my-0.5">
              {telemetry.currentDistanceKm} <span className="text-xs text-slate-500">/ {activeRoute.totalDistanceKm}km</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans">{Math.round(telemetry.progressPercent)}% complete</span>
          </div>

          {/* Elevation */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Elevation</span>
            <div className="text-xl font-bold text-slate-100 my-0.5">
              {telemetry.currentElevationM}m
            </div>
            <span className="text-[10px] text-slate-400 font-sans">MSL altitude</span>
          </div>

          {/* Active Road */}
          <div className="bg-[#141822] p-3 rounded-lg border border-white/[0.06] text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Segment</span>
            <div className="text-xs font-semibold text-emerald-300 truncate my-1">
              {currentSeg ? `Seg #${segmentIdx + 1}` : 'Highway'}
            </div>
            <span className="text-[10px] text-slate-400 font-sans">
              {currentSeg ? `${currentSeg.distanceKm} km · ${currentSeg.speedKmh} km/h` : 'Cruising'}
            </span>
          </div>
        </div>

        {/* Continuous Progress Bar */}
        <div className="mt-3">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Reroute Alert Banner when Activated or Significant Deviation */}
      {isDeviationSignificant && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 shadow-xl text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                    ENERGY DEVIATION DETECTED
                  </h3>
                  {activeEvent && (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {activeEvent}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Current real-time consumption is exceeding the original prediction by{' '}
                  <strong className="text-amber-300 font-mono">+{Math.max(12, Math.round(Math.abs(socError) * 3))}%</strong>. 
                  A* search can recalculate an optimized corridor using current SOC, updated consumption rate, higher safety reserve, and intermediate charging access.
                </p>
                <div className="flex items-center gap-4 text-[11px] font-mono mt-2 text-slate-400">
                  <span>Predicted: <strong className="text-slate-200">{activeRoute.totalEnergyKwh} kWh</strong></span>
                  <span>Updated Load: <strong className="text-amber-300">{(activeRoute.totalEnergyKwh * 1.15).toFixed(1)} kWh (+15%)</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteReroute}
              disabled={isRerouting}
              className="py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRerouting ? 'animate-spin' : ''}`} />
              <span>{isRerouting ? 'Recalculating A*...' : 'AUTO REROUTE'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Drive Workspace: Map (Left/Center) + Energy Stress Test (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Real-time Map tracking vehicle */}
        <div className="lg:col-span-8">
          <RouteMap
            routes={routes}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            nodes={nodes}
            telemetry={telemetry}
            isDriving={isDriving}
            selectedVehicle={selectedVehicle}
            heightClass="h-[460px] lg:h-[520px]"
          />
        </div>

        {/* Energy Stress Test & Live Environmental Disturbance */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                  ENERGY STRESS TEST
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Inject dynamic environmental disturbances</p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Live Simulation
              </span>
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Simulate Event
              </span>

              {/* Event 1: Strong Headwind */}
              <button
                type="button"
                onClick={() => handleSimulateEvent('headwind', 'Strong Headwind (+35 km/h)')}
                className="w-full p-2.5 rounded-lg bg-[#141822] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Strong Headwind</div>
                    <div className="text-[10px] text-slate-400">+22% aerodynamic highway drag (Faero ∝ v²)</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">+22%</span>
              </button>

              {/* Event 2: Traffic Congestion */}
              <button
                type="button"
                onClick={() => handleSimulateEvent('traffic_shock', 'Severe Traffic Congestion')}
                className="w-full p-2.5 rounded-lg bg-[#141822] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Traffic Congestion</div>
                    <div className="text-[10px] text-slate-400">Stop-and-go micro-acceleration throttle losses</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-semibold">+28%</span>
              </button>

              {/* Event 3: High AC Usage */}
              <button
                type="button"
                onClick={() => handleSimulateEvent('ac_blast', 'High Auxiliary HVAC Load')}
                className="w-full p-2.5 rounded-lg bg-[#141822] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Snowflake className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">High AC Usage</div>
                    <div className="text-[10px] text-slate-400">Cabin chilling at 18°C during peak ambient heat</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-semibold">+15%</span>
              </button>
            </div>

            {/* Battery Thermal & BMS Status */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 font-sans">Pack Core Temperature:</span>
                <span className="text-emerald-400 font-semibold">{telemetry.packTempC}°C</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 font-sans">BMS Thermal Preconditioning:</span>
                <span className={telemetry.preconditioningActive ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {telemetry.preconditioningActive ? 'ACTIVE (Pre-cooling)' : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
