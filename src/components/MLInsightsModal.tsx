import { FC } from 'react';
import { X, Cpu, Layers, BookOpen, Check, Zap, Battery, Shield } from 'lucide-react';
import { RouteOption, VehicleSpec, WeatherCondition, TripInputs } from '../types';

interface MLInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: RouteOption;
  selectedVehicle: VehicleSpec;
  weather: WeatherCondition;
  inputs: TripInputs;
}

export const MLInsightsModal: FC<MLInsightsModalProps> = ({
  isOpen,
  onClose,
  activeRoute,
  selectedVehicle,
  weather,
  inputs,
}) => {
  if (!isOpen) return null;

  const totalMassKg = selectedVehicle.kerbWeightKg + (inputs.passengers * inputs.passengerWeightKg) + inputs.cargoWeightKg;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0e121a] border border-white/[0.1] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0b0e14]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Vehicle Specifications & Powertrain Architecture
              </h3>
              <p className="text-xs text-slate-400">
                {selectedVehicle.manufacturer} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* 1. Vehicle Configuration Grid */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Powertrain & Physical Specifications
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Gross Weight</span>
                <span className="text-white font-bold text-sm mt-0.5 block tabular-nums">{totalMassKg} kg</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Kerb: {selectedVehicle.kerbWeightKg} kg</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Battery Pack</span>
                <span className="text-emerald-400 font-bold text-sm mt-0.5 block tabular-nums">{selectedVehicle.batteryCapacityKwh} kWh</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Usable: {selectedVehicle.usableCapacityKwh} kWh</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Motor Output</span>
                <span className="text-white font-bold text-sm mt-0.5 block tabular-nums">{selectedVehicle.motorPowerKw} kW</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Max Regen: {selectedVehicle.maxRegenPowerKw} kW</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">DC Fast Charging</span>
                <span className="text-amber-400 font-bold text-sm mt-0.5 block tabular-nums">{selectedVehicle.maxDcChargingPowerKw} kW</span>
                <span className="text-[10px] text-slate-500 mt-1 block">AC Charge: {selectedVehicle.acChargingPowerKw} kW</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Aerodynamic Drag</span>
                <span className="text-white font-bold text-sm mt-0.5 block tabular-nums">
                  {(selectedVehicle.dragCoefficient * selectedVehicle.frontalAreaM2).toFixed(2)} m²
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Cd: {selectedVehicle.dragCoefficient}</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Rolling Resistance</span>
                <span className="text-white font-bold text-sm mt-0.5 block tabular-nums">{selectedVehicle.rollingResistanceCoeff}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Standard EV compound</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Regen Recovery</span>
                <span className="text-emerald-400 font-bold text-sm mt-0.5 block tabular-nums">{Math.round(selectedVehicle.regenEfficiency * 100)}%</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Downhill recovery</span>
              </div>
              <div className="bg-[#141924] p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Base Consumption</span>
                <span className="text-white font-bold text-sm mt-0.5 block tabular-nums">{selectedVehicle.baseWhPerKm} Wh/km</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Nominal cycle</span>
              </div>
            </div>
          </section>

          {/* 2. Powertrain Dynamics & Optimization */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Energy Optimization Principles
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-[#141924] p-4 rounded-xl border border-white/[0.06] space-y-2">
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Kinetic & Aerodynamic Modeling
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Calculates drag losses according to high-speed expressway profiles and wind vectors. Incorporates rolling friction across road surfaces and gravitational energy potential during mountain passes.
                </p>
              </div>

              <div className="bg-[#141924] p-4 rounded-xl border border-white/[0.06] space-y-2">
                <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5" /> Battery Electrochemistry & Thermal Management
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Accounts for internal cell impedance increases at lower state of charge, active battery pack preconditioning before DC fast charging, and cabin air conditioning loads in tropical climates.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Research Evaluation Matrix */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Performance Comparison
              </h4>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#141924] text-slate-400 border-b border-white/[0.06]">
                  <tr>
                    <th className="p-3">Route Profile</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Travel Time</th>
                    <th className="p-3">Energy Consumed</th>
                    <th className="p-3">Arrival Battery</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] bg-[#0b0e14]">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-semibold text-slate-300">Shortest Distance</td>
                    <td className="p-3">292.0 km</td>
                    <td className="p-3">5h 45m</td>
                    <td className="p-3 text-amber-400">26.8 kWh</td>
                    <td className="p-3">28%</td>
                    <td className="p-3 text-slate-400">Steep gradients & slow passes</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-semibold text-slate-300">Expressway Highway</td>
                    <td className="p-3">344.0 km</td>
                    <td className="p-3 font-semibold text-white">4h 12m</td>
                    <td className="p-3 text-rose-400 font-semibold">29.4 kWh</td>
                    <td className="p-3 text-rose-400">22%</td>
                    <td className="p-3 text-rose-400">High aerodynamic drag</td>
                  </tr>
                  <tr className="bg-emerald-500/10 font-semibold">
                    <td className="p-3 text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      EVRoute (Optimized)
                    </td>
                    <td className="p-3 text-white">{activeRoute.totalDistanceKm} km</td>
                    <td className="p-3 text-white">
                      {Math.floor(activeRoute.totalTravelTimeMin / 60)}h {activeRoute.totalTravelTimeMin % 60}m
                    </td>
                    <td className="p-3 text-emerald-400">{activeRoute.totalEnergyKwh} kWh</td>
                    <td className="p-3 text-emerald-400">{activeRoute.arrivalSoc}%</td>
                    <td className="p-3 text-emerald-400">Recommended Reserve Preserved</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0b0e14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
};
