/**
 * Authoritative Orders System Core Types
 * 
 * "Every monetizable thing should eventually become an order."
 * 
 * Establishes the clear separation between:
 * 1. Wallet Ledger: Records the financial movement (credits, double-entry, lots, earnings).
 * 2. Order: Records what was purchased (buyer, seller, product, price, payment method, tax, order state).
 * 3. Entitlement: Records what the user received (access, privileges, duration).
 */

export type OrderType =
  | "SUBSCRIPTION"      // Tiered creator subscription
  | "PPV_CONTENT"       // Pay-per-view video, photo, album unlock
  | "TIP_GIFT"          // Direct tip or live gift drop
  | "INTERACTION"       // Live tip alert, toy trigger, sound effect, question
  | "PRIVATE_SESSION"   // 1-on-1 private video booking
  | "TICKETED_EVENT"    // Ticketed live show / special stream pass
  | "PREMIUM_SEAT"      // VIP Front Row or premium seat purchase/bid
  | "PRODUCT"           // Digital download, physical merch, custom service
  | "OTHER_EXPERIENCE"; // Special paid creator experience

export type OrderStatus =
  | "PENDING"           // Order initiated, awaiting payment/escrow
  | "PROCESSING"        // Financial debit & validation in flight
  | "COMPLETED"         // Authoritatively settled and entitlements granted
  | "FAILED"            // Payment failed or ledger rejected
  | "CANCELLED"         // Cancelled prior to fulfillment
  | "REFUNDED"          // Refunded post-settlement, entitlements revoked
  | "DISPUTED";         // Chargeback or payment dispute opened

export type RefundStatus =
  | "NOT_REFUNDED"
  | "REFUND_REQUESTED"
  | "PARTIALLY_REFUNDED"
  | "FULLY_REFUNDED";

export type PaymentMethodType =
  | "WALLET_CREDITS"    // In-platform virtual credits
  | "FIAT_CARD"         // Credit/debit card via payment gateway
  | "CRYPTO"            // Cryptocurrency payment
  | "EXTERNAL_GATEWAY"; // Direct gateway checkout (CCBill, Segpay, Epoch, Stripe)

export interface OrderRecord {
  id: string;
  orderNumber: string;               // e.g. ORD-2026-0908-1234
  buyerId: string;                   // User ID of the purchaser
  sellerId?: string | null;          // Creator Profile ID or platform
  orderType: OrderType;
  targetResourceId?: string | null;  // contentId, subscriptionProductId, interactionId, bookingId
  itemTitle: string;
  itemDescription?: string | null;
  
  // Authoritative Pricing (server verified)
  priceCredits: number;
  priceFiatCents: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  
  status: OrderStatus;
  refundStatus: RefundStatus;
  refundAmountCredits: number;
  refundAmountFiatCents: number;
  
  // Associated references across financial ledger & entitlements
  walletTransactionId?: string | null;
  paymentTransactionId?: string | null;
  entitlementIds: string[];
  
  idempotencyKey: string;
  metadata?: Record<string, any>;
  
  createdAt: Date;
  completedAt?: Date | null;
  refundedAt?: Date | null;
  updatedAt: Date;
}

export interface CreateOrderInput {
  buyerId: string;
  sellerId?: string | null;
  orderType: OrderType;
  targetResourceId?: string | null;
  paymentMethod: PaymentMethodType;
  idempotencyKey: string;
  
  // Optional client metadata / overrides (verified authoritatively on server)
  customMessage?: string;
  livestreamId?: string;
  seatIndex?: number;
  tierLevel?: number;
  metadata?: Record<string, any>;
}

export interface OrderExecutionResult {
  success: boolean;
  order: OrderRecord;
  ledgerTransactionId?: string | null;
  grantedEntitlements: Array<{
    id: string;
    key: string;
    resourceId?: string | null;
    expiresAt?: Date | null;
  }>;
  message: string;
  statusCode: number;
}

export interface RefundOrderInput {
  orderId: string;
  refundReason: string;
  initiatedByUserId: string;        // Admin ID or Creator ID
  isAdminOverride?: boolean;
  partialRefundCredits?: number;
}

export interface OrderRefundResult {
  success: boolean;
  orderId: string;
  refundStatus: RefundStatus;
  refundAmountCredits: number;
  revokedEntitlementCount: number;
  walletTransactionId?: string | null;
  message: string;
}

export interface OrderListFilter {
  buyerId?: string;
  sellerId?: string;
  orderType?: OrderType;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}
