const BASE_URL = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
const FIT_ACCEPT = "application/zip, application/x-zip-compressed, application/octet-stream";

/** Garmin rejected the key: it expired or was revoked. Retrying can't help, so sync must stop. */
export class GarminBlockedError extends Error {
  constructor() {
    super("Garmin rejected the API key");
    this.name = "GarminBlockedError";
  }
}

/** Garmin kept failing with 429, 5xx or no response. End the run and let the next one try. */
export class GarminUnavailableError extends Error {
  constructor(
    readonly path: string,
    readonly status: number | null,
  ) {
    super(`Garmin unavailable on ${path} (${status ?? "no response"})`);
    this.name = "GarminUnavailableError";
  }
}

/** Any other refusal, such as 400 for a date window that's too wide. */
export class GarminRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`Garmin refused ${path} (${status})`);
    this.name = "GarminRequestError";
  }
}

export type GarminClientOptions = {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Rate limits are unpublished, and about 1 call per second is what has been observed to work (`docs/garmin-api.md`). */
  pauseMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
};

type Params = Record<string, string | number>;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createGarminClient({
  apiKey,
  fetch: doFetch = globalThis.fetch,
  sleep = wait,
  pauseMs = 1000,
  maxAttempts = 4,
  backoffMs = 1000,
}: GarminClientOptions) {
  let token: string | null = null;
  let calledBefore = false;

  /** Sends one request, retrying 429, 5xx and network failures with exponential backoff. */
  async function send(path: string, init: RequestInit) {
    if (calledBefore) await sleep(pauseMs);
    calledBefore = true;

    let status: number | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
      try {
        const response = await doFetch(`${BASE_URL}${path}`, init);
        if (response.status !== 429 && response.status < 500) return response;
        status = response.status;
      } catch {
        status = null;
      }
    }
    throw new GarminUnavailableError(path, status);
  }

  async function fetchToken() {
    const response = await send(TOKEN_PATH, {
      method: "POST",
      headers: { Authorization: `ApiKey ${apiKey}` },
    });
    if (response.status === 401) throw new GarminBlockedError();
    if (!response.ok) throw new GarminRequestError(TOKEN_PATH, response.status);
    return (await response.text()).trim();
  }

  async function authorizedGet(path: string, accept: string) {
    token ??= await fetchToken();
    const response = await send(path, { headers: { Accept: accept, Authorization: `Bearer ${token}` } });
    if (response.status !== 401) return response;

    // A stale token gets one replacement; a second 401 means the key itself no longer works.
    token = await fetchToken();
    const retried = await send(path, { headers: { Accept: accept, Authorization: `Bearer ${token}` } });
    if (retried.status === 401) throw new GarminBlockedError();
    return retried;
  }

  /** The response body as Garmin sent it, ready for the raw archive. Null when Garmin has nothing. */
  async function getBytes(path: string, { params, accept = "application/json" }: { params?: Params; accept?: string } = {}) {
    const query = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : "";
    const response = await authorizedGet(`${path}${query}`, accept);
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) throw new GarminRequestError(path, response.status);
    return new Uint8Array(await response.arrayBuffer());
  }

  return {
    getBytes,

    async getJson(path: string, params?: Params): Promise<unknown> {
      const bytes = await getBytes(path, { params });
      return bytes && bytes.length > 0 ? JSON.parse(new TextDecoder().decode(bytes)) : null;
    },

    /** The ZIP holding the activity's original .FIT. */
    downloadActivity(activityId: number | string) {
      return getBytes(`/download-service/files/activity/${activityId}`, { accept: FIT_ACCEPT });
    },
  };
}

export type GarminClient = ReturnType<typeof createGarminClient>;
