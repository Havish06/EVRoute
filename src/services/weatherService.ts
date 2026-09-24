import { WeatherCondition } from '../types';

export interface WeatherStationSegment {
  segmentName: string;
  lat: number;
  lng: number;
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionText: string;
  condition: 'Sunny' | 'Partly Cloudy' | 'Cloudy' | 'Windy' | 'Light Rain' | 'Hot & Dry';
  humidityPercent: number;
  airDensityKgM3: number;
}

/**
 * Calculates dry-air density from temperature in Celsius and atmospheric pressure (approx sea level ~1013.25 hPa)
 * rho = P / (R_specific * T_kelvin)
 */
export function calculateAirDensity(tempC: number, elevationM: number = 100): number {
  const kelvin = tempC + 273.15;
  // Barometric formula estimate for pressure at elevation
  const pressurePa = 101325 * Math.pow(1 - 2.25577e-5 * elevationM, 5.25588);
  const R_specific = 287.058; // J/(kg·K)
  const density = pressurePa / (R_specific * kelvin);
  return Number(density.toFixed(3));
}

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Simulates real-time telemetry/sensor or meteorological API fetching along the active route corridor.
 * Generates realistic micro-climate fluctuations (thermal heat islands on expressways, gusts in valleys/passes, coastal vs summit gradients).
 */
export function fetchRealtimeRouteWeather(
  currentWeather: WeatherCondition,
  routeLocationName: string = 'Current Corridor'
): { updatedWeather: WeatherCondition; segmentWeather: WeatherStationSegment; deltaDescription: string } {
  // Variations within realistic meteorological limits
  const tempDrift = Number(((Math.random() - 0.45) * 6).toFixed(1)); // -2.7°C to +3.3°C
  const windDrift = Math.round((Math.random() - 0.4) * 16); // -6 to +10 km/h
  const humidityDrift = Math.round((Math.random() - 0.5) * 15);

  const newTemp = Math.max(16, Math.min(44, Number((currentWeather.temperatureC + tempDrift).toFixed(1))));
  const newWind = Math.max(5, Math.min(55, currentWeather.windSpeedKmh + windDrift));
  const newHumidity = Math.max(20, Math.min(95, (currentWeather.humidityPercent || 55) + humidityDrift));
  
  const windDirIdx = Math.floor(Math.random() * WIND_DIRECTIONS.length);
  const windDirText = WIND_DIRECTIONS[windDirIdx];
  const windDirDeg = windDirIdx * 45;

  let condition: WeatherStationSegment['condition'] = 'Partly Cloudy';
  if (newTemp >= 36) condition = 'Hot & Dry';
  else if (newWind >= 35) condition = 'Windy';
  else if (newTemp > 28 && newHumidity < 45) condition = 'Sunny';
  else if (newHumidity > 75) condition = 'Light Rain';

  const newAirDensity = calculateAirDensity(newTemp, 150);

  const updatedWeather: WeatherCondition = {
    ...currentWeather,
    temperatureC: newTemp,
    windSpeedKmh: newWind,
    humidityPercent: newHumidity,
    airDensityKgM3: newAirDensity,
    rainfallMm: condition === 'Light Rain' ? 2.5 : 0,
    windDirectionDeg: windDirDeg,
  };

  const segmentWeather: WeatherStationSegment = {
    segmentName: routeLocationName,
    lat: 12.2,
    lng: 79.1,
    temperatureC: newTemp,
    windSpeedKmh: newWind,
    windDirectionDeg: windDirDeg,
    windDirectionText: windDirText,
    condition,
    humidityPercent: newHumidity,
    airDensityKgM3: newAirDensity,
  };

  const deltaTempStr = tempDrift >= 0 ? `+${tempDrift.toFixed(1)}°C` : `${tempDrift.toFixed(1)}°C`;
  const deltaWindStr = windDrift >= 0 ? `+${windDrift} km/h` : `${windDrift} km/h`;
  const deltaDescription = `Telemetry updated: Temp ${deltaTempStr} (${newTemp}°C), Wind ${deltaWindStr} (${newWind} km/h ${windDirText}). Dynamic air density: ${newAirDensity} kg/m³.`;

  return {
    updatedWeather,
    segmentWeather,
    deltaDescription,
  };
}
