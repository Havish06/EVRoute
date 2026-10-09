import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Navbar, AppMode } from './components/Navbar';
import { PlanMode } from './components/modes/PlanMode';
import { DriveMode } from './components/modes/DriveMode';
import { AnalyzeMode } from './components/modes/AnalyzeMode';
import { EngineMode } from './components/modes/EngineMode';
import { MLInsightsModal } from './components/MLInsightsModal';
import { RangeIsochroneModal } from './components/RangeIsochroneModal';
import { ModelLearningModal } from './components/ModelLearningModal';
import { VehicleSpecSettingsModal } from './components/VehicleSpecSettingsModal';
import { NotFoundPage } from './components/NotFoundPage';
import { ROUTE_PRESETS, RoutePreset } from './data/sampleRoutes';
import { VEHICLE_DATABASE, getVehicleById } from './data/vehicles';
import { VehicleSpec, TripInputs, RouteOption, TelemetryState, WeatherCondition, IsochroneContour, TelemetryAnomaly, DriverStyle } from './types';
import { computeAllRouteOptions, solveAStarRoute } from './services/astarRouter';
import { fetchRealtimeRouteWeather } from './services/weatherService';
import { recordTelemetryObservation } from './services/telemetryLearningLoop';

const getInitialRouteState = (): { mode: AppMode; isNotFound: boolean } => {
  const rawPath = window.location.pathname.toLowerCase();
  const cleanPath = rawPath.replace(/\/+$/, '') || '/';
  
  if (cleanPath === '/' || cleanPath === '/plan') {
    return { mode: 'plan', isNotFound: false };
  }
  if (cleanPath === '/drive') {
    return { mode: 'drive', isNotFound: false };
  }
  if (cleanPath === '/analyze') {
    return { mode: 'analyze', isNotFound: false };
  }
  if (cleanPath === '/engine') {
    return { mode: 'engine', isNotFound: false };
  }
  return { mode: 'plan', isNotFound: true };
};

export default function App() {
  const initialRoute = useMemo(() => getInitialRouteState(), []);
  const [activeMode, setActiveMode] = useState<AppMode>(initialRoute.mode);
  const [isNotFound, setIsNotFound] = useState<boolean>(initialRoute.isNotFound);
  const [attemptedPath, setAttemptedPath] = useState<string>(() => window.location.pathname || '/');
  const [activePreset, setActivePreset] = useState<RoutePreset>(ROUTE_PRESETS[0]);
  const [currentWeather, setCurrentWeather] = useState<WeatherCondition>(ROUTE_PRESETS[0].weather);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSpec>(() =>
    getVehicleById(ROUTE_PRESETS[0].defaultVehicleId)
  );

  const [inputs, setInputs] = useState<TripInputs>({
    vehicleId: ROUTE_PRESETS[0].defaultVehicleId,
    sourceId: ROUTE_PRESETS[0].sourceNodeId,
    destinationId: ROUTE_PRESETS[0].destinationNodeId,
    batterySoc: ROUTE_PRESETS[0].defaultSoc,
    passengers: 2,
    passengerWeightKg: 75,
    cargoWeightKg: 20,
    minimumReserveSoc: 10,
    cabinTempC: 22,
    routingObjective: 'energy_efficient',
    driverStyle: 'balanced',
  });

  const [isMLModalOpen, setIsMLModalOpen] = useState(false);
  const [isIsochroneModalOpen, setIsIsochroneModalOpen] = useState(false);
  const [isModelLearningModalOpen, setIsModelLearningModalOpen] = useState(false);
  const [isVehicleSettingsOpen, setIsVehicleSettingsOpen] = useState(false);
  const [showIsochronesOnMap, setShowIsochronesOnMap] = useState(false);
  const [isochroneContours, setIsochroneContours] = useState<IsochroneContour[]>([]);
  const [isDriving, setIsDriving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Computed routes
  const [routes, setRoutes] = useState<RouteOption[]>(() => {
    return computeAllRouteOptions(
      activePreset.nodes,
      activePreset.edges,
      selectedVehicle,
      inputs,
      currentWeather
    );
  });
  const [activeRouteId, setActiveRouteId] = useState<string>('route_energy_efficient');

  const handleSelectVehicle = useCallback((vehicle: VehicleSpec) => {
    setSelectedVehicle(vehicle);
    setInputs(prev => ({ ...prev, vehicleId: vehicle.id }));
  }, []);

  // Fast route calculation
  const calculateRoutes = useCallback(() => {
    setIsCalculating(true);
    requestAnimationFrame(() => {
      const computed = computeAllRouteOptions(
        activePreset.nodes,
        activePreset.edges,
        selectedVehicle,
        inputs,
        currentWeather
      );
      setRoutes(computed);
      if (computed.length > 0) {
        setActiveRouteId(prevId => {
          const match = computed.find(r => r.id === prevId) || computed.find(r => r.type === inputs.routingObjective) || computed[0];
          return match.id;
        });
      }
      setIsCalculating(false);
    });
  }, [activePreset, selectedVehicle, inputs, currentWeather]);

  // Recalculate routes when vehicle, preset, or inputs change
  useEffect(() => {
    calculateRoutes();
  }, [selectedVehicle.id, activePreset.id, inputs.batterySoc, inputs.passengers, inputs.cargoWeightKg, inputs.minimumReserveSoc, inputs.driverStyle]);

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
    packTempC: 31,
    preconditioningActive: false,
    anomalyAlert: { detected: false, type: 'none', message: '', severity: 'low' },
    driverStyle: inputs.driverStyle || 'balanced',
    p10ArrivalSoc: 0,
    p90ArrivalSoc: 0,
  });

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
      packTempC: 31,
      preconditioningActive: false,
      anomalyAlert: { detected: false, type: 'none', message: '', severity: 'low' },
      driverStyle: inputs.driverStyle || 'balanced',
      p10ArrivalSoc: activeRoute?.quantile?.p10Soc || 0,
      p90ArrivalSoc: activeRoute?.quantile?.p90Soc || 0,
    });
  }, [activePreset, inputs.batterySoc, inputs.driverStyle, activeRoute]);

  // Handle preset change
  const handleSelectPreset = (preset: RoutePreset) => {
    setActivePreset(preset);
    setCurrentWeather(preset.weather);
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

  // Weather Refresh
  const handleRefreshWeather = useCallback(() => {
    setIsRefreshingWeather(true);
    setTimeout(() => {
      const { updatedWeather } = fetchRealtimeRouteWeather(
        currentWeather,
        activePreset.name
      );
      setCurrentWeather(updatedWeather);
      setIsRefreshingWeather(false);
    }, 350);
  }, [currentWeather, activePreset.name]);

  // Driving Simulation Animation Loop
  useEffect(() => {
    if (!isDriving || !activeRoute || activeRoute.polyline.length === 0) return;

    const interval = setInterval(() => {
      setTelemetry(prev => {
        const polyline = activeRoute.polyline;
        const totalPoints = polyline.length;
        if (totalPoints < 2) return prev;

        const step = (0.35 * prev.simSpeedMultiplier) / (activeRoute.totalDistanceKm || 100);
        const newProgress = Math.min(100, prev.progressPercent + step);

        const pointFloat = (newProgress / 100) * (totalPoints - 1);
        const pointIdx = Math.min(totalPoints - 2, Math.floor(pointFloat));
        const t = pointFloat - pointIdx;

        const p1 = polyline[pointIdx];
        const p2 = polyline[pointIdx + 1] || p1;

        const currentLat = p1[0] + (p2[0] - p1[0]) * t;
        const currentLng = p1[1] + (p2[1] - p1[1]) * t;
        const currentDistanceKm = Number(((newProgress / 100) * activeRoute.totalDistanceKm).toFixed(1));

        const segmentIdx = Math.min(
          activeRoute.segments.length - 1,
          Math.floor((newProgress / 100) * activeRoute.segments.length)
        );
        const activeSeg = activeRoute.segments[segmentIdx];
        const currentSpeedKmh = activeSeg ? activeSeg.speedKmh : 70;

        const startElev = activePreset.nodes.find(n => n.id === activeRoute.pathNodeIds[0])?.elevationM || 32;
        const destElev = activePreset.nodes.find(n => n.id === activeRoute.pathNodeIds[activeRoute.pathNodeIds.length - 1])?.elevationM || 1515;
        let elevT = newProgress / 100;
        if (elevT > 0.75) elevT = 0.3 + Math.pow((elevT - 0.75) / 0.25, 1.8) * 0.7;
        const currentElevationM = Math.round(startElev + (destElev - startElev) * elevT);

        const expectedSocDropTotal = inputs.batterySoc - activeRoute.arrivalSoc;
        const predictedSocAtPoint = inputs.batterySoc - (expectedSocDropTotal * (newProgress / 100));

        const actualSocDrop = (expectedSocDropTotal * (newProgress / 100)) * disturbanceRef.current;
        const currentActualSoc = Math.max(0, inputs.batterySoc - actualSocDrop);
        const socErrorPercent = Number((predictedSocAtPoint - currentActualSoc).toFixed(1));

        const rerouteSuggested = socErrorPercent >= 3.2 && currentActualSoc < (inputs.minimumReserveSoc + 6);

        const hasChargingStop = Boolean(activeRoute.chargingStops && activeRoute.chargingStops.length > 0);
        const remainingDistKm = activeRoute.totalDistanceKm - currentDistanceKm;
        const preconditioningActive = hasChargingStop && remainingDistKm < 35 && remainingDistKm > 5;

        const baseTemp = 30 + (currentSpeedKmh > 85 ? 3 : 1);
        const packTempC = preconditioningActive ? 32 : Math.round(baseTemp + (currentDistanceKm * 0.012));

        const anomalyDetected = disturbanceRef.current > 1.15 || socErrorPercent >= 3.8;
        const anomalyAlert: TelemetryAnomaly = anomalyDetected ? {
          detected: true,
          type: 'excess_drain',
          message: `Excess Energy Drain Detected (+${((disturbanceRef.current - 1) * 100).toFixed(0)}% above baseline). Reduce highway speed or plan reroute.`,
          severity: disturbanceRef.current > 1.25 ? 'high' : 'medium',
        } : { detected: false, type: 'none', message: '', severity: 'low' };

        const p10ArrivalSoc = activeRoute.quantile?.p10Soc || Math.round(currentActualSoc - (expectedSocDropTotal * (1 - newProgress / 100) * 0.92));
        const p90ArrivalSoc = activeRoute.quantile?.p90Soc || Math.round(currentActualSoc - (expectedSocDropTotal * (1 - newProgress / 100) * 1.12));

        if (newProgress >= 100) {
          setIsDriving(false);
          recordTelemetryObservation({
            vehicleId: selectedVehicle.id,
            distanceKm: activeRoute.totalDistanceKm,
            avgSpeedKmh: Math.round(activeRoute.totalDistanceKm / (activeRoute.totalTravelTimeMin / 60)),
            gradientAvg: 0.15,
            ambientTempC: currentWeather.temperatureC,
            predictedWhPerKm: activeRoute.averageWhPerKm,
            actualWhPerKm: Math.round(activeRoute.averageWhPerKm * disturbanceRef.current),
            errorRatio: Number((disturbanceRef.current).toFixed(3)),
            driverStyle: inputs.driverStyle || 'balanced',
          });
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
          packTempC,
          preconditioningActive,
          anomalyAlert,
          p10ArrivalSoc,
          p90ArrivalSoc,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isDriving, activeRoute, activePreset, inputs.batterySoc, inputs.minimumReserveSoc, inputs.driverStyle, selectedVehicle, currentWeather]);

  // Disturbance Injection Handler
  const handleInjectDisturbance = (type: 'headwind' | 'ac_blast' | 'traffic_shock') => {
    if (type === 'headwind') {
      disturbanceRef.current += 0.22;
    } else if (type === 'ac_blast') {
      disturbanceRef.current += 0.15;
    } else if (type === 'traffic_shock') {
      disturbanceRef.current += 0.28;
    }
  };

  // Dynamic Rerouting Execution
  const handleTriggerDynamicReroute = () => {
    const recalculated = solveAStarRoute(
      'energy_efficient',
      activePreset.nodes,
      activePreset.edges,
      selectedVehicle,
      {
        ...inputs,
        batterySoc: Math.round(telemetry.currentActualSoc),
        minimumReserveSoc: Math.max(15, inputs.minimumReserveSoc + 4),
      },
      {
        ...activePreset.weather,
        windSpeedKmh: activePreset.weather.windSpeedKmh + 20,
      }
    );

    if (recalculated) {
      recalculated.name = 'EVRoute Dynamic Reroute (Safety Recovery)';
      recalculated.color = '#06b6d4';
      recalculated.explanation = {
        title: 'Dynamic Reroute Executed',
        points: [
          'Detected real-time energy consumption rate exceeding initial prediction by +15%',
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

  const originCoords: [number, number] = [
    activePreset.nodes[0]?.lat || 12.8406,
    activePreset.nodes[0]?.lng || 80.1534,
  ];

  // Browser navigation popstate listener
  useEffect(() => {
    const handlePopState = () => {
      const { mode, isNotFound: notFound } = getInitialRouteState();
      setActiveMode(mode);
      setIsNotFound(notFound);
      setAttemptedPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectMode = (mode: AppMode) => {
    setActiveMode(mode);
    setIsNotFound(false);
    const targetUrl = mode === 'plan' ? '/' : `/${mode}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  const handleTrigger404 = () => {
    setAttemptedPath('/unmapped-waypoint-404');
    setIsNotFound(true);
    window.history.pushState({}, '', '/404');
  };

  const handleReturnFromNotFound = (preset?: RoutePreset, mode: AppMode = 'plan') => {
    if (preset) {
      handleSelectPreset(preset);
    }
    setActiveMode(mode);
    setIsNotFound(false);
    const targetUrl = mode === 'plan' ? '/' : `/${mode}`;
    window.history.pushState({}, '', targetUrl);
  };

  if (isNotFound) {
    return (
      <NotFoundPage
        attemptedPath={attemptedPath}
        selectedVehicle={selectedVehicle}
        currentSoc={telemetry.currentActualSoc}
        onReturnToCockpit={handleReturnFromNotFound}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-900">
      {/* Top Navbar with Mode Switching & Global Status */}
      <Navbar
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={handleSelectVehicle}
        currentSoc={telemetry.currentActualSoc}
        batteryHealthPercent={inputs.batteryHealthPercent || 100}
        weather={currentWeather}
        isDriving={isDriving}
        onRefreshWeather={handleRefreshWeather}
        isRefreshingWeather={isRefreshingWeather}
        onOpenMLModal={() => setIsMLModalOpen(true)}
        onOpenIsochrones={() => setIsIsochroneModalOpen(true)}
        onOpenModelLearningModal={() => setIsModelLearningModalOpen(true)}
        onOpenVehicleSettings={() => setIsVehicleSettingsOpen(true)}
        onTrigger404={handleTrigger404}
      />

      {/* Main Mode Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-2.5 sm:p-4">
        {/* Core Product Pipeline Header */}
        <div className="mb-3 hidden sm:flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#0f121a]/90 border border-white/[0.06] rounded-xl px-3.5 py-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold tracking-wider font-sans">EV COCKPIT PIPELINE:</span>
            <span>Vehicle Dynamics</span>
            <span className="text-emerald-400">→</span>
            <span>Terrain & Weather</span>
            <span className="text-emerald-400">→</span>
            <span>ML Energy Prediction</span>
            <span className="text-emerald-400">→</span>
            <span>A* Battery Search</span>
            <span className="text-emerald-400">→</span>
            <span className="text-emerald-400 font-semibold">Optimal EV Trajectory</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden lg:inline font-mono">
            Corridor: {activePreset.name}
          </span>
        </div>

        {/* 1. PLAN MODE */}
        {activeMode === 'plan' && activeRoute && (
          <PlanMode
            inputs={inputs}
            onChangeInputs={setInputs}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onCalculateRoute={calculateRoutes}
            isDriving={isDriving}
            weather={currentWeather}
            nodes={activePreset.nodes}
            routes={routes}
            activeRoute={activeRoute}
            onSelectRoute={(r) => setActiveRouteId(r.id)}
            telemetry={telemetry}
            isCalculating={isCalculating}
            onOpenVehicleSettings={() => setIsVehicleSettingsOpen(true)}
            onStartDrive={() => setActiveMode('drive')}
          />
        )}

        {/* 2. DRIVE MODE */}
        {activeMode === 'drive' && activeRoute && (
          <DriveMode
            telemetry={telemetry}
            activeRoute={activeRoute}
            routes={routes}
            onSelectRoute={(r) => setActiveRouteId(r.id)}
            nodes={activePreset.nodes}
            selectedVehicle={selectedVehicle}
            isDriving={isDriving}
            onToggleDriving={() => setIsDriving(prev => !prev)}
            onResetDriving={resetTelemetry}
            onChangeSpeedMultiplier={(m) => setTelemetry(prev => ({ ...prev, simSpeedMultiplier: m }))}
            onInjectDisturbance={handleInjectDisturbance}
            onTriggerDynamicReroute={handleTriggerDynamicReroute}
          />
        )}

        {/* 3. ANALYZE MODE */}
        {activeMode === 'analyze' && activeRoute && (
          <AnalyzeMode
            activeRoute={activeRoute}
            nodes={activePreset.nodes}
            selectedVehicle={selectedVehicle}
            weather={currentWeather}
            startSoc={inputs.batterySoc}
            minimumReserveSoc={inputs.minimumReserveSoc}
          />
        )}

        {/* 4. ENGINE MODE */}
        {activeMode === 'engine' && activeRoute && (
          <EngineMode
            nodes={activePreset.nodes}
            edges={activePreset.edges}
            selectedVehicle={selectedVehicle}
            inputs={inputs}
            onChangeInputs={setInputs}
            activeRoute={activeRoute}
            weather={currentWeather}
            onSelectRoute={(r) => setActiveRouteId(r.id)}
          />
        )}
      </main>

      {/* Technical Modals */}
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

      <RangeIsochroneModal
        isOpen={isIsochroneModalOpen}
        onClose={() => setIsIsochroneModalOpen(false)}
        vehicle={selectedVehicle}
        currentSoc={inputs.batterySoc}
        reserveSoc={inputs.minimumReserveSoc}
        weather={currentWeather}
        originCoords={originCoords}
        originName={activePreset.nodes[0]?.name || 'Origin'}
        showIsochronesOnMap={showIsochronesOnMap}
        onToggleIsochronesOnMap={(show, contours) => {
          setShowIsochronesOnMap(show);
          setIsochroneContours(contours);
        }}
      />

      <ModelLearningModal
        isOpen={isModelLearningModalOpen}
        onClose={() => setIsModelLearningModalOpen(false)}
        currentDriverStyle={inputs.driverStyle || 'balanced'}
        onSelectDriverStyle={(style: DriverStyle) => setInputs(prev => ({ ...prev, driverStyle: style }))}
      />

      <VehicleSpecSettingsModal
        isOpen={isVehicleSettingsOpen}
        onClose={() => setIsVehicleSettingsOpen(false)}
        selectedVehicle={selectedVehicle}
        inputs={inputs}
        onChangeInputs={setInputs}
      />
    </div>
  );
}
