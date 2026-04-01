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

  return (
    <div className="min-h-screen">
      {!isDiagnose && <Header />}
      <main>
        {/* ChatInterface is ALWAYS mounted — hidden via CSS when not on diagnose tab */}
        <div style={{ display: activeTab === "diagnose" ? "block" : "none" }} className="fixed inset-0 top-0 bottom-16 z-10">
          <ChatInterface user={user} />
        </div>

        {/* Other tabs render normally */}
        {activeTab === "manuals" && <ManualsScreen sharedManuals={manuals} userId={user?.id} />}
        {activeTab === "history" && <HistoryScreen userId={user?.id} />}
        {activeTab === "settings" && <ProfileScreen />}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        manualsNotification={hasNew && activeTab !== "manuals"}
      />
    </div>
  );
}
