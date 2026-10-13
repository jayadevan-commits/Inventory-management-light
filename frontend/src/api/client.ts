import type { ApiResponse } from "./types";

// Defaults to "/api/v1", which Vite forwards to the FastAPI backend (see vite.config.ts).
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Params = Record<string, string | number | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Params;
}

function buildQuery(params?: Params): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Calls the backend and returns the standard response, or throws ApiError with the server's message. */
export async function request<T>(
  path: string,
  { method = "GET", body, params }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running.", 0);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // The body was not JSON (for example, the backend is down behind the dev proxy).
  }

  if (!response.ok || !payload || !payload.success) {
    throw new ApiError(
      payload?.message ?? `The server returned an unexpected response (${response.status}).`,
      response.status,
    );
  }
  return payload;
}
