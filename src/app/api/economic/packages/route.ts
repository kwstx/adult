import { NextResponse } from "next/server";
import { CREDIT_PACKAGES } from "@/modules/economic/payment.adapter";

export async function GET() {
  return NextResponse.json({ packages: CREDIT_PACKAGES });
}
