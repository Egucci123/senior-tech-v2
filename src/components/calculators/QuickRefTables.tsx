'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import quickRef from '@/data/quick_reference.json';

type SectionKey = 'shsc' | 'motor' | 'cap' | 'cr' | 'amps';

const motorData = quickRef.motor_winding_resistance.single_phase_psc_230v;
const capData = quickRef.capacitor_testing.examples;
const crData = quickRef.compression_ratios.normal_ranges;
const ampData = quickRef.amp_draw_by_tonnage.residential_AC_condenser_230V_single_phase;

export default function QuickRefTables() {
  const [expanded, setExpanded] = useState<SectionKey | null>('shsc');

  function toggle(key: SectionKey) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-sm uppercase tracking-wider text-on-surface">
          Quick Reference
        </h3>
      </div>

      {/* SH/SC Targets */}
      <Section title="SH/SC Targets by System Type" sectionKey="shsc" expanded={expanded} toggle={toggle}>
        <div className="space-y-2">
          {/* Fixed Orifice */}
          <div className="bg-[#0e0e0e] rounded-lg p-3">
            <p className="font-headline text-xs text-primary uppercase mb-1.5">Fixed Orifice (Piston)</p>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SH Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.superheat_targets.fixed_orifice_piston.typical_range_F}{'\u00b0F'}</p>
              </div>
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SC Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.subcooling_targets.fixed_orifice_piston.typical_subcooling_F}{'\u00b0F'}</p>
              </div>
            </div>
            <p className="text-[10px] text-outline/80 font-body">Superheat is primary charging method. Use charging chart.</p>
          </div>
          {/* TXV */}
          <div className="bg-[#0e0e0e] rounded-lg p-3">
            <p className="font-headline text-xs text-primary uppercase mb-1.5">TXV / EEV</p>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SH Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.superheat_targets.txv_systems.target_superheat_F}{'\u00b0F'}</p>
              </div>
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SC Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.subcooling_targets.txv_systems.target_subcooling_F}{'\u00b0F'}</p>
              </div>
            </div>
            <p className="text-[10px] text-outline/80 font-body">Subcooling is primary charging method. TXV controls superheat.</p>
          </div>
          {/* Heat Pump */}
          <div className="bg-[#0e0e0e] rounded-lg p-3">
            <p className="font-headline text-xs text-primary uppercase mb-1.5">Heat Pump (Heating)</p>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SH Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.superheat_targets.electronic_expansion_valve.target_superheat_F}{'\u00b0F'}</p>
              </div>
              <div>
                <span className="font-headline text-[10px] text-outline uppercase tracking-wider">SC Target</span>
                <p className="font-body text-sm text-on-surface">{quickRef.subcooling_targets.heat_pump_heating_mode.target_subcooling_F}{'\u00b0F'}</p>
              </div>
            </div>
            <p className="text-[10px] text-outline/80 font-body">Measured at indoor coil (condenser in heating). Lower SC targets are normal.</p>
          </div>
        </div>
      </Section>

      {/* Motor Winding Resistance */}
      <Section title="Motor Winding Resistance (230V PSC)" sectionKey="motor" expanded={expanded} toggle={toggle}>
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">HP</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">C-R (&Omega;)</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">C-S (&Omega;)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(motorData).map(([key, val]) => {
                const label = key.replace(/_/g, '/').replace(/HP/i, ' HP');
                return (
                  <tr key={key} className="border-b border-outline-variant/30">
                    <td className="py-2 px-3 font-headline text-primary uppercase text-xs">{label}</td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">{val.common_to_run}</td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">{val.common_to_start}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-outline/70 font-body px-3 mt-2">
            Infinity = open winding. Zero = shorted. Any reading to ground = grounded motor.
          </p>
        </div>
      </Section>

      {/* Capacitor Tolerance */}
      <Section title="Capacitor Tolerance (\u00b16%)" sectionKey="cap" expanded={expanded} toggle={toggle}>
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Rated &mu;F</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Min</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Max</th>
              </tr>
            </thead>
            <tbody>
              {capData.map((row, i) => (
                <tr key={i} className="border-b border-outline-variant/30">
                  <td className="py-2 px-3 text-center font-headline text-primary text-xs">{row.rated_uf}</td>
                  <td className="py-2 px-3 text-center font-body text-on-surface/80">{row.min_pass}</td>
                  <td className="py-2 px-3 text-center font-body text-on-surface/80">{row.max_pass}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-outline/70 font-body px-3 mt-2">
            Always discharge capacitor before testing. Replace if outside range.
          </p>
        </div>
      </Section>

      {/* Compression Ratio Ranges */}
      <Section title="Compression Ratio Ranges" sectionKey="cr" expanded={expanded} toggle={toggle}>
        <div className="space-y-2">
          {Object.entries(crData).map(([key, val]) => {
            const label = key.replace(/_/g, ' ').replace(/residential/i, '').trim();
            const ratio = 'typical_ratio' in val ? val.typical_ratio : '';
            const example = 'example' in val ? val.example : ('note' in val ? val.note : '');
            return (
              <div key={key} className="bg-[#0e0e0e] rounded-lg p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-headline text-xs text-primary uppercase">{label}</span>
                  <span className="font-headline text-sm text-emerald-400">{ratio}</span>
                </div>
                {example && (
                  <p className="text-[10px] text-outline/80 font-body">{example}</p>
                )}
              </div>
            );
          })}
          <p className="text-[10px] text-outline/70 font-body mt-2">
            CR = (Discharge psig + 14.7) / (Suction psig + 14.7). Above 4:1 in AC indicates a problem.
          </p>
        </div>
      </Section>

      {/* Amp Draw by Tonnage */}
      <Section title="Amp Draw by Tonnage (230V)" sectionKey="amps" expanded={expanded} toggle={toggle}>
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Ton</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Comp FLA</th>
                <th className="text-center py-2 px-3 font-headline uppercase text-[10px] text-outline tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ampData).map(([key, val]) => {
                const label = key.replace(/_/g, '.').replace(/ton/i, '') + ' Ton';
                return (
                  <tr key={key} className="border-b border-outline-variant/30">
                    <td className="py-2 px-3 font-headline text-primary uppercase text-xs">{label}</td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">{val.compressor_FLA}</td>
                    <td className="py-2 px-3 text-center font-body text-on-surface/80">{val.total_outdoor_unit_FLA}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-outline/70 font-body px-3 mt-2">
            Always check nameplate. Running above FLA indicates overload. Low voltage increases amp draw.
          </p>
        </div>
      </Section>
    </div>
  );
}

/* Collapsible Section */
function Section({
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
        <span className="font-headline text-xs uppercase tracking-wider text-on-surface">{title}</span>
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
