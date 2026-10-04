import { ChargingStation, ChargingStop, VehicleSpec } from '../types';

export interface ChargingOptimizationResult {
  stops: ChargingStop[];
  totalRechargeTimeMin: number;
  totalQueueTimeMin: number;
  totalChargingCostInr: number;
  preconditioningRecommended: boolean;
  preconditioningStartDistanceKm: number;
}

/**
 * Models non-linear Constant Current / Constant Voltage (CC/CV) EV fast charging curve
 * Power is max until ~55-65% SOC, then tapers exponentially.
 */
export function calculateChargingDurationAndTarget(
  station: ChargingStation,
  vehicle: VehicleSpec,
  arrivalSoc: number,
  targetSocNeededForNextLeg: number,
  isPreconditioned: boolean = true
): { targetSoc: number; durationMin: number; energyAddedKwh: number; exitReason: string } {
  const usableKwh = vehicle.usableCapacityKwh;
  const maxAcceptanceKw = Math.min(vehicle.maxDcChargingPowerKw, station.powerKw);

  // Optimal exit SOC: Do not charge beyond 75-80% unless strictly necessary to reach next waypoint
  // Because charging above 80% takes 3x longer per kWh added than driving to another DC charger.
  let optimalTargetSoc = Math.max(targetSocNeededForNextLeg + 12, 65);
  optimalTargetSoc = Math.min(optimalTargetSoc, 80); // Cap default stop at 80%
  if (targetSocNeededForNextLeg > 75) {
    optimalTargetSoc = Math.min(95, targetSocNeededForNextLeg + 8);
  }

  // Energy needed to reach optimalTargetSoc
  const energyAddedKwh = Math.max(2, ((optimalTargetSoc - arrivalSoc) / 100) * usableKwh);

  // Stepwise integration across SOC bands
  let totalTimeHours = 0;
  let currentSimSoc = arrivalSoc;
  const stepSoc = 1.0;

  while (currentSimSoc < optimalTargetSoc) {
    const kwhStep = (stepSoc / 100) * usableKwh;

    // Power taper factor
    let powerMultiplier = 1.0;
    if (currentSimSoc < 20) {
      powerMultiplier = isPreconditioned ? 0.95 : 0.70; // cold battery throttling without preconditioning
    } else if (currentSimSoc <= 55) {
      powerMultiplier = 1.0; // peak constant-current plateau
    } else if (currentSimSoc <= 70) {
      powerMultiplier = 0.82; // initial taper onset
    } else if (currentSimSoc <= 80) {
      powerMultiplier = 0.55; // steep taper
    } else {
      powerMultiplier = 0.28; // trickle cell balancing
    }

    const effectiveKw = Math.max(15, maxAcceptanceKw * powerMultiplier);
    const stepHours = kwhStep / effectiveKw;
    totalTimeHours += stepHours;
    currentSimSoc += stepSoc;
  }

  // Add 3 minutes connection handshake & billing setup
  const durationMin = Math.round(totalTimeHours * 60 + 3);

  let exitReason = 'Optimal CC/CV sweet-spot: Stop at ' + optimalTargetSoc + '% to avoid severe charge-curve tapering.';
  if (optimalTargetSoc <= 70) {
    exitReason = `Quick Splash & Dash: Exit at ${optimalTargetSoc}% saves ~14 min vs waiting for 80% top-off.`;
  } else if (optimalTargetSoc >= 85) {
    exitReason = `High Mountain Buffer: Extended charge to ${optimalTargetSoc}% to conquer steep upcoming climb.`;
  }

  return {
    targetSoc: optimalTargetSoc,
    durationMin,
    energyAddedKwh: Number(energyAddedKwh.toFixed(1)),
    exitReason,
  };
}

/**
 * Predicts queue time and station reliability
 */
export function estimateQueueAndReliability(station: ChargingStation): { queueTimeMin: number; reliabilityScorePercent: number } {
  // Free ports vs total ports
  const occupiedPorts = station.totalPorts - station.availablePorts;
  let queueTimeMin = 0;

  if (station.availablePorts === 0) {
    queueTimeMin = 14; // Average wait for one bay to clear
  } else if (station.availablePorts === 1) {
    queueTimeMin = 3; // Slight congestion
  }

  // Operator reliability indexing
  let reliability = 98;
  if (station.operator.toLowerCase().includes('zeon')) reliability = 99;
  else if (station.operator.toLowerCase().includes('jio-bp')) reliability = 98;
  else if (station.operator.toLowerCase().includes('tata')) reliability = 95;
  else if (station.operator.toLowerCase().includes('relux')) reliability = 94;

  return {
    queueTimeMin,
    reliabilityScorePercent: reliability,
  };
}

/**
 * Solves battery thermal preconditioning requirement
 * Fast charging is fastest when battery cells are at 30°C - 35°C.
 */
export function calculatePreconditioningAdvice(
  currentPackTempC: number,
  ambientTempC: number
): { durationMin: number; startDistanceKm: number; action: 'heat' | 'chill' | 'optimal' } {
  if (currentPackTempC < 25) {
    // Battery needs heating (typically winter or cold morning)
    const degToHeat = 32 - currentPackTempC;
    const durationMin = Math.min(25, Math.round(degToHeat * 2.2));
    return {
      durationMin,
      startDistanceKm: Math.round(durationMin * 1.2),
      action: 'heat',
    };
  } else if (currentPackTempC > 36 || ambientTempC > 34) {
    // Battery needs pre-chilling to handle exothermic heat of 120kW+ charge
    return {
      durationMin: 18,
      startDistanceKm: 22,
      action: 'chill',
    };
  }
  return {
    durationMin: 10,
    startDistanceKm: 12,
    action: 'optimal',
  };
}
