// TMPCL Razorpay Webhook - Supabase Edge Function
// File name for Supabase: supabase/functions/razorpay-webhook/index.ts
// Uses SERVICE_ROLE_KEY as requested. Keep all secrets in Supabase Edge Function Secrets.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ybfrnvkikhtlouocobnk.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function bytesToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(signature);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getRegistrationId(payment: any, order: any) {
  const notes = payment?.notes || order?.notes || {};
  const possible = [
    notes.registration_id,
    notes.player_id,
    notes.tmpcl_registration_id,
    payment?.description,
    order?.receipt,
  ].filter(Boolean).map(String);
  return possible.find((v) => v.startsWith("TMPCL-")) || possible[0] || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse({ ok: true });
  if (req.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

  try {
    if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY secret");
    if (!WEBHOOK_SECRET) throw new Error("Missing RAZORPAY_WEBHOOK_SECRET secret");

    const rawBody = await req.text();
    const razorpaySignature = req.headers.get("x-razorpay-signature") || "";
    const expectedSignature = await hmacSha256Hex(rawBody, WEBHOOK_SECRET);

    if (!razorpaySignature || !safeEqual(expectedSignature, razorpaySignature)) {
      return corsResponse({ ok: false, error: "Invalid Razorpay signature" }, 401);
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.event || "unknown";
    const payment = payload?.payload?.payment?.entity || null;
    const order = payload?.payload?.order?.entity || null;

    const registrationId = getRegistrationId(payment, order);
    const razorpayPaymentId = payment?.id || "";
    const razorpayOrderId = payment?.order_id || order?.id || "";
    const amount = payment?.amount || order?.amount_paid || order?.amount || 99900;
    const currency = payment?.currency || order?.currency || "INR";

    let paymentStatus = "Pending";
    if (event === "payment.captured" || event === "order.paid" || payment?.status === "captured") paymentStatus = "Paid";
    if (event === "payment.failed" || payment?.status === "failed") paymentStatus = "Failed";

    const paymentRowId = razorpayPaymentId || razorpayOrderId || `${event}-${Date.now()}`;
    await supabase.from("payments").upsert({
      id: paymentRowId,
      player_id: registrationId || null,
      razorpay_payment_id: razorpayPaymentId || null,
      razorpay_order_id: razorpayOrderId || null,
      amount,
      currency,
      status: paymentStatus,
      event,
      payload,
    });

    if (registrationId) {
      await supabase.from("players").update({
        payment_status: paymentStatus,
        razorpay_payment_id: razorpayPaymentId || null,
        razorpay_order_id: razorpayOrderId || null,
        payment_amount: amount,
        payment_currency: currency,
        paid_at: paymentStatus === "Paid" ? new Date().toISOString() : null,
      }).eq("id", registrationId);
    } else if (razorpayOrderId) {
      await supabase.from("players").update({
        payment_status: paymentStatus,
        razorpay_payment_id: razorpayPaymentId || null,
        payment_amount: amount,
        payment_currency: currency,
        paid_at: paymentStatus === "Paid" ? new Date().toISOString() : null,
      }).eq("razorpay_order_id", razorpayOrderId);
    }

    return corsResponse({ ok: true, event, paymentStatus, registrationId, razorpayPaymentId, razorpayOrderId });
  } catch (error) {
    console.error("TMPCL Razorpay webhook error:", error);
    return corsResponse({ ok: false, error: String(error?.message || error) }, 500);
  }
});
