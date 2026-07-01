import { Activity, GitBranch, ShieldCheck, TerminalSquare } from "lucide-react";

const cards = [
  {
    label: "Intent to Plan",
    title: "Converts requests into tool calls",
    copy: "The planner takes a natural-language change request and produces typed actions with parameters, descriptions, and verification steps.",
    chip: "bg-[#e8f1ee] text-[#234e46]",
    Icon: GitBranch
  },
  {
    label: "Approval Gate",
    title: "Blocks writes until reviewed",
    copy: "Configuration-changing steps pause before execution. The operator can approve, reject, or cancel without sending commands to the device.",
    chip: "bg-[#edf2ef] text-[#33403b]",
    Icon: ShieldCheck
  },
  {
    label: "Network Execution",
    title: "Runs approved device operations",
    copy: "The executor dispatches to Netmiko for CLI workflows and RESTCONF for model-driven reads, returning structured results for each step.",
    chip: "bg-[#e8f1ee] text-[#234e46]",
    Icon: TerminalSquare
  },
  {
    label: "Validation",
    title: "Checks evidence after changes",
    copy: "The validator reads command output and device state, marks the session successful or failed, and keeps rollback status visible.",
    chip: "bg-[#edf2ef] text-[#33403b]",
    Icon: Activity
  }
];

export function SystemCapabilityCards() {
  return (
    <section className="border-t border-line/80 bg-[#fbfdfb] py-14 sm:py-16 lg:py-20">
      <div className="container-shell">
        <div className="mb-8 grid grid-cols-[1fr_auto] items-end gap-6 max-lg:grid-cols-1">
          <h2 className="m-0 max-w-[760px] text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[1.02] tracking-normal text-ink">
            What the system actually does.
          </h2>
          <p className="m-0 max-w-[500px] text-base font-medium leading-7 text-[#52615a]">
            It turns a network request into a controlled agent workflow: plan the change, require
            approval, execute device operations, then validate the result.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3.5 max-xl:grid-cols-2 max-md:grid-cols-1">
          {cards.map((card) => (
            <article
              key={card.title}
              className="premium-card premium-card-hover grid min-h-[252px] grid-rows-[auto_auto_1fr] rounded-[var(--radius-md)] p-5"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-black ${card.chip}`}>
                  {card.label}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-[#f6faf7] text-moss">
                  <card.Icon size={20} strokeWidth={2.4} />
                </span>
              </div>
              <h3 className="m-0 text-[22px] font-extrabold leading-7 text-ink">{card.title}</h3>
              <p className="mt-4 font-medium leading-7 text-[#5e6c66]">{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
