"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/ui/Header";
import BottomNav, { type TabId } from "@/components/ui/BottomNav";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryScreen from "@/components/history/HistoryScreen";
import ManualsScreen from "@/components/manuals/ManualsScreen";
import ProfileScreen from "@/components/profile/ProfileScreen";
import { useManuals } from "@/hooks/useManuals";

export default function MainApp() {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("diagnose");
  const { manuals, hasNew, clearNew } = useManuals();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/onboarding");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (activeTab === "manuals" && hasNew) {
      clearNew();
    }
  }, [activeTab, hasNew, clearNew]);

  if (loading || !session) {
    return <div className="min-h-screen bg-[#0e0e0e] dot-grid" />;
  }

  const isDiagnose = activeTab === "diagnose";

  const renderContent = () => {
    switch (activeTab) {
      case "diagnose":
        return (
          <div className="fixed inset-0 top-0 bottom-16 z-10">
            <ChatInterface user={user} />
          </div>
        );
      case "manuals":
        return <ManualsScreen sharedManuals={manuals} userId={user?.id} />;
      case "history":
        return <HistoryScreen userId={user?.id} />;
      case "settings":
        return <ProfileScreen />;
      default:
        return (
          <div className="fixed inset-0 top-0 bottom-16 z-10">
            <ChatInterface user={user} />
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
