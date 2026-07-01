"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  Loader2,
  ShieldCheck,
  TerminalSquare,
  X
} from "lucide-react";
import { useState } from "react";

import { CommandResultCard } from "@/components/chat/CommandResultCard";
import { approveSession, rejectSession, type ActionStep, type SessionState, type StepResult } from "@/lib/api";

export function AgentWorkspace({
  initialSession,
  onExit
}: {
  initialSession: SessionState;
  onExit: () => void;
}) {
  const [session, setSession] = useState(initialSession);
  const [isWorking, setIsWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function approve() {
    setIsWorking(true);
    setNotice("Approved. Running the planned tool calls...");
    try {
      const updated = await approveSession(session.session_id);
      setSession(updated);
      setNotice(updated.status === "done" ? "Execution finished successfully." : "Execution finished with a non-success status.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function reject() {
    setIsWorking(true);
    setNotice("Rejecting plan...");
    try {
      const updated = await rejectSession(session.session_id);
      setSession(updated);
      setNotice("Plan rejected. No device changes were made.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Reject failed.");
    } finally {
      setIsWorking(false);
    }
  }

  const awaitingApproval = session.status === "awaiting_approval";
  const hasResults = session.results.length > 0;

  return (
    <section className="min-h-screen bg-[#f7faf8]">
      <header className="sticky top-0 z-10 border-b border-line/90 bg-white/85 backdrop-blur-xl">
        <div className="container-shell flex min-h-16 items-center justify-between gap-4">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5"
            type="button"
            onClick={onExit}
          >
            <ArrowLeft size={16} />
            New request
          </button>
          <div className="text-right">
            <p className="m-0 text-sm font-extrabold text-ink">NetOps Agent</p>
            <p className="m-0 mt-0.5 font-mono text-xs font-semibold text-[#60716a]">{session.session_id}</p>
          </div>
        </div>
      </header>

      <div className="container-shell grid gap-6 py-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside className="premium-card h-fit rounded-[var(--radius-lg)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.1em] text-[#60716a]">Session status</p>
              <h2 className="m-0 mt-2 text-2xl font-extrabold text-ink">{formatStatus(session.status)}</h2>
            </div>
            <StatusIcon status={session.status} />
          </div>

          <div className="mt-6 grid gap-3">
            <InfoRow label="Plan steps" value={String(session.plan.length)} />
            <InfoRow label="Tool results" value={String(session.results.length)} />
            <InfoRow label="Validation" value={session.validation_result ?? "Pending"} />
          </div>

          {awaitingApproval ? (
            <div className="mt-6 grid gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17211f] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                type="button"
                disabled={isWorking}
                onClick={approve}
              >
                {isWorking ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
                Approve and run
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 disabled:opacity-50"
                type="button"
                disabled={isWorking}
                onClick={reject}
              >
                <X size={17} />
                Reject plan
              </button>
            </div>
          ) : null}

          {notice ? <p className="m-0 mt-5 rounded-xl bg-[#eef6f2] p-3 text-sm font-semibold leading-6 text-[#234e46]">{notice}</p> : null}
        </aside>

        <main className="premium-card overflow-hidden rounded-[var(--radius-lg)]">
          <div className="border-b border-line bg-white px-5 py-4">
            <p className="m-0 text-sm font-extrabold text-[#60716a]">Conversation</p>
          </div>

          <div className="grid gap-5 p-5">
            <Message role="user" title="Request">
              {session.intent}
            </Message>

            <Message role="assistant" title={awaitingApproval ? "Plan ready for review" : "Agent response"}>
              {awaitingApproval
                ? "I created a plan and paused before running write operations. Review the tool calls below."
                : hasResults
                  ? "The approved plan ran through the backend executor. Results are shown below."
                  : "The session has no execution results."}
            </Message>

            <PlanPanel plan={session.plan} />

            {hasResults ? <ResultsPanel results={session.results} /> : null}
          </div>
        </main>
      </div>
    </section>
  );
}

function Message({ role, title, children }: { role: "user" | "assistant"; title: string; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82ch] rounded-2xl px-4 py-3 ${isUser ? "bg-[#17211f] text-white" : "border border-line bg-[#f8fbf9] text-ink"}`}>
        <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.08em] opacity-70">{title}</p>
        <p className="m-0 text-sm font-semibold leading-6">{children}</p>
      </div>
    </article>
  );
}

function PlanPanel({ plan }: { plan: ActionStep[] }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck size={18} className="text-moss" />
        <h3 className="m-0 text-base font-extrabold text-ink">Planned operations</h3>
      </div>
      <div className="grid gap-3">
        {plan.map((step, index) => (
          <article key={`${step.tool}-${index}`} className="rounded-xl border border-[#dce8e3] bg-[#fbfdfb] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-extrabold text-ink">
                  {index + 1}. {step.description}
                </p>
                <p className="m-0 mt-1 font-mono text-xs font-semibold text-[#60716a]">{step.tool}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${step.write ? "bg-[#fff4ed] text-[#7b3b21]" : "bg-[#edf5f2] text-[#234e46]"}`}>
                {step.write ? "Approval required" : "Read only"}
              </span>
            </div>
            <pre className="mt-3 overflow-auto rounded-lg bg-white p-3 text-xs font-semibold leading-5 text-[#2f3f39]">
              {JSON.stringify(step.params, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResultsPanel({ results }: { results: StepResult[] }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <TerminalSquare size={18} className="text-moss" />
        <h3 className="m-0 text-base font-extrabold text-ink">Execution results</h3>
      </div>
      <div className="grid gap-3">
        {results.map((result) => (
          <CommandResultCard key={`${result.tool}-${result.step_index}`} result={result} />
        ))}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-3">
      <span className="text-sm font-bold text-[#60716a]">{label}</span>
      <span className="text-sm font-extrabold text-ink">{value}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: SessionState["status"] }) {
  if (status === "failed") {
    return (
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff1ef] text-[#87352b]">
        <CircleAlert size={21} />
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf5f2] text-[#234e46]">
        <Check size={21} />
      </span>
    );
  }
  return (
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2f7f5] text-[#234e46]">
      <Clock3 size={21} />
    </span>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
