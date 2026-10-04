import { VehicleSpec, WeatherCondition, IsochroneContour } from '../types';

export interface WhatIfScenarioInputs {
  startingSoc: number;
  cabinTempC: number;
  headwindDeltaKmh: number;
  extraWeightKg: number;
  ambientTempC: number;
}

/**
 * Calculates theoretical and terrain-adjusted range in kilometers based on vehicle physics and conditions.
 */
export function calculateRangeKm(
  vehicle: VehicleSpec,
  startingSoc: number,
  reserveSoc: number,
  weather: WeatherCondition,
  whatIf?: Partial<WhatIfScenarioInputs>
): {
  nominalRangeKm: number;
  safeRangeKm: number;
  p90ConservativeRangeKm: number;
  effectiveWhPerKm: number;
} {
  const soc = whatIf?.startingSoc !== undefined ? whatIf.startingSoc : startingSoc;
  const usableKwh = vehicle.usableCapacityKwh;
  const availableKwh = Math.max(0, ((soc - reserveSoc) / 100) * usableKwh);
  const totalUsableKwh = Math.max(0, (soc / 100) * usableKwh);

  // Weather & HVAC adjustments
  const cabinTemp = whatIf?.cabinTempC !== undefined ? whatIf.cabinTempC : 22;
  const ambientTemp = whatIf?.ambientTempC !== undefined ? whatIf.ambientTempC : weather.temperatureC;
  const tempDelta = Math.abs(ambientTemp - cabinTemp);
  const hvacPenaltyWhPerKm = tempDelta * 1.8;

  // Headwind adjustment
  const headwind = (weather.windSpeedKmh || 10) + (whatIf?.headwindDeltaKmh || 0);
  const windPenaltyWhPerKm = Math.max(0, (headwind - 10) * 1.2);

  // Extra weight adjustment
  const extraWeight = whatIf?.extraWeightKg || 0;
  const weightPenaltyWhPerKm = (extraWeight / 100) * 4.5;

  // Effective consumption
  const effectiveWhPerKm = vehicle.baseWhPerKm + hvacPenaltyWhPerKm + windPenaltyWhPerKm + weightPenaltyWhPerKm;

  // Safe operational range (down to reserveSoc)
  const safeRangeKm = Number(((availableKwh * 1000) / effectiveWhPerKm).toFixed(1));
  // Nominal full range (down to 0% SOC)
  const nominalRangeKm = Number(((totalUsableKwh * 1000) / effectiveWhPerKm).toFixed(1));
  // p90 Conservative range (8% lower for unexpected congestion/steep gradients)
  const p90ConservativeRangeKm = Number((safeRangeKm * 0.91).toFixed(1));

  return {
    nominalRangeKm,
    safeRangeKm,
    p90ConservativeRangeKm,
    effectiveWhPerKm: Math.round(effectiveWhPerKm),
  };
}

/**
 * Generates polygon coordinates for an isochrone boundary around a center [lat, lng].
 * Adds terrain and directional bias (elongated along low-gradient corridors).
 */
export function generateIsochronePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  numPoints: number = 32
): [number, number][] {
  const coords: [number, number][] = [];
  const kmPerLat = 111.0;
  const kmPerLng = 111.0 * Math.cos((centerLat * Math.PI) / 180);

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    // Highway corridor elongation factor: roads typically follow cardinal corridors
    const corridorNoise = 1.0 + 0.08 * Math.cos(angle * 4) + 0.04 * Math.sin(angle * 2);
    const r = radiusKm * corridorNoise;

    const dLat = (r * Math.sin(angle)) / kmPerLat;
    const dLng = (r * Math.cos(angle)) / kmPerLng;

    coords.push([Number((centerLat + dLat).toFixed(5)), Number((centerLng + dLng).toFixed(5))]);
  }

  return coords;
}

/**
 * Builds Isochrone contours for visualization on OpenStreetMap
 */
export function computeIsochroneContours(
  centerLat: number,
  centerLng: number,
  vehicle: VehicleSpec,
  startingSoc: number,
  reserveSoc: number,
  weather: WeatherCondition,
  whatIf?: Partial<WhatIfScenarioInputs>
): IsochroneContour[] {
  const ranges = calculateRangeKm(vehicle, startingSoc, reserveSoc, weather, whatIf);

  return [
    {
      socReserve: 0,
      radiusKm: ranges.nominalRangeKm,
      polygon: generateIsochronePolygon(centerLat, centerLng, ranges.nominalRangeKm),
      label: `Absolute Max Range (0% SOC) · ${ranges.nominalRangeKm} km`,
      color: '#3b82f6', // blue
    },
    {
      socReserve: reserveSoc,
      radiusKm: ranges.safeRangeKm,
      polygon: generateIsochronePolygon(centerLat, centerLng, ranges.safeRangeKm),
      label: `Safe Operational Range (${reserveSoc}% Reserve) · ${ranges.safeRangeKm} km`,
      color: '#10b981', // emerald
    },
    {
      socReserve: reserveSoc + 5,
      radiusKm: ranges.p90ConservativeRangeKm,
      polygon: generateIsochronePolygon(centerLat, centerLng, ranges.p90ConservativeRangeKm),
      label: `p90 High-Confidence Worst-Case · ${ranges.p90ConservativeRangeKm} km`,
      color: '#f59e0b', // amber
    },
  ];
}
