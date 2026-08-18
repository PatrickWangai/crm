export interface DocumentTypeGuess {
  docType: string;
  expectedFields: string[];
}

const DOCUMENT_TYPE_PATTERNS: { pattern: RegExp; docType: string; expectedFields: string[] }[] = [
  { pattern: /(national[_\s-]?id|passport|id[_\s-]?card)/i, docType: "Identification document", expectedFields: ["ID number", "Full name", "Date of birth"] },
  { pattern: /(lease|tenancy)/i, docType: "Lease agreement", expectedFields: ["Tenant name", "Unit number", "Lease start/end date", "Rent amount"] },
  { pattern: /(invoice|bill)/i, docType: "Invoice", expectedFields: ["Invoice number", "Amount due", "Due date"] },
  { pattern: /(receipt)/i, docType: "Payment receipt", expectedFields: ["Amount paid", "Payment date", "Reference number"] },
  { pattern: /(title[_\s-]?deed|deed)/i, docType: "Title deed", expectedFields: ["Title number", "Property description", "Owner name"] },
  { pattern: /(kra|pin[_\s-]?certificate)/i, docType: "KRA PIN certificate", expectedFields: ["KRA PIN", "Taxpayer name"] },
  { pattern: /(agreement|contract)/i, docType: "Agreement", expectedFields: ["Party names", "Effective date", "Terms"] },
];

/**
 * Filename-based heuristic guessing what kind of document was just selected,
 * standing in for real OCR/document-AI field extraction. Deliberately does
 * NOT fabricate extracted field values — only names which fields a live
 * integration would pull out, since inventing fake PII would be misleading.
 * Pure and client-safe — runs at file-select time, before upload.
 */
export function guessDocumentType(fileName: string): DocumentTypeGuess | null {
  const nameOnly = fileName.replace(/\.[^.]+$/, "");
  for (const entry of DOCUMENT_TYPE_PATTERNS) {
    if (entry.pattern.test(nameOnly)) {
      return { docType: entry.docType, expectedFields: entry.expectedFields };
    }
  }
  return null;
}
