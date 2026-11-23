import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import { PersonTimeline } from "./person-timeline";

describe("PersonTimeline", () => {
  it("asks for a person until one is chosen", () => {
    render(
      <PersonTimeline
        wcif={makePrintablesWcif()}
        selectedWcaUserId={null}
        onSelectPerson={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Elige una persona para ver su línea de tiempo de asignaciones.",
      ),
    ).toBeInTheDocument();
  });

  it("lists people alphabetically and shows the chosen person's assignments", async () => {
    const user = userEvent.setup();
    const onSelectPerson = vi.fn();
    render(
      <PersonTimeline
        wcif={makePrintablesWcif()}
        selectedWcaUserId={null}
        onSelectPerson={onSelectPerson}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Ana López",
      "Beto Martínez (贝托)",
      "Carla Núñez",
      "Diego Ramírez",
    ]);

    await user.click(screen.getByRole("option", { name: "Ana López" }));
    expect(onSelectPerson).toHaveBeenCalledWith(1001);

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => [
        within(row).getByText(/ · G\d/).textContent,
        within(row).getAllByRole("cell")[3]!.textContent,
      ]),
    ).toEqual([
      ["333-r1-g1 · G1", "Competidor"],
      ["333-r1-g2 · G2", expect.stringMatching(/juez/i)],
      ["333bf-r1-g1 · G1", "Competidor"],
    ]);
  });
});
