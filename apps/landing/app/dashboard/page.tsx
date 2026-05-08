/**
 * Triangulate Dashboard — Phase 3 minimal credit view.
 *
 * Auth: ?token=<api_key> query param, validated by calling GET /v1/credits.
 * Shows credit balance card, recent usage table, API key management,
 * and upgrade nudge banner when balance < 30%.
 */
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ──────────────────────────────────────────────

interface CreditUsage {
  accountId: string;
  balance: number;
  lifetimeConsumed: number;
  tier: string;
  purchases: Array<{
    packId: string;
    credits: number;
    priceUsd: number;
    purchasedAt: string;
  }>;
  recentUsage: Array<{
    correlationId: string;
    inputHash: string;
    inputDomain: string;
    consumedAt: string;
    cached: boolean;
  }>;
  nudge?: {
    threshold: number;
    remaining: number;
    message: string;
    upgradeUrl: string;
  };
}

interface ApiKeyItem {
  id: string;
  prefix: string;
  label: string;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://lead-enrichment.prin7r.com";

async function fetchJson(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function tierTotalCredits(tier: string): number {
  switch (tier) {
    case "starter": return 1000;
    case "team": return 10000;
    case "scale": return 100000;
    default: return 1000;
  }
}

// ─── Components ──────────────────────────────────────────

function LoginForm({ onToken }: { onToken: (t: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--midnight)] mb-2">Triangulate Dashboard</h1>
          <p className="text-sm text-[var(--slate)] mb-6">
            Enter your API key to view credits, usage, and API keys.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const t = value.trim();
              if (t.length >= 20) onToken(t);
            }}
          >
            <label className="block text-[11px] uppercase tracking-[0.08em] font-mono text-[var(--slate)] mb-2">
              API Key
            </label>
            <input
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="tri_live_..."
              className="w-full rounded-lg border border-[var(--border)] px-4 py-3 font-mono text-sm text-[var(--midnight)] placeholder:text-[var(--ghost)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-transparent"
              autoFocus
            />
            <button
              type="submit"
              disabled={value.trim().length < 20}
              className="mt-4 w-full rounded-lg bg-[var(--violet)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-[var(--violet-shadow)] transition-colors"
            >
              View Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--violet)] border-t-transparent" />
        <p className="text-sm text-[var(--slate)] font-mono">Loading dashboard...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 max-w-md w-full">
        <p className="text-sm font-medium text-red-700 mb-2">Authentication Failed</p>
        <p className="text-sm text-red-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium text-[var(--violet)] hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function CreditCard({ usage }: { usage: CreditUsage }) {
  const total = tierTotalCredits(usage.tier);
  const pctRemaining = Math.round((usage.balance / total) * 100);
  const isLow = usage.balance < total * 0.3;
  const isCrit = usage.balance < total * 0.1;

  return (
    <>
      {/* Upgrade nudge banner */}
      {usage.nudge && (
        <div className="rounded-xl bg-[var(--violet-washed)] border border-[var(--violet-soft)] p-4 mb-6">
          <p className="text-sm text-[var(--midnight)] font-medium">
            {usage.nudge.message}{" "}
            <a
              href={usage.nudge.upgradeUrl}
              className="text-[var(--violet)] font-semibold hover:underline"
            >
              See plans →
            </a>
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--midnight)]">Credit Balance</h2>
          <span className="rounded-full bg-[var(--powder)] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">
            {usage.tier}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className={`text-4xl font-light tracking-[-0.03em] ${isCrit ? "text-[var(--err)]" : isLow ? "text-[var(--warn)]" : "text-[var(--violet)]"}`}>
            {usage.balance.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--slate)]">/ {total.toLocaleString()} credits remaining</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--porcelain)] overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${
              isCrit ? "bg-[var(--err)]" : isLow ? "bg-[var(--warn)]" : "bg-[var(--violet)]"
            }`}
            style={{ width: `${Math.max(pctRemaining, 2)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-[var(--slate)] font-mono">
          <span>{pctRemaining}% remaining</span>
          <span>{usage.lifetimeConsumed.toLocaleString()} consumed lifetime</span>
        </div>
      </div>
    </>
  );
}

function PurchasesTable({ usage }: { usage: CreditUsage }) {
  if (usage.purchases.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--midnight)]">Purchases</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--porcelain)]">
              <th className="px-6 py-3 text-left text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Pack</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Credits</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Price</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Date</th>
            </tr>
          </thead>
          <tbody>
            {usage.purchases.map((p, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="px-6 py-3 font-medium text-[var(--midnight)] capitalize">{p.packId}</td>
                <td className="px-6 py-3 text-right font-mono tabular-nums text-[var(--slate)]">{p.credits.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono tabular-nums text-[var(--slate)]">${p.priceUsd}</td>
                <td className="px-6 py-3 text-right text-[var(--ghost)]">{formatDate(p.purchasedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentUsageTable({ usage }: { usage: CreditUsage }) {
  if (usage.recentUsage.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--midnight)]">Recent Usage</h3>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--porcelain)] sticky top-0">
              <th className="px-6 py-3 text-left text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Domain</th>
              <th className="px-6 py-3 text-center text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Cached</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Date</th>
            </tr>
          </thead>
          <tbody>
            {usage.recentUsage.map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="px-6 py-3 text-[var(--midnight)]">{r.inputDomain || "(hash)"}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-mono ${
                    r.cached
                      ? "bg-green-100 text-[var(--ok)]"
                      : "bg-[var(--powder)] text-[var(--slate)]"
                  }`}>
                    {r.cached ? "cache hit" : "enriched"}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-[var(--ghost)]">{formatDate(r.consumedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiKeyManager({
  keys,
  token,
  onRefresh
}: {
  keys: ApiKeyItem[];
  token: string;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState<{ key: string; id: string } | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/v1/api-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ label: newLabel || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setNewKey({ key: data.key, id: data.id });
      setNewLabel("");
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--midnight)]">API Keys</h3>
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-lg border border-[var(--violet)] px-3 py-1.5 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-colors"
        >
          {creating ? "Cancel" : "New Key"}
        </button>
      </div>

      {creating && (
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--porcelain)]">
          <label className="block text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)] mb-2">
            Label (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="staging, dev, production..."
              className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-[var(--violet)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--violet-shadow)] transition-colors disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-[var(--err)]">{error}</p>}
        </div>
      )}

      {newKey && (
        <div className="px-6 py-4 border-b border-[var(--border)] bg-green-50">
          <p className="text-xs font-semibold text-[var(--ok)] mb-1">API key created — copy it now. It won't be shown again.</p>
          <code className="block rounded-lg border border-green-200 bg-white px-3 py-2 font-mono text-xs text-[var(--midnight)] break-all select-all">
            {newKey.key}
          </code>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-[var(--slate)] hover:text-[var(--midnight)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && !creating && (
        <div className="px-6 py-3 text-xs text-[var(--err)] border-b border-[var(--border)]">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--porcelain)]">
              <th className="px-6 py-3 text-left text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Prefix</th>
              <th className="px-6 py-3 text-left text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Label</th>
              <th className="px-6 py-3 text-left text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Status</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]">Created</th>
              <th className="px-6 py-3 text-right text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--slate)]"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-6 py-3 font-mono text-xs text-[var(--midnight)]">{k.prefix}...</td>
                <td className="px-6 py-3 text-[var(--slate)]">{k.label}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-mono ${
                    k.status === "active"
                      ? "bg-green-100 text-[var(--ok)]"
                      : "bg-red-100 text-[var(--err)]"
                  }`}>
                    {k.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-[var(--ghost)]">{formatDate(k.createdAt)}</td>
                <td className="px-6 py-3 text-right">
                  {k.status === "active" && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-xs text-[var(--err)] hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-[var(--ghost)]">
                  No API keys found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [usage, setUsage] = useState<CreditUsage | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usageData, keysData] = await Promise.all([
        fetchJson("/v1/credits", token),
        fetchJson("/v1/api-keys", token).catch(() => ({ keys: [] }))
      ]);
      setUsage(usageData);
      setKeys(keysData.keys ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => { setError(""); load(); }} />;
  if (!usage) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-[-0.03em] text-[var(--midnight)]">Dashboard</h1>
          <p className="text-sm text-[var(--slate)] mt-1">Credit balance, usage, and API key management.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-xs font-medium text-[var(--slate)] hover:text-[var(--midnight)] transition-colors"
          >
            ← Back to site
          </a>
          <button
            onClick={load}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--slate)] hover:text-[var(--midnight)] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Credit balance card */}
      <CreditCard usage={usage} />

      {/* Purchases */}
      <PurchasesTable usage={usage} />

      {/* Recent usage */}
      <RecentUsageTable usage={usage} />

      {/* API Key management */}
      <ApiKeyManager keys={keys} token={token} onRefresh={load} />
    </div>
  );
}

// ─── Page wrapper (reads token from search params) ─────

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") ?? "";
  const [token, setToken] = useState<string | null>(tokenParam || null);

  if (!token) {
    return <LoginForm onToken={t => setToken(t)} />;
  }

  return <Dashboard token={token} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardPageInner />
    </Suspense>
  );
}
