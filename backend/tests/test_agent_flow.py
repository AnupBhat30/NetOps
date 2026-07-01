from fastapi.testclient import TestClient

from backend.agents import tools
from backend.agents.nodes import planner
from backend.cisco.result import ToolResult
from backend.main import app
from backend.models.schemas import ActionStep


def ospf_plan() -> list[ActionStep]:
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


def static_route_plan() -> list[ActionStep]:
    return [
        ActionStep(
            tool="configure_static_route",
            params={"network": "10.10.10.0", "mask": "255.255.255.0", "next_hop": "192.0.2.1"},
            description="Configure static route 10.10.10.0/24 via 192.0.2.1.",
            write=True,
        ),
        ActionStep(
            tool="show_command",
            params={"command": "show ip route 10.10.10.0"},
            description="Validate that 10.10.10.0/24 is present in the routing table.",
        ),
    ]


def test_chat_creates_approval_required_langgraph_session(monkeypatch) -> None:
    monkeypatch.setattr(planner, "build_llm_plan", lambda _intent: ospf_plan())
    client = TestClient(app)

    response = client.post("/api/chat", json={"intent": "Configure OSPF area 0 for 10.99.99.0/24"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "awaiting_approval"
    assert body["session_id"]


def test_approved_session_executes_plan_with_tool_registry(monkeypatch) -> None:
    calls: list[tuple[str, dict[str, object], bool]] = []
    monkeypatch.setattr(planner, "build_llm_plan", lambda _intent: ospf_plan())

    def fake_call_tool(tool_name: str, params: dict[str, object], approved: bool = False) -> ToolResult:
        calls.append((tool_name, params, approved))
        return ToolResult.success(tool_name, {"stub": True})

    monkeypatch.setattr(tools, "call_tool", fake_call_tool)

    client = TestClient(app)
    chat = client.post("/api/chat", json={"intent": "Configure OSPF area 0 for 10.99.99.0/24"}).json()
    response = client.post(f"/api/sessions/{chat['session_id']}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["validation_result"] == "success"
    assert [call[0] for call in calls] == ["configure_ospf", "show_command"]
    assert all(call[2] is True for call in calls)


def test_capability_question_uses_advisory_answer_tool(monkeypatch) -> None:
    calls: list[tuple[str, dict[str, object], bool]] = []
    monkeypatch.setattr(
        planner,
        "build_llm_plan",
        lambda intent: [
            ActionStep(
                tool="answer_question",
                params={"question": intent, "topic": "target_capabilities"},
                description="Explain what NetOps Agent can do with the connected target.",
            )
        ],
    )

    def fake_call_tool(tool_name: str, params: dict[str, object], approved: bool = False) -> ToolResult:
        calls.append((tool_name, params, approved))
        return ToolResult.success(tool_name, {"answer": "LLM generated answer"})

    monkeypatch.setattr(tools, "call_tool", fake_call_tool)

    client = TestClient(app)
    response = client.post("/api/chat", json={"intent": "What can the Cat8000 do?"})

    assert response.status_code == 200
    body = response.json()
    session = client.get(f"/api/sessions/{body['session_id']}").json()

    assert body["status"] == "done"
    assert session["plan"][0]["tool"] == "answer_question"
    assert session["plan"][0]["params"]["question"] == "What can the Cat8000 do?"
    assert calls == [("answer_question", {"question": "What can the Cat8000 do?", "topic": "target_capabilities"}, False)]


def test_general_cat8000_question_uses_advisory_answer_tool() -> None:
    plan = planner.build_offline_fallback_plan("what is cat8000 used for?")

    assert len(plan) == 1
    assert plan[0].tool == "answer_question"
    assert plan[0].params == {"question": "what is cat8000 used for?", "topic": "target_capabilities"}


def test_static_route_prompt_creates_write_plan() -> None:
    plan = planner.build_offline_fallback_plan("configure a static route to 10.10.10.0/24 via 192.0.2.1")

    assert [step.tool for step in plan] == ["configure_static_route", "show_command"]
    assert plan[0].write is True
    assert plan[0].params == {
        "network": "10.10.10.0",
        "mask": "255.255.255.0",
        "next_hop": "192.0.2.1",
    }
    assert plan[1].params == {"command": "show ip route 10.10.10.0"}


def test_approved_static_route_session_executes_static_route_tool(monkeypatch) -> None:
    calls: list[tuple[str, dict[str, object], bool]] = []
    monkeypatch.setattr(planner, "build_llm_plan", lambda _intent: static_route_plan())

    def fake_call_tool(tool_name: str, params: dict[str, object], approved: bool = False) -> ToolResult:
        calls.append((tool_name, params, approved))
        return ToolResult.success(tool_name, {"stub": True})

    monkeypatch.setattr(tools, "call_tool", fake_call_tool)

    client = TestClient(app)
    chat = client.post("/api/chat", json={"intent": "configure a static route to 10.10.10.0/24 via 192.0.2.1"}).json()
    response = client.post(f"/api/sessions/{chat['session_id']}/approve")

    assert response.status_code == 200
    assert calls == [
        ("configure_static_route", {"network": "10.10.10.0", "mask": "255.255.255.0", "next_hop": "192.0.2.1"}, True),
        ("show_command", {"command": "show ip route 10.10.10.0"}, True),
    ]
