import { NextRequest, NextResponse } from "next/server";
import { SubscriptionProductService } from "@/modules/subscription";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const product = await SubscriptionProductService.getProductById(productId);

    if (!product) {
      return NextResponse.json(
        { error: "Subscription product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscription product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await req.json();
    const { creatorProfileId, pricePolicy, ...updates } = body;

    if (!creatorProfileId) {
      return NextResponse.json(
        { error: "creatorProfileId is required to verify ownership" },
        { status: 400 }
      );
    }

    const result = await SubscriptionProductService.updateProduct({
      productId,
      creatorProfileId,
      pricePolicy,
      ...updates,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update subscription product" },
      { status: 500 }
    );
  }
}
