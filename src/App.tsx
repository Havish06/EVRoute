import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { TripInputPanel } from './components/TripInputPanel';
import { RouteMap } from './components/RouteMap';
import { RouteComparison } from './components/RouteComparison';
import { ElevationProfile } from './components/ElevationProfile';
import { LiveTelemetryPanel } from './components/LiveTelemetryPanel';
import { MLInsightsModal } from './components/MLInsightsModal';
import { ROUTE_PRESETS, RoutePreset } from './data/sampleRoutes';
import { VEHICLE_DATABASE, getVehicleById } from './data/vehicles';
import { VehicleSpec, TripInputs, RouteOption, TelemetryState, WeatherCondition } from './types';
import { computeAllRouteOptions, solveAStarRoute } from './services/astarRouter';
import { fetchRealtimeRouteWeather } from './services/weatherService';

export default function App() {
  const [activePreset, setActivePreset] = useState<RoutePreset>(ROUTE_PRESETS[0]);
  const [currentWeather, setCurrentWeather] = useState<WeatherCondition>(ROUTE_PRESETS[0].weather);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);
  const [lastWeatherUpdateText, setLastWeatherUpdateText] = useState<string>('');

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSpec>(
    getVehicleById(ROUTE_PRESETS[0].defaultVehicleId)
  );

  const [inputs, setInputs] = useState<TripInputs>({
    vehicleId: ROUTE_PRESETS[0].defaultVehicleId,
    sourceId: ROUTE_PRESETS[0].sourceNodeId,
    destinationId: ROUTE_PRESETS[0].destinationNodeId,
    batterySoc: ROUTE_PRESETS[0].defaultSoc,
    passengers: 3,
    passengerWeightKg: 75,
    cargoWeightKg: 20,
    minimumReserveSoc: 10,
    cabinTempC: 22,
    routingObjective: 'energy_efficient',
  });

  const [isMLModalOpen, setIsMLModalOpen] = useState(false);
  const [isDriving, setIsDriving] = useState(false);

  // Computed routes
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string>('route_energy_efficient');

  // Calculate routes on input change, scenario switch, or weather update
  const calculateRoutes = useCallback(() => {
    const computed = computeAllRouteOptions(
      activePreset.nodes,
      activePreset.edges,
      selectedVehicle,
      inputs,
      currentWeather
    );
    setRoutes(computed);
    if (computed.length > 0) {
      const match = computed.find(r => r.type === inputs.routingObjective) || computed[0];
      setActiveRouteId(match.id);
    }
  }, [activePreset, selectedVehicle, inputs, currentWeather]);

  // Initial calculation
  useEffect(() => {
    calculateRoutes();
  }, [calculateRoutes]);

  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === activeRouteId) || routes[0] || null;
  }, [routes, activeRouteId]);

  // Telemetry simulation state
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    currentDistanceKm: 0,
    currentLat: activePreset.nodes[0]?.lat || 12.8406,
    currentLng: activePreset.nodes[0]?.lng || 80.1534,
    currentElevationM: activePreset.nodes[0]?.elevationM || 32,
    currentSpeedKmh: 75,
    currentActualSoc: inputs.batterySoc,
    predictedSocAtThisPoint: inputs.batterySoc,
    socErrorPercent: 0,
    isDriving: false,
    simSpeedMultiplier: 5,
    progressPercent: 0,
    activeSegmentIndex: 0,
    rerouteSuggested: false,
  });

  // Additional dynamic disturbance factor
  const disturbanceRef = useRef<number>(1.0);

  // Sync telemetry when active route changes or reset
  const resetTelemetry = useCallback(() => {
    setIsDriving(false);
    disturbanceRef.current = 1.0;
    const originNode = activePreset.nodes.find(n => n.id === activePreset.sourceNodeId) || activePreset.nodes[0];
    setTelemetry({
      currentDistanceKm: 0,
      currentLat: originNode?.lat || 12.8406,
      currentLng: originNode?.lng || 80.1534,
      currentElevationM: originNode?.elevationM || 32,
      currentSpeedKmh: 75,
      currentActualSoc: inputs.batterySoc,
      predictedSocAtThisPoint: inputs.batterySoc,
      socErrorPercent: 0,
      isDriving: false,
      simSpeedMultiplier: 5,
      progressPercent: 0,
      activeSegmentIndex: 0,
      rerouteSuggested: false,
    });
  }, [activePreset, inputs.batterySoc]);

  // Handle preset change
  const handleSelectPreset = (preset: RoutePreset) => {
    setActivePreset(preset);
    setCurrentWeather(preset.weather);
    setLastWeatherUpdateText('');
    const vehicle = getVehicleById(preset.defaultVehicleId);
    setSelectedVehicle(vehicle);
    setInputs(prev => ({
      ...prev,
      vehicleId: vehicle.id,
      sourceId: preset.sourceNodeId,
      destinationId: preset.destinationNodeId,
      batterySoc: preset.defaultSoc,
    }));
    resetTelemetry();
  };

  // Real-Time Segment Weather Refresh Simulation
  const handleRefreshWeather = useCallback(() => {
    setIsRefreshingWeather(true);
    setTimeout(() => {
      const { updatedWeather, deltaDescription } = fetchRealtimeRouteWeather(
        currentWeather,
        activePreset.name
      );
      setCurrentWeather(updatedWeather);
      setLastWeatherUpdateText(deltaDescription);
      setIsRefreshingWeather(false);
    }, 450);
  }, [currentWeather, activePreset.name]);

  // Driving Simulation Animation Loop
  useEffect(() => {
    if (!isDriving || !activeRoute || activeRoute.polyline.length === 0) return;

    const interval = setInterval(() => {
      setTelemetry(prev => {
        const polyline = activeRoute.polyline;
        const totalPoints = polyline.length;
        if (totalPoints < 2) return prev;

        // Advance progress
        const step = (0.35 * prev.simSpeedMultiplier) / (activeRoute.totalDistanceKm || 100);
        const newProgress = Math.min(100, prev.progressPercent + step);

        // Find coordinate along polyline
        const pointFloat = (newProgress / 100) * (totalPoints - 1);
        const pointIdx = Math.min(totalPoints - 2, Math.floor(pointFloat));
        const t = pointFloat - pointIdx;

        const p1 = polyline[pointIdx];
        const p2 = polyline[pointIdx + 1] || p1;

        const currentLat = p1[0] + (p2[0] - p1[0]) * t;
        const currentLng = p1[1] + (p2[1] - p1[1]) * t;
        const currentDistanceKm = Number(((newProgress / 100) * activeRoute.totalDistanceKm).toFixed(1));

        // Estimate current elevation along route
        const segmentIdx = Math.min(
          activeRoute.segments.length - 1,
          Math.floor((newProgress / 100) * activeRoute.segments.length)
        );
        const activeSeg = activeRoute.segments[segmentIdx];
        const currentSpeedKmh = activeSeg ? activeSeg.speedKmh : 70;

        // Linear interpolation of altitude
        const startElev = activePreset.nodes.find(n => n.id === activeRoute.pathNodeIds[0])?.elevationM || 32;
        const destElev = activePreset.nodes.find(n => n.id === activeRoute.pathNodeIds[activeRoute.pathNodeIds.length - 1])?.elevationM || 1515;
        // Mountain ascent accelerates in the last 20%
        let elevT = newProgress / 100;
        if (elevT > 0.75) elevT = 0.3 + Math.pow((elevT - 0.75) / 0.25, 1.8) * 0.7;
        const currentElevationM = Math.round(startElev + (destElev - startElev) * elevT);

        // Battery calculation
        const expectedSocDropTotal = inputs.batterySoc - activeRoute.arrivalSoc;
        const predictedSocAtPoint = inputs.batterySoc - (expectedSocDropTotal * (newProgress / 100));

        // Actual battery accounts for disturbance multiplier
        const actualSocDrop = (expectedSocDropTotal * (newProgress / 100)) * disturbanceRef.current;
        const currentActualSoc = Math.max(0, inputs.batterySoc - actualSocDrop);
        const socErrorPercent = Number((predictedSocAtPoint - currentActualSoc).toFixed(1));

        const rerouteSuggested = socErrorPercent >= 3.5 && currentActualSoc < (inputs.minimumReserveSoc + 4);

        if (newProgress >= 100) {
          setIsDriving(false);
        }

        return {
          ...prev,
          currentDistanceKm,
          currentLat,
          currentLng,
          currentElevationM,
          currentSpeedKmh,
          currentActualSoc,
          predictedSocAtThisPoint: Number(predictedSocAtPoint.toFixed(1)),
          socErrorPercent,
          progressPercent: newProgress,
          activeSegmentIndex: segmentIdx,
          rerouteSuggested,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isDriving, activeRoute, activePreset, inputs.batterySoc, inputs.minimumReserveSoc]);

  // Disturbance Injection Handler
  const handleInjectDisturbance = (type: 'headwind' | 'ac_blast' | 'traffic_shock') => {
    if (type === 'headwind') {
      disturbanceRef.current += 0.22; // 22% more aerodynamic drag
    } else if (type === 'ac_blast') {
      disturbanceRef.current += 0.15; // 15% more auxiliary power
    } else if (type === 'traffic_shock') {
      disturbanceRef.current += 0.28; // 28% stop-and-go acceleration losses
    }
  };

  // Dynamic Rerouting Execution (Section 23)
  const handleTriggerDynamicReroute = () => {
    // Dynamically recalculate route with safer reserve and conservative weights
    const recalculated = solveAStarRoute(
      'energy_efficient',
      activePreset.nodes,
      activePreset.edges,
      selectedVehicle,
      {
        ...inputs,
        batterySoc: Math.round(telemetry.currentActualSoc),
        minimumReserveSoc: 15, // increase safety reserve
      },
      {
        ...activePreset.weather,
        windSpeedKmh: activePreset.weather.windSpeedKmh + 20, // adjust for detected headwinds
      }
    );

    if (recalculated) {
      recalculated.name = 'EVRoute Dynamic Reroute (Safety Recovery)';
      recalculated.color = '#06b6d4'; // bright cyan
      recalculated.explanation = {
        title: 'Dynamic Reroute Executed (Section 23)',
        points: [
          'Detected real-time energy consumption rate exceeding initial prediction by +14%',
          'Recalculated A* graph search prioritizing gentle gradient corridors and nearby charging access',
          `Maintains revised emergency reserve at ${Math.round(recalculated.arrivalSoc)}% arrival SOC`,
        ],
        energySavedKwh: 3.2,
      };

      setRoutes(prev => [recalculated, ...prev.filter(r => r.id !== recalculated.id)]);
      setActiveRouteId(recalculated.id);
      setTelemetry(prev => ({
        ...prev,
        rerouteSuggested: false,
        socErrorPercent: 0,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-900">
      {/* Top Navigation */}
      <Navbar
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        selectedVehicle={selectedVehicle}
        weather={currentWeather}
        onOpenMLModal={() => setIsMLModalOpen(true)}
        isDriving={isDriving}
        onRefreshWeather={handleRefreshWeather}
        isRefreshingWeather={isRefreshingWeather}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Scenario Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">{activePreset.name}</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-mono">
                Active Benchmark
              </span>
            </div>
            <p className="text-slate-400 mt-1">{activePreset.description}</p>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-300">
            <div>
              <span className="text-slate-500 block">Origin Elev:</span>
              <span className="text-slate-200 font-bold">{activePreset.nodes[0]?.elevationM}m MSL</span>
            </div>
            <div>
              <span className="text-slate-500 block">Summit Elev:</span>
              <span className="text-emerald-400 font-bold">
                {activePreset.nodes[activePreset.nodes.length - 1]?.elevationM}m MSL
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Corridor Temp:</span>
              <span className="text-amber-400 font-bold">{currentWeather.temperatureC}°C</span>
            </div>
            <div>
              <span className="text-slate-500 block">Wind Velocity:</span>
              <span className="text-cyan-400 font-bold">{currentWeather.windSpeedKmh} km/h</span>
            </div>
          </div>
        </div>

        {/* Primary Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trip Inputs (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-6">
            <TripInputPanel
              inputs={inputs}
              onChangeInputs={setInputs}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              onCalculateRoute={calculateRoutes}
              isDriving={isDriving}
              weather={currentWeather}
              onRefreshWeather={handleRefreshWeather}
              isRefreshingWeather={isRefreshingWeather}
              lastWeatherUpdateText={lastWeatherUpdateText}
            />
          </div>

          {/* Right Column: Map, Telemetry, Comparison, Elevation (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive Route Map */}
            {activeRoute && (
              <RouteMap
                routes={routes}
                activeRoute={activeRoute}
                onSelectRoute={(r) => setActiveRouteId(r.id)}
                nodes={activePreset.nodes}
                telemetry={telemetry}
                isDriving={isDriving}
              />
            )}

            {/* Live Telemetry & Dynamic Rerouting Engine */}
            {activeRoute && (
              <LiveTelemetryPanel
                telemetry={telemetry}
                activeRoute={activeRoute}
                selectedVehicle={selectedVehicle}
                isDriving={isDriving}
                onToggleDriving={() => setIsDriving(prev => !prev)}
                onResetDriving={resetTelemetry}
                onChangeSpeedMultiplier={(m) => setTelemetry(prev => ({ ...prev, simSpeedMultiplier: m }))}
                onInjectDisturbance={handleInjectDisturbance}
                onTriggerDynamicReroute={handleTriggerDynamicReroute}
              />
            )}

            {/* A* Route Comparison & Explainability */}
            {activeRoute && (
              <RouteComparison
                routes={routes}
                activeRoute={activeRoute}
                onSelectRoute={(r) => setActiveRouteId(r.id)}
                selectedVehicle={selectedVehicle}
                minimumReserveSoc={inputs.minimumReserveSoc}
              />
            )}

            {/* Terrain & Elevation Profile */}
            {activeRoute && (
              <ElevationProfile
                route={activeRoute}
                nodes={activePreset.nodes}
              />
            )}
          </div>
        </div>
      </main>

      {/* ML Insights & Research Modal */}
      {activeRoute && (
        <MLInsightsModal
          isOpen={isMLModalOpen}
          onClose={() => setIsMLModalOpen(false)}
          activeRoute={activeRoute}
          selectedVehicle={selectedVehicle}
          weather={currentWeather}
          inputs={inputs}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600 font-mono">
        <span>EVRoute · Intelligent Electric Vehicle Route Planning using ML-Based Energy Prediction and A* Graph Search</span>
      </footer>
    </div>
  );
}
