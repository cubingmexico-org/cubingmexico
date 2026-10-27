import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonSearchSelect } from "./person-search-select";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("PersonSearchSelect", () => {
  it("shows the selected person, or the placeholder", () => {
    const { rerender } = render(
      <PersonSearchSelect
        value={null}
        placeholder="Elige a alguien"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Elige a alguien");

    rerender(
      <PersonSearchSelect
        value={{ wcaId: "2099SMOK01", name: null }}
        placeholder="Elige a alguien"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("2099SMOK01");
  });

  it("searches persons and reports the chosen WCA ID", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        success: true,
        data: {
          persons: [
            { wcaId: "2099SMOK01", name: "Ana Smoke" },
            { wcaId: "2099SMOK02", name: "Beto Smoke" },
          ],
          competitions: [],
          teams: [],
        },
      }),
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PersonSearchSelect
        value={null}
        placeholder="Elige a alguien"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getByText("Escribe al menos 2 caracteres para buscar."),
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Nombre o WCA ID…"), "Smoke");
    await user.click(await screen.findByRole("option", { name: /Beto Smoke/ }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/search?q=Smoke");
    expect(onSelect).toHaveBeenCalledWith("2099SMOK02");
    expect(
      screen.queryByPlaceholderText("Nombre o WCA ID…"),
    ).not.toBeInTheDocument();
  });

  it("says so when nobody matches", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(
      <PersonSearchSelect value={null} placeholder="x" onSelect={() => {}} />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Nombre o WCA ID…"), "zz");

    expect(
      await screen.findByText("No se encontraron competidores."),
    ).toBeInTheDocument();
  });
});
