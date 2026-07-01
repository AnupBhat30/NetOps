"use client";

import { useState } from "react";

import { HeroChat } from "@/components/chat/HeroChat";
import { WorkflowConsole } from "@/components/chat/WorkflowConsole";
import { DeviceStatePanel } from "@/components/device/DeviceStatePanel";
import { SystemCapabilityCards } from "@/components/portfolio/SystemCapabilityCards";
import { AgentTimeline } from "@/components/timeline/AgentTimeline";
import type { SessionState } from "@/lib/api";

export function HomeExperience() {
  const [activeSession, setActiveSession] = useState<SessionState | null>(null);

  if (activeSession) {
    return <WorkflowConsole initialSession={activeSession} onExit={() => setActiveSession(null)} />;
  }

  return (
    <>
      <HeroChat onSessionStart={setActiveSession} />
      <AgentTimeline />
      <DeviceStatePanel />
      <SystemCapabilityCards />
    </>
  );
}
