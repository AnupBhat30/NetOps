const steps = [
  ["01", "Parse", "Accepts a request and creates a session with normalized intent."],
  ["02", "Plan", "Builds typed network tool calls with parameters and verification steps."],
  ["03", "Review", "Pauses write operations until the operator approves the plan."],
  ["04", "Execute", "Runs approved Netmiko or RESTCONF operations against IOS XE."],
  ["05", "Validate", "Checks command output and device state before closing the session."]
];

export function AgentTimeline() {
  return (
    <section className="relative px-0 pb-14 pt-10 sm:pb-16 sm:pt-12 lg:pb-20" id="system-view">
      <div className="container-shell">
        <div className="mb-6 grid grid-cols-[1fr_auto] items-end gap-6 max-lg:grid-cols-1 sm:mb-8">
          <h2 className="m-0 max-w-[720px] text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[1.02] tracking-normal text-ink">
            Agent execution flow.
          </h2>
          <p className="m-0 max-w-[500px] text-base font-medium leading-7 text-[#52615a]">
            The backend treats each request as a stateful workflow. Configuration writes are
            separated from planning and cannot run until the review state is approved.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-1" aria-label="Agent pipeline">
          {steps.map(([number, title, copy], index) => (
            <article
              key={title}
              className="premium-card premium-card-hover relative grid min-h-[184px] grid-rows-[auto_auto_1fr] overflow-hidden rounded-[var(--radius-md)] p-5"
              style={{ animationDelay: `${index * 65}ms` }}
            >
              <strong className="mb-7 block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#74827c]">{number}</strong>
              <h3 className="mb-2.5 text-xl font-extrabold tracking-normal text-ink">{title}</h3>
              <p className="m-0 text-sm font-medium leading-6 text-[#5e6c66]">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
