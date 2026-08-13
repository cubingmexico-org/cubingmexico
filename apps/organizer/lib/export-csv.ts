/** Download a simple CSV from row objects (client-side). */
export function exportRowsToCsv(
  rows: Record<string, string | number | boolean | null | undefined>[],
  opts: { filename: string; columns?: string[] } = { filename: "export" },
): void {
  if (rows.length === 0) return;

  const columns =
    opts.columns ??
    Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );

  const escapeCell = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvContent = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCell(row[column])).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${opts.filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
