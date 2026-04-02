"use client";

import { Wrench, Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0e0e0e] border-b border-white/5 flex items-center justify-between px-4">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary-container" />
        <div className="flex flex-col leading-tight">
          <span className="font-headline font-black text-xl uppercase text-primary-container tracking-tighter">
            SENIOR TECH
          </span>
          <span className="font-headline font-bold text-[10px] uppercase text-outline tracking-wide">
            System Diagnostics v4.2
          </span>
        </div>
      </div>

      {/* Right: Notification */}
      <button
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-outline" />
      </button>
    </header>
  );
}
