import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import { RoundSelector } from "./round-selector";

describe("RoundSelector", () => {
  it("lists every round with its event name and reports the choice", async () => {
    const wcif = makePrintablesWcif();
    wcif.events[0]!.rounds[0]!.linkedRounds = ["333-r1", "333-r2"];
    const onSelect = vi.fn();
    render(
      <RoundSelector wcif={wcif} selectedRoundId={null} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: "Ronda" }));

    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual([
      "3x3x3 — Ronda 1 (dual)",
      "3x3x3 a ciegas — Ronda 1",
    ]);

    await userEvent.click(
      screen.getByRole("option", { name: "3x3x3 a ciegas — Ronda 1" }),
    );
    expect(onSelect).toHaveBeenCalledWith("333bf-r1");
  });

  it("shows the selected round", () => {
    render(
      <RoundSelector
        wcif={makePrintablesWcif()}
        selectedRoundId="333bf-r1"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Ronda" })).toHaveTextContent(
      "3x3x3 a ciegas — Ronda 1",
    );
  });

  it("explains when the WCIF has no rounds", () => {
    const wcif = { ...makePrintablesWcif(), events: [] };
    render(
      <RoundSelector wcif={wcif} selectedRoundId={null} onSelect={() => {}} />,
    );

    expect(
      screen.getByText("Esta competencia no tiene rondas en el WCIF."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
