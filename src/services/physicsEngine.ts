import { VehicleSpec, WeatherCondition, TrafficLevel, RoadType } from '../types';

export interface PhysicsSegmentInputs {
  vehicle: VehicleSpec;
  totalMassKg: number;
  distanceKm: number;
  averageSpeedKmh: number;
  gradientPercent: number;
  roadType: RoadType;
  trafficLevel: TrafficLevel;
  weather: WeatherCondition;
  cabinTempC: number;
  currentSocPercent: number;
}

export interface PhysicsSegmentResult {
  travelTimeHours: number;
  travelTimeMin: number;
  rollingResistanceEnergyKwh: number;
  aerodynamicEnergyKwh: number;
  gradientEnergyKwh: number;
  accelerationEnergyKwh: number;
  auxiliaryEnergyKwh: number;
  grossEnergyKwh: number;
  regeneratedEnergyKwh: number;
  netEnergyKwh: number;
  whPerKm: number;
}

const GRAVITY = 9.80665; // m/s^2

export function calculateSegmentPhysics(inputs: PhysicsSegmentInputs): PhysicsSegmentResult {
  const {
    vehicle,
    totalMassKg,
    distanceKm,
    averageSpeedKmh,
    gradientPercent,
    trafficLevel,
    weather,
    cabinTempC,
    currentSocPercent,
  } = inputs;

  const distanceM = distanceKm * 1000;
  // Convert speed to m/s
  const speedMs = Math.max(1, (averageSpeedKmh * 1000) / 3600);
  const travelTimeSeconds = distanceM / speedMs;
  const travelTimeHours = travelTimeSeconds / 3600;
  const travelTimeMin = travelTimeHours * 60;

  // 1. Angle calculation
  // gradient = tan(theta) * 100 => theta = atan(gradient / 100)
  const thetaRad = Math.atan(gradientPercent / 100);

  // 2. Rolling resistance
  // F_roll = Crr * m * g * cos(theta)
  // Rain on road increases rolling resistance by 10-25%
  const rainCrrMultiplier = weather.rainfallMm > 0 ? 1 + Math.min(0.25, weather.rainfallMm * 0.05) : 1.0;
  const effectiveCrr = vehicle.rollingResistanceCoeff * rainCrrMultiplier;
  const fRollNewtons = effectiveCrr * totalMassKg * GRAVITY * Math.cos(thetaRad);
  const workRollJoules = fRollNewtons * distanceM;
  const rollingResistanceEnergyKwh = Math.max(0, workRollJoules / 3.6e6);

  // 3. Aerodynamic drag
  // F_aero = 0.5 * rho * Cd * A * v_eff^2
  // Wind impact: assume headwind factor based on wind speed
  const windMs = (weather.windSpeedKmh * 1000) / 3600;
  // Effective air velocity (modest headwind component)
  const effectiveAirSpeedMs = speedMs + windMs * 0.6;
  const airDensity = weather.airDensityKgM3 || 1.20;
  const fAeroNewtons = 0.5 * airDensity * vehicle.dragCoefficient * vehicle.frontalAreaM2 * Math.pow(effectiveAirSpeedMs, 2);
  const workAeroJoules = fAeroNewtons * distanceM;
  const aerodynamicEnergyKwh = Math.max(0, workAeroJoules / 3.6e6);

  // 4. Gradient (Gravitational) force
  // F_grade = m * g * sin(theta)
  // Positive when uphill (consuming energy), negative when downhill (potential regen)
  const fGradeNewtons = totalMassKg * GRAVITY * Math.sin(thetaRad);
  const workGradeJoules = fGradeNewtons * distanceM;
  const gradientEnergyKwh = workGradeJoules / 3.6e6; // can be negative

  // 5. Acceleration / Traffic Stop-and-Go Energy
  // In traffic, repeated accelerations (v_stop to v_avg) dissipate kinetic energy
  let stopGoAccelerationCyclesPerKm = 0.1; // baseline free flow
  if (trafficLevel === 'moderate') stopGoAccelerationCyclesPerKm = 0.6;
  if (trafficLevel === 'heavy') stopGoAccelerationCyclesPerKm = 1.8;
  if (trafficLevel === 'severe') stopGoAccelerationCyclesPerKm = 3.5;

  const totalCycles = distanceKm * stopGoAccelerationCyclesPerKm;
  // Kinetic energy per acceleration: 0.5 * m * (delta_v)^2
  const deltaVMs = Math.min(speedMs, (35 * 1000) / 3600);
  const kineticEnergyPerCycleJoules = 0.5 * totalMassKg * Math.pow(deltaVMs, 2);
  // EV powertrain efficiency during repeated acceleration (~88%)
  const accelerationWorkJoules = (totalCycles * kineticEnergyPerCycleJoules) / 0.88;
  const accelerationEnergyKwh = Math.max(0, accelerationWorkJoules / 3.6e6);

  // 6. Auxiliary power (HVAC + Base electronics)
  // Base vehicle electronics (ECU, power steering, infotainment, sensors): ~0.35 kW
  const baseElectronicsKw = 0.35;
  // HVAC thermal delta: difference between ambient and cabin temp
  const tempDelta = Math.abs(weather.temperatureC - cabinTempC);
  // HVAC power consumption: ~0.15 kW per deg C delta, capped at 2.5 kW
  const hvacKw = Math.min(2.5, tempDelta * 0.14);
  const totalAuxKw = baseElectronicsKw + hvacKw;
  const auxiliaryEnergyKwh = totalAuxKw * travelTimeHours;

  // 7. Regenerative Braking calculation
  let regeneratedEnergyKwh = 0;
  if (gradientEnergyKwh < 0) {
    // We are descending. Some of the potential energy is recovered.
    const availablePotentialKwh = Math.abs(gradientEnergyKwh);
    
    // Regeneration efficiency decreases if battery SOC is very high (>90% cannot absorb high charge)
    let socRegenFactor = 1.0;
    if (currentSocPercent > 95) socRegenFactor = 0.15;
    else if (currentSocPercent > 88) socRegenFactor = 0.60;

    // Power limit: max regen power kW * travel time hours
    const maxRegenKwhByPower = vehicle.maxRegenPowerKw * travelTimeHours;
    const potentialHarvestKwh = availablePotentialKwh * vehicle.regenEfficiency * socRegenFactor;

    regeneratedEnergyKwh = Math.min(potentialHarvestKwh, maxRegenKwhByPower);
  }

  // 8. Net Energy Summation
  // Motor/inverter efficiency ~91%
  const tractionEnergyKwh = (rollingResistanceEnergyKwh + aerodynamicEnergyKwh + Math.max(0, gradientEnergyKwh) + accelerationEnergyKwh) / 0.91;
  const grossEnergyKwh = tractionEnergyKwh + auxiliaryEnergyKwh;
  const netEnergyKwh = Math.max(0.01, grossEnergyKwh - regeneratedEnergyKwh);
  const whPerKm = (netEnergyKwh * 1000) / Math.max(0.1, distanceKm);

  return {
    travelTimeHours,
    travelTimeMin,
    rollingResistanceEnergyKwh,
    aerodynamicEnergyKwh,
    gradientEnergyKwh,
    accelerationEnergyKwh,
    auxiliaryEnergyKwh,
    grossEnergyKwh,
    regeneratedEnergyKwh,
    netEnergyKwh,
    whPerKm,
  };
}
