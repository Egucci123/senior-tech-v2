'use client';

import { useState } from 'react';
import { Thermometer, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  calculateSuperheat,
  calculateSubcooling,
  getAvailableRefrigerants,
  type RefrigerantType,
} from '@/lib/calculations';

type Mode = 'superheat' | 'subcooling';

function getColor(value: number, mode: Mode): string {
  if (mode === 'superheat') {
    if (value >= 8 && value <= 12) return 'text-emerald-400';
    if (value >= 5 && value <= 20) return 'text-amber-400';
    return 'text-red-400';
  }
  // subcooling
  if (value >= 10 && value <= 15) return 'text-emerald-400';
  if (value >= 5 && value <= 20) return 'text-amber-400';
  return 'text-red-400';
}

function getBgColor(value: number, mode: Mode): string {
  if (mode === 'superheat') {
    if (value >= 8 && value <= 12) return 'bg-emerald-400/10 border-emerald-400/30';
    if (value >= 5 && value <= 20) return 'bg-amber-400/10 border-amber-400/30';
    return 'bg-red-400/10 border-red-400/30';
  }
  if (value >= 10 && value <= 15) return 'bg-emerald-400/10 border-emerald-400/30';
  if (value >= 5 && value <= 20) return 'bg-amber-400/10 border-amber-400/30';
  return 'bg-red-400/10 border-red-400/30';
}

function getTargetLabel(mode: Mode): string {
  return mode === 'superheat' ? 'Target: 8\u201312\u00b0F' : 'Target: 10\u201315\u00b0F';
}

export default function SuperheatSubcoolCalc() {
  const [mode, setMode] = useState<Mode>('superheat');
  const [refrigerant, setRefrigerant] = useState<RefrigerantType>('R-410A');
  const [pressure, setPressure] = useState('');
  const [lineTemp, setLineTemp] = useState('');
  const [result, setResult] = useState<{ value: number; satTemp: number } | null>(null);

  const refrigerants = getAvailableRefrigerants();

  function handleCalculate() {
    const p = parseFloat(pressure);
    const t = parseFloat(lineTemp);
    if (isNaN(p) || isNaN(t)) return;

    if (mode === 'superheat') {
      const r = calculateSuperheat(refrigerant, p, t);
      if (r) setResult({ value: r.superheat, satTemp: r.satTemp });
    } else {
      const r = calculateSubcooling(refrigerant, p, t);
      if (r) setResult({ value: r.subcooling, satTemp: r.satTemp });
    }
  }

  function handleClear() {
    setPressure('');
    setLineTemp('');
    setResult(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Thermometer className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          SH / SC Calculator
        </h3>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-[#0e0e0e] rounded-lg p-0.5">
        <button
          onClick={() => { setMode('superheat'); setResult(null); }}
          className={`flex-1 py-2 rounded-md font-headline text-xs uppercase tracking-wider transition-all ${
            mode === 'superheat'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Superheat
        </button>
        <button
          onClick={() => { setMode('subcooling'); setResult(null); }}
          className={`flex-1 py-2 rounded-md font-headline text-xs uppercase tracking-wider transition-all ${
            mode === 'subcooling'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Subcooling
        </button>
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

      {/* Pressure + Line Temp */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
            {mode === 'superheat' ? 'Suction' : 'Liquid'} Press (psig)
          </label>
          <input
            type="number"
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
            placeholder={mode === 'superheat' ? '118' : '350'}
            className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
              focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
              transition-all placeholder:text-outline/40"
          />
        </div>
        <div>
          <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
            Line Temp (\u00b0F)
          </label>
          <input
            type="number"
            value={lineTemp}
            onChange={(e) => setLineTemp(e.target.value)}
            placeholder={mode === 'superheat' ? '52' : '95'}
            className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
              focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
              transition-all placeholder:text-outline/40"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={!pressure || !lineTemp}
          className="flex-1 bg-primary-container text-on-primary-container font-headline uppercase text-sm tracking-wider
            py-3 rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Calculate
        </button>
        <button
          onClick={handleClear}
          className="px-4 border border-outline-variant text-outline font-headline uppercase text-sm tracking-wider
            py-3 rounded-lg hover:border-outline hover:text-on-surface transition-all"
        >
          Clear
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className={`border rounded-lg p-4 ${getBgColor(result.value, mode)}`}>
          <div className="text-center">
            <div className={`font-headline text-5xl font-bold ${getColor(result.value, mode)}`}>
              {result.value.toFixed(1)}\u00b0F
            </div>
            <div className="mt-1 text-xs text-outline font-body">
              Sat Temp: {result.satTemp.toFixed(1)}\u00b0F
            </div>
            <div className={`font-headline text-xs uppercase tracking-wider mt-2 ${getColor(result.value, mode)}`}>
              {mode === 'superheat' ? 'Superheat' : 'Subcooling'} &bull; {getTargetLabel(mode)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
