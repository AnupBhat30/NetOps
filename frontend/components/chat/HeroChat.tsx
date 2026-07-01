"use client";

import { ArrowRight, ArrowUp, CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { getSession, startChatSession, type SessionState } from "@/lib/api";

export function HeroChat({ onSessionStart }: { onSessionStart: (session: SessionState) => void }) {
  const [intent, setIntent] = useState("");
  const [status, setStatus] = useState("Plan review");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = intent.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus("Creating plan");
    try {
      const created = await startChatSession(trimmed);
      const session = await getSession(created.session_id);
      onSessionStart(session);
    } catch (_error) {
      setStatus("Backend offline");
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="relative isolate border-b border-line/80 pb-10 pt-10 sm:pt-14 lg:pb-14 lg:pt-16"
      aria-labelledby="hero-title"
    >
      <div className="container-shell grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)] xl:gap-14">
        <div className="fade-up grid gap-6">
          <div className="grid gap-5">
            <h1 id="hero-title" className="m-0 max-w-[800px] text-[clamp(56px,7vw,104px)] font-extrabold leading-[0.98] tracking-normal text-ink">
              NetOps <span className="gradient-word">Agent</span>
            </h1>

            <p className="m-0 max-w-[620px] text-[clamp(18px,1.8vw,22px)] font-medium leading-[1.5] text-[#4f5f58]">
              AI-assisted network change workflow with approval, execution, and validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#system-view"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-plum px-5 text-sm font-extrabold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#22302b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
            >
              View Workflow
              <ArrowRight size={16} />
            </a>
            <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-white/75 px-4 text-sm font-bold text-[#66746e]">
              Connected target: IOS XE Cat8000
            </span>
          </div>
        </div>

        <div className="fade-up-delay">
          <form
            className="premium-card grid min-h-[280px] grid-rows-[auto_1fr_auto] gap-5 rounded-[var(--radius-lg)] bg-white p-5 shadow-[0_28px_80px_rgba(23,33,31,0.14)] outline-none ring-0 transition focus-within:ring-2 focus-within:ring-moss/35 sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#dbe7e2] pb-4">
              <div>
                <p className="m-0 text-sm font-extrabold text-ink">Request console</p>
                <p className="m-0 mt-1 text-xs font-semibold text-[#4f5f58]">Plan first. Execute only after approval.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cddbd6] bg-[#f2f7f5] px-2.5 py-1 text-xs font-extrabold text-[#234e46]">
                <CheckCircle2 size={14} />
                {status}
              </span>
            </div>

            <textarea
              aria-label="Network configuration request"
              className="min-h-28 w-full resize-none border-0 bg-transparent text-[clamp(19px,2vw,26px)] font-semibold leading-[1.38] text-ink outline-none placeholder:text-[#3f4d47]"
              placeholder="Request a network change, show command, route update, ACL, or OSPF task"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
            />

            <div className="flex items-center justify-between gap-4 max-sm:items-end">
              <div className="flex flex-wrap gap-2" aria-label="Capabilities">
                {["Config snapshot", "RESTCONF reads", "Netmiko SSH"].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex min-h-7 items-center rounded-full border border-[#cddbd6] bg-[#f6faf7] px-2.5 text-xs font-extrabold text-[#234e46]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className="grid h-12 w-12 flex-none place-items-center rounded-full border border-[#d3e1dc] bg-[#17211f] text-white transition hover:-translate-y-0.5 hover:bg-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                aria-label="Create agent session"
                disabled={!intent.trim() || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={21} /> : <ArrowUp size={23} strokeWidth={2.8} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
