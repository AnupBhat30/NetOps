import { Activity, Check, GitBranch, LockKeyhole, Route, Server, ShieldCheck, TerminalSquare } from "lucide-react";

const workflowEvents = [
  { label: "Intent parsed", detail: "Loopback + OSPF change detected", status: "done" },
  { label: "Plan generated", detail: "2 config steps, 2 validation checks", status: "done" },
  { label: "Approval gate", detail: "Operator review required", status: "pause" },
  { label: "Execution ready", detail: "Netmiko CLI session prepared", status: "pending" },
];

const commandPreview = [
  "interface Loopback99",
  " ip address 10.99.99.1 255.255.255.255",
  "router ospf 1",
  " network 10.99.99.1 0.0.0.0 area 0",
];

const targetStats = [
  { label: "Provider", value: "Netmiko SSH" },
  { label: "Platform", value: "IOS XE" },
  { label: "Scope", value: "Single device" },
  { label: "Risk", value: "Low" },
];

const validationChecks = [
  "show ip interface brief",
  "show running-config interface Loopback99",
  "show ip route",
];

export function DeviceStatePanel() {
  return (
    <section className="border-t border-line/80 bg-white py-14 sm:py-16 lg:py-20">
      <div className="container-shell">
        <div className="mb-8 grid items-end gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
          <div>
            <p className="m-0 mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#60716a]">Project Preview</p>
            <h2 className="m-0 max-w-[760px] text-[clamp(32px,3.8vw,56px)] font-extrabold leading-[1.02] tracking-normal text-ink">
              A network workflow that feels alive.
            </h2>
          </div>
          <p className="m-0 max-w-[560px] text-base font-medium leading-7 text-[#52615a]">
            The product stays vendor-neutral, while the current demo connects to one IOS XE target
            and proves the loop from intent to evidence.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">
          <section className="overflow-hidden rounded-[28px] border border-[#d9e5df] bg-[#f8fbf9] p-2 shadow-[0_28px_90px_rgba(23,33,31,0.14)]">
            <div className="overflow-hidden rounded-[22px] border border-[#e2ebe6] bg-white">
              <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#e7efeb] bg-[#fbfdfb] px-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef6a5f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f3bf4f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#61c27c]" />
                </div>
                <span className="rounded-full border border-[#d7e4de] bg-white px-3 py-1 text-xs font-extrabold text-[#234e46]">
                  NetOps Agent / live run
                </span>
              </div>

              <div className="grid min-h-[500px] lg:grid-cols-[190px_1fr]">
                <aside className="border-b border-[#e7efeb] bg-[#f4f8f6] p-4 lg:border-b-0 lg:border-r">
                  <div className="grid gap-4">
                    <MiniStatus label="State" value="Waiting approval" Icon={LockKeyhole} />
                    <MiniStatus label="Progress" value="62%" Icon={Activity} />
                    <MiniStatus label="Rollback" value="Snapshot ready" Icon={ShieldCheck} />
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dde8e2]">
                    <div className="h-full w-[62%] rounded-full bg-[#234e46]" />
                  </div>
                </aside>

                <main className="p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60716a]">Workflow Replay</p>
                      <h3 className="m-0 mt-1 text-2xl font-extrabold tracking-normal text-ink">Configure Loopback99</h3>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8e7] px-3 py-1.5 text-xs font-extrabold text-[#7b4f10]">
                      <span className="h-2 w-2 rounded-full bg-[#d89019]" />
                      Paused
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {workflowEvents.map((event, index) => (
                      <WorkflowRow key={event.label} event={event} index={index} />
                    ))}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce8e3] bg-[#101816]">
                    <div className="flex min-h-11 items-center justify-between border-b border-white/10 px-4">
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#9fb5ad]">
                        <TerminalSquare size={15} />
                        Proposed CLI
                      </span>
                      <span className="text-xs font-bold text-[#6fb7a6]">4 commands</span>
                    </div>
                    <pre className="m-0 overflow-auto p-4 font-mono text-sm font-semibold leading-7 text-[#e8f4ef]">
                      <code>{commandPreview.join("\n")}</code>
                    </pre>
                  </div>
                </main>
              </div>
            </div>
          </section>

          <aside className="overflow-hidden rounded-[28px] border border-[#d9e5df] bg-[#f8fbf9] p-2 shadow-[0_28px_90px_rgba(23,33,31,0.12)]">
            <div className="grid h-full overflow-hidden rounded-[22px] border border-[#e2ebe6] bg-white">
              <div className="border-b border-[#e7efeb] bg-[#fbfdfb] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[#60716a]">Connected Target</p>
                    <h3 className="m-0 mt-2 text-2xl font-extrabold tracking-normal text-ink">Cat8000 Sandbox</h3>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#17211f] text-white">
                    <Server size={20} />
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {targetStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-[#dce8e3] bg-[#fbfdfb] p-4">
                      <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60716a]">{stat.label}</p>
                      <p className="m-0 mt-2 text-sm font-extrabold text-ink">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#dce8e3] bg-[#fbfdfb] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold text-ink">
                      <Route size={17} className="text-[#234e46]" />
                      Validation Evidence
                    </span>
                    <span className="rounded-full bg-[#edf5f2] px-2.5 py-1 text-xs font-extrabold text-[#234e46]">Ready</span>
                  </div>
                  <div className="grid gap-2">
                    {validationChecks.map((check) => (
                      <div key={check} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5">
                        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#edf5f2] text-[#234e46]">
                          <Check size={14} />
                        </span>
                        <span className="min-w-0 truncate font-mono text-xs font-bold text-[#2f3f39]">{check}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#dce8e3] bg-[#17211f] p-4 text-white">
                  <div className="mb-4 flex items-center gap-2">
                    <GitBranch size={17} className="text-[#6fb7a6]" />
                    <p className="m-0 text-sm font-extrabold">Run posture</p>
                  </div>
                  <div className="grid gap-3">
                    <PostureRow label="Approval" value="Required before writes" />
                    <PostureRow label="Snapshot" value="Captured pre-change" />
                    <PostureRow label="Rollback" value="Available if validation fails" />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MiniStatus({ label, value, Icon }: { label: string; value: string; Icon: typeof Activity }) {
  return (
    <div className="grid gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#dce8e3] bg-white text-[#234e46]">
        <Icon size={17} />
      </span>
      <div>
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#60716a]">{label}</p>
        <p className="m-0 mt-1 text-sm font-extrabold text-ink">{value}</p>
      </div>
    </div>
  );
}

function WorkflowRow({ event, index }: { event: (typeof workflowEvents)[number]; index: number }) {
  const statusClass =
    event.status === "done"
      ? "bg-[#edf5f2] text-[#234e46]"
      : event.status === "pause"
        ? "bg-[#fff8e7] text-[#7b4f10]"
        : "bg-[#f0f4f2] text-[#60716a]";

  return (
    <div className="grid grid-cols-[32px_1fr] gap-3 rounded-2xl border border-[#dce8e3] bg-[#fbfdfb] p-3">
      <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${statusClass}`}>
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-sm font-extrabold text-ink">{event.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${statusClass}`}>
            {event.status === "pause" ? "paused" : event.status}
          </span>
        </div>
        <p className="m-0 mt-1 text-sm font-semibold text-[#60716a]">{event.detail}</p>
      </div>
    </div>
  );
}

function PostureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold text-[#a9bbb4]">{label}</span>
      <span className="text-right text-xs font-extrabold text-white">{value}</span>
    </div>
  );
}
