from backend.agents.state import AgentState
from backend.agents import tools
from backend.models.schemas import SessionStatus


def executor_node(state: AgentState) -> AgentState:
    results: list[dict[str, object]] = []
    for index, step in enumerate(state.get("plan", [])):
        tool_name = str(step.get("tool", "unknown"))
        params = step.get("params", {})
        if not isinstance(params, dict):
            params = {}

        result = tools.call_tool(tool_name, params, approved=state.get("human_approved", False))
        results.append(
            {
                "step_index": index,
                "tool": tool_name,
                "ok": result.ok,
                "output": result.model_dump(),
                "error": result.error,
            }
        )
        if not result.ok:
            return {**state, "execution_results": results, "status": SessionStatus.FAILED.value}

    return {**state, "execution_results": results, "status": SessionStatus.VALIDATING.value}
