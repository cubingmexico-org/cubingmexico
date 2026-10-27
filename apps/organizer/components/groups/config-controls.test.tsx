import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfigSwitch, StaffRoleRow } from "./config-controls";

function StaffRoleHarness({
  onCountChange,
}: {
  onCountChange: (count: number) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [count, setCount] = useState(2);
  return (
    <StaffRoleRow
      id="judges"
      label="Jueces"
      helper="Por grupo"
      checked={checked}
      onCheckedChange={setChecked}
      count={count}
      onCountChange={(next) => {
        setCount(next);
        onCountChange(next);
      }}
    />
  );
}

describe("StaffRoleRow", () => {
  it("only lets the count change once the role is enabled", async () => {
    const onCountChange = vi.fn();
    const user = userEvent.setup();
    render(<StaffRoleHarness onCountChange={onCountChange} />);

    const count = screen.getByRole("spinbutton", {
      name: "Cantidad de jueces",
    });
    expect(count).toBeDisabled();
    expect(screen.getByText("Por grupo")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Jueces" }));
    expect(count).toBeEnabled();

    await user.clear(count);
    await user.type(count, "5");

    expect(onCountChange).toHaveBeenLastCalledWith(5);
    expect(count).toHaveValue(5);
  });

  it("keeps the last valid count when the field is emptied", async () => {
    const onCountChange = vi.fn();
    const user = userEvent.setup();
    render(<StaffRoleHarness onCountChange={onCountChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Jueces" }));
    const count = screen.getByRole("spinbutton", {
      name: "Cantidad de jueces",
    });
    await user.clear(count);
    await user.tab();

    expect(onCountChange).not.toHaveBeenCalled();
    expect(count).toHaveValue(2);
  });
});

describe("ConfigSwitch", () => {
  it("toggles from its label", async () => {
    const onCheckedChange = vi.fn();
    render(
      <ConfigSwitch
        id="sort-by-speed"
        label="Ordenar por velocidad"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    await userEvent.click(screen.getByText("Ordenar por velocidad"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
