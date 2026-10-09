import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Compass, 
  RotateCcw, 
  Radio, 
  MapPin, 
  ArrowLeft, 
  ShieldAlert, 
  Cpu, 
  BatteryCharging, 
  CheckCircle2, 
  Copy, 
  Terminal,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { ROUTE_PRESETS, RoutePreset } from '../data/sampleRoutes';
import { VehicleSpec } from '../types';

interface NotFoundPageProps {
  attemptedPath?: string;
  selectedVehicle?: VehicleSpec;
  currentSoc?: number;
  onReturnToCockpit: (preset?: RoutePreset, mode?: 'plan' | 'drive' | 'analyze' | 'engine') => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  attemptedPath = window.location.pathname || '/unmapped-corridor',
  selectedVehicle,
  currentSoc = 78,
  onReturnToCockpit,
}) => {
  const [isReacquiring, setIsReacquiring] = useState(false);
  const [reacquireStep, setReacquireStep] = useState(0);
  const [copiedLog, setCopiedLog] = useState(false);
  const [radarDegree, setRadarDegree] = useState(0);

  // Radar continuous rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarDegree((prev) => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateReacquire = () => {
    if (isReacquiring) return;
    setIsReacquiring(true);
    setReacquireStep(1);

    setTimeout(() => setReacquireStep(2), 600);
    setTimeout(() => setReacquireStep(3), 1200);
    setTimeout(() => setReacquireStep(4), 1800);
    setTimeout(() => {
      setIsReacquiring(false);
      onReturnToCockpit(ROUTE_PRESETS[0], 'plan');
    }, 2400);
  };

  const diagnosticText = `[EVROUTE_DIAGNOSTIC_LOG]
TIMESTAMP: ${new Date().toISOString()}
ATTEMPTED_VECTOR: "${attemptedPath}"
GNSS_LOCK: FAILED (0/14 SATELLITES)
HDOP_ERROR: 99.99 (OFF_CORRIDOR_DEVIATION)
GRAPH_SOLVER: A* Node Lookup returned null
LAST_KNOWN_CORRIDOR: "VIT Chennai → Yercaud (NH 44/48)"
VEHICLE_STATUS:
  Pack SOC: ${Math.round(currentSoc)}%
  Battery Condition: Nominal
  Thermal Loop: Stable (22°C)
  Fail-Safe: Active Position Hold
RECOMMENDED_ACTION: Re-anchor navigation to nearest charted corridor.`;

  const handleCopyLog = () => {
    navigator.clipboard?.writeText(diagnosticText);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background Subtle HUD Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #38bdf8 1px, transparent 1px),
            linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Cockpit Telemetry Bar */}
      <header className="border-b border-white/[0.08] bg-[#0b0e17]/90 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between text-xs font-mono relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-bold tracking-wider text-white font-mono text-sm">EVROUTE HUD</span>
            <span className="ml-2 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 uppercase tracking-widest">
              OFF-GRID CORRIDOR
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-slate-500">PACK SOC:</span>
            <span className="text-emerald-400 font-bold">{Math.round(currentSoc)}% SAFE</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-500">SYSTEM:</span>
            <span className="text-amber-400">FAIL-SAFE MODE</span>
          </div>
          <button
            type="button"
            onClick={() => onReturnToCockpit(ROUTE_PRESETS[0], 'plan')}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-md transition-all cursor-pointer text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cockpit</span>
          </button>
        </div>
      </header>

      {/* Main 404 Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Automotive Radar Scanner (Skeuomorphic Cockpit Visualizer) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full bg-[#0d111a] border-2 border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.9)] p-4 flex items-center justify-center">
              
              {/* Concentric Radar Rings */}
              <div className="absolute inset-4 rounded-full border border-white/[0.05]" />
              <div className="absolute inset-12 rounded-full border border-white/[0.06] border-dashed" />
              <div className="absolute inset-20 rounded-full border border-white/[0.08]" />
              <div className="absolute inset-28 rounded-full border border-rose-500/20" />

              {/* Crosshair lines */}
              <div className="absolute w-full h-[1px] bg-white/[0.08]" />
              <div className="absolute h-full w-[1px] bg-white/[0.08]" />

              {/* Radar Rotating Sweep Line */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `conic-gradient(from ${radarDegree}deg, rgba(244, 63, 94, 0.25) 0deg, rgba(244, 63, 94, 0.05) 45deg, transparent 90deg)`,
                }}
              />

              {/* Range Distance Labels */}
              <span className="absolute top-6 text-[9px] font-mono text-slate-500">30 KM RANGE</span>
              <span className="absolute top-14 text-[9px] font-mono text-slate-500">15 KM</span>
              <span className="absolute top-22 text-[9px] font-mono text-rose-400/80">NO GPS FIX</span>

              {/* Lost Waypoint Target Beacon (Off Center) */}
              <div className="absolute top-1/4 right-1/4 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-rose-500/30 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                </div>
                <span className="mt-1 text-[9px] font-mono font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30">
                  404_UNMAPPED
                </span>
              </div>

              {/* Center Vehicle Icon (Lost Indicator) */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-[#141824] border border-rose-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <Navigation className="w-6 h-6 text-rose-400 transform -rotate-45" />
                </div>
                <span className="mt-2 text-[10px] font-mono text-slate-300 font-semibold tracking-wider">
                  VEHICLE OFF-GRID
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  LAT: --.----° | LNG: --.----°
                </span>
              </div>

              {/* Corner Coordinate Indicators */}
              <div className="absolute bottom-4 left-6 text-[9px] font-mono text-slate-500">
                HDOP: ∞ (FAIL)
              </div>
              <div className="absolute bottom-4 right-6 text-[9px] font-mono text-slate-500">
                SAT: 0/14
              </div>
            </div>

            {/* Status caption */}
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>TERRAIN POSITIONING SENSOR: NO SATELLITE LOCK</span>
            </div>
          </div>

          {/* Right Column: Error Details, Diagnostics & Recovery Actions */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Header Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ERROR 404 // ROUTE CORRIDOR NOT FOUND</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-mono flex items-baseline gap-3">
                <span>404</span>
                <span className="text-xl sm:text-2xl font-sans font-bold text-slate-300">
                  WAYPOINT UNRESOLVED
                </span>
              </h1>

              <p className="mt-2 text-slate-400 text-sm sm:text-base leading-relaxed">
                The requested navigation corridor <code className="text-emerald-400 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-xs break-all">{attemptedPath}</code> does not exist in the active EVRoute topology graph. Your vehicle has entered unmapped terrain outside the high-voltage charging corridor network.
              </p>
            </div>

            {/* Automotive Instrument Telemetry Grid (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#10141f] border border-white/[0.08] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                  <Radio className="w-3 h-3 text-rose-400" />
                  <span>GNSS LOCK</span>
                </div>
                <div className="text-sm font-bold text-rose-400 font-mono">0 / 14 SATS</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Signal Lost</div>
              </div>

              <div className="bg-[#10141f] border border-white/[0.08] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                  <span>ENERGY SOC</span>
                </div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{Math.round(currentSoc)}% SAFE</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Pack Nominal</div>
              </div>

              <div className="bg-[#10141f] border border-white/[0.08] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>A* GRAPH</span>
                </div>
                <div className="text-sm font-bold text-cyan-400 font-mono">0 EDGES</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unreachable</div>
              </div>

              <div className="bg-[#10141f] border border-white/[0.08] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
                  <Compass className="w-3 h-3 text-amber-400" />
                  <span>FAIL-SAFE</span>
                </div>
                <div className="text-sm font-bold text-amber-400 font-mono">ENGAGED</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Stationary Hold</div>
              </div>
            </div>

            {/* Live GPS Re-acquisition Tool */}
            <div className="bg-[#111522] border border-white/[0.08] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCcw className={`w-4 h-4 text-emerald-400 ${isReacquiring ? 'animate-spin' : ''}`} />
                    <span>Autonomous Corridor Re-anchoring</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger satellite frequency calibration to re-acquire the nearest mapped benchmark highway.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateReacquire}
                  disabled={isReacquiring}
                  className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isReacquiring
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02]'
                  }`}
                >
                  {isReacquiring ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>LOCKING SATELLITES...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5" />
                      <span>RE-ACQUIRE GPS FIX</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar during re-acquisition */}
              {isReacquiring && (
                <div className="space-y-1.5 mt-2">
                  <div className="w-full bg-[#1b2132] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-1.5 transition-all duration-500"
                      style={{ width: `${(reacquireStep / 4) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                    <span>
                      {reacquireStep === 1 && 'Scanning L1/L5 GNSS bands...'}
                      {reacquireStep === 2 && 'Ephemeris acquired (6/12 satellites locked)...'}
                      {reacquireStep === 3 && 'Differential GPS fix verified (precision ±0.4m)...'}
                      {reacquireStep === 4 && 'Corridor anchored! Returning to navigation cockpit...'}
                    </span>
                    <span>{Math.round((reacquireStep / 4) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Charted Corridor Selection */}
            <div>
              <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Select Charted Corridors (Known Charging Networks)</span>
                <span className="text-[10px] text-slate-500">{ROUTE_PRESETS.length} Active Corridors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ROUTE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onReturnToCockpit(preset, 'plan')}
                    className="p-3 rounded-xl bg-[#0f121b] hover:bg-[#151a27] border border-white/[0.08] hover:border-emerald-500/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {preset.name}
                        </span>
                        <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{preset.nodes.length} Waypoints</span>
                      <span className="text-emerald-400 group-hover:underline flex items-center gap-1 font-semibold">
                        Chart Route →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Diagnostics Accordion / Log */}
            <div className="bg-[#0b0e17] border border-white/[0.06] rounded-xl p-3 text-xs font-mono text-slate-400">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-[11px]">VEHICLE TELEMETRY DIAGNOSTIC DUMP</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLog}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  {copiedLog ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Log</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-[10px] text-slate-400 bg-black/40 p-2.5 rounded-lg overflow-x-auto whitespace-pre font-mono leading-relaxed border border-white/[0.04]">
                {diagnosticText}
              </pre>
            </div>

            {/* Direct Navigation Links */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onReturnToCockpit(ROUTE_PRESETS[0], 'plan')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>PLAN COCKPIT</span>
              </button>

              <button
                type="button"
                onClick={() => onReturnToCockpit(ROUTE_PRESETS[0], 'drive')}
                className="px-4 py-2 bg-[#141824] hover:bg-[#1a2133] border border-white/[0.08] hover:border-white/[0.15] text-slate-200 font-semibold rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>DRIVE SIMULATOR</span>
              </button>

              <button
                type="button"
                onClick={() => onReturnToCockpit(ROUTE_PRESETS[0], 'analyze')}
                className="px-4 py-2 bg-[#141824] hover:bg-[#1a2133] border border-white/[0.08] hover:border-white/[0.15] text-slate-200 font-semibold rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>ENERGY ANALYSIS</span>
              </button>

              <button
                type="button"
                onClick={() => onReturnToCockpit(ROUTE_PRESETS[0], 'engine')}
                className="px-4 py-2 bg-[#141824] hover:bg-[#1a2133] border border-white/[0.08] hover:border-white/[0.15] text-slate-200 font-semibold rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>WHAT-IF ENGINE</span>
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* Footer System Status */}
      <footer className="border-t border-white/[0.06] bg-[#090b10] px-4 sm:px-6 py-2.5 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-3">
          <span>EVRoute v2.4 Embedded Navigation Core</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-400">Fail-safe Trajectory Fallback Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Core Telemetry: Operating within safe battery margins</span>
        </div>
      </footer>
    </div>
  );
};
