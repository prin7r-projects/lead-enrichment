/**
 * CSV parser for batch enrichment uploads.
 *
 * Handles quoted fields, trims headers, and returns structured data.
 * No external dependencies — uses built-in string operations.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

/**
 * Parse CSV content string into headers + row maps.
 * Handles quoted fields (double-quote escaping).
 */
export function parseCsv(content: string): ParsedCsv {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  const rawRows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length === 0) continue; // skip empty lines

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j]?.trim() ?? "";
    }
    rows.push(row);
    rawRows.push(fields);
  }

  return { headers, rows, rawRows };
}

/**
 * Parse a single CSV line into fields, handling quoted values.
 */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Validate that the CSV has at least one recognized identifier column.
 * Returns the identifier type found.
 */
export type IdentifierType = "email" | "domain" | "firstName+lastName+company";

export function validateIdentifierColumns(headers: string[]): IdentifierType | null {
  const lower = headers.map(h => h.toLowerCase());

  if (lower.includes("email")) return "email";
  if (lower.includes("domain")) return "domain";
  if (
    lower.includes("firstname") &&
    lower.includes("lastname") &&
    lower.includes("company")
  ) {
    return "firstName+lastName+company";
  }
  return null;
}

/**
 * Map a CSV row to an EnrichInput object based on the identifier type.
 */
export function rowToEnrichInput(
  row: Record<string, string>,
  idType: IdentifierType
): { email?: string; domain?: string; firstName?: string; lastName?: string; company?: string } {
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])
  );

  switch (idType) {
    case "email":
      return { email: lower.email || undefined };
    case "domain":
      return { domain: lower.domain || undefined };
    case "firstName+lastName+company":
      return {
        firstName: lower.firstname || undefined,
        lastName: lower.lastname || undefined,
        company: lower.company || undefined
      };
    default:
      return {};
  }
}

/**
 * Escape a value for CSV output (quote if contains comma, quote, or newline).
 */
export function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
