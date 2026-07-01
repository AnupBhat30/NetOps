# NetOps Agent

NetOps Agent is a network change assistant for operator-led configuration work. It turns a request into an inspectable plan, requires approval before changes, runs the automation, and returns validation evidence.

## Why

AI is becoming part of every system, but AI still depends on infrastructure. Data centers, cloud networks, branch networks, routing, DNS, firewalls, and load balancers all have to work reliably. As AI workloads grow, network teams need to make changes faster, but every change carries risk.

The hard part is not typing a command. The hard part is understanding the request, planning it correctly, getting approval, executing it safely, validating the result, and keeping evidence of what happened.

NetOps Agent exists for that workflow.

It uses AI for intent understanding and planning, while the backend validates actions and executes only approved operations.

## Demo

The current demo is wired to a sandboxed Cat8000 router for local testing.

The workflow is:

- Ask a contextual question about the router.
- Run read-only checks such as hostname, uptime, software version, and routing table.
- Propose configuration changes such as a static route or OSPF.
- Create a structured plan, wait for approval, execute through backend automation, validate the result, and preserve evidence.

The repository is split into:

- A FastAPI backend for sessions, planning, execution, and validation.
- A Next.js frontend for the request console and workflow view.

## Run locally

Backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
bun install
bun dev
```

## Environment

Copy `.env.example` to `.env` and fill in local values.

```bash
cp .env.example .env
```
