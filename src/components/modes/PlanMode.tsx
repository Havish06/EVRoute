import React, { FC, useState } from 'react';
import { 
  TripInputs, 
  VehicleSpec, 
  RouteOption, 
  GraphNode, 
  WeatherCondition, 
  TelemetryState, 
  ChargingStation 
} from '../../types';
import { RouteMap } from '../RouteMap';
import { TripInputPanel } from '../TripInputPanel';
import { RouteInfoFloatingCard } from '../RouteInfoFloatingCard';
import { EvEnergyPanel } from '../EvEnergyPanel';
import { RouteAnalysisDrawer } from '../RouteAnalysisDrawer';
import { ChargingStationCard } from '../ChargingStationCard';
import { SlidersHorizontal, ChevronRight, X, Layers, Compass, BatteryCharging } from 'lucide-react';

interface PlanModeProps {
  inputs: TripInputs;
  onChangeInputs: (newInputs: TripInputs) => void;
  selectedVehicle: VehicleSpec;
  onSelectVehicle: (vehicle: VehicleSpec) => void;
  onCalculateRoute: () => void;
  isDriving: boolean;
  weather: WeatherCondition;
  nodes: GraphNode[];
  routes: RouteOption[];
  activeRoute: RouteOption;
  onSelectRoute: (route: RouteOption) => void;
  telemetry: TelemetryState;
  isCalculating?: boolean;
  onOpenVehicleSettings?: () => void;
  onStartDrive?: () => void;
}

export const PlanMode: FC<PlanModeProps> = ({
  inputs,
  onChangeInputs,
  selectedVehicle,
  onSelectVehicle,
  onCalculateRoute,
  isDriving,
  weather,
  nodes,
  routes,
  activeRoute,
  onSelectRoute,
  telemetry,
  isCalculating = false,
  onOpenVehicleSettings,
  onStartDrive,
}) => {
  // UI Dock visibility state
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isAnalysisDrawerOpen, setIsAnalysisDrawerOpen] = useState(false);
  const [selectedChargingStation, setSelectedChargingStation] = useState<ChargingStation | null>(null);

  // Check if active station is in route stops
  const activeStop = selectedChargingStation
    ? activeRoute.chargingStops.find(s => s.station.id === selectedChargingStation.id)
    : undefined;

  const handleToggleStop = (station: ChargingStation) => {
    // If the station is already in stops, clicking can alert or recalculate
    setSelectedChargingStation(null);
  };

  return (
    <div className="relative w-full h-[calc(100vh-76px)] min-h-[640px] max-h-[960px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#090b10]">
      {/* 1. HERO MAP CANVAS (DOMINANT VIEWPORT) */}
      <div className="absolute inset-0 z-0">
        <RouteMap
          routes={routes}
          activeRoute={activeRoute}
          onSelectRoute={onSelectRoute}
          nodes={nodes}
          telemetry={telemetry}
          isDriving={isDriving}
          selectedVehicle={selectedVehicle}
          heightClass="h-full w-full"
          onSelectChargingStation={(station) => setSelectedChargingStation(station)}
          weather={weather}
        />
      </div>

      {/* 2. FLOATING LEFT DOCK: TRIP CONFIGURATION & VEHICLE ENERGY */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 max-w-[340px] sm:max-w-[360px] w-full max-h-[calc(100%-80px)] pointer-events-none">
        {/* Toggle Trip Setup Pill (always visible) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSetupOpen(!isSetupOpen)}
            className="cockpit-panel px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider flex items-center gap-2 text-slate-200 hover:text-emerald-400 transition-all cursor-pointer shadow-lg"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSetupOpen ? 'Collapse Trip Setup' : 'Configure Trip & Vehicle'}</span>
          </button>
        </div>

        {/* Collapsible Trip Setup Box */}
        {isSetupOpen && (
          <div className="pointer-events-auto overflow-y-auto max-h-[calc(100vh-260px)] pr-1 animate-fade-in">
            <TripInputPanel
              inputs={inputs}
              onChangeInputs={onChangeInputs}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={onSelectVehicle}
              onCalculateRoute={onCalculateRoute}
              isDriving={isDriving}
              weather={weather}
              nodes={nodes}
              isCalculating={isCalculating}
              onOpenVehicleSettings={onOpenVehicleSettings}
            />
          </div>
        )}

        {/* Compact EV Energy Instrument Module */}
        <div className="pointer-events-auto">
          <EvEnergyPanel
            activeRoute={activeRoute}
            selectedVehicle={selectedVehicle}
            currentSoc={inputs.batterySoc}
            minimumReserveSoc={inputs.minimumReserveSoc}
            onOpenVehicleSettings={onOpenVehicleSettings}
          />
        </div>
      </div>

      {/* 3. FLOATING RIGHT DOCK: ROUTE INFORMATION & CORRIDOR PROFILE */}
      <div className="absolute top-4 right-4 z-20 max-w-sm sm:max-w-md w-full pointer-events-none hidden md:block">
        <div className="pointer-events-auto">
          <RouteInfoFloatingCard
            routes={routes}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            selectedVehicle={selectedVehicle}
            startSoc={inputs.batterySoc}
            minimumReserveSoc={inputs.minimumReserveSoc}
            onSelectChargingStation={(station) => setSelectedChargingStation(station)}
            onStartDrive={onStartDrive}
          />
        </div>
      </div>

      {/* Mobile Floating Route Info Card Button / Drawer for small viewports */}
      <div className="md:hidden absolute top-4 right-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('mobile-route-info');
            if (el) el.classList.toggle('hidden');
          }}
          className="cockpit-panel p-2 rounded-xl text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-mono font-bold"
        >
          <Compass className="w-4 h-4" />
          <span>{activeRoute.totalDistanceKm}km</span>
        </button>
      </div>

      {/* Mobile Popout Modal */}
      <div id="mobile-route-info" className="hidden md:hidden absolute inset-x-3 top-14 z-30 pointer-events-auto">
        <RouteInfoFloatingCard
          routes={routes}
          activeRoute={activeRoute}
          onSelectRoute={onSelectRoute}
          selectedVehicle={selectedVehicle}
          startSoc={inputs.batterySoc}
          minimumReserveSoc={inputs.minimumReserveSoc}
          onSelectChargingStation={(station) => setSelectedChargingStation(station)}
          onStartDrive={onStartDrive}
        />
      </div>

      {/* 4. CHARGING STATION MODAL / CARD OVERLAY (WHEN CLICKED ON MAP) */}
      {selectedChargingStation && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <ChargingStationCard
            station={selectedChargingStation}
            activeStop={activeStop}
            selectedVehicle={selectedVehicle}
            currentSoc={inputs.batterySoc}
            onClose={() => setSelectedChargingStation(null)}
            onToggleStop={handleToggleStop}
            isPlannedStop={Boolean(activeStop)}
          />
        </div>
      )}

      {/* 5. FLOATING BOTTOM DOCK: EXPANDABLE ROUTE ANALYSIS DRAWER */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto max-w-4xl mx-auto">
        <RouteAnalysisDrawer
          activeRoute={activeRoute}
          nodes={nodes}
          selectedVehicle={selectedVehicle}
          weather={weather}
          inputs={inputs}
          isOpen={isAnalysisDrawerOpen}
          onToggleOpen={() => setIsAnalysisDrawerOpen(!isAnalysisDrawerOpen)}
        />
      </div>
    </div>
  );
};
