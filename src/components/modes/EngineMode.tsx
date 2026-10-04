import React, { FC, useState, useEffect } from 'react';
import { 
  Cpu, 
  GitBranch, 
  Sliders, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Activity, 
  Clock, 
  Flame, 
  Layers, 
  ArrowRight,
  Compass,
  Users,
  Luggage,
  BatteryMedium,
  ShieldAlert,
  Gauge
} from 'lucide-react';
import { 
  GraphNode, 
  GraphEdge, 
  VehicleSpec, 
  TripInputs, 
  RouteOption, 
  WeatherCondition,
  DriverStyle 
} from '../../types';
import { getLastAStarMetrics, solveAStarRoute } from '../../services/astarRouter';

interface EngineModeProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedVehicle: VehicleSpec;
  inputs: TripInputs;
  onChangeInputs: (newInputs: TripInputs) => void;
  activeRoute: RouteOption;
  weather: WeatherCondition;
  onSelectRoute: (route: RouteOption) => void;
}

export const EngineMode: FC<EngineModeProps> = ({
  nodes,
  edges,
  selectedVehicle,
  inputs,
  onChangeInputs,
  activeRoute,
  weather,
  onSelectRoute,
}) => {
  const metrics = getLastAStarMetrics();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>(edges[0]?.id || '');
  const [recalcFeedback, setRecalcFeedback] = useState<string>('Route updated');
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedEdge = edges.find(e => e.id === selectedEdgeId) || edges[0];
  const fromNode = nodes.find(n => n.id === selectedEdge?.fromNodeId);
  const toNode = nodes.find(n => n.id === selectedEdge?.toNodeId);

  // Check if selected edge is in active route
  const activeSegmentMatch = activeRoute.segments.find(s => s.edgeId === selectedEdge?.id);
  const isEdgeInSelectedRoute = activeRoute.pathNodeIds.includes(selectedEdge?.fromNodeId) && 
    activeRoute.pathNodeIds.includes(selectedEdge?.toNodeId);
  const isSegmentFeasible = !activeSegmentMatch || (activeSegmentMatch.endSocPercent >= inputs.minimumReserveSoc);

  // Scenario Presets
  const scenarios = [
    {
      name: 'College Trip',
      desc: '3 passengers · 20 kg gear',
      soc: 68,
      passengers: 3,
      cargo: 20,
      driverStyle: 'balanced' as DriverStyle,
      reserve: 10,
    },
    {
      name: 'Mountain Trip',
      desc: '5 passengers · 150 kg luggage',
      soc: 85,
      passengers: 5,
      cargo: 150,
      driverStyle: 'eco_hypermiler' as DriverStyle,
      reserve: 15,
    },
    {
      name: 'Low Battery Scenario',
      desc: '35% SOC · Range stress test',
      soc: 35,
      passengers: 2,
      cargo: 0,
      driverStyle: 'eco_hypermiler' as DriverStyle,
      reserve: 10,
    },
  ];

  const handleApplyScenario = (sc: typeof scenarios[0]) => {
    setIsUpdating(true);
    setRecalcFeedback('Applying scenario preset...');
    setTimeout(() => {
      setRecalcFeedback('Running A* constrained graph search...');
      const updatedInputs: TripInputs = {
        ...inputs,
        batterySoc: sc.soc,
        passengers: sc.passengers,
        cargoWeightKg: sc.cargo,
        minimumReserveSoc: sc.reserve,
        driverStyle: sc.driverStyle,
      };
      onChangeInputs(updatedInputs);

      const newRoute = solveAStarRoute('energy_efficient', nodes, edges, selectedVehicle, updatedInputs, weather);
      if (newRoute) {
        onSelectRoute(newRoute);
      }
      setIsUpdating(false);
      setRecalcFeedback('Route updated.');
    }, 250);
  };

  const handleInputChange = (field: keyof TripInputs, value: any) => {
    setIsUpdating(true);
    setRecalcFeedback('Updating vehicle load...');
    const updated = { ...inputs, [field]: value };
    onChangeInputs(updated);

    setTimeout(() => {
      setRecalcFeedback('Running A*...');
      const newRoute = solveAStarRoute(inputs.routingObjective, nodes, edges, selectedVehicle, updated, weather);
      if (newRoute) {
        onSelectRoute(newRoute);
      }
      setIsUpdating(false);
      setRecalcFeedback('Route updated.');
    }, 150);
  };

  return (
    <div className="space-y-4">
      {/* 1. A* SEARCH TELEMETRY HEADER */}
      <div className="bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              A* Route Engine Telemetry & Pruning State
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Duration: {metrics.searchDurationMs}ms
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Nodes Explored</span>
            <span className="text-base font-bold text-slate-100">{metrics.nodesExplored}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Open queue states</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Candidate Paths</span>
            <span className="text-base font-bold text-cyan-400">{metrics.candidatePathsEvaluated}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Graph edge traversals</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">SOC Infeasible Pruned</span>
            <span className="text-base font-bold text-rose-400">{metrics.socInfeasibleEdgesPruned}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Battery exhaustion cut</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Charging Nodes</span>
            <span className="text-base font-bold text-amber-400">{metrics.chargingNodesConsidered}</span>
            <span className="text-[10px] text-slate-400 font-sans block">DC stations tested</span>
          </div>

          <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Final Path Cost</span>
            <span className="text-base font-bold text-emerald-400">{metrics.finalPathCost}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Normalized objective</span>
          </div>
        </div>
      </div>

      {/* 2. ROAD GRAPH TOPOLOGY & EDGE INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Road Graph Topological Flow */}
        <div className="lg:col-span-8 bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                Road Network Topology Graph
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Select any edge to inspect battery feasibility
            </span>
          </div>

          {/* Interactive Topology Graph Flow */}
          <div className="p-3 bg-[#141822] rounded-lg border border-white/[0.06] overflow-x-auto">
            <div className="text-[11px] font-mono text-slate-400 mb-2">Network Highway Segments ({edges.length} corridors):</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {edges.map((edge) => {
                const isSelected = selectedEdgeId === edge.id;
                const isInActiveRoute = activeRoute.pathNodeIds.includes(edge.fromNodeId) && activeRoute.pathNodeIds.includes(edge.toNodeId);
                const fromN = nodes.find(n => n.id === edge.fromNodeId);
                const toN = nodes.find(n => n.id === edge.toNodeId);

                return (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => setSelectedEdgeId(edge.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/30'
                        : isInActiveRoute
                        ? 'bg-[#181d2a] border-cyan-500/40 text-slate-200'
                        : 'bg-[#10141e] border-white/[0.05] text-slate-400 hover:text-slate-200 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono mb-1">
                      <span className="font-semibold text-slate-200 truncate max-w-[160px]">
                        {fromN?.name.split(' ')[0]} → {toN?.name.split(' ')[0]}
                      </span>
                      {isInActiveRoute && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{edge.distanceKm} km · {edge.averageSpeedKmh} km/h</span>
                      <span className={edge.gradientPercent > 2 ? 'text-amber-400' : 'text-slate-300'}>
                        {edge.gradientPercent > 0 ? `+${edge.gradientPercent}%` : `${edge.gradientPercent}%`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Edge Inspector */}
        <div className="lg:col-span-4 bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                Segment Feasibility
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                isSegmentFeasible
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              }`}>
                {isSegmentFeasible ? '✓ FEASIBLE' : '✕ BATTERY CONSTRAINT'}
              </span>
            </div>

            {selectedEdge && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Corridor Segment</span>
                  <div className="font-semibold text-slate-100 mt-0.5">
                    {fromNode?.name} → {toNode?.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Distance</span>
                    <span className="text-slate-100 font-bold">{selectedEdge.distanceKm} km</span>
                  </div>
                  <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Gradient</span>
                    <span className={`font-bold ${selectedEdge.gradientPercent > 2 ? 'text-amber-400' : 'text-slate-100'}`}>
                      {selectedEdge.gradientPercent}%
                    </span>
                  </div>
                  <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Speed Limit</span>
                    <span className="text-slate-100 font-bold">{selectedEdge.speedLimitKmh} km/h</span>
                  </div>
                  <div className="bg-[#141822] p-2 rounded-lg border border-white/[0.06]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Traffic Level</span>
                    <span className="text-cyan-400 font-bold capitalize">{selectedEdge.trafficLevel}</span>
                  </div>
                </div>

                {activeSegmentMatch && (
                  <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-sans font-semibold">
                      Evaluated Energy Consumption
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Predicted Energy:</span>
                      <span className="text-emerald-400 font-bold">{activeSegmentMatch.mlPredictedEnergyKwh.toFixed(2)} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Battery Drop:</span>
                      <span className="text-amber-300 font-bold">-{activeSegmentMatch.socDropPercent.toFixed(1)}% SOC</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                      <span className="text-slate-400">Battery after segment:</span>
                      <span className={`font-bold ${activeSegmentMatch.endSocPercent < inputs.minimumReserveSoc ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {activeSegmentMatch.endSocPercent.toFixed(1)}% SOC
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06] text-[10px] text-slate-400">
            A* algorithm verifies battery feasibility across each edge before adding state to Pareto queue.
          </div>
        </div>
      </div>

      {/* 3. WHAT-IF SIMULATOR & SCENARIO PRESETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* What-If Live Tuning */}
        <div className="lg:col-span-7 bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                What-If? Energy & Feasibility Simulator
              </h3>
            </div>
            {/* Live recalculation subtle feedback */}
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
              isUpdating 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {recalcFeedback}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Passengers */}
            <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Passengers
                </span>
                <span className="font-mono font-bold text-slate-100">{inputs.passengers}</span>
              </div>
              <input
                type="range"
                min={1}
                max={7}
                value={inputs.passengers}
                onChange={(e) => handleInputChange('passengers', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>1 solo</span>
                <span>4 family</span>
                <span>7 full</span>
              </div>
            </div>

            {/* Cargo */}
            <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Luggage className="w-3.5 h-3.5 text-slate-400" />
                  Cargo Load
                </span>
                <span className="font-mono font-bold text-slate-100">{inputs.cargoWeightKg} kg</span>
              </div>
              <input
                type="range"
                min={0}
                max={250}
                step={10}
                value={inputs.cargoWeightKg}
                onChange={(e) => handleInputChange('cargoWeightKg', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>0 kg</span>
                <span>100 kg</span>
                <span>250 kg</span>
              </div>
            </div>

            {/* Battery SOC */}
            <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
                  Battery SOC
                </span>
                <span className="font-mono font-bold text-emerald-400">{inputs.batterySoc}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={inputs.batterySoc}
                onChange={(e) => handleInputChange('batterySoc', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>20% Low</span>
                <span>60%</span>
                <span>100% Full</span>
              </div>
            </div>

            {/* Battery State-of-Health (SoH) Multiplier */}
            <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06]">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Battery Health (SoH)
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100}%
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({(selectedVehicle.usableCapacityKwh * ((inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100) / 100)).toFixed(1)} kWh)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100}
                onChange={(e) => handleInputChange('batteryHealthPercent', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>50% Worn</span>
                <span>85% Fleet</span>
                <span>100% New</span>
              </div>
            </div>

            {/* Driver Style */}
            <div className="bg-[#141822] p-2.5 rounded-lg border border-white/[0.06] sm:col-span-2">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  Driving Style
                </span>
                <span className="font-mono font-bold text-cyan-400 capitalize">{inputs.driverStyle || 'balanced'}</span>
              </div>
              <select
                value={inputs.driverStyle || 'balanced'}
                onChange={(e) => handleInputChange('driverStyle', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 mt-0.5 focus:outline-none"
              >
                <option value="eco_hypermiler">Eco Hypermiler (Smooth coasting)</option>
                <option value="balanced">Balanced Cruiser (Standard highway)</option>
                <option value="spirited">Spirited (Aggressive throttle)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scenario Presets */}
        <div className="lg:col-span-5 bg-[#0f121a] rounded-xl border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
              Scenario Presets
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Instant evaluation
            </span>
          </div>

          <div className="space-y-2">
            {scenarios.map((sc) => (
              <button
                key={sc.name}
                type="button"
                onClick={() => handleApplyScenario(sc)}
                className="w-full p-2.5 rounded-lg bg-[#141822] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">{sc.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sc.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">{sc.soc}% SOC</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
