from backend.agents.state import AgentState
from backend.models.schemas import SessionStatus


def validator_node(state: AgentState) -> AgentState:
    failed = any(not result.get("ok", False) for result in state.get("execution_results", []))
    if failed:
        return {**state, "validation_result": "failure", "status": SessionStatus.FAILED.value}

    return {**state, "validation_result": "success", "status": SessionStatus.DONE.value}

