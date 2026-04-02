'use client';

import { useState } from 'react';
import { Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import refData from '@/data/refrigerant_reference.json';

type SectionKey = 'replacements' | 'phaseout' | 'oil' | 'pressures';

export default function RefrigerantReference() {
  const [expanded, setExpanded] = useState<SectionKey | null>('replacements');

  function toggle(key: SectionKey) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  const replacements = refData.r22_replacement_options.replacements;
  const phaseOut = refData.r410a_phase_out;
  const oilCompat = refData.oil_compatibility;
  const pressureChart = refData.pressure_comparison_chart;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Droplets className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          Refrigerant Reference
        </h3>
      </div>

      {/* R-22 Replacement Options */}
      <SectionCard
        title="R-22 Replacement Options"
        sectionKey="replacements"
        expanded={expanded}
        toggle={toggle}
      >
        <div className="space-y-3">
          {Object.entries(replacements).map(([name, info]) => (
            <div key={name} className="bg-[#0e0e0e] rounded-lg p-3">
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-headline text-sm text-primary uppercase">{name}</span>
                <span className="text-[10px] text-outline bg-surface-container-high px-2 py-0.5 rounded font-headline uppercase">
                  {info.type}
                </span>
              </div>
              <p className="text-xs text-outline font-body mb-1">
                Oil: {info.oil_compatibility}
              </p>
              <p className="text-xs text-outline/70 font-body">
                Capacity vs R-22: {info.capacity_vs_r22}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* R-410A Phase-Out Info */}
      <SectionCard
        title="R-410A Phase-Down"
        sectionKey="phaseout"
        expanded={expanded}
        toggle={toggle}
      >
        <div className="space-y-2">
          <p className="text-xs text-on-surface font-body leading-relaxed">
            {phaseOut.status}
          </p>
          <div className="bg-[#0e0e0e] rounded-lg p-3">
            <p className="font-headline text-[11px] uppercase tracking-wider text-outline mb-2">
              GWP Comparison
            </p>
            <div className="space-y-1.5">
              {Object.entries(refData.r454b_transition).filter(([k]) => k === 'gwp').length > 0 && (
                <>
                  <GWPBar label="R-410A" value={2088} max={2088} color="bg-red-400" />
                  <GWPBar label="R-32" value={675} max={2088} color="bg-amber-400" />
                  <GWPBar label="R-454B" value={466} max={2088} color="bg-emerald-400" />
                </>
              )}
            </div>
          </div>
          <div className="bg-[#0e0e0e] rounded-lg p-3">
            <p className="font-headline text-[11px] uppercase tracking-wider text-outline mb-2">
              Key Points
            </p>
            <ul className="space-y-1">
              {phaseOut.key_points.map((point, i) => (
                <li key={i} className="text-xs text-on-surface/80 font-body flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">&#x2022;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Oil Compatibility */}
      <SectionCard
        title="Oil Compatibility"
        sectionKey="oil"
        expanded={expanded}
        toggle={toggle}
      >
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 px-3 font-headline uppercase tracking-wider text-outline text-[11px]">
                  Refrigerant
                </th>
                <th className="text-left py-2 px-3 font-headline uppercase tracking-wider text-outline text-[11px]">
                  Oil Type
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(oilCompat).map(([ref, info]) => (
                <tr key={ref} className="border-b border-outline-variant/30">
                  <td className="py-2 px-3 font-headline text-primary uppercase text-xs">
                    {ref}
                  </td>
                  <td className="py-2 px-3 font-body text-on-surface/80">
                    {info.required_oil}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Pressure Comparison */}
      <SectionCard
        title="Pressure Comparison (95\u00b0F Ambient)"
        sectionKey="pressures"
        expanded={expanded}
        toggle={toggle}
      >
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 px-3 font-headline uppercase tracking-wider text-outline text-[10px]">
                  Temp
                </th>
                <th className="text-center py-2 px-3 font-headline uppercase tracking-wider text-outline text-[10px]">
                  R-22
                </th>
                <th className="text-center py-2 px-3 font-headline uppercase tracking-wider text-outline text-[10px]">
                  R-410A
                </th>
                <th className="text-center py-2 px-3 font-headline uppercase tracking-wider text-outline text-[10px]">
                  R-454B
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '40\u00b0F Evap', key: 'at_40F_evaporator' as const },
                { label: '45\u00b0F Evap', key: 'at_45F_evaporator' as const },
                { label: '100\u00b0F Cond', key: 'at_100F_condenser' as const },
                { label: '110\u00b0F Cond', key: 'at_110F_condenser' as const },
                { label: '120\u00b0F Cond', key: 'at_120F_condenser' as const },
              ].map((row) => {
                const data = pressureChart[row.key] as Record<string, number>;
                return (
                  <tr key={row.key} className="border-b border-outline-variant/30">
                    <td className="py-2 px-3 font-headline uppercase text-[11px] text-outline">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">
                      {data['R-22']}
                    </td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">
                      {data['R-410A']}
                    </td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">
                      {data['R-454B']}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-outline/70 font-body px-3 mt-2">
            Pressures in psig. R-410A runs ~50-60% higher than R-22.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

/* Collapsible Section Card */
function SectionCard({
  title,
  sectionKey,
  expanded,
  toggle,
  children,
}: {
  title: string;
  sectionKey: SectionKey;
  expanded: SectionKey | null;
  toggle: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded === sectionKey;
  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-lg overflow-hidden">
      <button
        onClick={() => toggle(sectionKey)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-container-high/50 transition-colors"
      >
        <span className="font-headline text-xs uppercase tracking-wider text-on-surface">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-outline" />
        ) : (
          <ChevronDown className="w-4 h-4 text-outline" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/* GWP Bar Chart Component */
function GWPBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const width = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="font-headline text-[11px] uppercase text-outline w-14 text-right">{label}</span>
      <div className="flex-1 bg-outline-variant/20 rounded h-4 overflow-hidden">
        <div
          className={`${color} h-full rounded transition-all`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-body text-[11px] text-on-surface/70 w-10 text-right">{value}</span>
    </div>
  );
}
