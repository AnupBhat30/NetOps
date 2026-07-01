"use client";

import { Check, ChevronDown, CircleAlert, TerminalSquare } from "lucide-react";

import type { StepResult } from "@/lib/api";

type RouteRow = {
  protocol: string;
  prefix: string;
  nextHop: string;
  interfaceName: string;
};

type AnswerSection = {
  title: string;
  items: string[];
};

const protocolLabels: Record<string, string> = {
  C: "Connected",
  L: "Local",
  S: "Static",
  "S*": "Default static",
  O: "OSPF",
  IA: "OSPF inter-area",
  B: "BGP",
  D: "EIGRP",
  R: "RIP",
};

export function CommandResultCard({ result, compact = false }: { result: StepResult; compact?: boolean }) {
  const data = getRecord(result.output.data);
  const command = getString(data.command);
  const outputText = getString(data.output);
  const answer = getString(data.answer);
  const sections = getSections(data.sections);
  const routeSummary = command === "show ip route" && outputText ? parseIpRoute(outputText) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-[#dce8e3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1ece7] bg-[#fbfdfb] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${result.ok ? "bg-[#edf5f2] text-[#234e46]" : "bg-[#fff1ef] text-[#87352b]"}`}>
            {result.ok ? <Check size={17} /> : <CircleAlert size={17} />}
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate font-mono text-xs font-extrabold text-[#2f3f39]">{command || (answer ? "NetOps answer" : result.tool)}</p>
            <p className="m-0 mt-0.5 text-xs font-bold text-[#60716a]">{answer ? "Advisory response" : result.ok ? "Command completed" : "Command failed"}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${result.ok ? "bg-[#edf5f2] text-[#234e46]" : "bg-[#fff1ef] text-[#87352b]"}`}>
          {result.ok ? "OK" : "Failed"}
        </span>
      </div>

      <div className={`grid gap-4 ${compact ? "p-3" : "p-4"}`}>
        {result.error ? <p className="m-0 rounded-lg bg-[#fff7f4] p-3 text-sm font-semibold leading-6 text-[#87352b]">{result.error}</p> : null}

        {routeSummary ? <RouteSummary summary={routeSummary} compact={compact} /> : null}

        {answer ? <AnswerSummary answer={answer} sections={sections} /> : null}

        {command ? (
          <details className="group rounded-lg border border-[#dce8e3] bg-[#fbfdfb] px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold">
              <span className="inline-flex items-center gap-2">
                <TerminalSquare size={15} />
                View Command
              </span>
              <ChevronDown className="transition group-open:rotate-180" size={15} />
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-[#101816] p-3 font-mono text-xs font-semibold leading-5 text-[#d7e6df]">{command}</pre>
          </details>
        ) : null}

        {outputText ? (
          <details className="group rounded-lg border border-[#dce8e3] bg-[#fbfdfb] px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold">
              <span className="inline-flex items-center gap-2">
                <TerminalSquare size={15} />
                View Device Output
              </span>
              <ChevronDown className="transition group-open:rotate-180" size={15} />
            </summary>
            <pre className={`${compact ? "max-h-52 text-[11px]" : "max-h-[420px] text-xs"} mt-2 overflow-auto rounded-lg bg-[#101816] p-4 font-mono font-semibold leading-5 text-[#d7e6df]`}>
              {outputText}
            </pre>
          </details>
        ) : !answer ? (
          <pre className="max-h-64 overflow-auto rounded-lg bg-[#f6faf7] p-3 text-xs font-semibold leading-5 text-[#2f3f39]">
            {JSON.stringify(result.output, null, 2)}
          </pre>
        ) : null}
      </div>
    </article>
  );
}

function AnswerSummary({ answer, sections }: { answer: string; sections: AnswerSection[] }) {
  return (
    <section className="grid gap-4">
      <div className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#2f3f39]">{answer}</div>
      <div className="grid gap-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-[#dce8e3] bg-[#fbfdfb] p-3">
            <p className="m-0 text-sm font-extrabold text-ink">{section.title}</p>
            <ul className="m-0 mt-2 grid gap-1.5 pl-5 text-sm font-semibold leading-6 text-[#52615a]">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function RouteSummary({ summary, compact }: { summary: ReturnType<typeof parseIpRoute>; compact: boolean }) {
  if (!summary) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Gateway" value={summary.gateway || "Not set"} wide />
        <Metric label="Routes" value={String(summary.routes.length)} />
        <Metric label="Connected" value={String(summary.connectedCount)} />
        <Metric label="Static" value={String(summary.staticCount)} />
      </div>

      {summary.routes.length ? (
        <div className="overflow-hidden rounded-lg border border-[#dce8e3]">
          <div className="grid grid-cols-[minmax(92px,0.8fr)_minmax(130px,1fr)_minmax(120px,1fr)] bg-[#f3f8f5] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#60716a]">
            <span>Type</span>
            <span>Prefix</span>
            <span>Next hop / interface</span>
          </div>
          <div className={`${compact ? "max-h-48" : "max-h-72"} overflow-auto bg-white`}>
            {summary.routes.map((route, index) => (
              <div key={`${route.protocol}-${route.prefix}-${index}`} className="grid grid-cols-[minmax(92px,0.8fr)_minmax(130px,1fr)_minmax(120px,1fr)] gap-2 border-t border-[#edf3f0] px-3 py-2 text-sm font-semibold text-[#26352f]">
                <span>{protocolLabels[route.protocol] ?? route.protocol}</span>
                <span className="font-mono text-xs">{route.prefix}</span>
                <span className="min-w-0 truncate font-mono text-xs">{route.nextHop || route.interfaceName || "direct"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-[#dce8e3] bg-[#fbfdfb] p-3 ${wide ? "sm:col-span-1" : ""}`}>
      <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#60716a]">{label}</p>
      <p className="m-0 mt-1 truncate font-mono text-sm font-extrabold text-ink">{value}</p>
    </div>
  );
}

function parseIpRoute(output: string) {
  const gateway = output.match(/Gateway of last resort is\s+(\S+)\s+to network\s+(\S+)/);
  const routes: RouteRow[] = [];

  for (const line of output.split("\n")) {
    const match = line.match(/^\s*([A-Z][A-Z0-9* ]*?)\s+(\d+(?:\.\d+){3}\/\d+)\s+(?:\[[^\]]+\]\s+via\s+([^,\s]+)|is directly connected,\s+(.+))\s*$/);
    if (!match) {
      continue;
    }

    const protocol = match[1].trim().replace(/\s+/g, " ");
    routes.push({
      protocol,
      prefix: match[2],
      nextHop: match[3] ?? "",
      interfaceName: match[4]?.trim() ?? "",
    });
  }

  return {
    gateway: gateway ? `${gateway[1]} -> ${gateway[2]}` : "",
    routes,
    connectedCount: routes.filter((route) => route.protocol === "C").length,
    staticCount: routes.filter((route) => route.protocol.startsWith("S")).length,
  };
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getSections(value: unknown): AnswerSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = getRecord(item);
    const title = getString(record.title);
    const items = Array.isArray(record.items) ? record.items.filter((entry): entry is string => typeof entry === "string") : [];
    return title && items.length ? [{ title, items }] : [];
  });
}
