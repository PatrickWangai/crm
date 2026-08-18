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
