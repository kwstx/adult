import { NextRequest, NextResponse } from "next/server";
import { AgeEntitlementService, AgeVerificationMethod } from "@/modules/trust-safety/age-verification";

/**
 * GET /api/safety/age-verify/mock-complete
 * 
 * Simulates third-party provider hosted verification flow in sandbox/testing environments.
 * When called, it renders a sandbox simulation page allowing manual trigger of APPROVED or REJECTED.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref") || `inq_${Date.now()}`;
  const userId = searchParams.get("userId") || "unknown";
  const method = (searchParams.get("method") as AgeVerificationMethod) || "ID_DOCUMENT_KYC";
  const jurisdiction = searchParams.get("jurisdiction") || "DEFAULT";
  const returnUrl = searchParams.get("returnUrl") || "/discover";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sandbox Age Verification Provider</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-zinc-950 text-white min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
        <div class="w-16 h-16 bg-pink-500/20 text-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-pink-500/40">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
        
        <div class="inline-block bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full font-mono mb-2 border border-amber-500/30">
          PROVIDER SANDBOX ENVIRONMENT
        </div>
        
        <h1 class="text-xl font-bold mb-2">Simulated Identity & Age Assurance</h1>
        <p class="text-xs text-zinc-400 mb-6">
          This simulates a third-party verification provider (Persona / Veriff / Yoti).
          In production, the user is redirected to the provider's certified SOC2 biometric & ID scanning infrastructure.
        </p>
        
        <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-6 text-left font-mono text-[11px] text-zinc-400 space-y-1">
          <div><span class="text-zinc-500">Inquiry Ref:</span> <span class="text-pink-400">${ref}</span></div>
          <div><span class="text-zinc-500">User ID:</span> <span class="text-zinc-300">${userId}</span></div>
          <div><span class="text-zinc-500">Assurance Method:</span> <span class="text-zinc-300">${method}</span></div>
          <div><span class="text-zinc-500">Jurisdiction:</span> <span class="text-zinc-300">${jurisdiction}</span></div>
          <div><span class="text-zinc-500">PII Policy:</span> <span class="text-emerald-400">Zero-PII Tokenized</span></div>
        </div>

        <form method="POST" action="/api/safety/age-verify/mock-complete" class="space-y-3">
          <input type="hidden" name="ref" value="${ref}">
          <input type="hidden" name="userId" value="${userId}">
          <input type="hidden" name="method" value="${method}">
          <input type="hidden" name="jurisdiction" value="${jurisdiction}">
          <input type="hidden" name="returnUrl" value="${returnUrl}">
          
          <button type="submit" name="decision" value="APPROVED" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-emerald-900/30 transition-all">
            Simulate Provider Pass (18+ Verified)
          </button>
          
          <button type="submit" name="decision" value="REJECTED" class="w-full bg-zinc-800 hover:bg-rose-950/80 hover:text-rose-300 border border-zinc-700 text-zinc-400 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all">
            Simulate Provider Decline (Underage / Invalid ID)
          </button>
        </form>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * POST /api/safety/age-verify/mock-complete
 * 
 * Handles submission from mock provider sandbox page and emits canonical webhook update.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const ref = (formData.get("ref") as string) || `inq_${Date.now()}`;
    const userId = (formData.get("userId") as string) || "mock_user";
    const method = (formData.get("method") as AgeVerificationMethod) || "ID_DOCUMENT_KYC";
    const jurisdiction = (formData.get("jurisdiction") as string) || "DEFAULT";
    const decision = (formData.get("decision") as string) || "APPROVED";
    const returnUrl = (formData.get("returnUrl") as string) || "/discover";

    const mockPayload = {
      data: {
        providerReference: ref,
        userId,
        status: decision,
        method,
        jurisdictionCode: jurisdiction,
        rejectionReason: decision === "REJECTED" ? "Provider age estimation was below 18" : undefined,
      },
    };

    // Dispatch to webhook processor
    await AgeEntitlementService.handleProviderWebhook(
      "SANDBOX_MOCK",
      {},
      JSON.stringify(mockPayload)
    );

    // Redirect user back to the application
    return NextResponse.redirect(new URL(returnUrl, req.url));
  } catch (error: any) {
    console.error("Mock complete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
