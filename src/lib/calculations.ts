import ptCharts from "@/data/pt_charts.json";

export type RefrigerantType = "R-22" | "R-410A" | "R-32" | "R-454B" | "R-407C" | "R-134a";

interface PTDataPoint {
  pressure: number;
  temperature: number;
}

/**
 * Parse PT chart data for a given refrigerant into sorted numeric arrays.
 */
function getPTData(refrigerant: RefrigerantType): PTDataPoint[] {
  const chart = ptCharts[refrigerant] as Record<string, string>;
  if (!chart) return [];

  return Object.entries(chart)
    .map(([p, t]) => ({ pressure: parseFloat(p), temperature: parseFloat(t) }))
    .filter((d) => !isNaN(d.pressure) && !isNaN(d.temperature))
    .sort((a, b) => a.pressure - b.pressure);
}

/**
 * Linear interpolation between two points.
 */
function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

/**
 * Look up saturation temperature from pressure using interpolation.
 * Returns null if the pressure is out of range for the given refrigerant.
 */
export function getSatTempFromPressure(
  refrigerant: RefrigerantType,
  pressurePsig: number
): number | null {
  const data = getPTData(refrigerant);
  if (data.length === 0) return null;

  // Exact match
  const exact = data.find((d) => d.pressure === pressurePsig);
  if (exact) return exact.temperature;

  // Out of range
  if (pressurePsig < data[0].pressure || pressurePsig > data[data.length - 1].pressure) {
    // Extrapolate from nearest two points
    if (pressurePsig < data[0].pressure && data.length >= 2) {
      return lerp(
        pressurePsig,
        data[0].pressure,
        data[1].pressure,
        data[0].temperature,
        data[1].temperature
      );
    }
    if (pressurePsig > data[data.length - 1].pressure && data.length >= 2) {
      const n = data.length;
      return lerp(
        pressurePsig,
        data[n - 2].pressure,
        data[n - 1].pressure,
        data[n - 2].temperature,
        data[n - 1].temperature
      );
    }
    return null;
  }

  // Find bracketing points and interpolate
  for (let i = 0; i < data.length - 1; i++) {
    if (pressurePsig >= data[i].pressure && pressurePsig <= data[i + 1].pressure) {
      return lerp(
        pressurePsig,
        data[i].pressure,
        data[i + 1].pressure,
        data[i].temperature,
        data[i + 1].temperature
      );
    }
  }

  return null;
}

/**
 * Look up pressure from saturation temperature using interpolation.
 * Returns null if the temperature is out of range for the given refrigerant.
 */
export function getPressureFromSatTemp(
  refrigerant: RefrigerantType,
  temperatureF: number
): number | null {
  const data = getPTData(refrigerant);
  if (data.length === 0) return null;

  // Sort by temperature for this lookup
  const byTemp = [...data].sort((a, b) => a.temperature - b.temperature);

  // Exact match
  const exact = byTemp.find((d) => d.temperature === temperatureF);
  if (exact) return exact.pressure;

  // Out of range - extrapolate
  if (temperatureF < byTemp[0].temperature && byTemp.length >= 2) {
    return lerp(
      temperatureF,
      byTemp[0].temperature,
      byTemp[1].temperature,
      byTemp[0].pressure,
      byTemp[1].pressure
    );
  }
  if (temperatureF > byTemp[byTemp.length - 1].temperature && byTemp.length >= 2) {
    const n = byTemp.length;
    return lerp(
      temperatureF,
      byTemp[n - 2].temperature,
      byTemp[n - 1].temperature,
      byTemp[n - 2].pressure,
      byTemp[n - 1].pressure
    );
  }

  // Find bracketing points and interpolate
  for (let i = 0; i < byTemp.length - 1; i++) {
    if (temperatureF >= byTemp[i].temperature && temperatureF <= byTemp[i + 1].temperature) {
      return lerp(
        temperatureF,
        byTemp[i].temperature,
        byTemp[i + 1].temperature,
        byTemp[i].pressure,
        byTemp[i + 1].pressure
      );
    }
  }

  return null;
}

/**
 * Calculate compression ratio from suction and discharge pressures.
 * CR = (Discharge psig + 14.7) / (Suction psig + 14.7)
 */
export function calculateCompressionRatio(
  suctionPsig: number,
  dischargePsig: number
): number | null {
  const suctionPsia = suctionPsig + 14.7;
  const dischargePsia = dischargePsig + 14.7;

  if (suctionPsia <= 0) return null;
  return dischargePsia / suctionPsia;
}

/**
 * Calculate superheat.
 * SH = Line Temperature - Saturation Temperature
 */
export function calculateSuperheat(
  refrigerant: RefrigerantType,
  suctionPressure: number,
  lineTemp: number
): { superheat: number; satTemp: number } | null {
  const satTemp = getSatTempFromPressure(refrigerant, suctionPressure);
  if (satTemp === null) return null;
  return { superheat: lineTemp - satTemp, satTemp };
}

/**
 * Calculate subcooling.
 * SC = Saturation Temperature - Line Temperature
 */
export function calculateSubcooling(
  refrigerant: RefrigerantType,
  liquidPressure: number,
  lineTemp: number
): { subcooling: number; satTemp: number } | null {
  const satTemp = getSatTempFromPressure(refrigerant, liquidPressure);
  if (satTemp === null) return null;
  return { subcooling: satTemp - lineTemp, satTemp };
}

/**
 * Get the available refrigerant types from PT chart data.
 */
export function getAvailableRefrigerants(): RefrigerantType[] {
  return Object.keys(ptCharts).filter((k) => k !== "_metadata") as RefrigerantType[];
}

/**
 * Get the pressure range for a given refrigerant.
 */
export function getPressureRange(refrigerant: RefrigerantType): { min: number; max: number } | null {
  const data = getPTData(refrigerant);
  if (data.length === 0) return null;
  return { min: data[0].pressure, max: data[data.length - 1].pressure };
}

/**
 * Get the temperature range for a given refrigerant.
 */
export function getTemperatureRange(refrigerant: RefrigerantType): { min: number; max: number } | null {
  const data = getPTData(refrigerant);
  if (data.length === 0) return null;
  const temps = data.map((d) => d.temperature);
  return { min: Math.min(...temps), max: Math.max(...temps) };
}
