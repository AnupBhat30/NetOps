export type SessionStatus =
  | "created"
  | "planning"
  | "awaiting_approval"
  | "rejected"
  | "executing"
  | "validating"
  | "done"
  | "rolled_back"
  | "failed"
  | "cancelled";

export interface ChatResponse {
  session_id: string;
  status: SessionStatus;
}

export interface ActionStep {
  tool: string;
  params: Record<string, unknown>;
  description: string;
  write: boolean;
}

export interface StepResult {
  step_index: number;
  tool: string;
  ok: boolean;
  output: Record<string, unknown>;
  error: string | null;
}

export interface SessionState {
  session_id: string;
  intent: string;
  status: SessionStatus;
  plan: ActionStep[];
  results: StepResult[];
  validation_result: string | null;
  device_snapshot_before: string | null;
  device_snapshot_after: string | null;
  created_at: string;
  updated_at: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function startChatSession(intent: string): Promise<ChatResponse> {
  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ intent })
  });

  if (!response.ok) {
    throw new Error(`Failed to start chat session: ${response.status}`);
  }

  return response.json() as Promise<ChatResponse>;
}

export async function getSession(sessionId: string): Promise<SessionState> {
  const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to load session: ${response.status}`);
  }

  return response.json() as Promise<SessionState>;
}

export async function approveSession(sessionId: string): Promise<SessionState> {
  const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}/approve`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to approve session: ${response.status}`);
  }

  return response.json() as Promise<SessionState>;
}

export async function rejectSession(sessionId: string): Promise<SessionState> {
  const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}/reject`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to reject session: ${response.status}`);
  }

  return response.json() as Promise<SessionState>;
}
