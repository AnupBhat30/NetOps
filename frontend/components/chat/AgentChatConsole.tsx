"use client";

import { ArrowUp, Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { CommandResultCard } from "@/components/chat/CommandResultCard";
import {
  approveSession,
  getSession,
  rejectSession,
  startChatSession,
  type ActionStep,
  type SessionState,
  type SessionStatus,
  type StepResult
} from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  title?: string;
  content: string;
  session?: SessionState;
};

const examples = [
  "Configure OSPF area 0 for 10.99.99.0/24",
  "Show version",
  "Add a static route to 10.10.10.0/24 via 10.0.0.1"
];

export function AgentChatConsole() {
  const [intent, setIntent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      title: "Ready",
      content: "Ask for an IOS XE change or show command. I will create a plan first and stop for approval before write operations."
    }
  ]);
  const [activeSession, setActiveSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<SessionStatus | "idle" | "loading" | "error">("idle");

  const isBusy = status === "loading" || status === "planning" || status === "executing" || status === "validating";
  const statusLabel = useMemo(() => formatStatus(status), [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = intent.trim();
    if (!trimmed || isBusy) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };
    setMessages((current) => [...current, userMessage]);
    setIntent("");
    setStatus("loading");

    try {
      const created = await startChatSession(trimmed);
      const session = await getSession(created.session_id);
      setActiveSession(session);
      setStatus(session.status);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          title: responseTitle(session),
          content: responseSummary(session),
          session
        }
      ]);
    } catch (error) {
      setStatus("error");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          title: "Backend unavailable",
          content: error instanceof Error ? error.message : "Unable to reach the backend API."
        }
      ]);
    }
  }

  async function handleApprove(sessionId: string) {
    setStatus("executing");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "system",
        title: "Approved",
        content: "Execution started. The backend will run the approved plan through the tool registry."
      }
    ]);

    try {
      const session = await approveSession(sessionId);
      setActiveSession(session);
      setStatus(session.status);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          title: responseTitle(session),
          content: responseSummary(session),
          session
        }
      ]);
    } catch (error) {
      setStatus("error");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          title: "Approval failed",
          content: error instanceof Error ? error.message : "Unable to approve the session."
        }
      ]);
    }
  }

  async function handleReject(sessionId: string) {
    setStatus("loading");
    try {
      const session = await rejectSession(sessionId);
      setActiveSession(session);
      setStatus(session.status);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          title: "Rejected",
          content: "The plan was rejected. No device operations were executed.",
          session
        }
      ]);
    } catch (error) {
      setStatus("error");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          title: "Reject failed",
          content: error instanceof Error ? error.message : "Unable to reject the session."
        }
      ]);
    }
  }

  return (
    <section className="premium-card flex h-[620px] max-h-[72vh] min-h-[540px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_28px_80px_rgba(23,33,31,0.14)]">
      <header className="flex items-center justify-between gap-4 border-b border-[#dbe7e2] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#17211f] text-white">
              <Sparkles size={16} />
            </span>
            <p className="m-0 text-sm font-extrabold text-ink">Network agent</p>
          </div>
          <p className="m-0 mt-1 text-xs font-semibold text-[#52615a]">Plan, approve, execute, validate</p>
        </div>
        <span className="rounded-full border border-[#cddbd6] bg-[#f2f7f5] px-3 py-1 text-xs font-extrabold text-[#234e46]">
          {statusLabel}
        </span>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            activeSessionId={activeSession?.session_id ?? null}
            isBusy={isBusy}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>

      <div className="border-t border-[#dbe7e2] bg-[#fbfdfb] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              className="rounded-full border border-[#d5e2dd] bg-white px-3 py-1.5 text-left text-xs font-bold text-[#365149] transition hover:-translate-y-0.5 hover:border-[#9dbcb3]"
              type="button"
              onClick={() => setIntent(example)}
            >
              {example}
            </button>
          ))}
        </div>
        <form className="flex items-end gap-3 rounded-2xl border border-[#ccdcd6] bg-white p-2 shadow-[0_12px_34px_rgba(24,32,29,0.06)]" onSubmit={handleSubmit}>
          <textarea
            aria-label="Network request"
            className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[15px] font-semibold leading-6 text-ink outline-none placeholder:text-[#55645e]"
            placeholder="Message the network agent..."
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
            className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[#17211f] text-white transition hover:-translate-y-0.5 hover:bg-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!intent.trim() || isBusy}
            aria-label="Send request"
          >
            {isBusy ? <Loader2 className="animate-spin" size={20} /> : <ArrowUp size={21} strokeWidth={2.8} />}
          </button>
        </form>
      </div>
    </section>
  );
}

function MessageBubble({
  message,
  activeSessionId,
  isBusy,
  onApprove,
  onReject
}: {
  message: ChatMessage;
  activeSessionId: string | null;
  isBusy: boolean;
  onApprove: (sessionId: string) => void;
  onReject: (sessionId: string) => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const session = message.session;
  const canApprove = session?.status === "awaiting_approval" && session.session_id === activeSessionId && !isBusy;

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[#17211f] text-white"
            : isSystem
              ? "border border-[#ead5cf] bg-[#fff7f4] text-[#552f25]"
              : "border border-[#dbe7e2] bg-[#f7fbf9] text-ink"
        }`}
      >
        {message.title ? <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.08em] opacity-75">{message.title}</p> : null}
        <p className="m-0 whitespace-pre-wrap text-sm font-semibold leading-6">{message.content}</p>

        {session?.plan.length ? <PlanList plan={session.plan} /> : null}
        {session?.results.length ? <ResultList results={session.results} /> : null}

        {canApprove ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#17211f] px-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5"
              type="button"
              onClick={() => onApprove(session.session_id)}
            >
              <Check size={16} />
              Approve and run
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#ccdcd6] bg-white px-3 text-sm font-extrabold text-ink transition hover:-translate-y-0.5"
              type="button"
              onClick={() => onReject(session.session_id)}
            >
              <X size={16} />
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PlanList({ plan }: { plan: ActionStep[] }) {
  return (
    <div className="mt-4 space-y-2">
      {plan.map((step, index) => (
        <div key={`${step.tool}-${index}`} className="rounded-xl border border-[#dbe7e2] bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-extrabold text-ink">
                {index + 1}. {step.description}
              </p>
              <p className="m-0 mt-1 font-mono text-xs font-semibold text-[#52615a]">{step.tool}</p>
            </div>
            {step.write ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3ed] px-2 py-1 text-xs font-extrabold text-[#7b3b21]">
                <ShieldCheck size={13} />
                Write
              </span>
            ) : (
              <span className="rounded-full bg-[#edf5f2] px-2 py-1 text-xs font-extrabold text-[#234e46]">Read</span>
            )}
          </div>
          <pre className="mt-3 overflow-auto rounded-lg bg-[#f6faf7] p-2 text-xs font-semibold leading-5 text-[#2f3f39]">
            {JSON.stringify(step.params, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ResultList({ results }: { results: StepResult[] }) {
  return (
    <div className="mt-4 space-y-2">
      {results.map((result) => (
        <CommandResultCard key={`${result.tool}-${result.step_index}`} result={result} compact />
      ))}
    </div>
  );
}

function responseTitle(session: SessionState) {
  if (session.status === "awaiting_approval") {
    return "Plan ready";
  }
  if (session.status === "done") {
    return "Execution complete";
  }
  if (session.status === "failed") {
    return "Execution failed";
  }
  if (session.status === "rejected") {
    return "Rejected";
  }
  return formatStatus(session.status);
}

function responseSummary(session: SessionState) {
  if (session.status === "awaiting_approval") {
    return "I created a plan and paused before running write operations. Review the steps below.";
  }
  if (session.status === "done") {
    return "The approved plan finished and validation passed.";
  }
  if (session.status === "failed") {
    return "The session failed. Review the step result below for the exact backend or device error.";
  }
  if (session.status === "rejected") {
    return "The plan was rejected. No device operations were executed.";
  }
  return `Session status: ${session.status}.`;
}

function formatStatus(status: SessionStatus | "idle" | "loading" | "error") {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
