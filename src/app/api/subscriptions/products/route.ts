import { NextRequest, NextResponse } from "next/server";
import { SubscriptionProductService } from "@/modules/subscription";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId");

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId query parameter is required" },
        { status: 400 }
      );
    }

    const includeArchived = searchParams.get("includeArchived") === "true";
    const products = await SubscriptionProductService.getProductsForCreator(
      creatorId,
      includeArchived
    );

    return NextResponse.json({
      success: true,
      creatorProfileId: creatorId,
      count: products.length,
      products,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorProfileId,
      name,
      tier,
      tierLevel,
      description,
      priceFiatCents,
      currency,
      creditPriceMonthly,
      billingInterval,
      entitlements,
      badgeIconUrl,
      badgeColorHex,
    } = body;

    if (!creatorProfileId || !name || priceFiatCents === undefined) {
      return NextResponse.json(
        { error: "creatorProfileId, name, and priceFiatCents are required" },
        { status: 400 }
      );
    }

    const product = await SubscriptionProductService.createProduct({
      creatorProfileId,
      name,
      tier,
      tierLevel,
      description,
      priceFiatCents: Number(priceFiatCents),
      currency,
      creditPriceMonthly: creditPriceMonthly ? Number(creditPriceMonthly) : undefined,
      billingInterval,
      entitlements,
      badgeIconUrl,
      badgeColorHex,
    });

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create subscription product" },
      { status: 500 }
    );
  }
}
