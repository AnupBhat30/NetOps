from langgraph.graph import END, StateGraph

from backend.agents.nodes.executor import executor_node
from backend.agents.nodes.human_gate import route_after_human_gate, route_after_planner, human_gate_node
from backend.agents.nodes.planner import planner_node
from backend.agents.nodes.validator import validator_node
from backend.agents.state import AgentState
from backend.models.events import AgentEvent
from backend.models.schemas import ActionStep, SessionState, SessionStatus, StepResult
from backend.session_store import session_store


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("planner", planner_node)
    graph.add_node("human_gate", human_gate_node)
    graph.add_node("executor", executor_node)
    graph.add_node("validator", validator_node)

    graph.set_entry_point("planner")
    graph.add_conditional_edges(
        "planner",
        route_after_planner,
        {"human_gate": "human_gate", "executor": "executor"},
    )
    graph.add_conditional_edges(
        "human_gate",
        route_after_human_gate,
        {"executor": "executor", "__end__": END},
    )
    graph.add_edge("executor", "validator")
    graph.add_edge("validator", END)
    return graph.compile()


agent_graph = build_agent_graph()


def _state_from_session(session: SessionState, human_approved: bool = False) -> AgentState:
    return {
        "session_id": session.session_id,
        "user_intent": session.intent,
        "plan": [step.model_dump() for step in session.plan],
        "human_approved": human_approved,
        "execution_results": [result.model_dump() for result in session.results],
        "validation_result": session.validation_result,
        "status": session.status.value,
        "device_snapshot_before": session.device_snapshot_before,
        "device_snapshot_after": session.device_snapshot_after,
    }


def _apply_state_to_session(session: SessionState, state: AgentState) -> SessionState:
    session.plan = [ActionStep.model_validate(step) for step in state.get("plan", [])]
    session.results = [StepResult.model_validate(result) for result in state.get("execution_results", [])]
    session.validation_result = state.get("validation_result")
    session.device_snapshot_before = state.get("device_snapshot_before")
    session.device_snapshot_after = state.get("device_snapshot_after")
    session.status = SessionStatus(state["status"])
    return session


async def start_agent_session(session: SessionState) -> SessionState:
    """Run the LangGraph planner and pause at the human approval gate when required."""

    state = agent_graph.invoke(_state_from_session(session))
    session = _apply_state_to_session(session, state)
    await session_store.save(session)

    await session_store.publish(
        AgentEvent(type="plan_created", session_id=session.session_id, payload={"plan": [step.model_dump() for step in session.plan]})
    )
    if session.status == SessionStatus.AWAITING_APPROVAL:
        await session_store.publish(
            AgentEvent(
                type="approval_required",
                session_id=session.session_id,
                payload={"plan": [step.model_dump() for step in session.plan]},
            )
        )
    else:
        await session_store.publish(
            AgentEvent(type="session_complete", session_id=session.session_id, payload={"status": session.status.value})
        )
    return session


async def resume_approved_session(session: SessionState) -> SessionState:
    state = agent_graph.invoke(_state_from_session(session, human_approved=True))
    session = _apply_state_to_session(session, state)
    await session_store.save(session)

    for result in session.results:
        await session_store.publish(
            AgentEvent(
                type="step_result",
                session_id=session.session_id,
                payload=result.model_dump(),
            )
        )

    await session_store.publish(
        AgentEvent(
            type="validation_result",
            session_id=session.session_id,
            payload={"result": session.validation_result, "status": session.status.value},
        )
    )
    await session_store.publish(
        AgentEvent(type="session_complete", session_id=session.session_id, payload={"status": session.status.value})
    )
    return session
