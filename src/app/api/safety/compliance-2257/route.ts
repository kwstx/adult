import { NextRequest, NextResponse } from "next/server";
import { Compliance2257Service } from "@/modules/trust-safety/compliance-2257";
import prisma from "@/lib/db";

/**
 * POST /api/safety/compliance-2257
 * Submit 18 U.S.C. § 2257 Record-keeping declaration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, legalFullName, dateOfBirth, governmentIdType, idNumber, documentVaultUrl } = body;

    if (!creatorId || !legalFullName || !dateOfBirth || !governmentIdType || !idNumber) {
      return NextResponse.json(
        { error: "Missing required 2257 compliance fields." },
        { status: 400 }
      );
    }

    const record = await Compliance2257Service.submit2257Record({
      creatorId,
      legalFullName,
      dateOfBirth,
      governmentIdType,
      idNumber,
      documentVaultUrl: documentVaultUrl || `vault://encrypted-store/compliance/${creatorId}/kyc.dat`,
    });

    return NextResponse.json({
      success: true,
      record,
      message: "2257 Compliance records verified and stored in encrypted vault.",
    });
  } catch (error: any) {
    console.error("2257 compliance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process 2257 compliance." },
      { status: 400 }
    );
  }
}

/**
 * GET /api/safety/compliance-2257?creatorId=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json({ error: "creatorId is required." }, { status: 400 });
  }

  const record = await prisma.compliance2257Record.findUnique({
    where: { creatorId },
  });

  return NextResponse.json({ record });
}
