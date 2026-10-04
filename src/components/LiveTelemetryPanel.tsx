import { FC } from 'react';
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
  CheckCircle,
  Mountain,
  Snowflake,
  Zap,
  TrendingDown,
  Car
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
  onOpenModelLearningModal?: () => void;
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
  const isTripComplete = telemetry.progressPercent >= 99.5;
  const remainingDistanceKm = Math.max(0, Number((activeRoute.totalDistanceKm - telemetry.currentDistanceKm).toFixed(1)));
  
  // Power draw approximation for live dashboard dial
  const isDownhill = telemetry.activeSegmentIndex > 0 && 
    (activeRoute.segments[telemetry.activeSegmentIndex]?.gradientPercent || 0) < -1.5;
  const livePowerKw = isDownhill 
    ? -Number(((activeRoute.segments[telemetry.activeSegmentIndex]?.regeneratedEnergyKwh || 0.8) * 12).toFixed(1))
    : Number((14 + (telemetry.currentSpeedKmh > 80 ? (telemetry.currentSpeedKmh - 80) * 0.4 : 0)).toFixed(1));

  const remainingUsableKwh = Number(((selectedVehicle.usableCapacityKwh * telemetry.currentActualSoc) / 100).toFixed(1));
  const estimatedRangeRemainingKm = Math.round((remainingUsableKwh * 1000) / (activeRoute.averageWhPerKm || 145));

  // Circular gauge calculations
  const socRadius = 38;
  const socCircumference = 2 * Math.PI * socRadius;
  const socDashoffset = socCircumference - (Math.min(100, Math.max(0, telemetry.currentActualSoc)) / 100) * socCircumference;

  const speedRadius = 38;
  const speedCircumference = 2 * Math.PI * speedRadius;
  const maxDialSpeed = 140;
  const speedFraction = Math.min(1, Math.max(0, telemetry.currentSpeedKmh / maxDialSpeed));
  const speedDashoffset = speedCircumference - (speedFraction * 0.75) * speedCircumference; // 270 degree arc

  return (
    <div className="bg-[#0e121a] rounded-2xl border border-white/[0.08] p-5 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 left-1/3 w-72 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cockpit Top Bar */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/[0.08] mb-5 gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <Car className={`w-4 h-4 ${isDriving ? 'text-emerald-400' : 'text-slate-400'}`} />
            {isDriving && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-100">
                Digital Cockpit
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                isDriving 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                  : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
              }`}>
                {isDriving ? 'DRIVING' : isTripComplete ? 'ARRIVED' : 'STANDBY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Real-time EV drive instruments & dynamic range</p>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-2">
          {/* Speed Selector */}
          <div className="flex bg-[#141924] p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
            {[1, 5, 20].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => onChangeSpeedMultiplier(mult)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                  telemetry.simSpeedMultiplier === mult
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>

          {/* Ignition / Drive Toggle */}
          <button
            type="button"
            onClick={onToggleDriving}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-lg ${
              isDriving
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-amber-500/10'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isDriving ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Drive</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{telemetry.progressPercent > 0 ? 'Resume Drive' : 'Start Drive'}</span>
              </>
            )}
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onResetDriving}
            className="p-2 rounded-xl bg-[#141924] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            title="Reset Drive"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Virtual Instrument Cluster (Fancy Dashboard Gauges) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Dial 1: Digital Speedometer */}
        <div className="bg-[#121622] rounded-xl p-4 border border-white/[0.06] flex items-center justify-between shadow-inner relative">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Vehicle Speed
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
                {Math.round(telemetry.currentSpeedKmh)}
              </span>
              <span className="text-xs font-mono text-slate-400">km/h</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {isDownhill ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Regen Coasting
                </span>
              ) : telemetry.currentSpeedKmh > 85 ? (
                <span className="text-slate-300">Highway Transit</span>
              ) : (
                <span className="text-slate-400">Cruising Speed</span>
              )}
            </div>
          </div>

          {/* Gauge Graphic */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={speedRadius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
                strokeDasharray={`${speedCircumference * 0.75} ${speedCircumference * 0.25}`}
                strokeLinecap="round"
              />
              <circle
                cx="45"
                cy="45"
                r={speedRadius}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="6"
                strokeDasharray={`${speedCircumference * 0.75} ${speedCircumference * 0.25}`}
                strokeDashoffset={speedDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[9px] font-mono text-cyan-400 font-bold">SPD</span>
            </div>
          </div>
        </div>

        {/* Dial 2: Main Battery & Range Gauge */}
        <div className="bg-[#121622] rounded-xl p-4 border border-emerald-500/20 flex items-center justify-between shadow-inner relative">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              Battery Remaining
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-3xl font-extrabold font-mono tabular-nums ${
                telemetry.currentActualSoc <= 15 ? 'text-rose-400' : telemetry.currentActualSoc <= 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {telemetry.currentActualSoc.toFixed(1)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              <span className="text-white font-bold tabular-nums">~{estimatedRangeRemainingKm} km</span> est. range
            </div>
          </div>

          {/* Radial Battery Arc */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={socRadius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
              />
              <circle
                cx="45"
                cy="45"
                r={socRadius}
                fill="none"
                stroke={telemetry.currentActualSoc <= 15 ? '#f43f5e' : telemetry.currentActualSoc <= 30 ? '#fbbf24' : '#10b981'}
                strokeWidth="6"
                strokeDasharray={socCircumference}
                strokeDashoffset={socDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[9px] font-mono text-emerald-400 font-bold">{remainingUsableKwh}</span>
              <span className="text-[7px] text-slate-500 font-mono uppercase">kWh</span>
            </div>
          </div>
        </div>

        {/* Dial 3: Powertrain Dynamics & Thermal */}
        <div className="bg-[#121622] rounded-xl p-4 border border-white/[0.06] flex items-center justify-between shadow-inner relative">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Live Energy Flow
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-3xl font-extrabold font-mono tabular-nums ${livePowerKw < 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                {livePowerKw < 0 ? `${livePowerKw}` : `+${livePowerKw}`}
              </span>
              <span className="text-xs font-mono text-slate-400">kW</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Pack: <strong className="text-slate-200">{telemetry.packTempC || 31}°C</strong> · {telemetry.preconditioningActive ? 'Pre-cooling' : 'Nominal'}
            </div>
          </div>

          <div className="text-right space-y-1 font-mono text-[10px] bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
            <div className="text-slate-400">
              Altitude: <strong className="text-slate-200">{Math.round(telemetry.currentElevationM)}m</strong>
            </div>
            <div className="text-slate-400">
              Pace: <strong className="text-slate-200">{activeRoute.averageWhPerKm} Wh/km</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar along route */}
      <div className="mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
        <div className="flex justify-between text-xs font-mono mb-1.5 text-slate-300">
          <span className="flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            Route Progress: <strong className="text-white">{telemetry.progressPercent.toFixed(1)}%</strong>
          </span>
          <span className="text-slate-400">
            {remainingDistanceKm} km remaining ({telemetry.currentDistanceKm.toFixed(1)} / {activeRoute.totalDistanceKm} km)
          </span>
        </div>
        <div className="w-full h-2 bg-[#141924] rounded-full overflow-hidden border border-white/[0.06] relative">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-200"
            style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Dynamic Road Conditions Simulator */}
      <div className="bg-[#121622] p-3 rounded-xl border border-white/[0.06] mb-3">
        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
          Simulate Road Scenarios:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onInjectDisturbance('headwind')}
            className="flex items-center justify-center space-x-2 py-2 px-3 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 rounded-lg text-xs transition-colors border border-white/[0.06] cursor-pointer"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Headwind (+45 km/h)</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectDisturbance('traffic_shock')}
            className="flex items-center justify-center space-x-2 py-2 px-3 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 rounded-lg text-xs transition-colors border border-white/[0.06] cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Highway Congestion</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectDisturbance('ac_blast')}
            className="flex items-center justify-center space-x-2 py-2 px-3 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 rounded-lg text-xs transition-colors border border-white/[0.06] cursor-pointer"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
            <span>Cabin Chill (Max AC)</span>
          </button>
        </div>
      </div>

      {/* Dynamic Recalculation Alert Banner */}
      {telemetry.rerouteSuggested && (
        <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mb-3 shadow-lg">
          <div className="flex items-start gap-2.5 max-w-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-200 block text-xs">Battery Reserve Advisory</strong>
              <span className="text-rose-300/80 text-[11px]">
                Higher energy demand detected. Recalculate route to preserve safety margin and guarantee arrival.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerDynamicReroute}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Recalculate Route</span>
          </button>
        </div>
      )}

      {/* Trip Complete Message */}
      {isTripComplete && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 mt-3 shadow-md">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            Destination Reached. Arrived with <strong className="text-emerald-400">{telemetry.currentActualSoc.toFixed(1)}% battery</strong> remaining.
          </span>
        </div>
      )}
    </div>
  );
};
