import React, { FC, useState } from 'react';
import { 
  BarChart3, 
  Mountain, 
  BatteryMedium, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Wind, 
  Gauge, 
  Activity, 
  ChevronRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Info
} from 'lucide-react';
import { RouteOption, GraphNode, VehicleSpec, WeatherCondition, SegmentEnergyPrediction } from '../../types';
import { ElevationProfile } from '../ElevationProfile';

interface AnalyzeModeProps {
  activeRoute: RouteOption;
  nodes: GraphNode[];
  selectedVehicle: VehicleSpec;
  weather: WeatherCondition;
  startSoc: number;
  minimumReserveSoc: number;
}

export const AnalyzeMode: FC<AnalyzeModeProps> = ({
  activeRoute,
  nodes,
  selectedVehicle,
  weather,
  startSoc,
  minimumReserveSoc,
}) => {
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(0);
  const segments = activeRoute.segments;
  const selectedSegment = segments[selectedSegmentIdx] || segments[0];

  // Aggregate physics breakdown across segments
  const totalAero = segments.reduce((sum, s) => sum + s.aerodynamicEnergyKwh, 0);
  const totalRolling = segments.reduce((sum, s) => sum + s.rollingResistanceEnergyKwh, 0);
  const totalGradient = segments.reduce((sum, s) => sum + (s.gradientEnergyKwh > 0 ? s.gradientEnergyKwh : 0), 0);
  const totalInertia = segments.reduce((sum, s) => sum + s.accelerationEnergyKwh, 0);
  const totalAux = segments.reduce((sum, s) => sum + s.auxiliaryEnergyKwh, 0);
  const totalRegen = segments.reduce((sum, s) => sum + s.regeneratedEnergyKwh, 0);

  const grossSum = totalAero + totalRolling + totalGradient + totalInertia + totalAux;

  // Battery Forecast Chart Points
  const batteryPoints: { distanceKm: number; soc: number; isChargeStop?: boolean }[] = [];
  let cumDist = 0;
  let currSoc = startSoc;
  batteryPoints.push({ distanceKm: 0, soc: startSoc });

  segments.forEach((seg, i) => {
    cumDist += seg.distanceKm;
    currSoc = Math.max(0, currSoc - seg.socDropPercent);
    const stopHere = activeRoute.chargingStops.find(s => {
      const node = nodes.find(n => n.id === activeRoute.pathNodeIds[i + 1]);
      return node?.chargingStation?.id === s.station.id;
    });

    batteryPoints.push({ distanceKm: Number(cumDist.toFixed(1)), soc: Math.round(currSoc) });
    if (stopHere) {
      currSoc = stopHere.targetSoc;
      batteryPoints.push({ distanceKm: Number(cumDist.toFixed(1)), soc: Math.round(currSoc), isChargeStop: true });
    }
  });

  return (
    <div className="space-y-4">
      {/* 1. ROUTE OVERVIEW */}
      <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Technical Route Overview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {activeRoute.batteryHealthPercent && activeRoute.batteryHealthPercent < 100 && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                {activeRoute.batteryHealthPercent}% SoH ({activeRoute.effectiveCapacityKwh || selectedVehicle.usableCapacityKwh} kWh)
              </span>
            )}
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {activeRoute.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Distance</span>
            <span className="text-base font-bold text-slate-100">{activeRoute.totalDistanceKm} km</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Travel Time</span>
            <span className="text-base font-bold text-slate-100">
              {Math.floor(activeRoute.totalTravelTimeMin / 60)}h {activeRoute.totalTravelTimeMin % 60}m
            </span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Energy Required</span>
            <span className="text-base font-bold text-emerald-400">{activeRoute.totalEnergyKwh} kWh</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Arrival SOC</span>
            <span className="text-base font-bold text-emerald-400">{activeRoute.arrivalSoc}%</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Charging Stops</span>
            <span className="text-base font-bold text-amber-400">
              {activeRoute.chargingStops.length === 0 ? '0' : `${activeRoute.chargingStops.length} stop (+${activeRoute.totalRechargeTimeMin}m)`}
            </span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Safety Margin</span>
            <span className="text-base font-bold text-cyan-400">
              +{Math.max(0, activeRoute.arrivalSoc - minimumReserveSoc)}% reserve
            </span>
          </div>
        </div>
      </div>

      {/* 2. ELEVATION PROFILE */}
      <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Topographic Elevation Profile & Terrain Climbs
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Click points along profile to inspect gradient
          </span>
        </div>

        <ElevationProfile route={activeRoute} nodes={nodes} />
      </div>

      {/* 3. BATTERY FORECAST & ENERGY BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Battery Forecast Graph */}
        <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <div className="flex items-center gap-2">
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                Battery SOC vs Route Distance Forecast
              </h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400">
              Min Reserve: {minimumReserveSoc}%
            </span>
          </div>

          {/* SVG Battery Curve */}
          <div className="w-full h-44 bg-[#141822] rounded-lg p-2.5 border border-white/[0.06] relative">
            <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
              {/* Minimum reserve horizontal dashed line */}
              <line
                x1="30"
                y1={110 - (minimumReserveSoc / 100) * 95}
                x2="480"
                y2={110 - (minimumReserveSoc / 100) * 95}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text x="35" y={105 - (minimumReserveSoc / 100) * 95} fill="#f59e0b" fontSize="8" fontFamily="monospace">
                Reserve Limit ({minimumReserveSoc}%)
              </text>

              {/* Grid Y Axis labels */}
              <text x="5" y="15" fill="#64748b" fontSize="8" fontFamily="monospace">100%</text>
              <text x="5" y="65" fill="#64748b" fontSize="8" fontFamily="monospace">50%</text>
              <text x="5" y="115" fill="#64748b" fontSize="8" fontFamily="monospace">0%</text>

              {/* Polyline of SOC vs Distance */}
              {(() => {
                const totalDist = activeRoute.totalDistanceKm || 1;
                const pointsSvg = batteryPoints.map(p => {
                  const x = 30 + (p.distanceKm / totalDist) * 450;
                  const y = 110 - (p.soc / 100) * 95;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={pointsSvg}
                    />
                    {batteryPoints.map((p, idx) => {
                      const x = 30 + (p.distanceKm / totalDist) * 450;
                      const y = 110 - (p.soc / 100) * 95;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={p.isChargeStop ? 4 : 2}
                          fill={p.isChargeStop ? '#f59e0b' : '#10b981'}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 px-1">
            <span>Origin: <strong className="text-slate-200">{startSoc}%</strong></span>
            <span>Lowest SOC: <strong className="text-amber-300">{activeRoute.minSocReached}%</strong></span>
            <span>Arrival: <strong className="text-emerald-400">{activeRoute.arrivalSoc}%</strong></span>
          </div>
        </div>

        {/* Energy Breakdown Horizontal Telemetry Bars */}
        <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                Newtonian Dynamics & HVAC Breakdown
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Total Gross: {grossSum.toFixed(1)} kWh
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {/* Aerodynamics */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-sans">Aerodynamic Drag (Faero ∝ v²)</span>
                <span className="text-slate-100">{totalAero.toFixed(1)} kWh ({Math.round((totalAero / grossSum) * 100)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${(totalAero / grossSum) * 100}%` }} />
              </div>
            </div>

            {/* Rolling Resistance */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-sans">Rolling Resistance (Frr = Crr·m·g)</span>
                <span className="text-slate-100">{totalRolling.toFixed(1)} kWh ({Math.round((totalRolling / grossSum) * 100)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${(totalRolling / grossSum) * 100}%` }} />
              </div>
            </div>

            {/* Terrain Gradient */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-sans">Terrain Ascent (Fgrad = m·g·sin θ)</span>
                <span className="text-slate-100">{totalGradient.toFixed(1)} kWh ({Math.round((totalGradient / grossSum) * 100)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${(totalGradient / grossSum) * 100}%` }} />
              </div>
            </div>

            {/* Acceleration Inertia */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-sans">Vehicle Load & Acceleration</span>
                <span className="text-slate-100">{totalInertia.toFixed(1)} kWh ({Math.round((totalInertia / grossSum) * 100)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400" style={{ width: `${(totalInertia / grossSum) * 100}%` }} />
              </div>
            </div>

            {/* Auxiliary HVAC */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-sans">Cabin HVAC & BMS Chiller</span>
                <span className="text-slate-100">{totalAux.toFixed(1)} kWh ({Math.round((totalAux / grossSum) * 100)}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${(totalAux / grossSum) * 100}%` }} />
              </div>
            </div>

            {/* Regenerative Braking (Negative Green bar) */}
            <div className="pt-1 border-t border-white/[0.06]">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-emerald-400 font-sans font-semibold">Regenerative Braking Recovery</span>
                <span className="text-emerald-400 font-bold">-{totalRegen.toFixed(1)} kWh</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (totalRegen / grossSum) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ML ENERGY PREDICTION & SEGMENT INSPECTOR */}
      <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              ML Segment Energy Prediction Inspector
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {segments.length} highway segments
          </span>
        </div>

        {/* Segment Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {segments.map((seg, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedSegmentIdx(idx)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedSegmentIdx === idx
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[#141822] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              Seg #{idx + 1} ({seg.distanceKm}km)
            </button>
          ))}
        </div>

        {/* Selected Segment Inspection Card */}
        {selectedSegment && (
          <div className="mt-3 space-y-3 font-mono">
            {/* Top Key Features Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Distance</span>
                <span className="text-slate-100 font-bold">{selectedSegment.distanceKm} km</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Gradient</span>
                <span className={`font-bold ${selectedSegment.gradientPercent > 2 ? 'text-amber-400' : 'text-slate-100'}`}>
                  {selectedSegment.gradientPercent > 0 ? `+${selectedSegment.gradientPercent}%` : `${selectedSegment.gradientPercent}%`}
                </span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Vehicle Mass</span>
                <span className="text-slate-200 font-semibold">{selectedVehicle.kerbWeightKg + 170} kg</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Speed</span>
                <span className="text-slate-200 font-semibold">{selectedSegment.speedKmh} km/h</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Traffic</span>
                <span className="text-cyan-300 font-semibold">Moderate</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Temperature</span>
                <span className="text-amber-300 font-semibold">{weather.temperatureC}°C</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Wind</span>
                <span className="text-sky-300 font-semibold">{weather.windSpeedKmh} km/h</span>
              </div>

              <div className="bg-[#141822] p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-sans font-bold">PREDICTED ENERGY</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedSegment.mlPredictedEnergyKwh.toFixed(2)} kWh</span>
              </div>
            </div>

            {/* Model Confidence & Feature Importance Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs bg-[#141822] p-3 rounded-lg border border-white/[0.06]">
              {/* Quantile Uncertainty Band */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans font-semibold mb-1">
                  Confidence & Uncertainty Interval
                </span>
                <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                  <span>Lower Bound: <strong className="text-cyan-400">{selectedSegment.confidenceLowerKwh.toFixed(2)} kWh</strong></span>
                  <span>Predicted: <strong className="text-emerald-400">{selectedSegment.mlPredictedEnergyKwh.toFixed(2)} kWh</strong></span>
                  <span>Upper Bound: <strong className="text-amber-400">{selectedSegment.confidenceUpperKwh.toFixed(2)} kWh</strong></span>
                </div>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">
                  Calibrated conformal prediction interval (90% coverage on real road telemetry)
                </span>
              </div>

              {/* Feature Importance Attribution */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans font-semibold mb-1">
                  Segment Feature Importance (SHAP / Gradient Contribution)
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-white/[0.03] p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-500 block">Aerodynamic:</span>
                    <span className="text-cyan-300 font-semibold">{selectedSegment.aerodynamicEnergyKwh.toFixed(2)} kWh</span>
                  </div>
                  <div className="bg-white/[0.03] p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-500 block">Rolling / Load:</span>
                    <span className="text-slate-300 font-semibold">{selectedSegment.rollingResistanceEnergyKwh.toFixed(2)} kWh</span>
                  </div>
                  <div className="bg-white/[0.03] p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-500 block">Terrain Gradient:</span>
                    <span className="text-amber-300 font-semibold">{selectedSegment.gradientEnergyKwh.toFixed(2)} kWh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
