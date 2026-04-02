'use client';

import { useState } from 'react';
import { TableProperties, ArrowRightLeft } from 'lucide-react';
import {
  getSatTempFromPressure,
  getPressureFromSatTemp,
  getAvailableRefrigerants,
  getPressureRange,
  getTemperatureRange,
  type RefrigerantType,
} from '@/lib/calculations';

type LookupMode = 'pressure_to_temp' | 'temp_to_pressure';

export default function PTChartLookup() {
  const [refrigerant, setRefrigerant] = useState<RefrigerantType>('R-410A');
  const [mode, setMode] = useState<LookupMode>('pressure_to_temp');
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const refrigerants = getAvailableRefrigerants();

  function handleLookup() {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return;

    if (mode === 'pressure_to_temp') {
      setResult(getSatTempFromPressure(refrigerant, val));
    } else {
      setResult(getPressureFromSatTemp(refrigerant, val));
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'pressure_to_temp' ? 'temp_to_pressure' : 'pressure_to_temp'));
    setInputValue('');
    setResult(null);
  }

  function handleClear() {
    setInputValue('');
    setResult(null);
  }

  const pressureRange = getPressureRange(refrigerant);
  const tempRange = getTemperatureRange(refrigerant);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TableProperties className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          PT Chart Lookup
        </h3>
      </div>

      {/* Refrigerant Select */}
      <div>
        <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
          Refrigerant
        </label>
        <select
          value={refrigerant}
          onChange={(e) => { setRefrigerant(e.target.value as RefrigerantType); setResult(null); }}
          className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
            focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
            transition-all appearance-none"
        >
          {refrigerants.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Mode Toggle */}
      <button
        onClick={toggleMode}
        className="w-full flex items-center justify-between bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5
          hover:border-outline transition-all"
      >
        <span className="font-headline text-xs uppercase tracking-wider text-on-surface">
          {mode === 'pressure_to_temp' ? 'Pressure \u2192 Temperature' : 'Temperature \u2192 Pressure'}
        </span>
        <ArrowRightLeft className="w-4 h-4 text-primary" />
      </button>

      {/* Input */}
      <div>
        <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
          {mode === 'pressure_to_temp' ? 'Enter Pressure (psig)' : 'Enter Temperature (\u00b0F)'}
        </label>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={mode === 'pressure_to_temp' ? '118' : '42'}
          className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
            focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
            transition-all placeholder:text-outline/40"
        />
        {mode === 'pressure_to_temp' && pressureRange && (
          <p className="text-[10px] text-outline/80 mt-1 font-body">
            Range: {pressureRange.min}\u2013{pressureRange.max} psig
          </p>
        )}
        {mode === 'temp_to_pressure' && tempRange && (
          <p className="text-[10px] text-outline/80 mt-1 font-body">
            Range: {tempRange.min}\u2013{tempRange.max}\u00b0F
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleLookup}
          disabled={!inputValue}
          className="flex-1 bg-primary-container text-on-primary-container font-headline uppercase text-sm tracking-wider
            py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Lookup
        </button>
        <button
          onClick={handleClear}
          className="px-4 border border-outline-variant text-outline font-headline uppercase text-sm tracking-wider
            py-2.5 rounded-lg hover:border-outline hover:text-on-surface transition-all"
        >
          Clear
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="text-center">
            <div className="text-xs text-outline font-headline uppercase tracking-wider mb-1">
              {refrigerant} &bull; {mode === 'pressure_to_temp' ? 'Sat. Temperature' : 'Sat. Pressure'}
            </div>
            <div className="font-headline text-5xl font-bold text-primary">
              {result.toFixed(1)}
              <span className="text-lg ml-1">
                {mode === 'pressure_to_temp' ? '\u00b0F' : 'psig'}
              </span>
            </div>
            <div className="text-xs text-outline/70 font-body mt-2">
              Input: {inputValue} {mode === 'pressure_to_temp' ? 'psig' : '\u00b0F'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
