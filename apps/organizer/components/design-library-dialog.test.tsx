import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignListItem } from "@/lib/design-schemas";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const { DesignLibraryDialog } = await import("./design-library-dialog");

const fetchMock = vi.fn<typeof fetch>();

function design(id: string, name: string): DesignListItem {
  return {
    id,
    name,
    competitionId: "Comp2026",
    userId: "u1",
    module: "certificate_podium",
    schemaVersion: 1,
    isPublic: false,
    ownerScope: "user",
    updatedAt: "2026-01-02T03:04:05.000Z",
    createdAt: "2026-01-02T03:04:05.000Z",
  };
}

type Props = React.ComponentProps<typeof DesignLibraryDialog>;

function renderDialog(props: Partial<Props> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onApply: vi.fn(),
    getJson: vi.fn(() => ({ elements: [1, 2] })),
  };
  render(
    // A fresh cache per test, so lists aren't reused between tests.
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <DesignLibraryDialog
        open
        mode="load"
        competitionId="Comp2026"
        module="certificate_podium"
        {...handlers}
        {...props}
      />
    </SWRConfig>,
  );
  return handlers;
}

function requests() {
  return fetchMock.mock.calls.map(([url, init]) => [
    init?.method ?? "GET",
    String(url),
  ]);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  vi.unstubAllGlobals();
});

describe("DesignLibraryDialog", () => {
  it("lists the competition's designs and opens one", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).startsWith("/api/designs?")
        ? Response.json({ designs: [design("d1", "Podio oficial")] })
        : Response.json({
            design: { ...design("d1", "Podio oficial"), json: { a: 1 } },
          }),
    );
    const { onApply, onOpenChange } = renderDialog();

    await screen.findByText("Podio oficial");
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { a: 1 },
        { id: "d1", name: "Podio oficial" },
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(requests()).toEqual([
      ["GET", "/api/designs?competitionId=Comp2026&module=certificate_podium"],
      ["GET", "/api/designs/d1"],
    ]);
  });

  it("deletes a design and reloads the list", async () => {
    let designs = [design("d1", "Viejo"), design("d2", "Nuevo")];
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "DELETE") {
        designs = designs.filter((d) => !String(url).endsWith(d.id));
        return new Response(null, { status: 204 });
      }
      return Response.json({ designs });
    });
    renderDialog();

    const row = (await screen.findByText("Viejo")).closest("li")!;
    await userEvent.click(
      within(row).getByRole("button", { name: "Eliminar diseño" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Viejo")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Diseño eliminado");
  });

  it("shows the API error when the list fails", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "No autorizado" }, { status: 403 }),
    );
    renderDialog();

    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("clones a template into the competition", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).startsWith("/api/designs/templates")
        ? Response.json({ designs: [design("t1", "Clásico")] })
        : Response.json({
            design: { ...design("d9", "Clásico"), json: { cloned: true } },
          }),
    );
    const { onApply } = renderDialog({ mode: "templates" });

    await screen.findByText("Clásico");
    await userEvent.click(screen.getByRole("button", { name: "Usar" }));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { cloned: true },
        { id: "d9", name: "Clásico" },
      ),
    );
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/designs/t1/clone");
    expect(JSON.parse(String(init?.body))).toEqual({
      competitionId: "Comp2026",
      name: "Clásico",
    });
  });

  it("requires a name before saving", async () => {
    renderDialog({ mode: "save" });

    await userEvent.click(screen.getByRole("button", { name: /Guardar$/ }));

    expect(toast.error).toHaveBeenCalledWith(
      "Escribe un nombre para el diseño.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves the current design", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ design: design("d3", "Mi diseño") }, { status: 201 }),
    );
    const { onOpenChange } = renderDialog({ mode: "save" });

    await userEvent.type(
      screen.getByLabelText("Nombre"),
      "  Mi diseño {Enter}",
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/designs");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      name: "Mi diseño",
      competitionId: "Comp2026",
      module: "certificate_podium",
      json: { elements: [1, 2] },
    });
  });
});
