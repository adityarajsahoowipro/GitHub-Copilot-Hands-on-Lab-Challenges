export type Severity = "P1" | "P2" | "P3";
export type Status = "OPEN" | "INVESTIGATING" | "MITIGATED" | "CLOSED";

export type ApiIncident = {
  incidentId: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  owner: string;
  impactedService: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export type CreateIncidentInput = {
  title: string;
  description: string;
  severity: Severity;
  owner: string;
  impactedService: string;
};

export type UpdateIncidentInput = {
  owner: string;
  severity: Severity;
  impactedService: string;
};

export type AssistantResponse = {
  answer: string;
  citations: Array<{ source: string; type: string; label: string }>;
  grounded: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const incidentApiEnabled = Boolean(apiUrl);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error("Incident API is not configured");

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(problem?.detail ?? `Incident API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const incidentApi = {
  list: () => request<ApiIncident[]>("/api/v1/incidents"),
  get: (incidentId: string) => request<ApiIncident>(`/api/v1/incidents/${incidentId}`),
  create: (input: CreateIncidentInput) => request<ApiIncident>("/api/v1/incidents", { method: "POST", body: JSON.stringify(input) }),
  update: (incidentId: string, input: UpdateIncidentInput) => request<ApiIncident>(`/api/v1/incidents/${incidentId}`, { method: "PATCH", body: JSON.stringify(input) }),
  transition: (incidentId: string, status: Status) => request<ApiIncident>(`/api/v1/incidents/${incidentId}/transitions`, { method: "POST", body: JSON.stringify({ status }) }),
};

export const assistantApi = {
  message: (input: { incidentId: string; question: string; conversationId?: string }) => request<AssistantResponse>("/api/v1/assistant/messages", { method: "POST", body: JSON.stringify(input) }),
};
