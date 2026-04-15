import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInspection, useInspections, useInspectionStats } from "./useInspections";

const {
  mockUseAuth,
  mockUseQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseQuery: vi.fn((options) => options),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("@/integrations/api", () => ({
  inspectionClient: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getStatistics: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useInspections query scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes inspection list queries by the signed-in user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
    });

    useInspections(25);

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["inspections", "user-1", 25],
      enabled: true,
    }));
  });

  it("disables history queries until the signed-in user is known", () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    useInspections();

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["inspections", "anonymous", 50],
      enabled: false,
    }));
  });

  it("scopes inspection detail and statistics queries by the signed-in user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-9" },
    });

    useInspection("inspection-3");
    useInspectionStats();

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      queryKey: ["inspection", "user-9", "inspection-3"],
      enabled: true,
    }));
    expect(mockUseQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      queryKey: ["inspection-stats", "user-9"],
      enabled: true,
    }));
  });
});
