import { NextRequest, NextResponse } from "next/server";
import { platformMetrics } from "@/core/observability/metrics-registry";

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";

  if (accept.includes("application/json")) {
    return NextResponse.json(platformMetrics.getSnapshot(), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  const prometheusText = platformMetrics.toPrometheusMetrics();
  return new Response(prometheusText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
