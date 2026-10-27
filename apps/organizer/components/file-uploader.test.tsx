import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

const { FileUploader } = await import("./file-uploader");

function Harness({ onFiles }: { onFiles?: (files: File[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <FileUploader
      files={files}
      setFiles={(next) => {
        setFiles(next);
        onFiles?.(typeof next === "function" ? next(files) : next);
      }}
    />
  );
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]')!;
}

afterEach(() => {
  toast.mockReset();
});

describe("FileUploader", () => {
  it("accepts an image and lists it", async () => {
    const onFiles = vi.fn();
    const { container } = render(<Harness onFiles={onFiles} />);

    const logo = new File(["png"], "logo.png", { type: "image/png" });
    await userEvent.upload(fileInput(container), logo);

    expect(await screen.findByText("logo.png")).toBeInTheDocument();
    expect(onFiles).toHaveBeenLastCalledWith([logo]);
    expect(toast).not.toHaveBeenCalled();
  });

  it("rejects files over 2MB", async () => {
    const onFiles = vi.fn();
    const { container } = render(<Harness onFiles={onFiles} />);

    const big = new File(
      [new Uint8Array(3 * 1024 * 1024)],
      "a-very-long-background-name.png",
      { type: "image/png" },
    );
    await userEvent.upload(fileInput(container), big);

    expect(toast).toHaveBeenCalledWith("File too large", {
      description: '"a-very-long-backgrou..." ha sido rechazado.',
    });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("disables the picker once the limit is reached", async () => {
    const { container } = render(<Harness />);

    await userEvent.upload(
      fileInput(container),
      new File(["png"], "logo.png", { type: "image/png" }),
    );

    await screen.findByText("logo.png");
    expect(fileInput(container)).toBeDisabled();
  });
});
