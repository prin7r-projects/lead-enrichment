"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export type CodeTab = {
  value: string;
  label: string;
  language: "bash" | "json" | "ts";
  source: string;
};

/**
 * Refined Stripe-style code-as-art block:
 *  - porcelain (#F8FAFD) surface with a hairline border
 *  - line numbers in a tabular-numeric gutter (CSS counter)
 *  - restrained syntax tokens (deep violet keys, sage strings)
 *  - copy button in mono caption type, no garish highlighting
 */
export function CodeSample({
  tabs,
  defaultTab,
  className,
  ariaLabel = "Code sample"
}: {
  tabs: CodeTab[];
  defaultTab?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const initial = defaultTab ?? tabs[0]?.value;
  const [active, setActive] = React.useState(initial);
  const current = tabs.find((t) => t.value === active) ?? tabs[0];
  const [copied, setCopied] = React.useState(false);

  async function copyToClipboard() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.source);
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
    } catch {
      // Clipboard not available; ignore.
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-porcelain overflow-hidden shadow-card",
        className
      )}
      aria-label={ariaLabel}
    >
      <Tabs value={active} onValueChange={setActive} className="flex flex-col">
        <div className="flex items-center justify-between gap-3 pr-3 border-b border-border bg-platinum">
          <TabsList className="border-0 px-3">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-slate hover:text-violet transition-colors duration-150 px-2 py-1 rounded-sm"
            aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="m-0">
            <pre
              className={cn(
                "scrollbar-thin overflow-x-auto bg-porcelain px-0 py-5 font-mono text-[12.5px] leading-[1.7] text-midnight m-0 max-h-[480px] code-block"
              )}
            >
              <code dangerouslySetInnerHTML={{ __html: highlight(t.source, t.language) }} />
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Token-based highlighter — each language is split into ordered tokens (no
 * "match-then-replace" overlap that would corrupt previously-inserted spans).
 * Strings match first; the remaining text is matched against keywords/punct.
 */
type Token = { kind: "key" | "string" | "number" | "comment" | "method" | "punct" | "text"; value: string };

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => HTML_ESCAPE[c]);
}

function emit(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.kind === "text") return esc(t.value);
      const cls =
        t.kind === "key"
          ? "code-key"
          : t.kind === "string"
            ? "code-string"
            : t.kind === "number"
              ? "code-number"
              : t.kind === "comment"
                ? "code-comment"
                : t.kind === "method"
                  ? "code-method"
                  : "code-punct";
      return `<span class="${cls}">${esc(t.value)}</span>`;
    })
    .join("");
}

function tokenizeBash(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = src.length;

  const KEYWORDS = new Set(["curl", "POST", "GET", "PUT", "DELETE"]);

  while (i < len) {
    const ch = src[i];

    // Comment to end of line
    if (ch === "#") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? len : end;
      tokens.push({ kind: "comment", value: src.slice(i, stop) });
      i = stop;
      continue;
    }

    // Strings (single / double quotes)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < len && src[j] !== quote) {
        if (src[j] === "\\") j++;
        j++;
      }
      tokens.push({ kind: "string", value: src.slice(i, Math.min(j + 1, len)) });
      i = Math.min(j + 1, len);
      continue;
    }

    // Prompt
    if (ch === "$" && (i === 0 || src[i - 1] === "\n")) {
      tokens.push({ kind: "comment", value: "$" });
      i += 1;
      continue;
    }

    // Flag (-X, --header)
    if (ch === "-" && /[a-zA-Z]/.test(src[i + 1] ?? "")) {
      let j = i + 1;
      while (j < len && /[a-zA-Z-]/.test(src[j])) j++;
      tokens.push({ kind: "key", value: src.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier — could be keyword
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({ kind: KEYWORDS.has(word) ? "method" : "text", value: word });
      i = j;
      continue;
    }

    // Pass-through for everything else
    tokens.push({ kind: "text", value: ch });
    i += 1;
  }
  return tokens;
}

function tokenizeJson(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    const ch = src[i];

    // Comment (we use /* … */ blocks for elision)
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      tokens.push({ kind: "comment", value: src.slice(i, stop) });
      i = stop;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? len : end;
      tokens.push({ kind: "comment", value: src.slice(i, stop) });
      i = stop;
      continue;
    }

    // String — could be a key (followed by ":") or a value.
    if (ch === '"') {
      let j = i + 1;
      while (j < len && src[j] !== '"') {
        if (src[j] === "\\") j++;
        j++;
      }
      const stop = Math.min(j + 1, len);
      // Look ahead for colon to detect key
      let k = stop;
      while (k < len && /\s/.test(src[k])) k++;
      const isKey = src[k] === ":";
      tokens.push({ kind: isKey ? "key" : "string", value: src.slice(i, stop) });
      i = stop;
      continue;
    }

    // Number
    if (/[\d-]/.test(ch) && /[\d.]/.test(src[i + 1] ?? ch)) {
      let j = i;
      if (src[j] === "-") j++;
      while (j < len && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }

    // Boolean / null
    if (/[a-z]/.test(ch)) {
      let j = i;
      while (j < len && /[a-zA-Z]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === "true" || word === "false" || word === "null") {
        tokens.push({ kind: "number", value: word });
      } else {
        tokens.push({ kind: "text", value: word });
      }
      i = j;
      continue;
    }

    // Punctuation
    if ("{}[]:,".includes(ch)) {
      tokens.push({ kind: "punct", value: ch });
      i += 1;
      continue;
    }

    tokens.push({ kind: "text", value: ch });
    i += 1;
  }
  return tokens;
}

function tokenizeTs(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = src.length;

  const KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "import",
    "from",
    "export",
    "async",
    "await",
    "return",
    "function",
    "new",
    "if",
    "else",
    "for",
    "while",
    "process",
    "env"
  ]);

  while (i < len) {
    const ch = src[i];

    // Line comment
    if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? len : end;
      tokens.push({ kind: "comment", value: src.slice(i, stop) });
      i = stop;
      continue;
    }

    // Block comment
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      tokens.push({ kind: "comment", value: src.slice(i, stop) });
      i = stop;
      continue;
    }

    // String (any of " ' `)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < len && src[j] !== quote) {
        if (src[j] === "\\") j++;
        j++;
      }
      tokens.push({ kind: "string", value: src.slice(i, Math.min(j + 1, len)) });
      i = Math.min(j + 1, len);
      continue;
    }

    // Number
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier — keyword?
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({ kind: KEYWORDS.has(word) ? "key" : "text", value: word });
      i = j;
      continue;
    }

    tokens.push({ kind: "text", value: ch });
    i += 1;
  }

  return tokens;
}

function highlight(source: string, language: CodeTab["language"]): string {
  const tokens =
    language === "bash"
      ? tokenizeBash(source)
      : language === "json"
        ? tokenizeJson(source)
        : tokenizeTs(source);
  const html = emit(tokens);

  // Wrap each line so the CSS counter (line numbers) increments per visible row.
  return html
    .split("\n")
    .map((line) => `<span class="code-line">${line || "&nbsp;"}</span>`)
    .join("\n");
}
