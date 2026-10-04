import React, { FC } from 'react';
import { 
  X, 
  BatteryCharging, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Gauge, 
  Wind, 
  Scale, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { VehicleSpec, TripInputs } from '../types';

interface VehicleSpecSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle: VehicleSpec;
  inputs: TripInputs;
  onChangeInputs: (newInputs: TripInputs) => void;
}

export const VehicleSpecSettingsModal: FC<VehicleSpecSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVehicle,
  inputs,
  onChangeInputs,
}) => {
  if (!isOpen) return null;

  const currentSoh = inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100;
  const sohMultiplier = currentSoh / 100;
  const effectiveUsableKwh = Number((selectedVehicle.usableCapacityKwh * sohMultiplier).toFixed(1));
  const effectiveGrossKwh = Number((selectedVehicle.batteryCapacityKwh * sohMultiplier).toFixed(1));
  const capacityLostKwh = Number((selectedVehicle.usableCapacityKwh - effectiveUsableKwh).toFixed(1));

  const handleSohChange = (newSoh: number) => {
    const clamped = Math.max(50, Math.min(100, Math.round(newSoh)));
    onChangeInputs({
      ...inputs,
      batteryHealthPercent: clamped,
    });
  };

  const getHealthBadge = (soh: number) => {
    if (soh >= 95) {
      return {
        label: 'Optimal / Like New',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    if (soh >= 85) {
      return {
        label: 'Normal Highway Aging',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        dot: 'bg-cyan-400',
      };
    }
    if (soh >= 75) {
      return {
        label: 'Moderate Cell Degradation',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: 'High Wear (Near Warranty Limit)',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      dot: 'bg-rose-400',
    };
  };

  const badge = getHealthBadge(currentSoh);

  const presets = [
    { label: '100% Factory New', value: 100, desc: 'Zero degradation' },
    { label: '92% Typical Fleet', value: 92, desc: '~40,000 km' },
    { label: '84% High Mileage', value: 84, desc: '~100,000 km' },
    { label: '75% Aged Pack', value: 75, desc: 'Warranty floor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0f121a] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08] bg-[#141822]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono">
                Vehicle Spec & Battery Health Settings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedVehicle.manufacturer} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-200">
          {/* 1. BATTERY STATE OF HEALTH (SoH) - Primary Focus */}
          <div className="bg-[#141822] rounded-xl p-4 border border-white/[0.08] shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Battery State-of-Health (SoH) Multiplier
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scales usable battery capacity directly in the A* graph routing & energy prediction logic
                </p>
              </div>
              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{badge.label}</span>
              </span>
            </div>

            {/* Slider & Direct Numeric Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">State of Health (SoH)</span>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={currentSoh}
                    onChange={(e) => handleSohChange(Number(e.target.value))}
                    className="w-16 bg-black/50 border border-white/15 rounded px-2 py-1 text-right font-bold text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-sm font-bold text-emerald-400">%</span>
                </div>
              </div>

              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={currentSoh}
                onChange={(e) => handleSohChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>50% (Severely Worn)</span>
                <span>75% (Aged)</span>
                <span>90% (Good)</span>
                <span>100% (Nominal)</span>
              </div>
            </div>

            {/* Capacity Multiplier Math Readout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Nominal Usable</span>
                <span className="text-sm font-bold text-slate-200">{selectedVehicle.usableCapacityKwh} kWh</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Factory spec</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">SoH Multiplier</span>
                <span className="text-sm font-bold text-cyan-400">{sohMultiplier.toFixed(2)}x</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Capacity ratio</span>
              </div>

              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/25">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-sans font-semibold">Effective Usable</span>
                <span className="text-sm font-bold text-emerald-300">{effectiveUsableKwh} kWh</span>
                <span className="text-[10px] text-emerald-400/80 block mt-0.5">Used by A* router</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Degradation Loss</span>
                <span className={`text-sm font-bold ${capacityLostKwh > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {capacityLostKwh > 0 ? `-${capacityLostKwh} kWh` : '0 kWh'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Cell aging loss</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                Battery Age Presets
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {presets.map((p) => {
                  const isSelected = currentSoh === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleSohChange(p.value)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/30'
                          : 'bg-[#10131c] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/15'
                      }`}
                    >
                      <div className="font-semibold text-[11px] font-mono">{p.label}</div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Informational Callout */}
            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                As lithium-ion cells age, available capacity declines and internal resistance increases. A* dynamically recalculates consumption rate, safety margin, and intermediate charging triggers using your effective degraded capacity.
              </span>
            </div>
          </div>

          {/* 2. PHYSICAL VEHICLE SPECIFICATIONS */}
          <div className="bg-[#141822] rounded-xl p-4 border border-white/[0.08] shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Physical Model Parameters (Aerodynamics, Mass, Drivetrain)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedVehicle.nominalVoltageV}V Architecture
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Kerb Weight</span>
                <span className="text-sm font-semibold text-slate-200">{selectedVehicle.kerbWeightKg} kg</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Motor Power</span>
                <span className="text-sm font-semibold text-slate-200">{selectedVehicle.motorPowerKw} kW</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Drag Coefficient</span>
                <span className="text-sm font-semibold text-cyan-400">Cd {selectedVehicle.dragCoefficient}</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Frontal Area</span>
                <span className="text-sm font-semibold text-slate-200">{selectedVehicle.frontalAreaM2} m²</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Aerodynamic Area (Cd·A)</span>
                <span className="text-sm font-semibold text-cyan-300">
                  {(selectedVehicle.dragCoefficient * selectedVehicle.frontalAreaM2).toFixed(3)} m²
                </span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Rolling Resistance (Crr)</span>
                <span className="text-sm font-semibold text-slate-200">{selectedVehicle.rollingResistanceCoeff}</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Regen Efficiency</span>
                <span className="text-sm font-semibold text-emerald-400">{Math.round(selectedVehicle.regenEfficiency * 100)}%</span>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.05]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Max DC Fast Charge</span>
                <span className="text-sm font-semibold text-amber-400">{selectedVehicle.maxDcChargingPowerKw} kW</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141822] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleSohChange(100)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset SoH (100%)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 fill-current" />
            <span>Apply & Recalculate Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
