import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteSearchResults } from "@/lib/site-search-types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { HeaderSearch } = await import("./header-search");

const fetchMock = vi.fn<typeof fetch>();

function searchResponse(data: Partial<SiteSearchResults>): Response {
  return Response.json({
    success: true,
    data: { persons: [], competitions: [], teams: [], ...data },
  });
}

async function openSearch() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  return { user, input: screen.getByPlaceholderText(/Personas, competencias/) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HeaderSearch", () => {
  it("doesn't query the API for fewer than 2 characters", async () => {
    render(<HeaderSearch />);
    const { user, input } = await openSearch();

    await user.type(input, "x");
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces typing into one request and opens the selected person", async () => {
    fetchMock.mockResolvedValue(
      searchResponse({
        persons: [{ wcaId: "2099SMOK01", name: "Ana Smoke" }],
      }),
    );
    render(<HeaderSearch />);
    const { user, input } = await openSearch();

    await user.type(input, "Ana S");

    const option = await screen.findByRole("option", { name: /Ana Smoke/ });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/search?q=Ana+S");

    await user.click(option);

    expect(push).toHaveBeenCalledWith("/persons/2099SMOK01");
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/Personas, competencias/),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows no results when the search fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<HeaderSearch />);
    const { user, input } = await openSearch();

    await user.type(input, "zzqx");

    expect(
      await screen.findByText("No se encontraron resultados."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Buscando…")).not.toBeInTheDocument();
  });

  it("toggles with Ctrl+K", async () => {
    render(<HeaderSearch />);
    const user = userEvent.setup();

    await user.keyboard("{Control>}k{/Control}");

    expect(
      screen.getByPlaceholderText(/Personas, competencias/),
    ).toBeInTheDocument();
  });
});
