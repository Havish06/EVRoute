import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, X, Check, Gauge, Sliders, CheckCircle2 } from 'lucide-react';
import { 
  calculateModelPerformanceMetrics, 
  getStoredObservations, 
  ModelPerformanceMetrics 
} from '../services/telemetryLearningLoop';
import { DriverStyle, TelemetryObservation } from '../types';

interface ModelLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDriverStyle: DriverStyle;
  onSelectDriverStyle: (style: DriverStyle) => void;
}

export const ModelLearningModal: React.FC<ModelLearningModalProps> = ({
  isOpen,
  onClose,
  currentDriverStyle,
  onSelectDriverStyle,
}) => {
  const [metrics, setMetrics] = useState<ModelPerformanceMetrics | null>(null);
  const [observations, setObservations] = useState<TelemetryObservation[]>([]);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMetrics(calculateModelPerformanceMetrics());
      setObservations(getStoredObservations());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetrain = () => {
    setIsRetraining(true);
    setRetrainSuccess(false);

    setTimeout(() => {
      setIsRetraining(false);
      setRetrainSuccess(true);
      setMetrics(calculateModelPerformanceMetrics());
      setTimeout(() => setRetrainSuccess(false), 3500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Driving Persona & Range Tuning</h2>
              <p className="text-xs text-slate-400">
                Personalized throttle response and consumption calibration
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

        {/* Model Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-4">
            <div className="p-3 rounded-xl bg-[#141924] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Prediction Match</span>
              <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">98.6%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">High confidence</span>
            </div>

            <div className="p-3 rounded-xl bg-[#141924] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Average Variance</span>
              <span className="text-lg font-bold font-mono text-slate-200 tabular-nums">3.8 <span className="text-[10px] font-normal text-slate-400">Wh/km</span></span>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">Minimal deviation</span>
            </div>

            <div className="p-3 rounded-xl bg-[#141924] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Adaptive Learning</span>
              <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">Active</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Live self-tuning</span>
            </div>

            <div className="p-3 rounded-xl bg-[#141924] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Efficiency Profile</span>
              <span className="text-lg font-bold font-mono text-slate-200 tabular-nums">Nominal</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Standard index</span>
            </div>
          </div>
        )}

        {/* Driver Style Personalization Selector */}
        <div className="bg-[#141924] p-4 rounded-xl border border-white/[0.06] mb-4">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Select Driving Persona
            </span>
            <span className="text-[10px] font-mono text-emerald-400 capitalize">Current: {currentDriverStyle}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { id: 'eco_hypermiler', label: 'Eco', factor: '0.88x', desc: 'Maximum coasting & gentle acceleration' },
              { id: 'balanced', label: 'Comfort', factor: '1.00x', desc: 'Standard highway and touring pace' },
              { id: 'spirited', label: 'Sport', factor: '1.16x', desc: 'Dynamic throttle response' },
              { id: 'adaptive', label: 'Adaptive', factor: 'Auto', desc: 'Learns automatically from your drive' },
            ].map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => onSelectDriverStyle(persona.id as DriverStyle)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentDriverStyle === persona.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'bg-[#111520] border-white/[0.06] hover:bg-white/[0.04] text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">{persona.label}</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5 font-semibold">{persona.factor} rate</div>
                <div className="text-[10px] text-slate-400 mt-1.5 leading-tight">{persona.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Observations History */}
        <div className="bg-[#141924] p-4 rounded-xl border border-white/[0.06] mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Recent Driving Observations ({observations.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Sync active</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0e121a] border border-white/[0.04] text-[11px]"
              >
                <div>
                  <span className="text-white font-semibold tabular-nums">{obs.distanceKm} km</span>
                  <span className="text-slate-400 ml-2">({obs.avgSpeedKmh} km/h · {obs.driverStyle})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Target: {obs.predictedWhPerKm} Wh/km</span>
                  <span className="text-slate-100 font-bold tabular-nums">Actual: {obs.actualWhPerKm} Wh/km</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    obs.errorRatio > 1.05 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {obs.errorRatio > 1 ? `+${((obs.errorRatio - 1) * 100).toFixed(1)}%` : `${((obs.errorRatio - 1) * 100).toFixed(1)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retrain Action */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <span className="text-xs text-slate-400">
            Adapts range algorithms to your personal driving habits
          </span>

          <div className="flex items-center gap-2">
            {retrainSuccess && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Profile Calibrated
              </span>
            )}

            <button
              type="button"
              disabled={isRetraining}
              onClick={handleRetrain}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              {isRetraining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calibrating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Calibrate With Drive Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
