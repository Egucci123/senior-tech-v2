"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/ui/Header";
import BottomNav, { type TabId } from "@/components/ui/BottomNav";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryScreen from "@/components/history/HistoryScreen";
import ManualsScreen from "@/components/manuals/ManualsScreen";
import ProfileScreen from "@/components/profile/ProfileScreen";
import { useManuals } from "@/hooks/useManuals";

export default function MainApp() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("diagnose");
  const [ready, setReady] = useState(false);
  const { manuals, hasNew, clearNew } = useManuals();

  useEffect(() => {
    const onboardingComplete = localStorage.getItem("senior_tech_onboarding_complete");
    if (!onboardingComplete) {
      router.replace("/onboarding");
      return;
    }
    setReady(true);
  }, [router]);

  // Clear notification when user visits manuals tab
  useEffect(() => {
    if (activeTab === "manuals" && hasNew) {
      clearNew();
    }
  }, [activeTab, hasNew, clearNew]);

  if (!ready) {
    return <div className="min-h-screen bg-[#0e0e0e] dot-grid" />;
  }

  const isDiagnose = activeTab === "diagnose";

  const renderContent = () => {
    switch (activeTab) {
      case "diagnose":
        return (
          <div className="fixed inset-0 top-0 bottom-16 z-10">
            <ChatInterface />
          </div>
        );
      case "manuals":
        return <ManualsScreen sharedManuals={manuals} />;
      case "history":
        return <HistoryScreen />;
      case "settings":
        return <ProfileScreen />;
      default:
        return (
          <div className="fixed inset-0 top-0 bottom-16 z-10">
            <ChatInterface />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      {!isDiagnose && <Header />}
      <main>{renderContent()}</main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        manualsNotification={hasNew && activeTab !== "manuals"}
      />
    </div>
  );
}
