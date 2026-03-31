"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { DiagnosticSession, ChatMessage } from "@/types";
import { getDiagnosticSessions } from "@/lib/supabase";
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

// ── Map filter tab to DB status value ──
function filterToDbStatus(filter: FilterTab): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "open") return "ongoing";
  if (filter === "in_progress") return "ongoing";
  if (filter === "complete") return "resolved";
  return undefined;
}

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
  userId?: string;
  onResumeSession?: (session: DiagnosticSession) => void;
}

export default function HistoryScreen({ userId, onResumeSession }: HistoryScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedSession, setSelectedSession] = useState<DiagnosticSession | null>(null);
  const [sessions, setSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    try {
      const dbStatus = filterToDbStatus(activeFilter);
      const { data, error } = await getDiagnosticSessions(userId, dbStatus);
      if (error) {
        console.error("Failed to fetch diagnostic sessions:", error);
        setSessions([]);
      } else {
        setSessions((data as DiagnosticSession[]) || []);
      }
    } catch (e) {
      console.error("Failed to fetch diagnostic sessions:", e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  // Show empty state if no userId
  if (!userId) {
    return (
      <div className="px-4 pt-20 pb-24 max-w-lg mx-auto">
        <div className="text-center py-12">
          <p className="text-outline text-sm">Sign in to view your diagnostic history.</p>
        </div>
      </div>
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

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary-container animate-spin" />
        </div>
      )}

      {/* Session Cards */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {sessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-outline text-sm">No sessions found.</p>
            </div>
          )}

          {sessions.map((session) => {
            const displayStatus = mapSessionStatus(session.status);
            const diagnosis = session.session_state?.working_diagnosis || "";
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
                  SN: {session.serial_number || "N/A"}
                </p>

                {/* Diagnosis tag */}
                {diagnosis && (
                  <div
                    className={`inline-flex items-center border-l-2 ${diagStyle.borderColor} pl-2 py-0.5`}
                  >
                    <span className={`text-xs font-medium ${diagStyle.textColor}`}>
                      {diagnosis}
                    </span>
                  </div>
                )}

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
      )}
    </div>
  );
}
