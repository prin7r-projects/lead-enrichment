/**
 * HubSpot Contact Enrichment — Cloudflare Worker reference implementation.
 *
 * Phase 3: Reference integration showing how a HubSpot webhook can feed into
 * Triangulate for real-time contact enrichment.
 *
 * Flow:
 * 1. HubSpot "contact.creation" webhook fires → calls this Worker
 * 2. Worker extracts contact email → calls POST /v1/enrich
 * 3. Maps Triangulate response fields → HubSpot custom properties
 * 4. PATCH HubSpot contact with enriched data
 *
 * Not deployed — reference only. Adapt secrets and field mappings for production.
 *
 * 🔧 DEPLOY (Cloudflare Workers):
 *   wrangler deploy
 *
 * 🔧 HubSpot setup:
 *   Settings → Properties → Create custom properties:
 *     - triangulate_person_full_name (text)
 *     - triangulate_person_title (text)
 *     - triangulate_person_department (text)
 *     - triangulate_company_name (text)
 *     - triangulate_company_industry (text)
 *     - triangulate_company_employee_count (number)
 *     - triangulate_company_funding_stage (text)
 *     - triangulate_technographics (text)
 *     - triangulate_intent_news_mentions_7d (number)
 *     - triangulate_email_status (text)
 *     - triangulate_confidence_summary (text)
 *   Settings → Integrations → Webhooks → New webhook
 *     - Object: Contact
 *     - Event: Created
 *     - URL: https://your-worker.workers.dev/hubspot/contact-created
 */

/**
 * Environment variables (set in Cloudflare dashboard or wrangler.toml):
 * - TRIANGULATE_API_KEY: your Triangulate API key
 * - TRIANGULATE_API_URL: https://lead-enrichment.prin7r.com
 * - HUBSPOT_ACCESS_TOKEN: HubSpot private app access token
 */

// ─── Types ───────────────────────────────────────────────

interface HubSpotWebhookEvent {
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId?: number;
  subscriptionId?: number;
  portalId?: number;
  appId?: number;
  occurredAt?: number;
}

interface HubSpotWebhookPayload {
  eventId?: number;
  subscriptionId?: number;
  portalId?: number;
  appId?: number;
  occurredAt?: number;
  subscriptionType?: string;
  attemptNumber?: number;
  objectId?: number;
  changeSource?: string;
  changeFlag?: string;
  event?: HubSpotWebhookEvent;
}

interface TriangulateResponse {
  request?: { correlationId?: string; cached?: boolean };
  person?: {
    fullName?: { value?: string; confidence?: number };
    title?: { value?: string; confidence?: number };
    department?: { value?: string; confidence?: number };
  };
  company?: {
    domain?: string;
    name?: { value?: string; confidence?: number };
    industry?: { value?: string; confidence?: number };
    employeeCount?: { value?: number; confidence?: number };
    fundingStage?: { value?: string; confidence?: number };
  };
  technographics?: Array<{ category: string; vendor: string; confidence: number }>;
  intent?: {
    hiring?: { openRoles?: number };
    newsMentions7d?: number;
  };
  contactTriangulation?: {
    emailDeliverability?: { status?: string; confidence?: number };
  };
  meta?: Record<string, unknown>;
}

interface EnrichErrorResponse {
  error?: string;
  message?: string;
}

// ─── Main handler ────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/hubspot/contact-created" && request.method === "POST") {
      return handleContactCreated(request, env);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "triangulate-hubspot-worker" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};

// ─── HubSpot contact.creation handler ────────────────────

async function handleContactCreated(request: Request, env: Env): Promise<Response> {
  let hubspotEvents: HubSpotWebhookPayload[] = [];

  try {
    hubspotEvents = await request.json() as HubSpotWebhookPayload[];
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  if (!Array.isArray(hubspotEvents) || hubspotEvents.length === 0) {
    return errorResponse(400, "Expected array of webhook events");
  }

  const results: Array<{ objectId: number; success: boolean; reason?: string }> = [];

  for (const event of hubspotEvents) {
    try {
      const objectId = event.objectId;
      if (!objectId) {
        results.push({ objectId: 0, success: false, reason: "Missing objectId" });
        continue;
      }

      // Step 1: Get contact email from HubSpot
      const contact = await getHubSpotContact(objectId, env.HUBSPOT_ACCESS_TOKEN);
      if (!contact || !contact.properties?.email) {
        results.push({ objectId, success: false, reason: "No email on contact" });
        continue;
      }

      const email = contact.properties.email as string;

      // Step 2: Enrich via Triangulate
      const enrichResult = await callTriangulateEnrich(email, env);
      if (!enrichResult) {
        results.push({ objectId, success: false, reason: "Enrichment returned no data" });
        continue;
      }

      // Step 3: Map Triangulate fields → HubSpot properties & PATCH
      const properties = mapTriangulateToHubSpot(enrichResult);
      await patchHubSpotContact(objectId, properties, env.HUBSPOT_ACCESS_TOKEN);

      results.push({ objectId, success: true });
    } catch (err: unknown) {
      results.push({
        objectId: event.objectId ?? 0,
        success: false,
        reason: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

// ─── HubSpot API calls ───────────────────────────────────

async function getHubSpotContact(
  contactId: number,
  token: string
): Promise<{ id: string; properties: Record<string, unknown> } | null> {
  const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    console.error(`HubSpot GET contact ${contactId} failed:`, res.status);
    return null;
  }

  return res.json() as Promise<{ id: string; properties: Record<string, unknown> }>;
}

async function patchHubSpotContact(
  contactId: number,
  properties: Record<string, string | number>,
  token: string
): Promise<void> {
  const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ properties })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`HubSpot PATCH contact ${contactId} failed:`, res.status, body.slice(0, 200));
    throw new Error(`HubSpot PATCH failed with ${res.status}`);
  }
}

// ─── Triangulate API call ────────────────────────────────

async function callTriangulateEnrich(
  email: string,
  env: Env
): Promise<TriangulateResponse | null> {
  const url = `${env.TRIANGULATE_API_URL ?? "https://lead-enrichment.prin7r.com"}/v1/enrich`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TRIANGULATE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ email })
  });

  if (!res.ok) {
    const err = await res.json() as EnrichErrorResponse;
    console.error(`Triangulate enrich failed for ${email}:`, res.status, err.error ?? err.message);
    return null;
  }

  return res.json() as Promise<TriangulateResponse>;
}

// ─── Field mapping: Triangulate → HubSpot ────────────────

function mapTriangulateToHubSpot(data: TriangulateResponse): Record<string, string | number> {
  const props: Record<string, string | number> = {};

  // Person fields
  if (data.person?.fullName?.value) {
    props["triangulate_person_full_name"] = data.person.fullName.value;
  }
  if (data.person?.title?.value) {
    props["triangulate_person_title"] = data.person.title.value;
  }
  if (data.person?.department?.value) {
    props["triangulate_person_department"] = data.person.department.value;
  }

  // Company fields
  if (data.company?.name?.value) {
    props["triangulate_company_name"] = data.company.name.value;
  }
  if (data.company?.industry?.value) {
    props["triangulate_company_industry"] = data.company.industry.value;
  }
  if (typeof data.company?.employeeCount?.value === "number") {
    props["triangulate_company_employee_count"] = data.company.employeeCount.value;
  }
  if (data.company?.fundingStage?.value) {
    props["triangulate_company_funding_stage"] = data.company.fundingStage.value;
  }

  // Technographics (serialized as JSON for HubSpot text field)
  if (Array.isArray(data.technographics) && data.technographics.length > 0) {
    const summary = data.technographics
      .map(t => `${t.category}: ${t.vendor} (${Math.round(t.confidence * 100)}%)`)
      .join("; ");
    props["triangulate_technographics"] = summary;
  }

  // Intent
  if (typeof data.intent?.newsMentions7d === "number") {
    props["triangulate_intent_news_mentions_7d"] = data.intent.newsMentions7d;
  }

  // Contact triangulation
  if (data.contactTriangulation?.emailDeliverability?.status) {
    props["triangulate_email_status"] = data.contactTriangulation.emailDeliverability.status;
  }

  // Confidence summary
  const confidences = [
    data.person?.fullName?.confidence,
    data.person?.title?.confidence,
    data.company?.name?.confidence,
    data.company?.industry?.confidence
  ].filter((c): c is number => typeof c === "number");

  if (confidences.length > 0) {
    const avg = Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100);
    props["triangulate_confidence_summary"] = `${avg}%`;
  }

  return props;
}

// ─── Types for Cloudflare Worker env ─────────────────────

interface Env {
  TRIANGULATE_API_KEY: string;
  TRIANGULATE_API_URL?: string;
  HUBSPOT_ACCESS_TOKEN: string;
}

// ─── Helpers ─────────────────────────────────────────────

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
