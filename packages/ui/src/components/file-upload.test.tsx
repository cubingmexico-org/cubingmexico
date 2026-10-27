import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FileUpload,
  FileUploadItem,
  FileUploadItemMetadata,
  FileUploadList,
  useFileUpload,
  type FileUploadProps,
} from "@workspace/ui/components/file-upload";

function FileNames() {
  const files = useFileUpload((state) => Array.from(state.files.keys()));
  return (
    <FileUploadList>
      {files.map((file) => (
        <FileUploadItem key={file.name} value={file}>
          <FileUploadItemMetadata />
        </FileUploadItem>
      ))}
    </FileUploadList>
  );
}

function setup(props: Partial<FileUploadProps> = {}) {
  const onFileReject = vi.fn();
  const onAccept = vi.fn();
  const { container } = render(
    <FileUpload onFileReject={onFileReject} onAccept={onAccept} {...props}>
      <FileNames />
    </FileUpload>,
  );
  const input =
    container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const select = (...files: File[]) =>
    fireEvent.change(input, { target: { files } });
  return { input, select, onFileReject, onAccept };
}

const file = (name: string, type: string, size = 10) =>
  new File(["x".repeat(size)], name, { type });

describe("FileUpload", () => {
  it("accepts files and lists them", () => {
    const { select, onAccept, onFileReject } = setup();
    const logo = file("logo.png", "image/png");

    select(logo);

    expect(onAccept).toHaveBeenCalledWith([logo]);
    expect(onFileReject).not.toHaveBeenCalled();
    expect(screen.getByText("logo.png")).toBeInTheDocument();
  });

  it("rejects files beyond maxFiles", () => {
    const { select, onAccept, onFileReject } = setup({ maxFiles: 1 });
    const first = file("a.png", "image/png");
    const second = file("b.png", "image/png");

    select(first, second);

    expect(onAccept).toHaveBeenCalledWith([first]);
    expect(onFileReject).toHaveBeenCalledWith(
      second,
      "Maximum 1 files allowed",
    );
  });

  it("matches accept by MIME type, wildcard and extension", () => {
    const { select, onAccept, onFileReject } = setup({
      accept: "image/*, .pdf, text/csv",
    });
    const png = file("a.png", "image/png");
    const pdf = file("b.pdf", "");
    const csv = file("c.csv", "text/csv");
    const zip = file("d.zip", "application/zip");

    select(png, pdf, csv, zip);

    expect(onAccept).toHaveBeenCalledWith([png, pdf, csv]);
    expect(onFileReject).toHaveBeenCalledTimes(1);
    expect(onFileReject).toHaveBeenCalledWith(zip, "File type not accepted");
  });

  it("rejects files larger than maxSize", () => {
    const { select, onAccept, onFileReject } = setup({ maxSize: 5 });
    const small = file("small.png", "image/png", 5);
    const big = file("big.png", "image/png", 6);

    select(small, big);

    expect(onAccept).toHaveBeenCalledWith([small]);
    expect(onFileReject).toHaveBeenCalledWith(big, "File too large");
  });

  it("uses onFileValidate messages, including for overflow files", () => {
    const onFileValidate = (f: File) =>
      f.name.startsWith("bad") ? `${f.name} is bad` : null;
    const { select, onAccept, onFileReject } = setup({
      onFileValidate,
      maxFiles: 2,
    });
    const good = file("good.png", "image/png");
    const bad = file("bad.png", "image/png");
    const overflow = file("bad-extra.png", "image/png");

    select(good, bad, overflow);

    expect(onAccept).toHaveBeenCalledWith([good]);
    expect(onFileReject).toHaveBeenCalledWith(bad, "bad.png is bad");
    expect(onFileReject).toHaveBeenCalledWith(overflow, "bad-extra.png is bad");
  });

  it("ignores input while disabled", () => {
    const { select, onAccept } = setup({ disabled: true });

    select(file("a.png", "image/png"));

    expect(onAccept).not.toHaveBeenCalled();
  });
});
