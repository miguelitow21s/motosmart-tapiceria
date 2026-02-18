"use client";

export async function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload })
    });
  } catch {
    // Avoid breaking UX due to non-critical telemetry failures.
  }
}
