import Papa from "papaparse";

/** Parses CSV text into row objects keyed by (trimmed) header. Values are trimmed strings. */
export function parseCsv(csvText: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });
  return result.data;
}

/** Builds a downloadable CSV string from a header row and example row(s), for template downloads. */
export function buildCsvTemplate(headers: string[], exampleRows: string[][]): string {
  return Papa.unparse({ fields: headers, data: exampleRows });
}

/** Builds a CSV string from arbitrary rows (varying widths OK — no inferred header row), e.g. a multi-section export. */
export function rowsToCsv(rows: (string | number)[][]): string {
  return Papa.unparse(rows);
}

/** Triggers a browser download of `content` as a file. Client-side only. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
