'use client';

import { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { calculateCompressionRatio } from '@/lib/calculations';

type RatingLevel = 'normal' | 'high' | 'critical' | null;

interface CalcResult {
  ratio: number;
  level: RatingLevel;
  label: string;
}

function getRating(ratio: number): { level: RatingLevel; label: string } {
  if (ratio >= 2.2 && ratio <= 4.0) {
    return { level: 'normal', label: 'NORMAL' };
  }
  if (ratio > 4.0 && ratio <= 4.5) {
    return { level: 'high', label: 'HIGH \u2014 CHECK HEAD PRESSURE' };
  }
  if (ratio > 4.5) {
    return { level: 'critical', label: 'CRITICAL \u2014 EXCESSIVE RATIO' };
  }
  if (ratio < 2.2 && ratio > 0) {
    return { level: 'critical', label: 'CRITICAL \u2014 LOW RATIO, CHECK COMPRESSOR VALVES' };
  }
  return { level: 'critical', label: 'INVALID RATIO' };
}

export default function CompressionRatioCalc() {
  const [suction, setSuction] = useState('');
  const [discharge, setDischarge] = useState('');
  const [result, setResult] = useState<CalcResult | null>(null);

  function handleCalculate() {
    const s = parseFloat(suction);
    const d = parseFloat(discharge);
    if (isNaN(s) || isNaN(d)) return;

    const ratio = calculateCompressionRatio(s, d);
    if (ratio === null || ratio <= 0) {
      setResult({ ratio: 0, level: 'critical', label: 'INVALID INPUT \u2014 CHECK PRESSURES' });
      return;
    }

    const rating = getRating(ratio);
    setResult({ ratio, ...rating });
  }

  function handleClear() {
    setSuction('');
    setDischarge('');
    setResult(null);
  }

  const levelColors: Record<string, string> = {
    normal: 'text-emerald-400',
    high: 'text-amber-400',
    critical: 'text-red-400',
  };

  const levelBgColors: Record<string, string> = {
    normal: 'bg-emerald-400/10 border-emerald-400/30',
    high: 'bg-amber-400/10 border-amber-400/30',
    critical: 'bg-red-400/10 border-red-400/30',
  };

  const LevelIcon = ({ level }: { level: RatingLevel }) => {
    if (level === 'normal') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (level === 'high') return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    if (level === 'critical') return <XCircle className="w-5 h-5 text-red-400" />;
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          Compression Ratio
        </h3>
      </div>

      <p className="text-xs text-outline font-body">
        CR = (Discharge + 14.7) / (Suction + 14.7)
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
            Suction (psig)
          </label>
          <input
            type="number"
            value={suction}
            onChange={(e) => setSuction(e.target.value)}
            placeholder="68"
            className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
              focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
              transition-all placeholder:text-outline/40"
          />
        </div>
        <div>
          <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
            Discharge (psig)
          </label>
          <input
            type="number"
            value={discharge}
            onChange={(e) => setDischarge(e.target.value)}
            placeholder="260"
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
          disabled={!suction || !discharge}
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
      {result && result.level && (
        <div className={`border rounded-lg p-4 ${levelBgColors[result.level] ?? ''}`}>
          <div className="text-center">
            <div className={`font-headline text-5xl font-bold ${levelColors[result.level] ?? ''}`}>
              {result.ratio.toFixed(2)}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <LevelIcon level={result.level} />
              <span className={`font-headline text-xs uppercase tracking-wider ${levelColors[result.level] ?? ''}`}>
                {result.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
