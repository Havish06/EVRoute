export interface VehicleSpec {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  batteryCapacityKwh: number;
  usableCapacityKwh: number;
  kerbWeightKg: number;
  motorPowerKw: number;
  dragCoefficient: number; // Cd
  frontalAreaM2: number; // A
  rollingResistanceCoeff: number; // Crr
  regenEfficiency: number; // 0.0 - 1.0
  maxRegenPowerKw: number;
  maxDcChargingPowerKw: number;
  acChargingPowerKw: number;
  nominalVoltageV: number;
  baseWhPerKm: number;
  imageUrl?: string;
}

export type TrafficLevel = 'low' | 'moderate' | 'heavy' | 'severe';
export type RoadType = 'motorway' | 'national_highway' | 'state_highway' | 'ghat_road' | 'urban_arterial';

export interface WeatherCondition {
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDeg: number; // 0 = North, 90 = East, etc.
  rainfallMm: number;
  humidityPercent: number;
  airDensityKgM3: number;
}

export interface ChargingStation {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lng: number;
  powerKw: number;
  connectorTypes: string[];
  totalPorts: number;
  availablePorts: number;
  pricePerKwh: number;
  amenities: string[];
  isFastCharger: boolean;
}

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
  isOrigin?: boolean;
  isDestination?: boolean;
  chargingStation?: ChargingStation;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  speedLimitKmh: number;
  roadType: RoadType;
  trafficLevel: TrafficLevel;
  averageSpeedKmh: number;
  elevationChangeM: number; // toNode.elevation - fromNode.elevation
  gradientPercent: number; // (elevationChangeM / (distanceKm * 1000)) * 100
  surfaceQuality: 'smooth' | 'fair' | 'rough';
  waypoints: [number, number][]; // [lat, lng] array
}

export interface SegmentEnergyPrediction {
  edgeId: string;
  distanceKm: number;
  gradientPercent: number;
  speedKmh: number;
  travelTimeMin: number;
  // Physics breakdown
  rollingResistanceEnergyKwh: number;
  aerodynamicEnergyKwh: number;
  gradientEnergyKwh: number;
  accelerationEnergyKwh: number;
  auxiliaryEnergyKwh: number;
  grossEnergyKwh: number;
  regeneratedEnergyKwh: number;
  netPhysicsEnergyKwh: number;
  // ML correction
  mlCorrectionFactor: number;
  mlPredictedEnergyKwh: number;
  confidenceLowerKwh: number;
  confidenceUpperKwh: number;
  // Battery effect
  startSocPercent: number;
  endSocPercent: number;
  socDropPercent: number;
}

export interface RouteOption {
  id: string;
  name: string;
  type: 'energy_efficient' | 'fastest' | 'balanced';
  color: string;
  pathNodeIds: string[];
  segments: SegmentEnergyPrediction[];
  totalDistanceKm: number;
  totalTravelTimeMin: number;
  totalEnergyKwh: number;
  averageWhPerKm: number;
  startSoc: number;
  arrivalSoc: number;
  minSocReached: number;
  isFeasible: boolean;
  chargingStops: {
    station: ChargingStation;
    arrivalSoc: number;
    targetSoc: number;
    energyAddedKwh: number;
    chargingTimeMin: number;
    stopCostInr: number;
  }[];
  explanation: {
    title: string;
    points: string[];
    energySavedKwh?: number;
    batteryMarginPercent?: number;
    gradientAvoided?: string;
  };
  polyline: [number, number][];
}

export interface TripInputs {
  vehicleId: string;
  sourceId: string;
  destinationId: string;
  batterySoc: number; // 0 - 100
  passengers: number;
  passengerWeightKg: number;
  cargoWeightKg: number;
  minimumReserveSoc: number; // default 10%
  cabinTempC: number;
  routingObjective: 'energy_efficient' | 'fastest' | 'balanced';
}

export interface TelemetryState {
  currentDistanceKm: number;
  currentLat: number;
  currentLng: number;
  currentElevationM: number;
  currentSpeedKmh: number;
  currentActualSoc: number;
  predictedSocAtThisPoint: number;
  socErrorPercent: number;
  isDriving: boolean;
  simSpeedMultiplier: number;
  progressPercent: number;
  activeSegmentIndex: number;
  rerouteSuggested: boolean;
}
