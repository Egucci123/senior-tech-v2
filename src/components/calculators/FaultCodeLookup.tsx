'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, Search, Database, Cpu } from 'lucide-react';
import faultCodes from '@/data/fault_codes.json';

type FaultCodesData = Record<string, Record<string, string>>;

const brands = Object.keys(faultCodes as FaultCodesData).sort();

export default function FaultCodeLookup() {
  const [brand, setBrand] = useState(brands[0] || '');
  const [code, setCode] = useState('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    description?: string;
    brand: string;
    code: string;
  } | null>(null);

  const allCodes = useMemo(() => {
    if (!brand) return {};
    return (faultCodes as FaultCodesData)[brand] || {};
  }, [brand]);

  function handleSearch() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || !brand) return;

    const data = (faultCodes as FaultCodesData)[brand];
    if (!data) {
      setSearchResult({ found: false, brand, code: trimmed });
      return;
    }

    // Try exact match first
    const exact = data[trimmed];
    if (exact) {
      setSearchResult({ found: true, description: exact, brand, code: trimmed });
      return;
    }

    // Try case-insensitive match
    const keys = Object.keys(data);
    const match = keys.find((k) => k.toUpperCase() === trimmed);
    if (match) {
      setSearchResult({ found: true, description: data[match], brand, code: match });
      return;
    }

    setSearchResult({ found: false, brand, code: trimmed });
  }

  function handleClear() {
    setCode('');
    setSearchResult(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          Fault Code Lookup
        </h3>
      </div>

      {/* Brand Select */}
      <div>
        <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
          Brand
        </label>
        <select
          value={brand}
          onChange={(e) => { setBrand(e.target.value); setSearchResult(null); }}
          className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
            focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
            transition-all appearance-none"
        >
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <p className="text-[10px] text-outline/80 mt-1 font-body">
          {Object.keys(allCodes).length} codes available
        </p>
      </div>

      {/* Code Input */}
      <div>
        <label className="block font-headline text-[11px] uppercase tracking-wider text-outline mb-1.5">
          Fault Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="E1, 14, CH22..."
          className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-body text-sm
            focus:outline-none focus:border-primary-container focus:shadow-[0_0_0_1px_rgba(79,195,247,0.3)]
            transition-all placeholder:text-outline/40 uppercase"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={!code.trim()}
          className="flex-1 bg-primary-container text-on-primary-container font-headline uppercase text-sm tracking-wider
            py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
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
      {searchResult && (
        <div className="space-y-3">
          {searchResult.found ? (
            <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-400 font-headline text-[10px] uppercase tracking-wider">
                    <Database className="w-3 h-3" />
                    Local
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-headline text-lg text-on-surface uppercase">
                      {searchResult.code}
                    </span>
                    <span className="font-headline text-[11px] text-outline uppercase tracking-wider">
                      {searchResult.brand}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface/90 font-body leading-relaxed">
                    {searchResult.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-outline font-body">
                  Code <span className="text-on-surface font-bold uppercase">{searchResult.code}</span> not found for{' '}
                  <span className="text-on-surface">{searchResult.brand}</span>
                </p>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container/20 border border-primary-container/40
                    text-primary font-headline text-xs uppercase tracking-wider hover:bg-primary-container/30 transition-colors"
                >
                  <Cpu className="w-4 h-4" />
                  AI Lookup
                </button>
                <p className="text-[10px] text-outline/80 font-body">
                  Sends code to AI for identification (requires network)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
