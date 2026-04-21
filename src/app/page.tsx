"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/ui/Header";
import BottomNav, { type TabId } from "@/components/ui/BottomNav";
import ChatInterface, { type ChatInterfaceHandle } from "@/components/chat/ChatInterface";
import HistoryScreen from "@/components/history/HistoryScreen";
import ManualsScreen from "@/components/manuals/ManualsScreen";
import ProfileScreen from "@/components/profile/ProfileScreen";
import { useManuals } from "@/hooks/useManuals";
import type { DiagnosticSession } from "@/types";

export default function MainApp() {
  const router = useRouter();
  const { session, user, loading, signOut, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("diagnose");
  const { manuals, hasNew, clearNew } = useManuals();
  const chatRef = useRef<ChatInterfaceHandle>(null);

  const handleResumeSession = useCallback((session: DiagnosticSession) => {
    chatRef.current?.loadSession(session);
    setActiveTab("diagnose");
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/onboarding");
      return;
    }
    // Session exists but user profile missing — retry once then sign out
    if (session && !user) {
      refreshUser().catch(() => {
        signOut().then(() => router.replace("/onboarding"));
      });
      return;
    }
    // User loaded — gate on subscription
    if (user && user.subscription_status !== "active") {
      router.replace("/subscribe");
    }
  }, [loading, session, user, router, refreshUser, signOut]);

  useEffect(() => {
    if (activeTab === "manuals" && hasNew) {
      clearNew();
    }
  }, [activeTab, hasNew, clearNew]);

  const isSubscribed = user?.subscription_status === "active";

  // Only block rendering while auth is genuinely loading.
  // Once loaded, the useEffect above handles redirects — don't show
  // the spinner for non-subscribed users (they'll be redirected instantly).
  if (loading || !session || !user) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] dot-grid flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 clip-hex bg-surface-container-high flex items-center justify-center">
          <svg className="w-7 h-7 text-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline animate-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  // Redirect in-progress for non-subscribers — render nothing while router navigates
  if (!isSubscribed) return null;

  const isDiagnose = activeTab === "diagnose";

  return (
    <div className="min-h-screen">
      {!isDiagnose && <Header />}
      <main>
        {/*
          ChatInterface is ALWAYS mounted to preserve chat state.
          Use visibility+pointer-events instead of display:none to avoid
          expensive layout recalculations on every tab switch.
        */}
        <div
          className="fixed inset-0 bottom-16 z-10"
          style={isDiagnose ? undefined : { visibility: "hidden", pointerEvents: "none" }}
        >
          <ChatInterface ref={chatRef} user={user} />
        </div>

        {/* Other tabs — mount/unmount normally, no freeze risk */}
        {activeTab === "manuals" && (
          <ManualsScreen sharedManuals={manuals} userId={user?.id} />
        )}
        {activeTab === "history" && (
          <HistoryScreen userId={user?.id} onResumeSession={handleResumeSession} />
        )}
        {activeTab === "settings" && (
          <ProfileScreen user={user} session={session} signOut={signOut} />
        )}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        manualsNotification={hasNew && activeTab !== "manuals"}
      />
    </div>
  );
}
