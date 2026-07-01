from backend.agents.state import AgentState
from backend.models.schemas import SessionStatus


def human_gate_node(state: AgentState) -> AgentState:
    if state.get("human_approved"):
        return {**state, "status": SessionStatus.EXECUTING.value, "device_snapshot_before": "snapshot_pending"}

    return {**state, "status": SessionStatus.AWAITING_APPROVAL.value}


def route_after_planner(state: AgentState) -> str:
    has_write_step = any(step.get("write", False) for step in state.get("plan", []))
    return "human_gate" if has_write_step else "executor"


def route_after_human_gate(state: AgentState) -> str:
    return "executor" if state.get("human_approved") else "__end__"

