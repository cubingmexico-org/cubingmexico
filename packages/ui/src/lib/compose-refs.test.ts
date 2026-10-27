import { describe, expect, it, vi } from "vitest";
import { composeRefs } from "@workspace/ui/lib/compose-refs";

type Node = { id: string };

describe("composeRefs", () => {
  it("sets object refs and calls callback refs with the node", () => {
    const objectRef: { current: Node | null } = { current: null };
    const callbackRef = vi.fn();
    const node = { id: "a" };

    const cleanup = composeRefs<Node>(objectRef, callbackRef, undefined)(node);

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);
    expect(cleanup).toBeUndefined();
  });

  it("returns a cleanup that runs callback cleanups and clears the other refs", () => {
    const objectRef: { current: Node | null } = { current: null };
    const plainCallback = vi.fn();
    const innerCleanup = vi.fn();
    const callbackWithCleanup = vi.fn(() => innerCleanup);
    const node = { id: "a" };

    const cleanup = composeRefs<Node>(
      objectRef,
      plainCallback,
      callbackWithCleanup,
    )(node);

    expect(cleanup).toBeTypeOf("function");
    cleanup?.();

    expect(innerCleanup).toHaveBeenCalledTimes(1);
    expect(objectRef.current).toBeNull();
    expect(plainCallback).toHaveBeenLastCalledWith(null);
    expect(callbackWithCleanup).toHaveBeenCalledTimes(1);
  });
});
