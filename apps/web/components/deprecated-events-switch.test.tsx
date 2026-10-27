import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import {
  DeprecatedEventsSwitch,
  useDeprecatedQuery,
} from "./deprecated-events-switch";

function withSearchParams(
  searchParams: string,
  onUrlUpdate?: OnUrlUpdateFunction,
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        {children}
      </NuqsTestingAdapter>
    );
  };
}

describe("DeprecatedEventsSwitch", () => {
  it("adds ?deprecated=true when switched on", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    render(<DeprecatedEventsSwitch />, {
      wrapper: withSearchParams("", onUrlUpdate),
    });

    const toggle = screen.getByRole("switch", {
      name: "Incluir eventos descontinuados",
    });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?deprecated=true");
    expect(toggle).toBeChecked();
  });

  it("clears the param when switched off", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    render(<DeprecatedEventsSwitch />, {
      wrapper: withSearchParams("?deprecated=true&event=333", onUrlUpdate),
    });

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe("?event=333");
  });
});

describe("useDeprecatedQuery", () => {
  it("keeps the toggle for links to other scoped pages", () => {
    const { result } = renderHook(() => useDeprecatedQuery(), {
      wrapper: withSearchParams("?deprecated=true"),
    });
    expect(result.current).toBe("?deprecated=true");
  });

  it("adds nothing in the official scope", () => {
    const { result } = renderHook(() => useDeprecatedQuery(), {
      wrapper: withSearchParams("?deprecated=false"),
    });
    expect(result.current).toBe("");
  });
});
