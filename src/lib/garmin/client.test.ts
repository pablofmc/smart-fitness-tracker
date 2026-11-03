import { describe, expect, it, vi } from "vitest";
import { createGarminClient, GarminBlockedError, GarminRequestError, GarminUnavailableError } from "./client";

const KEY = "secret-api-key";
const TOKEN_URL = "https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token";

type Reply = number | { status: number; body: string };

/** Answers the token endpoint with plain-text JWTs (as Garmin does) and data calls from a queue. */
function setup(data: Reply[], tokens: Reply[] = []) {
  let issued = 0;
  const tokenQueue = [...tokens];
  const dataQueue = [...data];
  const toResponse = (reply: Reply) =>
    typeof reply === "number"
      ? new Response(reply === 204 ? null : "", { status: reply })
      : new Response(reply.status === 204 ? null : reply.body, { status: reply.status });

  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    if (String(url) === TOKEN_URL) {
      const reply = tokenQueue.shift();
      if (reply !== undefined) return toResponse(reply);
      issued++;
      return new Response(`jwt-${issued}\n`, { status: 200 });
    }
    const reply = dataQueue.shift();
    if (reply === undefined) throw new Error("unexpected data call");
    return toResponse(reply);
  });
  const sleep = vi.fn(async () => {});
  const client = createGarminClient({ apiKey: KEY, fetch: fetchMock as unknown as typeof fetch, sleep, pauseMs: 250, backoffMs: 1000 });
  const headers = (call: number) => (fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
  return { client, fetchMock, sleep, headers };
}

const ok = (body: unknown) => ({ status: 200, body: JSON.stringify(body) });

describe("authentication", () => {
  it("trades the key for a token once, and sends only the token on data calls", async () => {
    const { client, fetchMock, headers } = setup([ok([1]), ok([2])]);
    await client.getJson("/a");
    await client.getJson("/b");

    expect(fetchMock.mock.calls.filter(([url]) => String(url) === TOKEN_URL)).toHaveLength(1);
    expect(headers(0).Authorization).toBe(`ApiKey ${KEY}`);
    expect(headers(1).Authorization).toBe("Bearer jwt-1");
    expect(JSON.stringify(fetchMock.mock.calls.slice(1))).not.toContain(KEY);
  });

  it("marks a 401 from the token endpoint as blocked, with no retry", async () => {
    const { client, fetchMock } = setup([], [401]);
    await expect(client.getJson("/a")).rejects.toBeInstanceOf(GarminBlockedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gets one new token after a 401 on a data call", async () => {
    const { client, headers } = setup([401, ok({ fine: true })]);
    await expect(client.getJson("/a")).resolves.toEqual({ fine: true });
    expect(headers(3).Authorization).toBe("Bearer jwt-2");
  });

  it("treats a second 401 on a data call as blocked", async () => {
    const { client } = setup([401, 401]);
    await expect(client.getJson("/a")).rejects.toBeInstanceOf(GarminBlockedError);
  });
});

describe("failures", () => {
  it("backs off exponentially on 429 and 5xx, then succeeds", async () => {
    const { client, sleep } = setup([429, 503, ok([1])]);
    await expect(client.getJson("/a")).resolves.toEqual([1]);
    expect(sleep.mock.calls.map(([ms]: number[]) => ms)).toEqual([250, 1000, 2000]);
  });

  it("ends the run after the attempts run out, rather than looping", async () => {
    const { client, fetchMock } = setup([500, 500, 500, 500, 500]);
    await expect(client.getJson("/a")).rejects.toBeInstanceOf(GarminUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("retries network failures", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("network down");
    });
    const client = createGarminClient({ apiKey: KEY, fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} });
    await expect(client.getJson("/a")).rejects.toBeInstanceOf(GarminUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("doesn't retry a 400, such as a date window that's too wide", async () => {
    const { client, fetchMock } = setup([{ status: 400, body: "" }]);
    await expect(client.getJson("/a")).rejects.toBeInstanceOf(GarminRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null for data Garmin doesn't have", async () => {
    const { client } = setup([404, 204, { status: 200, body: "" }]);
    await expect(client.getJson("/a")).resolves.toBeNull();
    await expect(client.getJson("/b")).resolves.toBeNull();
    await expect(client.getJson("/c")).resolves.toBeNull();
  });

  it("keeps the key and token out of every error message", async () => {
    const { client } = setup([{ status: 400, body: "" }]);
    const error = (await client.getJson("/a").catch((e) => e)) as Error;
    expect(error.message).not.toContain(KEY);
    expect(error.message).not.toContain("jwt-1");
  });
});

describe("requests", () => {
  it("adds query parameters", async () => {
    const { client, fetchMock } = setup([ok([])]);
    await client.getJson("/search", { start: 100, limit: 100 });
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/search\?start=100&limit=100$/);
  });

  it("downloads activities with the Accept header Garmin requires, and returns the bytes untouched", async () => {
    const { client, fetchMock, headers } = setup([{ status: 200, body: "PK-zip" }]);
    const bytes = await client.downloadActivity(123);

    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/download-service\/files\/activity\/123$/);
    expect(headers(1).Accept).toContain("application/zip");
    expect(new TextDecoder().decode(bytes!)).toBe("PK-zip");
  });
});
