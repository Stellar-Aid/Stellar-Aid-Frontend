/**
 * Backend REST API client for StellarAid.
 *
 * Base URL is centralized from NEXT_PUBLIC_API_URL. All requests share one
 * error-handling path. The milestone-create method REQUIRES a non-empty
 * `tx_hash` — enforced both at the type level and at runtime — so the UI can
 * never record a milestone that lacks an on-chain transaction.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

/* ------------------------------------------------------------------ */
/* Domain types (kept consistent with the contract + backend)          */
/* ------------------------------------------------------------------ */

export type MilestoneStatus = "Proposed" | "Active" | "Completed" | "Rejected";

export interface Milestone {
  id: number;
  title: string;
  description: string;
  amount: string; // stroops, as a string to preserve i128 precision
  status: MilestoneStatus;
  recipient: string;
  vaultId?: string;
  txHash?: string;
  approvals?: number;
  quorum?: number;
  createdAt?: string;
}

export interface Vault {
  id: string;
  contractId: string;
  name?: string;
  totalDeposited: string; // stroops
  totalReleased: string; // stroops
  totalRefunded: string; // stroops
  balance: string; // stroops
  signerCount?: number;
  quorum?: number;
}

export interface Deposit {
  id: string;
  vaultId: string;
  donor: string;
  amount: string; // stroops
  txHash: string;
  createdAt: string;
}

/** Payload required to record a proposed milestone. `tx_hash` is mandatory. */
export interface CreateMilestoneInput {
  title: string;
  description: string;
  amount: string; // stroops
  recipient: string;
  vaultId: string;
  /** On-chain transaction hash for the add_milestone invocation. REQUIRED. */
  tx_hash: string;
}

/* ------------------------------------------------------------------ */
/* Error type + core fetch wrapper                                     */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      `Network error contacting API: ${(err as Error).message}`,
      0,
      null,
    );
  }

  const text = await response.text();
  const parsed: unknown = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (isRecord(parsed) && typeof parsed.message === "string" && parsed.message) ||
      `API request failed (${response.status} ${response.statusText})`;
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* ------------------------------------------------------------------ */
/* Typed endpoint methods                                              */
/* ------------------------------------------------------------------ */

export const api = {
  baseUrl: API_BASE,

  listVaults(signal?: AbortSignal): Promise<Vault[]> {
    return request<Vault[]>("/api/vaults", { signal });
  },

  getVault(id: string, signal?: AbortSignal): Promise<Vault> {
    return request<Vault>(`/api/vaults/${encodeURIComponent(id)}`, { signal });
  },

  listDeposits(vaultId: string, signal?: AbortSignal): Promise<Deposit[]> {
    return request<Deposit[]>(
      `/api/vaults/${encodeURIComponent(vaultId)}/deposits`,
      { signal },
    );
  },

  listMilestones(signal?: AbortSignal): Promise<Milestone[]> {
    return request<Milestone[]>("/api/milestones", { signal });
  },

  getMilestone(id: number | string, signal?: AbortSignal): Promise<Milestone> {
    return request<Milestone>(`/api/milestones/${encodeURIComponent(String(id))}`, {
      signal,
    });
  },

  /**
   * Record a proposed milestone. Requires Bearer auth AND a non-empty tx_hash.
   * Throws before making any network call if the tx_hash is missing/blank, so a
   * milestone can never be persisted without a corresponding on-chain tx.
   */
  createMilestone(input: CreateMilestoneInput, token: string): Promise<Milestone> {
    if (!input.tx_hash || input.tx_hash.trim() === "") {
      throw new ApiError(
        "Refusing to create a milestone without an on-chain tx_hash.",
        400,
        null,
      );
    }
    if (!token) {
      throw new ApiError("Authentication token is required to create a milestone.", 401, null);
    }
    return request<Milestone>("/api/milestones", {
      method: "POST",
      body: input,
      token,
    });
  },
};

export type Api = typeof api;
