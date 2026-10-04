import React, { FC, useMemo } from 'react';
import { 
  Car, 
  BatteryMedium, 
  Users, 
  Luggage, 
  ShieldAlert, 
  MapPin,
  CheckCircle,
  CloudSun,
  Activity,
  Zap,
  ArrowRight,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { VehicleSpec, TripInputs, WeatherCondition, GraphNode } from '../types';
import { VEHICLE_DATABASE, getVehicleBrands, getVehiclesByBrand } from '../data/vehicles';

interface TripInputPanelProps {
  inputs: TripInputs;
  onChangeInputs: (newInputs: TripInputs) => void;
  selectedVehicle: VehicleSpec;
  onSelectVehicle: (vehicle: VehicleSpec) => void;
  onCalculateRoute: () => void;
  isDriving: boolean;
  weather?: WeatherCondition;
  nodes: GraphNode[];
  isCalculating?: boolean;
  onOpenVehicleSettings?: () => void;
}

export const TripInputPanel: FC<TripInputPanelProps> = ({
  inputs,
  onChangeInputs,
  selectedVehicle,
  onSelectVehicle,
  onCalculateRoute,
  isDriving,
  weather,
  nodes,
  isCalculating = false,
  onOpenVehicleSettings,
}) => {
  const brands = useMemo(() => getVehicleBrands(), []);
  const originNode = nodes.find(n => n.id === inputs.sourceId) || nodes[0];
  const destNode = nodes.find(n => n.id === inputs.destinationId) || nodes[nodes.length - 1];

  const currentSoh = inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100;
  const effectiveUsableKwh = Number((selectedVehicle.usableCapacityKwh * (currentSoh / 100)).toFixed(1));
  const availableEnergyKwh = Number(((effectiveUsableKwh * inputs.batterySoc) / 100).toFixed(1));
  const totalMassKg = selectedVehicle.kerbWeightKg + (inputs.passengers * inputs.passengerWeightKg) + inputs.cargoWeightKg;

  return (
    <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
            Trip Configuration
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Vehicle dynamics & load parameters</p>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Ready
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Origin → Destination Readout */}
        <div className="bg-[#141822] rounded-lg p-2.5 border border-white/[0.06] text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono mb-1.5 uppercase">
            <span>Route Corridor</span>
            <span>Terrain Elevation</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate max-w-[150px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{originNode?.name.split(' ')[0]}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate max-w-[150px]">
              <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="truncate">{destNode?.name.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        {/* 1. Vehicle Selection grouped by Brand */}
        <div>
          <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              Vehicle Model
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">
                {currentSoh < 100 ? (
                  <span className="text-amber-400 font-semibold">{effectiveUsableKwh} kWh ({currentSoh}% SoH)</span>
                ) : (
                  <span>{selectedVehicle.usableCapacityKwh} kWh net</span>
                )}
              </span>
              {onOpenVehicleSettings && (
                <button
                  type="button"
                  onClick={onOpenVehicleSettings}
                  className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Vehicle Spec & Battery Health Settings"
                >
                  <Settings className="w-3 h-3" />
                </button>
              )}
            </div>
          </label>
          <select
            value={selectedVehicle.id}
            onChange={(e) => {
              const v = VEHICLE_DATABASE.find(item => item.id === e.target.value);
              if (v) {
                onSelectVehicle(v);
              }
            }}
            disabled={isDriving}
            className="w-full bg-[#141822] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500/60 transition-colors"
          >
            {brands.map(brand => {
              const brandVehicles = getVehiclesByBrand(brand);
              return (
                <optgroup key={brand} label={`── ${brand.toUpperCase()} ──`} className="bg-[#0f121a] text-emerald-400 font-semibold">
                  {brandVehicles.map(v => (
                    <option key={v.id} value={v.id} className="bg-[#141822] text-slate-100 font-normal">
                      {v.manufacturer} {v.model} ({v.batteryCapacityKwh} kWh · {v.motorPowerKw} kW)
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* 2. Battery State-of-Health (SoH) Multiplier */}
        <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${currentSoh < 80 ? 'text-amber-400' : 'text-emerald-400'}`} />
              Battery Health (SoH)
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                currentSoh >= 95 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                currentSoh >= 85 ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' :
                currentSoh >= 75 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}>
                {currentSoh}% SoH
              </span>
              {onOpenVehicleSettings && (
                <button
                  type="button"
                  onClick={onOpenVehicleSettings}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-mono cursor-pointer"
                >
                  Specs
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={currentSoh}
            disabled={isDriving}
            onChange={(e) => onChangeInputs({ ...inputs, batteryHealthPercent: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1">
            <span>50% (Worn)</span>
            <span className="text-slate-400 font-semibold">{effectiveUsableKwh} kWh effective usable</span>
            <span>100% (Nominal)</span>
          </div>
        </div>

        {/* 2. Battery Starting SOC */}
        <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <BatteryMedium className={`w-3.5 h-3.5 ${inputs.batterySoc <= 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
              Battery SOC
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {inputs.batterySoc}% <span className="text-slate-400 text-[10px] font-normal">({availableEnergyKwh} kWh)</span>
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={100}
            step={1}
            value={inputs.batterySoc}
            disabled={isDriving}
            onChange={(e) => onChangeInputs({ ...inputs, batterySoc: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>15%</span>
            <span>50%</span>
            <span>80%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 3. Passengers & Cargo Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
              <Users className="w-3 h-3 text-slate-400" />
              Passengers
            </span>
            <div className="flex items-center justify-between">
              <input
                type="number"
                min={1}
                max={7}
                value={inputs.passengers}
                disabled={isDriving}
                onChange={(e) => onChangeInputs({ ...inputs, passengers: Math.max(1, Number(e.target.value)) })}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-100 text-center"
              />
              <span className="text-[10px] text-slate-500 font-mono">{(inputs.passengers * inputs.passengerWeightKg)} kg</span>
            </div>
          </div>

          <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
              <Luggage className="w-3 h-3 text-slate-400" />
              Cargo Load
            </span>
            <div className="flex items-center justify-between">
              <input
                type="number"
                min={0}
                max={300}
                step={5}
                value={inputs.cargoWeightKg}
                disabled={isDriving}
                onChange={(e) => onChangeInputs({ ...inputs, cargoWeightKg: Math.max(0, Number(e.target.value)) })}
                className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-100 text-center"
              />
              <span className="text-[10px] text-slate-500 font-mono">kg</span>
            </div>
          </div>
        </div>

        {/* 4. Minimum Safety Reserve SOC */}
        <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Minimum Reserve
            </span>
            <span className="font-mono font-semibold text-amber-300">{inputs.minimumReserveSoc}% buffer</span>
          </div>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={inputs.minimumReserveSoc}
            disabled={isDriving}
            onChange={(e) => onChangeInputs({ ...inputs, minimumReserveSoc: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
            <span>5% (Aggressive)</span>
            <span>10% (Std)</span>
            <span>20% (Safe)</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onCalculateRoute}
        disabled={isDriving || isCalculating}
        className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-emerald-500/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Zap className="w-4 h-4 fill-current" />
        <span>{isCalculating ? 'Computing A* Paths...' : 'PLAN ROUTE'}</span>
      </button>

      {/* Compact Live Conditions */}
      <div className="pt-3 border-t border-white/[0.06] space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
          Live Conditions
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-300">
          <div className="flex items-center justify-between bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04]">
            <span className="text-slate-400">Road Data</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" /> OSM High-Res
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04]">
            <span className="text-slate-400">Traffic</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" /> Real-time
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04]">
            <span className="text-slate-400">Weather</span>
            <span className="text-amber-400 flex items-center gap-1">
              <CloudSun className="w-2.5 h-2.5" /> {weather ? `${weather.temperatureC}°C · ${weather.windSpeedKmh}km/h` : 'Sync'}
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/[0.02] px-2 py-1 rounded border border-white/[0.04]">
            <span className="text-slate-400">Charging</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Network Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
