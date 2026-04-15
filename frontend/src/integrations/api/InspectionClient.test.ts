import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inspectionClient } from "./InspectionClient";

const SESSION_STORAGE_KEY = "meatlens-auth-session";

describe("InspectionClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the current session token and scopes inspection lists to the signed-in user by default", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ access_token: "session-token" }),
    );

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await inspectionClient.getAll(25, 5);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe("http://localhost:3001/api/inspections?limit=25&offset=5&scope=mine");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer session-token");
  });

  it("allows admin pages to explicitly request the full inspection dataset", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ access_token: "admin-token" }),
    );

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await inspectionClient.getAll(200, 0, "all");

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe("http://localhost:3001/api/inspections?limit=200&offset=0&scope=all");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer admin-token");
  });

  it("scopes inspection statistics to the signed-in user by default", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ access_token: "session-token" }),
    );

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, byClassification: {} }),
    } as Response);

    await inspectionClient.getStatistics();

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe("http://localhost:3001/api/inspections/stats?scope=mine");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer session-token");
  });
});
