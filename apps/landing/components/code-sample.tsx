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
      setTimeout(() => setCopied(false), 600);
    } catch {
      // Clipboard not available; ignore.
    }
  }

  return (
    <div
      className={cn(
        "surface-raised flex flex-col rounded-lg border border-border overflow-hidden",
        className
      )}
      aria-label={ariaLabel}
    >
      <Tabs value={active} onValueChange={setActive} className="flex flex-col">
        <div className="flex items-center justify-between gap-3 pr-3 border-b border-border">
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
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-signal transition-colors duration-150 px-2 py-1 rounded-sm"
            aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="m-0">
            <pre className="scrollbar-thin overflow-x-auto bg-[color:#0B0E12] px-5 py-4 font-mono text-[12.5px] leading-[1.65] text-ink m-0 max-h-[480px]">
              <code dangerouslySetInnerHTML={{ __html: highlight(t.source, t.language) }} />
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** Minimal monochrome syntax highlighter — no external dep. */
function highlight(source: string, language: CodeTab["language"]): string {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (language === "bash") {
    return escaped
      .replace(/(^|\n)(\$\s)/g, '$1<span class="code-comment">$</span> ')
      .replace(/\b(curl|POST|GET)\b/g, '<span class="code-method">$1</span>')
      .replace(/(\s)(-[A-Za-z]+)\b/g, '$1<span class="code-key">$2</span>')
      .replace(/(["'])((?:\\.|(?!\1).)*?)\1/g, '<span class="code-string">$&</span>');
  }

  if (language === "json") {
    return escaped
      .replace(/(\".*?\")(\s*:)/g, '<span class="code-key">$1</span>$2')
      .replace(/:\s*(\".*?\")/g, ': <span class="code-string">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="code-number">$1</span>')
      .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="code-number">$1</span>')
      .replace(/(\{|\}|\[|\]|,)/g, '<span class="code-punct">$1</span>');
  }

  // ts / js
  return escaped
    .replace(/\/\/.*$/gm, '<span class="code-comment">$&</span>')
    .replace(/\b(const|let|import|from|export|async|await|return|function|new|if|else)\b/g, '<span class="code-key">$1</span>')
    .replace(/(["'`])((?:\\.|(?!\1).)*?)\1/g, '<span class="code-string">$&</span>')
    .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
}
