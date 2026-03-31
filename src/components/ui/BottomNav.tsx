"use client";

import { Wrench, BookOpen, Clock, Settings } from "lucide-react";

export type TabId = "diagnose" | "manuals" | "history" | "settings";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  manualsNotification?: boolean;
}

const tabs: { id: TabId; label: string; icon: typeof Wrench; prominent?: boolean }[] = [
  { id: "diagnose", label: "DIAGNOSE", icon: Wrench, prominent: true },
  { id: "manuals", label: "MANUALS", icon: BookOpen },
  { id: "history", label: "HISTORY", icon: Clock },
  { id: "settings", label: "SETTINGS", icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange, manualsNotification }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e0e] border-t border-white/5">
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const iconSize = tab.prominent ? "w-7 h-7" : "w-5 h-5";

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 relative pt-1 transition-colors"
              aria-label={tab.label}
            >
              {/* Active indicator bar at top */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-container rounded-full" />
              )}

              <div className="relative">
                <Icon
                  className={`${iconSize} ${
                    isActive ? "text-primary-container" : "text-outline"
                  } transition-colors`}
                />
                {/* Notification dot for manuals */}
                {tab.id === "manuals" && manualsNotification && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#4fc3f7]" />
                )}
              </div>
              <span
                className={`font-headline font-bold text-[10px] uppercase mt-1 tracking-wide ${
                  isActive ? "text-primary-container" : "text-outline"
                } transition-colors`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
