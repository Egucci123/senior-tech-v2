"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { DiagnosticSession, ChatMessage } from "@/types";
import SessionDetail from "./SessionDetail";

// ── Filter types ──
type FilterTab = "all" | "open" | "in_progress" | "complete";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "open", label: "OPEN" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "complete", label: "COMPLETE" },
];

// ── Status mapping for display ──
type DisplayStatus = "open" | "in_progress" | "complete";

function mapSessionStatus(status: DiagnosticSession["status"]): DisplayStatus {
  if (status === "resolved") return "complete";
  if (status === "ongoing") return "in_progress";
  return "open";
}

// ── Mock data ──
const mockSessions: DiagnosticSession[] = [
  {
    id: "sess-001",
    user_id: "user-1",
    started_at: "2023-10-24T14:30:00Z",
    ended_at: "",
    equipment_brand: "Carrier",
    equipment_model: "Infinity 24",
    serial_number: "2318-GH-4910",
    opening_message: "Compressor not engaging on cooling call",
    status: "ongoing",
    full_conversation: [
      { id: "m1", role: "user", content: "Carrier Infinity 24, serial 2318-GH-4910. Compressor won't engage on cooling call. Contactor is pulling in but compressor hums and trips on overload after about 5 seconds.", timestamp: "2023-10-24T14:30:00Z" },
      { id: "m2", role: "assistant", content: "That hum-then-trip pattern on a Carrier Infinity 24 usually points to a locked rotor or failed start components. Let's narrow it down:\n\n1. What are your voltage readings at the contactor load side when it pulls in?\n2. Can you check the start capacitor with your meter? Should be around 43-56 MFD.\n3. What's the ambient temp?", timestamp: "2023-10-24T14:31:00Z" },
      { id: "m3", role: "user", content: "Voltage is 238V at contactor. Start cap reads 22 MFD - it's a 45 MFD cap. Ambient is 92F.", timestamp: "2023-10-24T14:35:00Z" },
      { id: "m4", role: "assistant", content: "There's your problem. That start capacitor is at less than half its rated value - 22 MFD vs the 45 MFD rating. That's not providing enough torque to get the compressor started, especially at 92F ambient where head pressures are already elevated.\n\nReplace the start capacitor with a 45 MFD 370/440V and the compressor should fire right up. While you're in there, check the run capacitor too - if the start cap failed, the run cap may be degraded as well.", timestamp: "2023-10-24T14:36:00Z" },
    ] as ChatMessage[],
    job_summary: "Compressor failing to start due to degraded start capacitor (22 MFD vs 45 MFD rated). Replacement recommended.",
    checklist: "- Replace start capacitor 45 MFD 370/440V\n- Check run capacitor\n- Verify amp draw after repair\n- Monitor for 10 minutes",
    manual_ids_referenced: [],
    session_state: {
      equipment: { brand: "Carrier", model: "Infinity 24", type: "Split System AC", serial_number: "2318-GH-4910" },
      readings: { suction_pressure: "", discharge_pressure: "", superheat: "", subcooling: "", ambient_temp: "92", supply_temp: "", return_temp: "" },
      symptoms: ["Compressor hums then trips on overload"],
      ruled_out: [],
      working_diagnosis: "Failed start capacitor",
      photos_received: [],
    },
  },
  {
    id: "sess-002",
    user_id: "user-1",
    started_at: "2023-10-22T09:15:00Z",
    ended_at: "2023-10-22T11:45:00Z",
    equipment_brand: "Trane",
    equipment_model: "XV20i",
    serial_number: "4721-TR-8834",
    opening_message: "Low airflow complaint, system freezing up",
    status: "resolved",
    full_conversation: [
      { id: "m1", role: "user", content: "Trane XV20i, serial 4721-TR-8834. Customer says system freezes up after running for about 2 hours. Noticed low airflow from registers.", timestamp: "2023-10-22T09:15:00Z" },
      { id: "m2", role: "assistant", content: "Freeze-ups with low airflow on an XV20i - let's check the usual suspects:\n\n1. Filter condition?\n2. Evaporator coil visual - any ice or dirt buildup?\n3. What's the static pressure across the coil?\n4. Blower wheel condition?", timestamp: "2023-10-22T09:16:00Z" },
      { id: "m3", role: "user", content: "Filter is new. Evap coil has significant dirt buildup. Static is .92 iwc. Blower wheel is caked with dirt.", timestamp: "2023-10-22T09:25:00Z" },
      { id: "m4", role: "assistant", content: "That .92 iwc static is way too high - should be under .50 for that system. The dirty evap coil and blower wheel are your culprits. The restricted airflow is dropping the coil temp below freezing.\n\nClean the evaporator coil and blower wheel. Recheck static after cleaning - should drop significantly. If it's still above .50, inspect ductwork for restrictions.", timestamp: "2023-10-22T09:27:00Z" },
    ] as ChatMessage[],
    job_summary: "System freeze-up caused by dirty evaporator coil and blower wheel. Static pressure .92 iwc (should be <.50). Cleaning resolved the issue.",
    checklist: "- Clean evaporator coil\n- Clean blower wheel\n- Recheck static pressure\n- Verify proper airflow",
    manual_ids_referenced: [],
    session_state: {
      equipment: { brand: "Trane", model: "XV20i", type: "Heat Pump", serial_number: "4721-TR-8834" },
      readings: { suction_pressure: "", discharge_pressure: "", superheat: "", subcooling: "", ambient_temp: "", supply_temp: "", return_temp: "" },
      symptoms: ["System freezes up after 2 hours", "Low airflow"],
      ruled_out: ["Filter"],
      working_diagnosis: "Dirty evap coil and blower wheel restricting airflow",
      photos_received: [],
    },
  },
  {
    id: "sess-003",
    user_id: "user-1",
    started_at: "2023-10-20T16:00:00Z",
    ended_at: "",
    equipment_brand: "Lennox",
    equipment_model: "XC25",
    serial_number: "1192-LX-0547",
    opening_message: "Error code 411 on communicating system",
    status: "unresolved",
    full_conversation: [
      { id: "m1", role: "user", content: "Lennox XC25 showing error code 411 on the iComfort thermostat. Serial 1192-LX-0547. System won't run.", timestamp: "2023-10-20T16:00:00Z" },
      { id: "m2", role: "assistant", content: "Error 411 on the Lennox communicating system is a communication fault between the thermostat and outdoor unit. Let's troubleshoot:\n\n1. Check the 4-wire communication cable between indoor and outdoor units\n2. Verify 24V at the outdoor board\n3. Any recent power surges or lightning in the area?", timestamp: "2023-10-20T16:01:00Z" },
    ] as ChatMessage[],
    job_summary: "",
    checklist: "",
    manual_ids_referenced: [],
    session_state: {
      equipment: { brand: "Lennox", model: "XC25", type: "Variable Speed AC", serial_number: "1192-LX-0547" },
      readings: { suction_pressure: "", discharge_pressure: "", superheat: "", subcooling: "", ambient_temp: "", supply_temp: "", return_temp: "" },
      symptoms: ["Error code 411", "System won't run"],
      ruled_out: [],
      working_diagnosis: "Communication fault - code 411",
      photos_received: [],
    },
  },
  {
    id: "sess-004",
    user_id: "user-1",
    started_at: "2023-10-18T11:00:00Z",
    ended_at: "2023-10-18T13:30:00Z",
    equipment_brand: "Rheem",
    equipment_model: "RA20",
    serial_number: "5583-RH-2219",
    opening_message: "Refrigerant leak at service valve",
    status: "resolved",
    full_conversation: [
      { id: "m1", role: "user", content: "Rheem RA20, serial 5583-RH-2219. Found refrigerant leak at the suction service valve. System is low on charge.", timestamp: "2023-10-18T11:00:00Z" },
      { id: "m2", role: "assistant", content: "Suction service valve leaks on Rheem units are fairly common. A few questions:\n\n1. Is it leaking at the valve stem or the braze joint?\n2. What refrigerant type - R-410A?\n3. Current suction pressure?", timestamp: "2023-10-18T11:01:00Z" },
    ] as ChatMessage[],
    job_summary: "Refrigerant leak repaired at suction service valve. Recharged system with R-410A to proper levels.",
    checklist: "- Repair valve stem\n- Pressure test\n- Evacuate\n- Recharge R-410A\n- Verify subcooling",
    manual_ids_referenced: [],
    session_state: {
      equipment: { brand: "Rheem", model: "RA20", type: "Split System AC", serial_number: "5583-RH-2219" },
      readings: { suction_pressure: "95", discharge_pressure: "", superheat: "", subcooling: "", ambient_temp: "", supply_temp: "", return_temp: "" },
      symptoms: ["Refrigerant leak at service valve"],
      ruled_out: [],
      working_diagnosis: "Suction service valve leak",
      photos_received: [],
    },
  },
  {
    id: "sess-005",
    user_id: "user-1",
    started_at: "2023-10-15T08:45:00Z",
    ended_at: "",
    equipment_brand: "York",
    equipment_model: "YXV",
    serial_number: "8847-YK-6631",
    opening_message: "Intermittent short cycling on heat mode",
    status: "ongoing",
    full_conversation: [
      { id: "m1", role: "user", content: "York YXV heat pump, serial 8847-YK-6631. Unit short cycles in heat mode - runs about 3 minutes then shuts off for 2 minutes, repeats.", timestamp: "2023-10-15T08:45:00Z" },
      { id: "m2", role: "assistant", content: "Short cycling in heat mode on the York YXV could be several things. Let's check:\n\n1. What's the outdoor temp?\n2. Any fault codes on the board?\n3. What are your pressures - suction and discharge?\n4. Is the defrost board cycling it?", timestamp: "2023-10-15T08:46:00Z" },
    ] as ChatMessage[],
    job_summary: "",
    checklist: "",
    manual_ids_referenced: [],
    session_state: {
      equipment: { brand: "York", model: "YXV", type: "Heat Pump", serial_number: "8847-YK-6631" },
      readings: { suction_pressure: "", discharge_pressure: "", superheat: "", subcooling: "", ambient_temp: "", supply_temp: "", return_temp: "" },
      symptoms: ["Short cycling in heat mode"],
      ruled_out: [],
      working_diagnosis: "Intermittent short cycling",
      photos_received: [],
    },
  },
];

// ── Helper: format date ──
function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} | ${hours}:${minutes}`;
}

// ── Diagnosis color ──
function getDiagnosisStyle(diagnosis: string): { borderColor: string; textColor: string } {
  const lower = diagnosis.toLowerCase();
  if (lower.includes("fail") || lower.includes("fault") || lower.includes("error") || lower.includes("leak")) {
    return { borderColor: "border-l-[#ff6b6b]", textColor: "text-[#ff6b6b]" };
  }
  if (lower.includes("dirty") || lower.includes("degrad") || lower.includes("restrict") || lower.includes("short")) {
    return { borderColor: "border-l-[#ffb74d]", textColor: "text-[#ffb74d]" };
  }
  return { borderColor: "border-l-[#69cc69]", textColor: "text-[#69cc69]" };
}

// ── Status badge ──
function StatusBadge({ status }: { status: DisplayStatus }) {
  const config = {
    open: {
      label: "OPEN",
      className: "border border-outline text-outline",
    },
    in_progress: {
      label: "IN PROGRESS",
      className: "border border-[#69cc69] text-[#69cc69] bg-[#69cc69]/10",
    },
    complete: {
      label: "COMPLETE",
      className: "bg-[#69cc69] text-[#0e0e0e]",
    },
  };

  const c = config[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded font-headline font-bold text-[10px] uppercase tracking-wide ${c.className}`}
    >
      {c.label}
    </span>
  );
}

// ── Main Component ──
interface HistoryScreenProps {
  onResumeSession?: (session: DiagnosticSession) => void;
}

export default function HistoryScreen({ onResumeSession }: HistoryScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedSession, setSelectedSession] = useState<DiagnosticSession | null>(null);

  const filteredSessions = mockSessions.filter((session) => {
    if (activeFilter === "all") return true;
    const displayStatus = mapSessionStatus(session.status);
    return displayStatus === activeFilter;
  });

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onResume={() => {
          onResumeSession?.(selectedSession);
        }}
      />
    );
  }

  return (
    <div className="px-4 pt-20 pb-24 max-w-lg mx-auto">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-headline font-bold text-xs uppercase tracking-wide transition-colors ${
                isActive
                  ? "bg-primary-container text-[#0e0e0e]"
                  : "bg-surface-container-high border border-outline-variant text-outline"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Session Cards */}
      <div className="flex flex-col gap-3">
        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-outline text-sm">No sessions found.</p>
          </div>
        )}

        {filteredSessions.map((session) => {
          const displayStatus = mapSessionStatus(session.status);
          const diagnosis = session.session_state.working_diagnosis;
          const diagStyle = getDiagnosisStyle(diagnosis);

          return (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="bg-surface-container-low ghost-border rounded-lg p-4 text-left transition-all active:scale-[0.99] hover:bg-surface-container"
            >
              {/* Top row: date + status */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-headline font-medium text-[11px] uppercase tracking-wide text-outline">
                  {formatDate(session.started_at)}
                </span>
                <StatusBadge status={displayStatus} />
              </div>

              {/* Equipment name */}
              <h3 className="font-headline font-bold text-base uppercase tracking-[-0.02em] text-on-surface mb-0.5">
                {session.equipment_brand} {session.equipment_model}
              </h3>

              {/* Serial number */}
              <p className="text-xs text-outline mb-3">
                SN: {session.serial_number}
              </p>

              {/* Diagnosis tag */}
              <div
                className={`inline-flex items-center border-l-2 ${diagStyle.borderColor} pl-2 py-0.5`}
              >
                <span className={`text-xs font-medium ${diagStyle.textColor}`}>
                  {diagnosis}
                </span>
              </div>

              {/* Resume button for non-complete sessions */}
              {displayStatus !== "complete" && (
                <div className="flex justify-end mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container/10 border border-primary-container/20 font-headline font-bold text-[11px] uppercase tracking-wide text-primary-container">
                    Resume
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
