import React, { useState } from 'react';
import { Compass, X, Sliders, Layers } from 'lucide-react';
import { VehicleSpec, WeatherCondition, IsochroneContour } from '../types';
import { calculateRangeKm, computeIsochroneContours } from '../services/rangeIsochroneService';

interface RangeIsochroneModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleSpec;
  currentSoc: number;
  reserveSoc: number;
  weather: WeatherCondition;
  originCoords: [number, number];
  originName: string;
  showIsochronesOnMap: boolean;
  onToggleIsochronesOnMap: (show: boolean, contours: IsochroneContour[]) => void;
}

export const RangeIsochroneModal: React.FC<RangeIsochroneModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  currentSoc,
  reserveSoc,
  weather,
  originCoords,
  originName,
  showIsochronesOnMap,
  onToggleIsochronesOnMap,
}) => {
  const [whatIfSoc, setWhatIfSoc] = useState(currentSoc);
  const [whatIfCabinTemp, setWhatIfCabinTemp] = useState(22);
  const [whatIfHeadwind, setWhatIfHeadwind] = useState(0);
  const [whatIfExtraWeight, setWhatIfExtraWeight] = useState(75);

  if (!isOpen) return null;

  const rangeEstimate = calculateRangeKm(vehicle, whatIfSoc, reserveSoc, weather, {
    startingSoc: whatIfSoc,
    cabinTempC: whatIfCabinTemp,
    headwindDeltaKmh: whatIfHeadwind,
    extraWeightKg: whatIfExtraWeight,
  });

  const contours = computeIsochroneContours(
    originCoords[0],
    originCoords[1],
    vehicle,
    whatIfSoc,
    reserveSoc,
    weather,
    {
      startingSoc: whatIfSoc,
      cabinTempC: whatIfCabinTemp,
      headwindDeltaKmh: whatIfHeadwind,
      extraWeightKg: whatIfExtraWeight,
    }
  );

  const handleApplyToMap = () => {
    onToggleIsochronesOnMap(true, contours);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Range Radar & Reachability</h2>
              <p className="text-xs text-slate-400">
                Dynamic travel radius centered at {originName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Range Preview Cards */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3.5 rounded-xl bg-[#141924] border border-emerald-500/30 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
              Safe Range
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {rangeEstimate.safeRangeKm} <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">With {reserveSoc}% buffer</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141924] border border-white/[0.06] text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              Adverse Weather
            </div>
            <div className="text-2xl font-bold font-mono text-slate-200 tabular-nums">
              {rangeEstimate.p90ConservativeRangeKm} <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Heavy AC or winds</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141924] border border-white/[0.06] text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Max Extended
            </div>
            <div className="text-2xl font-bold font-mono text-slate-300 tabular-nums">
              {rangeEstimate.nominalRangeKm} <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Full battery cycle</div>
          </div>
        </div>

        {/* Sensitivity Sliders */}
        <div className="space-y-4 bg-[#141924] p-4 rounded-xl border border-white/[0.06]">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Adjust What-If Scenarios
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {rangeEstimate.effectiveWhPerKm} Wh/km pace
            </span>
          </div>

          {/* Starting SOC */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 text-xs">Simulated Battery Charge</span>
              <span className="font-mono font-bold text-emerald-400 text-xs tabular-nums">{whatIfSoc}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={whatIfSoc}
              onChange={(e) => setWhatIfSoc(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Cabin AC setpoint */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 text-xs">Cabin Climate</span>
              <span className="font-mono font-semibold text-slate-200 text-xs">{whatIfCabinTemp}°C (Outside: {weather.temperatureC}°C)</span>
            </div>
            <input
              type="range"
              min="18"
              max="28"
              step="0.5"
              value={whatIfCabinTemp}
              onChange={(e) => setWhatIfCabinTemp(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Headwind delta */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 text-xs">Wind Gust Scenario</span>
              <span className="font-mono font-semibold text-slate-200 text-xs">
                {whatIfHeadwind > 0 ? `+${whatIfHeadwind} km/h Headwind` : whatIfHeadwind < 0 ? `${whatIfHeadwind} km/h Tailwind` : 'Neutral'}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="35"
              step="5"
              value={whatIfHeadwind}
              onChange={(e) => setWhatIfHeadwind(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Payload weight */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 text-xs">Extra Cargo & Passengers</span>
              <span className="font-mono font-semibold text-slate-200 text-xs">+{whatIfExtraWeight} kg</span>
            </div>
            <input
              type="range"
              min="0"
              max="350"
              step="25"
              value={whatIfExtraWeight}
              onChange={(e) => setWhatIfExtraWeight(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setWhatIfSoc(currentSoc);
              setWhatIfCabinTemp(22);
              setWhatIfHeadwind(0);
              setWhatIfExtraWeight(75);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Reset
          </button>

          <div className="flex items-center gap-2">
            {showIsochronesOnMap && (
              <button
                type="button"
                onClick={() => onToggleIsochronesOnMap(false, [])}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition cursor-pointer"
              >
                Hide
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyToMap}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overlay Range Contours on Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
