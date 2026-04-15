import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const {
  mockGetAllProfiles,
  mockGetAllInspections,
  mockGetUserStats,
  mockGetAllCodes,
  mockUseIsMobile,
} = vi.hoisted(() => ({
  mockGetAllProfiles: vi.fn(),
  mockGetAllInspections: vi.fn(),
  mockGetUserStats: vi.fn(),
  mockGetAllCodes: vi.fn(),
  mockUseIsMobile: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
  }),
}));

vi.mock("@/integrations/api/ProfileClient", () => ({
  profileClient: {
    getAllProfiles: mockGetAllProfiles,
    getUserStats: mockGetUserStats,
  },
}));

vi.mock("@/integrations/api/InspectionClient", () => ({
  inspectionClient: {
    getAll: mockGetAllInspections,
  },
}));

vi.mock("@/integrations/api/AccessCodeClient", () => ({
  accessCodeClient: {
    getAll: mockGetAllCodes,
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockUseIsMobile,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("recharts", async () => {
  const createChartStub = (name: string) => {
    return ({
      children,
      layout,
      dataKey,
      width,
      angle,
      interval,
      textAnchor,
    }: {
      children?: ReactNode;
      layout?: string;
      dataKey?: string;
      width?: number;
      angle?: number;
      interval?: number | string;
      textAnchor?: string;
    }) => (
      <div
        data-chart-component={name}
        data-layout={layout ?? "horizontal"}
        data-data-key={dataKey}
        data-width={width}
        data-angle={angle}
        data-interval={interval}
        data-text-anchor={textAnchor}
      >
        {children}
      </div>
    );
  };

  return {
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div data-chart-component="ResponsiveContainer">{children}</div>,
    AreaChart: createChartStub("AreaChart"),
    Area: createChartStub("Area"),
    BarChart: createChartStub("BarChart"),
    Bar: createChartStub("Bar"),
    Cell: createChartStub("Cell"),
    CartesianGrid: createChartStub("CartesianGrid"),
    PieChart: createChartStub("PieChart"),
    Pie: createChartStub("Pie"),
    Tooltip: createChartStub("Tooltip"),
    XAxis: createChartStub("XAxis"),
    YAxis: createChartStub("YAxis"),
    Legend: createChartStub("Legend"),
  };
});

describe("AdminDashboard overview analytics", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseIsMobile.mockReturnValue(false);

    mockGetAllProfiles.mockResolvedValue([
      {
        id: "admin-1",
        full_name: "Avery",
        avatar_url: null,
        inspector_code: "INSP-1",
        is_dark_mode: false,
        email: "avery@example.com",
        location: "North Market",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "user-2",
        full_name: "Blair",
        avatar_url: null,
        inspector_code: "INSP-2",
        is_dark_mode: false,
        email: "blair@example.com",
        location: "South Market",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
      },
    ]);

    mockGetAllInspections.mockResolvedValue([
      {
        id: "inspection-1",
        user_id: "admin-1",
        meat_type: "beef",
        classification: "fresh",
        confidence_score: 93,
        lab_l: null,
        lab_a: null,
        lab_b: null,
        glcm_contrast: null,
        glcm_correlation: null,
        glcm_energy: null,
        glcm_homogeneity: null,
        flagged_deviations: [],
        explanation: null,
        image_url: null,
        location: "North Market",
        inspector_notes: null,
        created_at: "2026-04-14T08:00:00.000Z",
        updated_at: "2026-04-14T08:00:00.000Z",
      },
      {
        id: "inspection-2",
        user_id: "user-2",
        meat_type: "fish",
        classification: "spoiled",
        confidence_score: 76,
        lab_l: null,
        lab_a: null,
        lab_b: null,
        glcm_contrast: null,
        glcm_correlation: null,
        glcm_energy: null,
        glcm_homogeneity: null,
        flagged_deviations: [],
        explanation: null,
        image_url: null,
        location: "",
        inspector_notes: null,
        created_at: "2026-04-13T08:00:00.000Z",
        updated_at: "2026-04-13T08:00:00.000Z",
      },
      {
        id: "inspection-3",
        user_id: null,
        meat_type: "pork",
        classification: "warning",
        confidence_score: 82,
        lab_l: null,
        lab_a: null,
        lab_b: null,
        glcm_contrast: null,
        glcm_correlation: null,
        glcm_energy: null,
        glcm_homogeneity: null,
        flagged_deviations: [],
        explanation: null,
        image_url: null,
        location: null,
        inspector_notes: null,
        created_at: "2026-04-12T08:00:00.000Z",
        updated_at: "2026-04-12T08:00:00.000Z",
      },
    ]);

    mockGetUserStats.mockResolvedValue({
      total_users: 2,
      total_inspections: 3,
      roles: [{ role: "admin", count: 1 }],
    });

    mockGetAllCodes.mockResolvedValue([]);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the expanded business analytics section with fallback labels", async () => {
    await act(async () => {
      root.render(<AdminDashboard />);
    });

    await waitForText(container, /admin dashboard/i);

    expect(findText(container, /business analytics/i)).toBeTruthy();
    expect(findText(container, /top inspectors by inspection volume/i)).toBeTruthy();
    expect(findText(container, /average confidence by inspector/i)).toBeTruthy();
    expect(findText(container, /inspections by meat type/i)).toBeTruthy();
    expect(findText(container, /spoiled rate by meat type/i)).toBeTruthy();
    expect(findText(container, /top locations by inspection count/i)).toBeTruthy();
    expect(findText(container, /spoiled share by location/i)).toBeTruthy();
    expect(findText(container, /average confidence trend/i)).toBeTruthy();
    expect(findText(container, /freshness mix by day/i)).toBeTruthy();
    expect(findAllText(container, /unspecified/i).length).toBeGreaterThan(0);
  });

  it("switches the analytics bar charts to a compact mobile layout", async () => {
    mockUseIsMobile.mockReturnValue(true);

    await act(async () => {
      root.render(<AdminDashboard />);
    });

    await waitForText(container, /business analytics/i);

    expect(container.querySelectorAll('[data-chart-component="BarChart"][data-layout="vertical"]').length).toBe(0);
  });
});

function findText(container: HTMLElement, text: RegExp): HTMLElement | undefined {
  return Array.from(container.querySelectorAll("*")).find((candidate) => {
    const content = candidate.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.test(content);
  }) as HTMLElement | undefined;
}

function findAllText(container: HTMLElement, text: RegExp): HTMLElement[] {
  return Array.from(container.querySelectorAll("*")).filter((candidate) => {
    const content = candidate.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.test(content);
  }) as HTMLElement[];
}

async function waitForText(container: HTMLElement, text: RegExp): Promise<HTMLElement> {
  const timeoutAt = Date.now() + 1000;

  while (Date.now() < timeoutAt) {
    const match = findText(container, text);
    if (match) return match;

    await act(async () => {
      await Promise.resolve();
    });
  }

  throw new Error(`Timed out waiting for text: ${text}`);
}
