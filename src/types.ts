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

export type DriverStyle = 'eco_hypermiler' | 'balanced' | 'spirited' | 'adaptive';

export interface QuantilePrediction {
  p10Soc: number; // Optimistic (tail-wind, smooth coasting)
  p50Soc: number; // Nominal ML prediction
  p90Soc: number; // Conservative (head-wind, heavy HVAC, cold/hot cell)
  p10EnergyKwh: number;
  p50EnergyKwh: number;
  p90EnergyKwh: number;
  uncertaintyMarginKwh: number;
  confidenceBandPercent: number; // e.g. 90%
}

export interface ChargingStop {
  station: ChargingStation;
  arrivalSoc: number;
  targetSoc: number;
  energyAddedKwh: number;
  chargingTimeMin: number;
  stopCostInr: number;
  queueTimeMin?: number;
  reliabilityScorePercent?: number;
  preconditioningDurationMin?: number;
  optimalExitSocReason?: string;
  isPreconditioned?: boolean;
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
  chargingStops: ChargingStop[];
  explanation: {
    title: string;
    points: string[];
    energySavedKwh?: number;
    batteryMarginPercent?: number;
    gradientAvoided?: string;
  };
  polyline: [number, number][];
  quantile?: QuantilePrediction;
  driveCycleLossKwh?: number;
  totalRechargeTimeMin?: number;
  totalTripTimeWithChargingMin?: number;
  effectiveCapacityKwh?: number;
  batteryHealthPercent?: number;
}

export interface TripInputs {
  vehicleId: string;
  sourceId: string;
  destinationId: string;
  batterySoc: number; // 0 - 100
  batteryHealthPercent?: number; // 50 - 100% State of Health (SoH), default 100%
  passengers: number;
  passengerWeightKg: number;
  cargoWeightKg: number;
  minimumReserveSoc: number; // default 10%
  cabinTempC: number;
  routingObjective: 'energy_efficient' | 'fastest' | 'balanced';
  driverStyle?: DriverStyle;
}

export interface TelemetryAnomaly {
  detected: boolean;
  type: 'excess_drain' | 'high_drag' | 'thermal_surge' | 'none';
  message: string;
  severity: 'low' | 'medium' | 'high';
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
  packTempC: number;
  preconditioningActive: boolean;
  anomalyAlert?: TelemetryAnomaly;
  driverStyle: DriverStyle;
  p10ArrivalSoc: number;
  p90ArrivalSoc: number;
}

export interface IsochroneContour {
  socReserve: number; // e.g. 0% for absolute max, 10% for reserve, 20% for safe
  radiusKm: number;
  polygon: [number, number][];
  label: string;
  color: string;
}

export interface TelemetryObservation {
  id: string;
  timestamp: number;
  vehicleId: string;
  distanceKm: number;
  avgSpeedKmh: number;
  gradientAvg: number;
  ambientTempC: number;
  predictedWhPerKm: number;
  actualWhPerKm: number;
  errorRatio: number;
  driverStyle: DriverStyle;
}
