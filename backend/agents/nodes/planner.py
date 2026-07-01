from ipaddress import ip_network
import re

from backend.agents.state import AgentState
from backend.llm import generate_plan
from backend.models.schemas import ActionStep, SessionStatus


def build_llm_plan(intent: str) -> list[ActionStep]:
    return generate_plan(intent)


def build_offline_fallback_plan(intent: str) -> list[ActionStep]:
    """Return a deterministic fallback plan when the LLM planner is unavailable."""

    lower_intent = intent.lower()
    if _is_advisory_question(lower_intent):
        return [
            ActionStep(
                tool="answer_question",
                params={"question": intent, "topic": "target_capabilities"},
                description="Explain what NetOps Agent can do with the connected target.",
            )
        ]

    is_write_intent = any(word in lower_intent for word in ("add", "change", "configure", "create", "remove", "set", "update"))

    static_route_plan = _build_static_route_plan(intent)
    if static_route_plan is not None:
        return static_route_plan

    if "ospf" in lower_intent and is_write_intent:
        return [
            ActionStep(
                tool="configure_ospf",
                params={"process_id": 1, "network": "10.99.99.0", "wildcard": "0.0.0.255", "area": 0},
                description="Configure OSPF process 1 for 10.99.99.0/24 in area 0.",
                write=True,
            ),
            ActionStep(
                tool="show_command",
                params={"command": "show ip ospf interface brief"},
                description="Verify OSPF interface state after the change.",
            ),
        ]

    read_commands = [
        (("routing table", "route table", "ip route", "routes"), "show ip route", "Show the current IP routing table."),
        (("interface status", "interfaces", "down interfaces"), "show ip interface brief", "Summarize interface status."),
        (("ospf",), "show ip ospf neighbor", "Show OSPF neighbor state."),
        (("running configuration", "running-config", "running config"), "show running-config", "Show the running configuration."),
        (("hostname", "uptime", "software version", "show version", "version"), "show version", "Show device hostname, uptime, and software version."),
    ]
    for keywords, command, description in read_commands:
        if any(keyword in lower_intent for keyword in keywords):
            return [
                ActionStep(
                    tool="show_command",
                    params={"command": command},
                    description=description,
                )
            ]

    return [
        ActionStep(
            tool="show_command",
            params={"command": "show version"},
            description="Run a read-only device check while planner support is expanded.",
        )
    ]


def _is_advisory_question(lower_intent: str) -> bool:
    subject_terms = ("cat8000", "cat 8000", "target", "device", "router", "you", "netops", "agent", "project")
    advisory_phrases = (
        "what can",
        "what do",
        "what does",
        "what is",
        "what are",
        "used for",
        "use case",
        "use cases",
        "capabilities",
        "help",
        "explain",
        "tell me about",
        "why use",
        "how does",
    )
    return any(term in lower_intent for term in subject_terms) and any(phrase in lower_intent for phrase in advisory_phrases)


def _build_static_route_plan(intent: str) -> list[ActionStep] | None:
    lower_intent = intent.lower()
    if "static route" not in lower_intent and "ip route" not in lower_intent:
        return None

    route_match = re.search(r"(?P<prefix>\d{1,3}(?:\.\d{1,3}){3}/\d{1,2}).*?\b(?:via|next-hop|next hop)\s+(?P<next_hop>\d{1,3}(?:\.\d{1,3}){3})", intent, re.IGNORECASE)
    if route_match is None:
        return [
            ActionStep(
                tool="answer_question",
                params={"question": intent, "topic": "missing_static_route_details"},
                description="Ask for the missing static route prefix and next-hop details.",
            )
        ]

    network = ip_network(route_match.group("prefix"), strict=False)
    next_hop = route_match.group("next_hop")
    return [
        ActionStep(
            tool="configure_static_route",
            params={"network": str(network.network_address), "mask": str(network.netmask), "next_hop": next_hop},
            description=f"Configure static route {network.with_prefixlen} via {next_hop}.",
            write=True,
        ),
        ActionStep(
            tool="show_command",
            params={"command": f"show ip route {network.network_address}"},
            description=f"Validate that {network.with_prefixlen} is present in the routing table.",
        ),
    ]


def planner_node(state: AgentState) -> AgentState:
    try:
        plan = build_llm_plan(state["user_intent"])
    except Exception as exc:
        plan = [
            ActionStep(
                tool="answer_question",
                params={
                    "question": (
                        "The LLM planner is unavailable. Explain that NetOps Agent needs a configured LLM "
                        f"to plan this request, and summarize this planner error: {exc}"
                    ),
                    "topic": "planner_unavailable",
                },
                description="Explain why the LLM planner could not create a network plan.",
            )
        ]
    return {
        **state,
        "plan": [step.model_dump() for step in plan],
        "status": SessionStatus.AWAITING_APPROVAL.value if any(step.write for step in plan) else SessionStatus.EXECUTING.value,
    }
