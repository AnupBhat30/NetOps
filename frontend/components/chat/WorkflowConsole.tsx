"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileDiff,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { CommandResultCard } from "@/components/chat/CommandResultCard";
import {
  approveSession,
  getSession,
  rejectSession,
  startChatSession,
  type ActionStep,
  type SessionState,
  type SessionStatus,
  type StepResult,
} from "@/lib/api";

type WorkflowEvent = {
  id: string;
  kind: "user" | "intent" | "planner" | "approval" | "approved" | "execution" | "validation" | "summary" | "system";
  title: string;
  status: "pending" | "running" | "paused" | "done" | "failed";
  body?: ReactNode;
  result?: StepResult;
};

const examples = [
  "Show the current IP routing table.",
  "Check interface status and summarize any down interfaces.",
  "Configure OSPF area 0 for 10.99.99.0/24.",
];

export function WorkflowConsole({
  initialSession = null,
  onExit,
}: {
  initialSession?: SessionState | null;
  onExit?: () => void;
}) {
  const [intent, setIntent] = useState("");
  const [lastIntent, setLastIntent] = useState(initialSession?.intent ?? "");
  const [session, setSession] = useState<SessionState | null>(initialSession);
  const [status, setStatus] = useState<SessionStatus | "idle" | "loading" | "error">(initialSession?.status ?? "idle");
  const [visibleCount, setVisibleCount] = useState(1);
  const feedRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "loading" || status === "planning" || status === "executing" || status === "validating";
  const events = useMemo(() => buildEvents(session, lastIntent, status), [session, lastIntent, status]);
  const visibleEvents = events.slice(0, visibleCount);
  const progress = session ? workflowProgress(session, visibleCount, events.length) : 0;
  const risk = session ? riskLevel(session.plan) : "Not assessed";

  useEffect(() => {
    setSession(initialSession);
    setLastIntent(initialSession?.intent ?? "");
    setStatus(initialSession?.status ?? "idle");
    setVisibleCount(1);
  }, [initialSession?.session_id]);

  useEffect(() => {
    if (visibleCount >= events.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + 1, events.length));
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [events.length, visibleCount]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, events.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = intent.trim();
    if (!trimmed || isBusy) {
      return;
    }

    setIntent("");
    setLastIntent(trimmed);
    setSession(null);
    setStatus("loading");
    setVisibleCount(1);

    try {
      const created = await startChatSession(trimmed);
      const loaded = await getSession(created.session_id);
      setSession(loaded);
      setStatus(loaded.status);
    } catch (_error) {
      setStatus("error");
    }
  }

  async function approve() {
    if (!session) {
      return;
    }

    setStatus("executing");
    setSession((current) => (current ? { ...current, status: "executing" } : current));
    try {
      const updated = await approveSession(session.session_id);
      setSession(updated);
      setStatus(updated.status);
    } catch (_error) {
      setStatus("error");
    }
  }

  async function reject() {
    if (!session) {
      return;
    }

    setStatus("loading");
    try {
      const updated = await rejectSession(session.session_id);
      setSession(updated);
      setStatus(updated.status);
    } catch (_error) {
      setStatus("error");
    }
  }

  function reset() {
    setIntent("");
    setLastIntent("");
    setSession(null);
    setStatus("idle");
    setVisibleCount(1);
    onExit?.();
  }

  return (
    <section className="min-h-screen bg-[#f7faf8] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[minmax(260px,25vw)_1fr]">
        <aside className="border-b border-line bg-white/92 px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center gap-3">
              <NetOpsMark />
              <div>
                <p className="m-0 text-sm font-extrabold">NetOps Agent</p>
              </div>
            </div>

            <div className="grid gap-4">
              <SidebarSection title="Current Workflow Status">
                <StatusPill status={session?.status ?? status} />
              </SidebarSection>

              <SidebarSection title="Progress">
                <div className="h-2 overflow-hidden rounded-full bg-[#e9f0ec]">
                  <div className="h-full rounded-full bg-[#234e46] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="m-0 mt-2 text-xs font-bold text-[#60716a]">{progress}% complete</p>
              </SidebarSection>

              <div className="grid gap-2 text-sm">
                <CompactRow label="Current State" value={formatStatus(session?.status ?? status)} />
                <CompactRow label="Risk Level" value={risk} tone={risk === "Low" ? "green" : risk === "Medium" ? "yellow" : undefined} />
                <CompactRow label="Rollback Status" value={session?.device_snapshot_before ? "Available" : session?.plan.some((step) => step.write) ? "Pending" : "Not required"} />
                <CompactRow label="Connected Target" value="IOS XE Cat8000" />
                <CompactRow label="Session ID" value={session?.session_id.slice(0, 8) ?? "None"} mono />
                <CompactRow label="Total Steps" value={String(session?.plan.length ?? 0)} />
              </div>
            </div>

            <button
              className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-extrabold text-ink transition hover:-translate-y-0.5"
              type="button"
              onClick={reset}
            >
              <RotateCcw size={15} />
              New session
            </button>
          </div>
        </aside>

        <main className="flex h-screen min-h-[720px] flex-col">
          <header className="border-b border-line bg-white/82 px-5 py-4 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="m-0 text-xl font-extrabold tracking-normal">Live Agent Run</h1>
                <p className="m-0 mt-1 text-sm font-semibold text-[#60716a]">Watch planning, approval, execution, and validation appear as events.</p>
              </div>
              {session ? (
                <span className="rounded-full border border-[#d6e3dd] bg-white px-3 py-1.5 text-xs font-extrabold text-[#234e46]">
                  {session.results.length} tool call{session.results.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </header>

          <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto grid max-w-5xl gap-4">
              {visibleEvents.map((event, index) => (
                <WorkflowEventItem
                  key={event.id}
                  event={event}
                  isLatest={index === visibleEvents.length - 1 && visibleCount < events.length}
                  canAct={session?.status === "awaiting_approval" && event.kind === "approval" && index === visibleEvents.length - 1}
                  onApprove={approve}
                  onReject={reject}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-line bg-white px-5 py-4">
            <form className="mx-auto flex max-w-5xl items-end gap-3 rounded-xl border border-[#cddbd6] bg-[#fbfdfb] p-2 shadow-[0_10px_30px_rgba(24,32,29,0.06)]" onSubmit={submit}>
              <textarea
                aria-label="Network request"
                className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[15px] font-semibold leading-6 text-ink outline-none placeholder:text-[#55645e]"
                placeholder="Ask the network agent for a show command or approved config change..."
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-[#17211f] text-white transition hover:-translate-y-0.5 hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={!intent.trim() || isBusy}
                aria-label="Send request"
              >
                {isBusy ? <Loader2 className="animate-spin" size={20} /> : <ArrowUp size={21} strokeWidth={2.8} />}
              </button>
            </form>
            {!session && !lastIntent ? (
              <div className="mx-auto mt-3 flex max-w-5xl flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    className="rounded-full border border-[#d5e2dd] bg-white px-3 py-1.5 text-xs font-bold text-[#365149] transition hover:-translate-y-0.5"
                    type="button"
                    onClick={() => setIntent(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </section>
  );
}

function WorkflowEventItem({
  event,
  isLatest,
  canAct,
  onApprove,
  onReject,
}: {
  event: WorkflowEvent;
  isLatest: boolean;
  canAct: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isUser = event.kind === "user";

  return (
    <article className={`workflow-event flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? <EventIcon status={event.status} kind={event.kind} active={isLatest} /> : null}
      <div className={`${isUser ? "max-w-[760px] bg-[#17211f] text-white" : "max-w-[860px] border border-[#dce8e3] bg-white text-ink"} rounded-2xl px-4 py-3 shadow-[0_12px_34px_rgba(24,32,29,0.06)]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm font-extrabold">{event.title}</p>
          {!isUser ? <EventStatus status={event.status} /> : null}
        </div>
        {event.body ? <div className="mt-3 text-sm font-semibold leading-6 text-inherit">{event.body}</div> : null}
        {event.result ? <div className="mt-3"><CommandResultCard result={event.result} compact /></div> : null}
        {canAct ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#17211f] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5" type="button" onClick={onApprove}>
              <Play size={16} />
              Approve
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#ccdcd6] bg-white px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5" type="button" onClick={onReject}>
              <X size={16} />
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function NetOpsMark() {
  return (
    <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl border border-[#dbe7e2] bg-[radial-gradient(circle_at_30%_22%,#ffffff_0,#f6faf7_34%,#dfece6_100%)] shadow-[0_12px_30px_rgba(24,32,29,0.12)]">
      <svg width="28" height="28" viewBox="0 0 28 28" role="img" aria-label="NetOps Agent mark" className="overflow-visible">
        <defs>
          <linearGradient id="netops-mark-line" x1="4" y1="24" x2="24" y2="4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#17211f" />
            <stop offset="1" stopColor="#2f6f63" />
          </linearGradient>
        </defs>
        <path d="M7 18.5C9.8 12.8 13.7 9.7 21 8" fill="none" stroke="url(#netops-mark-line)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8.5 9.5H17.8C19.1 9.5 19.9 10.9 19.2 12L14.5 19.5" fill="none" stroke="#17211f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
        <circle cx="7" cy="18.5" r="3.1" fill="#17211f" />
        <circle cx="21" cy="8" r="3.1" fill="#234e46" />
        <circle cx="8.5" cy="9.5" r="2.3" fill="#6fb7a6" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="14.5" cy="19.5" r="2.3" fill="#ffffff" stroke="#234e46" strokeWidth="1.7" />
      </svg>
    </span>
  );
}

function buildEvents(session: SessionState | null, lastIntent: string, status: SessionStatus | "idle" | "loading" | "error"): WorkflowEvent[] {
  if (!lastIntent) {
    return [
      {
        id: "welcome",
        kind: "system",
        title: "Agent ready",
        status: "done",
        body: "Send a network request. The workflow will reveal intent parsing, planning, approval gates, execution, and validation as separate events.",
      },
    ];
  }

  const events: WorkflowEvent[] = [
    {
      id: "request",
      kind: "user",
      title: "User Request",
      status: "done",
      body: lastIntent,
    },
    {
      id: "intent",
      kind: "intent",
      title: "Intent Parser",
      status: session ? "done" : status === "error" ? "failed" : "running",
      body: <IntentBody intent={lastIntent} plan={session?.plan ?? []} />,
    },
  ];

  if (!session) {
    events.push({
      id: "planning",
      kind: "planner",
      title: status === "error" ? "Backend unavailable" : "Planning Started",
      status: status === "error" ? "failed" : "running",
      body: status === "error" ? "The API request failed. Confirm the backend is running on port 8000." : "Building a typed execution plan from the request...",
    });
    return events;
  }

  events.push({
    id: "planner",
    kind: "planner",
    title: "Plan Generated",
    status: "done",
    body: <PlanBody plan={session.plan} />,
  });

  if (session.status === "awaiting_approval") {
    events.push({
      id: "approval",
      kind: "approval",
      title: "Approval Gate",
      status: "paused",
      body: <ApprovalBody session={session} />,
    });
    return events;
  }

  if (session.status === "rejected") {
    events.push({
      id: "rejected",
      kind: "system",
      title: "Plan Rejected",
      status: "failed",
      body: "No device operations were executed.",
    });
    return events;
  }

  if (session.results.length) {
    events.push({
      id: "approved",
      kind: "approved",
      title: "Approved",
      status: "done",
      body: "Execution released. Tool calls are now running against the connected network target.",
    });
  } else if (session.status === "executing" || status === "executing") {
    events.push({
      id: "approved",
      kind: "approved",
      title: "Approved",
      status: "done",
      body: "Execution released. Tool calls are now running against the connected network target.",
    });
    events.push({
      id: "execution-starting",
      kind: "execution",
      title: "Execution Starting",
      status: "running",
      body: "Opening the device session and preparing the approved tool calls...",
    });
    return events;
  }

  for (const result of session.results) {
    const step = session.plan[result.step_index];
    const advisory = result.tool === "answer_question";
    events.push({
      id: `execution-${result.step_index}`,
      kind: "execution",
      title: advisory ? "Answer Prepared" : `Executing Step ${result.step_index + 1} of ${Math.max(session.plan.length, session.results.length)}`,
      status: result.ok ? "done" : "failed",
      body: advisory ? "Generated an advisory response using the configured LLM and project context." : <StepBody step={step} />,
      result,
    });
  }

  if (session.results.length) {
    const advisory = session.results.every((result) => result.tool === "answer_question");
    events.push({
      id: "validation",
      kind: "validation",
      title: advisory ? "Response Complete" : session.validation_result === "success" ? "Validation Passed" : "Validation Review",
      status: session.status === "failed" ? "failed" : "done",
      body: advisory
        ? "No device command was required for this question."
        : session.validation_result === "success"
          ? "The backend validator marked the session successful based on tool results."
          : "Review the command evidence before closing the session.",
    });
  }

  if (session.status === "done" || session.status === "failed") {
    events.push({
      id: "summary",
      kind: "summary",
      title: "Session Complete",
      status: session.status === "done" ? "done" : "failed",
      body: <SummaryBody session={session} />,
    });
  }

  return events;
}

function IntentBody({ intent, plan }: { intent: string; plan: ActionStep[] }) {
  const write = plan.some((step) => step.write) || /\b(add|change|configure|create|remove|set|update)\b/i.test(intent);
  const read = /\b(show|check|get|display|summarize)\b/i.test(intent);
  const detected = [write ? "Configuration write required" : null, read ? "Read-only device inspection" : null, intent.toLowerCase().includes("ospf") ? "OSPF workflow" : null].filter(Boolean);

  return (
    <div className="grid gap-2">
      <p className="m-0 text-[#60716a]">Understanding request...</p>
      {detected.length ? (
        <ul className="m-0 grid gap-1 pl-5">
          {detected.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function PlanBody({ plan }: { plan: ActionStep[] }) {
  return (
    <div className="grid gap-2">
      {plan.map((step, index) => (
        <details key={`${step.tool}-${index}`} className="group rounded-lg border border-[#dce8e3] bg-[#fbfdfb] px-3 py-2" open={index === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="font-extrabold">Step {index + 1}</span>
              <span className="ml-2 text-[#52615a]">{step.description}</span>
            </span>
            <ChevronDown className="transition group-open:rotate-180" size={15} />
          </summary>
          <div className="mt-2 rounded-md bg-white p-2 font-mono text-xs text-[#2f3f39]">{JSON.stringify(step.params, null, 2)}</div>
        </details>
      ))}
    </div>
  );
}

function ApprovalBody({ session }: { session: SessionState }) {
  const commandCount = session.plan.length;

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-[#ead9ad] bg-[#fffaf0] p-4">
        <div className="flex items-center gap-2 text-[#7b4f10]">
          <Pause size={17} />
          <p className="m-0 text-sm font-extrabold">Configuration Change Detected</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CompactRow label="Connected Target" value="Cat8000" />
          <CompactRow label="Risk" value={riskLevel(session.plan)} tone="yellow" />
          <CompactRow label="Estimated Commands" value={String(commandCount)} />
          <CompactRow label="Rollback Snapshot" value="Ready before execution" />
        </div>
      </div>
      <p className="m-0 text-xs font-bold text-[#60716a]">Nothing executes until you approve this plan.</p>
    </div>
  );
}

function StepBody({ step }: { step?: ActionStep }) {
  if (!step) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <p className="m-0 text-[#52615a]">{step.description}</p>
      <details className="group rounded-lg border border-[#dce8e3] bg-[#fbfdfb] px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
          <span className="inline-flex items-center gap-2"><TerminalSquare size={15} /> View Command</span>
          <ChevronDown className="transition group-open:rotate-180" size={15} />
        </summary>
        <pre className="mt-2 overflow-auto rounded-md bg-[#101816] p-3 font-mono text-xs leading-5 text-[#d7e6df]">{JSON.stringify(step.params, null, 2)}</pre>
      </details>
    </div>
  );
}

function SummaryBody({ session }: { session: SessionState }) {
  const passed = session.results.filter((result) => result.ok).length;
  const changed = session.plan.some((step) => step.write);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <CompactRow label="Commands Executed" value={String(session.results.length)} />
        <CompactRow label="Validation Checks" value={`${passed} passed`} tone={passed === session.results.length ? "green" : undefined} />
        <CompactRow label="Configuration Changed" value={changed ? "Yes" : "No"} />
        <CompactRow label="Rollback Snapshot" value={session.device_snapshot_before ? "Available" : changed ? "Pending" : "Not required"} />
        <CompactRow label="Connected Target" value="Cisco IOS XE Cat8000" />
        <CompactRow label="Final Status" value={formatStatus(session.status)} tone={session.status === "done" ? "green" : undefined} />
      </div>
      <details className="group rounded-lg border border-[#dce8e3] bg-[#fbfdfb] px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
          <span className="inline-flex items-center gap-2"><FileDiff size={15} /> Expand evidence index</span>
          <ChevronDown className="transition group-open:rotate-180" size={15} />
        </summary>
        <ul className="m-0 mt-2 grid gap-1 pl-5 text-sm text-[#52615a]">
          {session.results.map((result) => <li key={`${result.tool}-${result.step_index}`}>{commandFromResult(result) || result.tool}</li>)}
        </ul>
      </details>
    </div>
  );
}

function EventIcon({ status, kind, active }: { status: WorkflowEvent["status"]; kind: WorkflowEvent["kind"]; active: boolean }) {
  const className = `mt-1 grid h-9 w-9 flex-none place-items-center rounded-full border ${statusClasses(status)} ${active ? "agent-pulse" : ""}`;
  const icon = status === "running" ? <Loader2 className="animate-spin" size={16} /> : status === "paused" ? <Pause size={16} /> : status === "failed" ? <X size={16} /> : kind === "validation" ? <ShieldCheck size={16} /> : <Check size={16} />;
  return <span className={className}>{icon}</span>;
}

function EventStatus({ status }: { status: WorkflowEvent["status"] }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusClasses(status)}`}>
      {formatStatus(status)}
    </span>
  );
}

function StatusPill({ status }: { status: SessionStatus | "idle" | "loading" | "error" }) {
  const normalized = status === "loading" ? "running" : status === "awaiting_approval" ? "paused" : status === "failed" || status === "error" ? "failed" : status === "done" ? "done" : "pending";
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${statusClasses(normalized)}`}>
      {normalized === "running" ? <Loader2 className="animate-spin" size={13} /> : normalized === "paused" ? <Pause size={13} /> : normalized === "failed" ? <CircleAlert size={13} /> : <Clock3 size={13} />}
      {formatStatus(status)}
    </span>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60716a]">{title}</p>
      {children}
    </section>
  );
}

function CompactRow({ label, value, tone, mono = false }: { label: string; value: string; tone?: "green" | "yellow"; mono?: boolean }) {
  const toneClass = tone === "green" ? "text-[#234e46]" : tone === "yellow" ? "text-[#7b4f10]" : "text-ink";
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-[#edf3f0] py-1.5 last:border-b-0">
      <span className="text-xs font-bold text-[#60716a]">{label}</span>
      <span className={`min-w-0 truncate text-right text-xs font-extrabold ${toneClass} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function workflowProgress(session: SessionState, visibleCount: number, eventCount: number) {
  if (session.status === "done") {
    return Math.min(100, Math.round((visibleCount / eventCount) * 100));
  }
  if (session.status === "awaiting_approval") {
    return Math.min(65, Math.round((visibleCount / eventCount) * 65));
  }
  if (session.status === "failed") {
    return Math.min(100, Math.round((visibleCount / eventCount) * 100));
  }
  return Math.min(90, Math.round((visibleCount / Math.max(eventCount, 1)) * 90));
}

function riskLevel(plan: ActionStep[]) {
  if (!plan.length) {
    return "Not assessed";
  }
  if (plan.some((step) => step.write)) {
    return "Medium";
  }
  return "Low";
}

function statusClasses(status: WorkflowEvent["status"] | "pending") {
  if (status === "done") {
    return "border-[#cfe3da] bg-[#edf5f2] text-[#234e46]";
  }
  if (status === "failed") {
    return "border-[#f0c9c3] bg-[#fff1ef] text-[#87352b]";
  }
  if (status === "paused") {
    return "border-[#ead9ad] bg-[#fff8e7] text-[#7b4f10]";
  }
  if (status === "running") {
    return "border-[#c9d9f2] bg-[#eef5ff] text-[#244a7f]";
  }
  return "border-[#dce8e3] bg-[#f7fbf9] text-[#60716a]";
}

function commandFromResult(result: StepResult) {
  const data = result.output.data;
  if (data && typeof data === "object" && !Array.isArray(data) && "command" in data) {
    return typeof data.command === "string" ? data.command : "";
  }
  return "";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
