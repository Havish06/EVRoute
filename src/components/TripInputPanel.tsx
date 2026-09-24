import { FC } from 'react';
import { 
  Car, 
  BatteryMedium, 
  Users, 
  Luggage, 
  Sliders, 
  ShieldAlert, 
  Thermometer, 
  Sparkles,
  Info,
  Scale,
  CloudSun,
  RefreshCw,
  Wind
} from 'lucide-react';
import { VehicleSpec, TripInputs, WeatherCondition } from '../types';
import { VEHICLE_DATABASE } from '../data/vehicles';

interface TripInputPanelProps {
  inputs: TripInputs;
  onChangeInputs: (newInputs: TripInputs) => void;
  selectedVehicle: VehicleSpec;
  onSelectVehicle: (vehicle: VehicleSpec) => void;
  onCalculateRoute: () => void;
  isDriving: boolean;
  weather?: WeatherCondition;
  onRefreshWeather?: () => void;
  isRefreshingWeather?: boolean;
  lastWeatherUpdateText?: string;
}

export const TripInputPanel: FC<TripInputPanelProps> = ({
  inputs,
  onChangeInputs,
  selectedVehicle,
  onSelectVehicle,
  onCalculateRoute,
  isDriving,
  weather,
  onRefreshWeather,
  isRefreshingWeather,
  lastWeatherUpdateText,
}) => {
  const totalMassKg = selectedVehicle.kerbWeightKg + (inputs.passengers * inputs.passengerWeightKg) + inputs.cargoWeightKg;
  const availableEnergyKwh = Number(((selectedVehicle.usableCapacityKwh * inputs.batterySoc) / 100).toFixed(2));

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Vehicle & Trip Parameters
          </h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
          5 Inputs Required
        </span>
      </div>

      <div className="space-y-4">
        {/* 1. Vehicle Model Selection */}
        <div>
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              1. Vehicle Model
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Internal Spec DB</span>
          </label>
          <select
            value={selectedVehicle.id}
            onChange={(e) => {
              const v = VEHICLE_DATABASE.find(item => item.id === e.target.value);
              if (v) {
                onSelectVehicle(v);
                onChangeInputs({ ...inputs, vehicleId: v.id });
              }
            }}
            disabled={isDriving}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            {VEHICLE_DATABASE.map(v => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                {v.manufacturer} {v.model} ({v.batteryCapacityKwh} kWh, {v.motorPowerKw} kW)
              </option>
            ))}
          </select>

          {/* Vehicle Spec Badges */}
          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-mono">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-1.5 text-center">
              <span className="text-slate-400 block text-[10px]">Battery</span>
              <span className="text-emerald-400 font-bold">{selectedVehicle.batteryCapacityKwh} kWh</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-1.5 text-center">
              <span className="text-slate-400 block text-[10px]">Kerb Mass</span>
              <span className="text-slate-200 font-bold">{selectedVehicle.kerbWeightKg} kg</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-1.5 text-center">
              <span className="text-slate-400 block text-[10px]">Max Fast DC</span>
              <span className="text-amber-400 font-bold">{selectedVehicle.maxDcChargingPowerKw} kW</span>
            </div>
          </div>
        </div>

        {/* 2. Battery SOC Slider */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <BatteryMedium className={`w-3.5 h-3.5 ${inputs.batterySoc <= 20 ? 'text-rose-400' : inputs.batterySoc <= 50 ? 'text-amber-400' : 'text-emerald-400'}`} />
              2. Current Battery (SOC)
            </span>
            <div className="text-right">
              <span className="text-xs font-bold font-mono text-emerald-400">{inputs.batterySoc}%</span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({availableEnergyKwh} kWh)</span>
            </div>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={inputs.batterySoc}
            disabled={isDriving}
            onChange={(e) => onChangeInputs({ ...inputs, batterySoc: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>10% (Low)</span>
            <span>50%</span>
            <span>100% (Full)</span>
          </div>
        </div>

        {/* 3. Passenger Count & Cargo Weight (Additional Mass) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                Passengers
              </span>
              <span className="font-mono text-cyan-400 font-bold">{inputs.passengers}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={inputs.passengers}
              disabled={isDriving}
              onChange={(e) => onChangeInputs({ ...inputs, passengers: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              + {inputs.passengers * inputs.passengerWeightKg} kg (at 75kg/p)
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Luggage className="w-3 h-3 text-amber-400" />
                Cargo Load
              </span>
              <span className="font-mono text-amber-400 font-bold">{inputs.cargoWeightKg} kg</span>
            </label>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={inputs.cargoWeightKg}
              disabled={isDriving}
              onChange={(e) => onChangeInputs({ ...inputs, cargoWeightKg: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">Luggage & gear</span>
          </div>
        </div>

        {/* Calculated Total Dynamic Mass Indicator */}
        <div className="flex items-center justify-between bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2 text-xs">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            Total Moving Mass (F_roll, F_grade)
          </span>
          <span className="font-mono font-bold text-slate-100">{totalMassKg} kg</span>
        </div>

        {/* Secondary Parameters (Reserve & Cabin Climate) */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Min. Reserve SOC
            </label>
            <select
              value={inputs.minimumReserveSoc}
              onChange={(e) => onChangeInputs({ ...inputs, minimumReserveSoc: Number(e.target.value) })}
              disabled={isDriving}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value={10}>10% (Standard Reserve)</option>
              <option value={15}>15% (Safe Hill Margin)</option>
              <option value={20}>20% (Conservative)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Thermometer className="w-3 h-3 text-cyan-400" />
              Cabin AC Setpoint
            </label>
            <select
              value={inputs.cabinTempC}
              onChange={(e) => onChangeInputs({ ...inputs, cabinTempC: Number(e.target.value) })}
              disabled={isDriving}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value={20}>20°C (High AC Draw)</option>
              <option value={22}>22°C (Comfortable)</option>
              <option value={24}>24°C (Eco AC Mode)</option>
            </select>
          </div>
        </div>

        {/* Routing Objective Mode Selection */}
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Routing Optimization Focus
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => onChangeInputs({ ...inputs, routingObjective: 'energy_efficient' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                inputs.routingObjective === 'energy_efficient'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ML-A* Energy
            </button>
            <button
              type="button"
              onClick={() => onChangeInputs({ ...inputs, routingObjective: 'balanced' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                inputs.routingObjective === 'balanced'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => onChangeInputs({ ...inputs, routingObjective: 'fastest' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                inputs.routingObjective === 'fastest'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fastest (Time)
            </button>
          </div>
        </div>

        {/* Real-Time Route Segment Weather & Microclimate Card */}
        {weather && (
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                Live Segment Weather Telemetry
              </span>
              {onRefreshWeather && (
                <button
                  type="button"
                  onClick={onRefreshWeather}
                  disabled={isRefreshingWeather}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 px-2 py-1 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingWeather ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingWeather ? 'Fetching...' : 'Refresh Weather'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Ambient Temp (HVAC)</span>
                <span className="text-amber-300 font-bold text-sm">{weather.temperatureC}°C</span>
                <span className="text-[9px] text-slate-500 block">
                  Δ {Math.abs(weather.temperatureC - inputs.cabinTempC).toFixed(1)}°C cabin delta
                </span>
              </div>

              <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Wind Velocity (Aero)</span>
                <span className="text-cyan-300 font-bold text-sm">{weather.windSpeedKmh} km/h</span>
                <span className="text-[9px] text-slate-500 block flex items-center gap-1">
                  <Wind className="w-2.5 h-2.5" />
                  rho: {weather.airDensityKgM3 || 1.20} kg/m³
                </span>
              </div>
            </div>

            {lastWeatherUpdateText && (
              <p className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/40 p-1.5 rounded border border-emerald-900/50">
                {lastWeatherUpdateText}
              </p>
            )}
          </div>
        )}

        {/* Calculate button */}
        <button
          type="button"
          onClick={onCalculateRoute}
          disabled={isDriving}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Execute Battery-Constrained A* Search</span>
        </button>

        <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-800/30 p-2 rounded-lg">
          <Info className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Elevation gradients, wind speed, live traffic & charging stations are acquired automatically via APIs.
          </span>
        </div>
      </div>
    </div>
  );
};
