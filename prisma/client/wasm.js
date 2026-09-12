
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.4.1
 * Query Engine version: a9055b89e58b4b5bfb59600785423b1db3d0e75d
 */
Prisma.prismaVersion = {
  client: "6.4.1",
  engine: "a9055b89e58b4b5bfb59600785423b1db3d0e75d"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  username: 'username',
  displayName: 'displayName',
  avatarUrl: 'avatarUrl',
  bannerUrl: 'bannerUrl',
  bio: 'bio',
  role: 'role',
  kycStatus: 'kycStatus',
  moderationState: 'moderationState',
  isActive: 'isActive',
  isBanned: 'isBanned',
  banReason: 'banReason',
  lastSeenAt: 'lastSeenAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreatorProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  stageName: 'stageName',
  bio: 'bio',
  bannerUrl: 'bannerUrl',
  category: 'category',
  tags: 'tags',
  streamKey: 'streamKey',
  ingestUrl: 'ingestUrl',
  playbackHlsUrl: 'playbackHlsUrl',
  playbackWhepUrl: 'playbackWhepUrl',
  isLive: 'isLive',
  moderationState: 'moderationState',
  totalFollowers: 'totalFollowers',
  totalViews: 'totalViews',
  totalEarnedCredits: 'totalEarnedCredits',
  defaultMinTip: 'defaultMinTip',
  subscriptionTier1Price: 'subscriptionTier1Price',
  subscriptionTier2Price: 'subscriptionTier2Price',
  subscriptionTier3Price: 'subscriptionTier3Price',
  customRules: 'customRules',
  paidMessagesEnabled: 'paidMessagesEnabled',
  messagePriceCredits: 'messagePriceCredits',
  allowFreeSubscribers: 'allowFreeSubscribers',
  allowFreeVip: 'allowFreeVip',
  customWelcomeMessage: 'customWelcomeMessage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreatorVerificationScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  userId: 'userId',
  legalFirstName: 'legalFirstName',
  legalLastName: 'legalLastName',
  dateOfBirth: 'dateOfBirth',
  idType: 'idType',
  idNumberEncrypted: 'idNumberEncrypted',
  idDocumentFrontUrl: 'idDocumentFrontUrl',
  idDocumentBackUrl: 'idDocumentBackUrl',
  selfieWithIdUrl: 'selfieWithIdUrl',
  secondaryCustodianName: 'secondaryCustodianName',
  secondaryCustodianAddress: 'secondaryCustodianAddress',
  verificationStatus: 'verificationStatus',
  rejectionReason: 'rejectionReason',
  verifiedByAdminId: 'verifiedByAdminId',
  verifiedAt: 'verifiedAt',
  expiresAt: 'expiresAt',
  complianceNotes: 'complianceNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgeAssuranceRecordScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  method: 'method',
  verificationToken: 'verificationToken',
  status: 'status',
  verifiedAt: 'verifiedAt',
  expiresAt: 'expiresAt',
  ipHash: 'ipHash',
  countryCode: 'countryCode'
};

exports.Prisma.FollowScalarFieldEnum = {
  id: 'id',
  followerId: 'followerId',
  creatorProfileId: 'creatorProfileId',
  notificationsEnabled: 'notificationsEnabled',
  notificationTier: 'notificationTier',
  createdAt: 'createdAt'
};

exports.Prisma.LivestreamScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  title: 'title',
  description: 'description',
  category: 'category',
  tags: 'tags',
  streamMode: 'streamMode',
  status: 'status',
  ticketPriceCredits: 'ticketPriceCredits',
  mediaRoomId: 'mediaRoomId',
  mediaSessionId: 'mediaSessionId',
  rtmpIngestUrl: 'rtmpIngestUrl',
  whipIngestUrl: 'whipIngestUrl',
  hlsPlaybackUrl: 'hlsPlaybackUrl',
  whepPlaybackUrl: 'whepPlaybackUrl',
  recordingUrl: 'recordingUrl',
  currentViewerCount: 'currentViewerCount',
  peakViewerCount: 'peakViewerCount',
  totalUniqueViewers: 'totalUniqueViewers',
  totalCreditsEarned: 'totalCreditsEarned',
  scheduledStartAt: 'scheduledStartAt',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LivestreamParticipantScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  userId: 'userId',
  roleInStream: 'roleInStream',
  joinedAt: 'joinedAt',
  leftAt: 'leftAt',
  watchDurationSeconds: 'watchDurationSeconds',
  creditsSpent: 'creditsSpent',
  chatMessagesCount: 'chatMessagesCount',
  isMuted: 'isMuted',
  isBannedFromRoom: 'isBannedFromRoom',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SeatScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  seatIndex: 'seatIndex',
  seatTier: 'seatTier',
  currentUserId: 'currentUserId',
  pricePerMinuteCredits: 'pricePerMinuteCredits',
  minimumBidCredits: 'minimumBidCredits',
  isOccupied: 'isOccupied',
  occupiedAt: 'occupiedAt',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CoStreamSessionScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  primaryHostId: 'primaryHostId',
  title: 'title',
  status: 'status',
  layoutMode: 'layoutMode',
  mediaRoomId: 'mediaRoomId',
  totalSplitPercentage: 'totalSplitPercentage',
  platformRakePercentage: 'platformRakePercentage',
  totalGrossCredits: 'totalGrossCredits',
  totalPlatformFee: 'totalPlatformFee',
  totalNetCredits: 'totalNetCredits',
  scheduledStartAt: 'scheduledStartAt',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CoStreamParticipantScalarFieldEnum = {
  id: 'id',
  coStreamSessionId: 'coStreamSessionId',
  creatorProfileId: 'creatorProfileId',
  role: 'role',
  splitPercentage: 'splitPercentage',
  status: 'status',
  whipIngestUrl: 'whipIngestUrl',
  webrtcTrackId: 'webrtcTrackId',
  isMediaPublished: 'isMediaPublished',
  isMuted: 'isMuted',
  totalCreditsEarned: 'totalCreditsEarned',
  joinedAt: 'joinedAt',
  leftAt: 'leftAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionProductScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  name: 'name',
  tier: 'tier',
  tierLevel: 'tierLevel',
  description: 'description',
  priceFiatCents: 'priceFiatCents',
  currency: 'currency',
  creditPriceMonthly: 'creditPriceMonthly',
  billingInterval: 'billingInterval',
  entitlements: 'entitlements',
  badgeIconUrl: 'badgeIconUrl',
  badgeColorHex: 'badgeColorHex',
  isActive: 'isActive',
  isArchived: 'isArchived',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  fanId: 'fanId',
  creatorProfileId: 'creatorProfileId',
  productId: 'productId',
  tier: 'tier',
  tierName: 'tierName',
  tierLevel: 'tierLevel',
  status: 'status',
  billingPriceCents: 'billingPriceCents',
  billingCurrency: 'billingCurrency',
  creditPriceMonthly: 'creditPriceMonthly',
  isPriceGrandfathered: 'isPriceGrandfathered',
  grandfatheredOriginalPriceCents: 'grandfatheredOriginalPriceCents',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  renewalDate: 'renewalDate',
  autoRenew: 'autoRenew',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  canceledAt: 'canceledAt',
  cancelReason: 'cancelReason',
  isPaused: 'isPaused',
  pausedAt: 'pausedAt',
  pauseResumeAt: 'pauseResumeAt',
  pauseReason: 'pauseReason',
  failedPaymentAttempts: 'failedPaymentAttempts',
  gracePeriodEndsAt: 'gracePeriodEndsAt',
  lastPaymentError: 'lastPaymentError',
  lastPaymentAt: 'lastPaymentAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPaymentScalarFieldEnum = {
  id: 'id',
  subscriptionId: 'subscriptionId',
  fanId: 'fanId',
  creatorProfileId: 'creatorProfileId',
  productId: 'productId',
  billingCycleIndex: 'billingCycleIndex',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  amountCents: 'amountCents',
  currency: 'currency',
  creditsDeducted: 'creditsDeducted',
  platformFeeCents: 'platformFeeCents',
  creatorNetCents: 'creatorNetCents',
  paymentGateway: 'paymentGateway',
  gatewayTransactionId: 'gatewayTransactionId',
  gatewayInvoiceId: 'gatewayInvoiceId',
  idempotencyKey: 'idempotencyKey',
  paymentMethod: 'paymentMethod',
  status: 'status',
  failureReason: 'failureReason',
  retryCount: 'retryCount',
  nextRetryAt: 'nextRetryAt',
  paidAt: 'paidAt',
  refundedAt: 'refundedAt',
  disputedAt: 'disputedAt',
  rawGatewayPayload: 'rawGatewayPayload',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  title: 'title',
  description: 'description',
  productType: 'productType',
  priceCredits: 'priceCredits',
  priceFiatCents: 'priceFiatCents',
  currency: 'currency',
  inventoryCount: 'inventoryCount',
  isActive: 'isActive',
  thumbnailUrl: 'thumbnailUrl',
  mediaUrls: 'mediaUrls',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContentScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  title: 'title',
  description: 'description',
  contentType: 'contentType',
  accessLevel: 'accessLevel',
  moderationState: 'moderationState',
  moderationReason: 'moderationReason',
  moderatedAt: 'moderatedAt',
  priceCredits: 'priceCredits',
  previewUrl: 'previewUrl',
  mediaUrl: 'mediaUrl',
  mediaDurationSeconds: 'mediaDurationSeconds',
  fileSizeBytes: 'fileSizeBytes',
  isPublished: 'isPublished',
  isArchived: 'isArchived',
  viewCount: 'viewCount',
  likeCount: 'likeCount',
  purchaseCount: 'purchaseCount',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContentPurchaseScalarFieldEnum = {
  id: 'id',
  contentId: 'contentId',
  fanId: 'fanId',
  priceCreditsPaid: 'priceCreditsPaid',
  platformFeeCredits: 'platformFeeCredits',
  creatorNetCredits: 'creatorNetCredits',
  walletTransactionId: 'walletTransactionId',
  accessGrantedAt: 'accessGrantedAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.JointProductScalarFieldEnum = {
  id: 'id',
  primaryProducerId: 'primaryProducerId',
  title: 'title',
  description: 'description',
  contentType: 'contentType',
  priceCredits: 'priceCredits',
  previewUrl: 'previewUrl',
  mediaUrl: 'mediaUrl',
  mediaDurationSeconds: 'mediaDurationSeconds',
  status: 'status',
  is2257Compliant: 'is2257Compliant',
  platformRakePercentage: 'platformRakePercentage',
  totalPurchasesCount: 'totalPurchasesCount',
  totalCreditsEarned: 'totalCreditsEarned',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JointProductCoCreatorScalarFieldEnum = {
  id: 'id',
  jointProductId: 'jointProductId',
  creatorProfileId: 'creatorProfileId',
  role: 'role',
  revenueSplitPercentage: 'revenueSplitPercentage',
  approvalStatus: 'approvalStatus',
  is2257Verified: 'is2257Verified',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JointEventScalarFieldEnum = {
  id: 'id',
  primaryHostId: 'primaryHostId',
  title: 'title',
  description: 'description',
  ticketPriceCredits: 'ticketPriceCredits',
  coverImageUrl: 'coverImageUrl',
  scheduledStartAt: 'scheduledStartAt',
  scheduledEndAt: 'scheduledEndAt',
  status: 'status',
  mediaRoomId: 'mediaRoomId',
  is2257Compliant: 'is2257Compliant',
  platformRakePercentage: 'platformRakePercentage',
  totalTicketsSold: 'totalTicketsSold',
  totalCreditsEarned: 'totalCreditsEarned',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JointEventCoHostScalarFieldEnum = {
  id: 'id',
  jointEventId: 'jointEventId',
  creatorProfileId: 'creatorProfileId',
  role: 'role',
  revenueSplitPercentage: 'revenueSplitPercentage',
  approvalStatus: 'approvalStatus',
  is2257Verified: 'is2257Verified',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JointProductPurchaseScalarFieldEnum = {
  id: 'id',
  jointProductId: 'jointProductId',
  fanId: 'fanId',
  priceCreditsPaid: 'priceCreditsPaid',
  platformFeeCredits: 'platformFeeCredits',
  netCreatorCredits: 'netCreatorCredits',
  walletTransactionId: 'walletTransactionId',
  accessGrantedAt: 'accessGrantedAt',
  createdAt: 'createdAt'
};

exports.Prisma.JointEventTicketScalarFieldEnum = {
  id: 'id',
  jointEventId: 'jointEventId',
  fanId: 'fanId',
  ticketPriceCreditsPaid: 'ticketPriceCreditsPaid',
  platformFeeCredits: 'platformFeeCredits',
  netCreatorCredits: 'netCreatorCredits',
  walletTransactionId: 'walletTransactionId',
  accessPassToken: 'accessPassToken',
  isUsed: 'isUsed',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  conversationType: 'conversationType',
  title: 'title',
  creatorProfileId: 'creatorProfileId',
  initiatorUserId: 'initiatorUserId',
  recipientUserId: 'recipientUserId',
  lastMessageId: 'lastMessageId',
  lastMessagePreview: 'lastMessagePreview',
  lastActivityAt: 'lastActivityAt',
  isArchived: 'isArchived',
  isLocked: 'isLocked',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  senderId: 'senderId',
  recipientId: 'recipientId',
  messageType: 'messageType',
  body: 'body',
  mediaUrl: 'mediaUrl',
  isPpvLocked: 'isPpvLocked',
  ppvPriceCredits: 'ppvPriceCredits',
  isPpvUnlocked: 'isPpvUnlocked',
  tipCredits: 'tipCredits',
  isPaidMessage: 'isPaidMessage',
  paidPriceCredits: 'paidPriceCredits',
  isPriority: 'isPriority',
  relationshipTierAtSend: 'relationshipTierAtSend',
  fanLevelAtSend: 'fanLevelAtSend',
  transactionId: 'transactionId',
  isRead: 'isRead',
  readAt: 'readAt',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  currency: 'currency',
  balance: 'balance',
  purchasedBalance: 'purchasedBalance',
  promotionalBalance: 'promotionalBalance',
  bonusBalance: 'bonusBalance',
  lockedBalance: 'lockedBalance',
  pendingBalance: 'pendingBalance',
  lifetimeDepositedCredits: 'lifetimeDepositedCredits',
  lifetimeEarnedCredits: 'lifetimeEarnedCredits',
  lifetimeSpentCredits: 'lifetimeSpentCredits',
  lifetimeWithdrawnCredits: 'lifetimeWithdrawnCredits',
  status: 'status',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditLotScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  creditType: 'creditType',
  originalAmount: 'originalAmount',
  remainingAmount: 'remainingAmount',
  fiatValueCents: 'fiatValueCents',
  fiatCurrency: 'fiatCurrency',
  expiresAt: 'expiresAt',
  grantReason: 'grantReason',
  paymentTransactionId: 'paymentTransactionId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditLotDeductionScalarFieldEnum = {
  id: 'id',
  creditLotId: 'creditLotId',
  walletTransactionId: 'walletTransactionId',
  amountDeducted: 'amountDeducted',
  creditType: 'creditType',
  createdAt: 'createdAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  sourceWalletId: 'sourceWalletId',
  destinationWalletId: 'destinationWalletId',
  transactionType: 'transactionType',
  direction: 'direction',
  amountCredits: 'amountCredits',
  primaryCreditType: 'primaryCreditType',
  platformFeeCredits: 'platformFeeCredits',
  creatorNetCredits: 'creatorNetCredits',
  sourceBalanceBefore: 'sourceBalanceBefore',
  sourceBalanceAfter: 'sourceBalanceAfter',
  destBalanceBefore: 'destBalanceBefore',
  destBalanceAfter: 'destBalanceAfter',
  idempotencyKey: 'idempotencyKey',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  status: 'status',
  note: 'note',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentTransactionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  walletId: 'walletId',
  paymentGateway: 'paymentGateway',
  gatewayTransactionId: 'gatewayTransactionId',
  gatewayEventId: 'gatewayEventId',
  idempotencyKey: 'idempotencyKey',
  amountFiatCents: 'amountFiatCents',
  currency: 'currency',
  creditsPurchased: 'creditsPurchased',
  bonusCredits: 'bonusCredits',
  gatewayFeeCents: 'gatewayFeeCents',
  paymentMethod: 'paymentMethod',
  status: 'status',
  riskScore: 'riskScore',
  ipAddress: 'ipAddress',
  countryCode: 'countryCode',
  rawGatewayPayload: 'rawGatewayPayload',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreatorEarningScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  walletTransactionId: 'walletTransactionId',
  earningSource: 'earningSource',
  sourceReferenceId: 'sourceReferenceId',
  grossCredits: 'grossCredits',
  platformRakePercentage: 'platformRakePercentage',
  platformFeeCredits: 'platformFeeCredits',
  netCreatorCredits: 'netCreatorCredits',
  fiatValueEstimatedCents: 'fiatValueEstimatedCents',
  clearanceStatus: 'clearanceStatus',
  clearsAt: 'clearsAt',
  createdAt: 'createdAt'
};

exports.Prisma.PayoutScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  amountFiatCents: 'amountFiatCents',
  creditsDeducted: 'creditsDeducted',
  currency: 'currency',
  payoutMethod: 'payoutMethod',
  payoutBeneficiaryInfo: 'payoutBeneficiaryInfo',
  status: 'status',
  gatewayReferenceId: 'gatewayReferenceId',
  failureReason: 'failureReason',
  reviewedByAdminId: 'reviewedByAdminId',
  requestedAt: 'requestedAt',
  reviewedAt: 'reviewedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InteractionDefinitionScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  title: 'title',
  description: 'description',
  actionType: 'actionType',
  priceCredits: 'priceCredits',
  durationSeconds: 'durationSeconds',
  intensityLevel: 'intensityLevel',
  toyCommandPattern: 'toyCommandPattern',
  soundAssetUrl: 'soundAssetUrl',
  iconUrl: 'iconUrl',
  cooldownSeconds: 'cooldownSeconds',
  isEnabled: 'isEnabled',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InteractionPurchaseScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  creatorProfileId: 'creatorProfileId',
  fanId: 'fanId',
  interactionDefinitionId: 'interactionDefinitionId',
  priceCreditsPaid: 'priceCreditsPaid',
  customMessage: 'customMessage',
  toyIntensity: 'toyIntensity',
  status: 'status',
  executedAt: 'executedAt',
  createdAt: 'createdAt'
};

exports.Prisma.InteractionQueueEntryScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  interactionPurchaseId: 'interactionPurchaseId',
  queuePosition: 'queuePosition',
  status: 'status',
  scheduledExecutionTime: 'scheduledExecutionTime',
  startedPlayingAt: 'startedPlayingAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CollectiveGoalScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  creatorProfileId: 'creatorProfileId',
  title: 'title',
  description: 'description',
  rewardDescription: 'rewardDescription',
  targetCredits: 'targetCredits',
  currentCredits: 'currentCredits',
  contributorCount: 'contributorCount',
  status: 'status',
  startedAt: 'startedAt',
  endsAt: 'endsAt',
  reachedAt: 'reachedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoalContributionScalarFieldEnum = {
  id: 'id',
  collectiveGoalId: 'collectiveGoalId',
  livestreamId: 'livestreamId',
  fanId: 'fanId',
  amountCredits: 'amountCredits',
  message: 'message',
  isAnonymous: 'isAnonymous',
  createdAt: 'createdAt'
};

exports.Prisma.CreatorRelationshipScalarFieldEnum = {
  id: 'id',
  fanId: 'fanId',
  creatorProfileId: 'creatorProfileId',
  relationshipTier: 'relationshipTier',
  currentLevel: 'currentLevel',
  totalXp: 'totalXp',
  totalCreditsSpent: 'totalCreditsSpent',
  totalMinutesWatched: 'totalMinutesWatched',
  currentStreakDays: 'currentStreakDays',
  longestStreakDays: 'longestStreakDays',
  lastInteractedAt: 'lastInteractedAt',
  customNickname: 'customNickname',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RelationshipXPEventScalarFieldEnum = {
  id: 'id',
  creatorRelationshipId: 'creatorRelationshipId',
  fanId: 'fanId',
  creatorProfileId: 'creatorProfileId',
  eventType: 'eventType',
  xpAwarded: 'xpAwarded',
  creditsMultiplier: 'creditsMultiplier',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.PlatformXPEventScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  eventType: 'eventType',
  xpAwarded: 'xpAwarded',
  userLevelAfter: 'userLevelAfter',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.AchievementScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  category: 'category',
  badgeIconUrl: 'badgeIconUrl',
  badgeTier: 'badgeTier',
  xpReward: 'xpReward',
  creditBonusReward: 'creditBonusReward',
  requirementThreshold: 'requirementThreshold',
  requirementMetric: 'requirementMetric',
  isHidden: 'isHidden',
  createdAt: 'createdAt'
};

exports.Prisma.UserAchievementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  achievementId: 'achievementId',
  currentProgress: 'currentProgress',
  isUnlocked: 'isUnlocked',
  unlockedAt: 'unlockedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaderboardRecordScalarFieldEnum = {
  id: 'id',
  scope: 'scope',
  timeframe: 'timeframe',
  periodKey: 'periodKey',
  creatorProfileId: 'creatorProfileId',
  livestreamId: 'livestreamId',
  userId: 'userId',
  rank: 'rank',
  totalCreditsContributed: 'totalCreditsContributed',
  totalXpEarned: 'totalXpEarned',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrivateSessionAvailabilityScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  dayOfWeek: 'dayOfWeek',
  startTimeUtc: 'startTimeUtc',
  endTimeUtc: 'endTimeUtc',
  minDurationMinutes: 'minDurationMinutes',
  maxDurationMinutes: 'maxDurationMinutes',
  creditRatePerMinute: 'creditRatePerMinute',
  bufferTimeMinutes: 'bufferTimeMinutes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  creatorProfileId: 'creatorProfileId',
  fanId: 'fanId',
  scheduledStartTime: 'scheduledStartTime',
  scheduledEndTime: 'scheduledEndTime',
  durationMinutes: 'durationMinutes',
  creditRatePerMinute: 'creditRatePerMinute',
  totalCreditsEscrowed: 'totalCreditsEscrowed',
  status: 'status',
  meetingRoomId: 'meetingRoomId',
  fanNotes: 'fanNotes',
  creatorNotes: 'creatorNotes',
  actualStartedAt: 'actualStartedAt',
  actualEndedAt: 'actualEndedAt',
  actualDurationSeconds: 'actualDurationSeconds',
  walletTransactionId: 'walletTransactionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  reporterId: 'reporterId',
  reportedUserId: 'reportedUserId',
  reportedCreatorProfileId: 'reportedCreatorProfileId',
  reportedContentId: 'reportedContentId',
  reportedLivestreamId: 'reportedLivestreamId',
  reportedMessageId: 'reportedMessageId',
  category: 'category',
  description: 'description',
  evidenceUrls: 'evidenceUrls',
  status: 'status',
  assignedModeratorId: 'assignedModeratorId',
  moderatorNotes: 'moderatorNotes',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModerationCaseScalarFieldEnum = {
  id: 'id',
  caseNumber: 'caseNumber',
  sourceReportId: 'sourceReportId',
  reportedObjectType: 'reportedObjectType',
  reportedObjectId: 'reportedObjectId',
  reportedContentId: 'reportedContentId',
  reportedUserId: 'reportedUserId',
  reportedCreatorProfileId: 'reportedCreatorProfileId',
  reporterId: 'reporterId',
  reporterType: 'reporterType',
  reasonCategory: 'reasonCategory',
  reason: 'reason',
  evidence: 'evidence',
  automatedSignals: 'automatedSignals',
  reviewerId: 'reviewerId',
  priority: 'priority',
  status: 'status',
  actionTaken: 'actionTaken',
  decision: 'decision',
  decisionNotes: 'decisionNotes',
  decisionTime: 'decisionTime',
  actionDurationHours: 'actionDurationHours',
  appealStatus: 'appealStatus',
  appealReason: 'appealReason',
  appealEvidence: 'appealEvidence',
  appealReviewerId: 'appealReviewerId',
  appealDecisionTime: 'appealDecisionTime',
  appealDecisionNotes: 'appealDecisionNotes',
  summaryFindings: 'summaryFindings',
  internalNotes: 'internalNotes',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditEventScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  actorType: 'actorType',
  action: 'action',
  targetEntityType: 'targetEntityType',
  targetEntityId: 'targetEntityId',
  oldState: 'oldState',
  newState: 'newState',
  oldValues: 'oldValues',
  newValues: 'newValues',
  reason: 'reason',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  metadataJson: 'metadataJson',
  hashChecksum: 'hashChecksum',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  senderUserId: 'senderUserId',
  type: 'type',
  title: 'title',
  body: 'body',
  actionUrl: 'actionUrl',
  isRead: 'isRead',
  readAt: 'readAt',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.GameSessionScalarFieldEnum = {
  id: 'id',
  livestreamId: 'livestreamId',
  creatorProfileId: 'creatorProfileId',
  gameType: 'gameType',
  title: 'title',
  status: 'status',
  entryCostCredits: 'entryCostCredits',
  totalPrizePoolCredits: 'totalPrizePoolCredits',
  winningUserId: 'winningUserId',
  gameStateJson: 'gameStateJson',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GameRewardScalarFieldEnum = {
  id: 'id',
  gameSessionId: 'gameSessionId',
  userId: 'userId',
  rewardType: 'rewardType',
  rewardValueCredits: 'rewardValueCredits',
  isClaimed: 'isClaimed',
  claimedAt: 'claimedAt',
  claimMetadata: 'claimMetadata',
  createdAt: 'createdAt'
};

exports.Prisma.RecommendationEventScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  userId: 'userId',
  creatorProfileId: 'creatorProfileId',
  livestreamId: 'livestreamId',
  contentId: 'contentId',
  eventType: 'eventType',
  dwellTimeMs: 'dwellTimeMs',
  watchDurationSeconds: 'watchDurationSeconds',
  searchQuery: 'searchQuery',
  category: 'category',
  tags: 'tags',
  amountCredits: 'amountCredits',
  positionIndex: 'positionIndex',
  deviceType: 'deviceType',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.RiskAssessmentRecordScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  actionType: 'actionType',
  riskScore: 'riskScore',
  riskLevel: 'riskLevel',
  recommendedAction: 'recommendedAction',
  finalAction: 'finalAction',
  ruleTriggersJson: 'ruleTriggersJson',
  signalsJson: 'signalsJson',
  contextJson: 'contextJson',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  deviceFingerprintHash: 'deviceFingerprintHash',
  executionTimeMs: 'executionTimeMs',
  isOverridden: 'isOverridden',
  overriddenById: 'overriddenById',
  overrideNotes: 'overrideNotes',
  createdAt: 'createdAt'
};

exports.Prisma.DeviceFingerprintRecordScalarFieldEnum = {
  id: 'id',
  fingerprintHash: 'fingerprintHash',
  userId: 'userId',
  rawTelemetryJson: 'rawTelemetryJson',
  canvasHash: 'canvasHash',
  webglHash: 'webglHash',
  userAgent: 'userAgent',
  language: 'language',
  screenResolution: 'screenResolution',
  timezone: 'timezone',
  isBlocked: 'isBlocked',
  blockReason: 'blockReason',
  trustScore: 'trustScore',
  linkedUserIdsJson: 'linkedUserIdsJson',
  firstSeenAt: 'firstSeenAt',
  lastSeenAt: 'lastSeenAt'
};

exports.Prisma.PaymentInstrumentFingerprintScalarFieldEnum = {
  id: 'id',
  cardHash: 'cardHash',
  binNumber: 'binNumber',
  lastFour: 'lastFour',
  cardBrand: 'cardBrand',
  cardCountry: 'cardCountry',
  isPrepaid: 'isPrepaid',
  linkedUserIdsJson: 'linkedUserIdsJson',
  totalTransactions: 'totalTransactions',
  totalDisputes: 'totalDisputes',
  totalChargebacks: 'totalChargebacks',
  isBlocked: 'isBlocked',
  blockReason: 'blockReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletHoldScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  userId: 'userId',
  amountCredits: 'amountCredits',
  reason: 'reason',
  status: 'status',
  riskAssessmentId: 'riskAssessmentId',
  releaseAt: 'releaseAt',
  releasedAt: 'releasedAt',
  releaseNotes: 'releaseNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.UserRole = exports.$Enums.UserRole = {
  FAN: 'FAN',
  CREATOR: 'CREATOR',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR'
};

exports.KYCStatus = exports.$Enums.KYCStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  AGE_VERIFIED: 'AGE_VERIFIED',
  COMPLIANCE_2257_APPROVED: 'COMPLIANCE_2257_APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED'
};

exports.AccountModerationState = exports.$Enums.AccountModerationState = {
  ACTIVE: 'ACTIVE',
  RESTRICTED: 'RESTRICTED',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  UNDER_REVIEW: 'UNDER_REVIEW'
};

exports.CreatorModerationState = exports.$Enums.CreatorModerationState = {
  APPLICATION: 'APPLICATION',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  VERIFIED: 'VERIFIED',
  MONETIZATION_ENABLED: 'MONETIZATION_ENABLED',
  RESTRICTED: 'RESTRICTED',
  SUSPENDED: 'SUSPENDED'
};

exports.GovIdType = exports.$Enums.GovIdType = {
  PASSPORT: 'PASSPORT',
  DRIVERS_LICENSE: 'DRIVERS_LICENSE',
  NATIONAL_ID: 'NATIONAL_ID',
  RESIDENCE_PERMIT: 'RESIDENCE_PERMIT'
};

exports.VerificationStatus = exports.$Enums.VerificationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.FollowNotifyTier = exports.$Enums.FollowNotifyTier = {
  ALL: 'ALL',
  LIVE_ONLY: 'LIVE_ONLY',
  NONE: 'NONE'
};

exports.StreamMode = exports.$Enums.StreamMode = {
  PUBLIC_BROADCAST: 'PUBLIC_BROADCAST',
  SUBSCRIBERS_ONLY: 'SUBSCRIBERS_ONLY',
  TICKETED_PPV: 'TICKETED_PPV',
  PRIVATE_1ON1: 'PRIVATE_1ON1',
  VIP_GROUP: 'VIP_GROUP'
};

exports.StreamStatus = exports.$Enums.StreamStatus = {
  SCHEDULED: 'SCHEDULED',
  PREPARING: 'PREPARING',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
  TERMINATED_SAFETY: 'TERMINATED_SAFETY'
};

exports.ParticipantStreamRole = exports.$Enums.ParticipantStreamRole = {
  VIEWER: 'VIEWER',
  SUBSCRIBER: 'SUBSCRIBER',
  VIP: 'VIP',
  MODERATOR: 'MODERATOR',
  CO_HOST: 'CO_HOST',
  GUEST: 'GUEST'
};

exports.SeatTier = exports.$Enums.SeatTier = {
  VIP_FRONT_ROW: 'VIP_FRONT_ROW',
  VIP_BOX: 'VIP_BOX',
  CO_HOST_STAGE: 'CO_HOST_STAGE',
  GUEST_CAMERA: 'GUEST_CAMERA',
  MODERATOR_CHAIR: 'MODERATOR_CHAIR'
};

exports.CoStreamSessionStatus = exports.$Enums.CoStreamSessionStatus = {
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED'
};

exports.CoStreamLayoutMode = exports.$Enums.CoStreamLayoutMode = {
  SIDE_BY_SIDE: 'SIDE_BY_SIDE',
  PICTURE_IN_PICTURE: 'PICTURE_IN_PICTURE',
  GRID: 'GRID',
  ACTIVE_SPEAKER: 'ACTIVE_SPEAKER'
};

exports.CoStreamParticipantRole = exports.$Enums.CoStreamParticipantRole = {
  PRIMARY_HOST: 'PRIMARY_HOST',
  CO_HOST: 'CO_HOST',
  GUEST_CREATOR: 'GUEST_CREATOR'
};

exports.CoStreamParticipantStatus = exports.$Enums.CoStreamParticipantStatus = {
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED'
};

exports.SubscriptionTier = exports.$Enums.SubscriptionTier = {
  BASIC: 'BASIC',
  VIP: 'VIP',
  DIAMOND: 'DIAMOND',
  CUSTOM: 'CUSTOM'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
  PAUSED: 'PAUSED'
};

exports.PaymentGateway = exports.$Enums.PaymentGateway = {
  CCBILL: 'CCBILL',
  SEGPAY: 'SEGPAY',
  EPOCH: 'EPOCH',
  STRIPE: 'STRIPE',
  NOWPAYMENTS: 'NOWPAYMENTS',
  COINBASE_COMMERCE: 'COINBASE_COMMERCE',
  MANUAL_BANK: 'MANUAL_BANK',
  WALLET_CREDITS: 'WALLET_CREDITS'
};

exports.SubscriptionPaymentStatus = exports.$Enums.SubscriptionPaymentStatus = {
  INITIALIZED: 'INITIALIZED',
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  DISPUTED_CHARGEBACK: 'DISPUTED_CHARGEBACK'
};

exports.ProductType = exports.$Enums.ProductType = {
  DIGITAL_DOWNLOAD: 'DIGITAL_DOWNLOAD',
  PHYSICAL_MERCH: 'PHYSICAL_MERCH',
  CUSTOM_SERVICE: 'CUSTOM_SERVICE',
  SHOUTOUT: 'SHOUTOUT',
  VIP_PASS: 'VIP_PASS',
  TOY_CONTROL_PASS: 'TOY_CONTROL_PASS'
};

exports.ContentType = exports.$Enums.ContentType = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  ALBUM: 'ALBUM',
  POST: 'POST',
  BUNDLE: 'BUNDLE'
};

exports.ContentAccessLevel = exports.$Enums.ContentAccessLevel = {
  PUBLIC: 'PUBLIC',
  FOLLOWERS_ONLY: 'FOLLOWERS_ONLY',
  SUBSCRIBERS_ONLY: 'SUBSCRIBERS_ONLY',
  PPV_PURCHASE: 'PPV_PURCHASE',
  TIER_VIP_ONLY: 'TIER_VIP_ONLY'
};

exports.ContentModerationState = exports.$Enums.ContentModerationState = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  RESTRICTED: 'RESTRICTED',
  REMOVED: 'REMOVED',
  APPEALED: 'APPEALED',
  REJECTED: 'REJECTED'
};

exports.JointProductStatus = exports.$Enums.JointProductStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.CoCreatorRole = exports.$Enums.CoCreatorRole = {
  PRIMARY_PRODUCER: 'PRIMARY_PRODUCER',
  CO_STAR: 'CO_STAR',
  FEATURING: 'FEATURING',
  PRIMARY_HOST: 'PRIMARY_HOST',
  CO_HOST: 'CO_HOST',
  SPECIAL_GUEST: 'SPECIAL_GUEST'
};

exports.JointApprovalStatus = exports.$Enums.JointApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.JointEventStatus = exports.$Enums.JointEventStatus = {
  SCHEDULED: 'SCHEDULED',
  COUNTDOWN_ACTIVE: 'COUNTDOWN_ACTIVE',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED'
};

exports.ConversationType = exports.$Enums.ConversationType = {
  DIRECT_DM: 'DIRECT_DM',
  CREATOR_FAN_DM: 'CREATOR_FAN_DM',
  GROUP_CHAT: 'GROUP_CHAT',
  SUPPORT_TICKET: 'SUPPORT_TICKET'
};

exports.MessageType = exports.$Enums.MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  TIP_ATTACHED: 'TIP_ATTACHED',
  PPV_LOCKED_MEDIA: 'PPV_LOCKED_MEDIA',
  SYSTEM_NOTICE: 'SYSTEM_NOTICE',
  PAID_MESSAGE: 'PAID_MESSAGE'
};

exports.RelationshipTier = exports.$Enums.RelationshipTier = {
  STRANGER: 'STRANGER',
  SUPPORTER: 'SUPPORTER',
  SUPERFAN: 'SUPERFAN',
  VIP_DEVOTEE: 'VIP_DEVOTEE',
  SOULMATE: 'SOULMATE',
  ROYAL_PATRON: 'ROYAL_PATRON'
};

exports.WalletStatus = exports.$Enums.WalletStatus = {
  ACTIVE: 'ACTIVE',
  FROZEN_SECURITY: 'FROZEN_SECURITY',
  SUSPENDED_CHARGEBACK: 'SUSPENDED_CHARGEBACK'
};

exports.CreditType = exports.$Enums.CreditType = {
  PURCHASED: 'PURCHASED',
  PROMOTIONAL: 'PROMOTIONAL',
  BONUS: 'BONUS'
};

exports.CreditLotStatus = exports.$Enums.CreditLotStatus = {
  ACTIVE: 'ACTIVE',
  DEPLETED: 'DEPLETED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.WalletTransactionType = exports.$Enums.WalletTransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  LIVE_TIP: 'LIVE_TIP',
  PPV_PURCHASE: 'PPV_PURCHASE',
  SUBSCRIPTION_PAYMENT: 'SUBSCRIPTION_PAYMENT',
  PRODUCT_PURCHASE: 'PRODUCT_PURCHASE',
  INTERACTION_FEE: 'INTERACTION_FEE',
  PRIVATE_BOOKING: 'PRIVATE_BOOKING',
  GOAL_CONTRIBUTION: 'GOAL_CONTRIBUTION',
  GAME_ENTRY_FEE: 'GAME_ENTRY_FEE',
  GAME_JACKPOT_WIN: 'GAME_JACKPOT_WIN',
  PLATFORM_FEE_RAKE: 'PLATFORM_FEE_RAKE',
  REFUND: 'REFUND',
  CHARGEBACK_REVERSAL: 'CHARGEBACK_REVERSAL',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  PROMOTIONAL_GRANT: 'PROMOTIONAL_GRANT',
  BONUS_GRANT: 'BONUS_GRANT',
  CREDIT_EXPIRATION: 'CREDIT_EXPIRATION',
  PAID_MESSAGE: 'PAID_MESSAGE'
};

exports.TransactionDirection = exports.$Enums.TransactionDirection = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  TRANSFER: 'TRANSFER'
};

exports.WalletTransactionStatus = exports.$Enums.WalletTransactionStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED'
};

exports.PaymentTransactionStatus = exports.$Enums.PaymentTransactionStatus = {
  INITIALIZED: 'INITIALIZED',
  PENDING_WEBHOOK: 'PENDING_WEBHOOK',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  DISPUTED_CHARGEBACK: 'DISPUTED_CHARGEBACK',
  REFUNDED: 'REFUNDED'
};

exports.EarningSourceType = exports.$Enums.EarningSourceType = {
  LIVE_TIP: 'LIVE_TIP',
  SUBSCRIPTION: 'SUBSCRIPTION',
  PPV_CONTENT: 'PPV_CONTENT',
  PRIVATE_SESSION: 'PRIVATE_SESSION',
  PRODUCT_SALE: 'PRODUCT_SALE',
  INTERACTION: 'INTERACTION',
  GOAL_REWARD: 'GOAL_REWARD',
  GAME_REWARD: 'GAME_REWARD',
  PLATFORM_BONUS: 'PLATFORM_BONUS',
  PAID_MESSAGE: 'PAID_MESSAGE'
};

exports.EarningClearanceStatus = exports.$Enums.EarningClearanceStatus = {
  PENDING_HOLD: 'PENDING_HOLD',
  CLEARED: 'CLEARED',
  PAID_OUT: 'PAID_OUT',
  REVERSED_FRAUD: 'REVERSED_FRAUD'
};

exports.PayoutMethod = exports.$Enums.PayoutMethod = {
  SEPA_BANK: 'SEPA_BANK',
  ACH_DIRECT: 'ACH_DIRECT',
  MASS_PAY: 'MASS_PAY',
  PAXUM: 'PAXUM',
  COSMO_PAY: 'COSMO_PAY',
  CRYPTO_USDT: 'CRYPTO_USDT',
  WIRE: 'WIRE'
};

exports.PayoutStatus = exports.$Enums.PayoutStatus = {
  REQUESTED: 'REQUESTED',
  UNDER_COMPLIANCE_REVIEW: 'UNDER_COMPLIANCE_REVIEW',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED'
};

exports.InteractionActionType = exports.$Enums.InteractionActionType = {
  TIP_ALERT: 'TIP_ALERT',
  SOUND_EFFECT: 'SOUND_EFFECT',
  VIBRATION_TOY: 'VIBRATION_TOY',
  WHEEL_SPIN: 'WHEEL_SPIN',
  DANCE_REQUEST: 'DANCE_REQUEST',
  COSTUME_CHANGE: 'COSTUME_CHANGE',
  CHAT_PIN: 'CHAT_PIN',
  POLL_VOTE: 'POLL_VOTE',
  CUSTOM_ACTION: 'CUSTOM_ACTION'
};

exports.InteractionPurchaseStatus = exports.$Enums.InteractionPurchaseStatus = {
  PAID: 'PAID',
  QUEUED: 'QUEUED',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED'
};

exports.QueueEntryStatus = exports.$Enums.QueueEntryStatus = {
  PENDING: 'PENDING',
  CURRENTLY_PLAYING: 'CURRENTLY_PLAYING',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED'
};

exports.GoalStatus = exports.$Enums.GoalStatus = {
  ACTIVE: 'ACTIVE',
  REACHED: 'REACHED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

exports.RelationshipXPType = exports.$Enums.RelationshipXPType = {
  LIVE_TIP: 'LIVE_TIP',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  STREAM_WATCH_TIME: 'STREAM_WATCH_TIME',
  PPV_PURCHASE: 'PPV_PURCHASE',
  SUBSCRIPTION_RENEWAL: 'SUBSCRIPTION_RENEWAL',
  GOAL_CONTRIBUTION: 'GOAL_CONTRIBUTION',
  GAME_PARTICIPATION: 'GAME_PARTICIPATION',
  PAID_MESSAGE: 'PAID_MESSAGE'
};

exports.PlatformXPType = exports.$Enums.PlatformXPType = {
  DAILY_LOGIN: 'DAILY_LOGIN',
  FIRST_DEPOSIT: 'FIRST_DEPOSIT',
  WATCH_STREAM: 'WATCH_STREAM',
  UNLOCK_ACHIEVEMENT: 'UNLOCK_ACHIEVEMENT',
  WRITE_REVIEW: 'WRITE_REVIEW',
  COMMUNITY_QUEST: 'COMMUNITY_QUEST',
  LEVEL_UP_BONUS: 'LEVEL_UP_BONUS'
};

exports.AchievementCategory = exports.$Enums.AchievementCategory = {
  FAN_LOYALTY: 'FAN_LOYALTY',
  SPENDING: 'SPENDING',
  WATCH_TIME: 'WATCH_TIME',
  SOCIAL: 'SOCIAL',
  GAMING: 'GAMING',
  CREATOR_MILESTONE: 'CREATOR_MILESTONE'
};

exports.BadgeTier = exports.$Enums.BadgeTier = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  DIAMOND: 'DIAMOND',
  MYTHIC: 'MYTHIC'
};

exports.LeaderboardScope = exports.$Enums.LeaderboardScope = {
  GLOBAL_PLATFORM: 'GLOBAL_PLATFORM',
  CREATOR_ROOM: 'CREATOR_ROOM',
  LIVESTREAM_SESSION: 'LIVESTREAM_SESSION'
};

exports.LeaderboardTimeframe = exports.$Enums.LeaderboardTimeframe = {
  ALL_TIME: 'ALL_TIME',
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY',
  DAILY: 'DAILY',
  STREAM_SESSION: 'STREAM_SESSION'
};

exports.BookingStatus = exports.$Enums.BookingStatus = {
  PENDING_CREATOR_ACCEPT: 'PENDING_CREATOR_ACCEPT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED_BY_FAN: 'CANCELLED_BY_FAN',
  CANCELLED_BY_CREATOR: 'CANCELLED_BY_CREATOR',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW'
};

exports.ReportCategory = exports.$Enums.ReportCategory = {
  UNDERAGE_SUSPICION: 'UNDERAGE_SUSPICION',
  NON_CONSENSUAL_CONTENT: 'NON_CONSENSUAL_CONTENT',
  HARASSMENT_ABUSE: 'HARASSMENT_ABUSE',
  VIOLENCE_THREATS: 'VIOLENCE_THREATS',
  COPYRIGHT_INFRINGEMENT: 'COPYRIGHT_INFRINGEMENT',
  FINANCIAL_FRAUD: 'FINANCIAL_FRAUD',
  SPAM_SCAM: 'SPAM_SCAM',
  TOY_SAFETY_VIOLATION: 'TOY_SAFETY_VIOLATION',
  OTHER: 'OTHER'
};

exports.ReportStatus = exports.$Enums.ReportStatus = {
  OPEN: 'OPEN',
  ASSIGNED_TO_MODERATOR: 'ASSIGNED_TO_MODERATOR',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACTION_TAKEN: 'ACTION_TAKEN',
  RESOLVED_DISMISSED: 'RESOLVED_DISMISSED',
  ESCALATED_LEGAL: 'ESCALATED_LEGAL'
};

exports.ReportedObjectType = exports.$Enums.ReportedObjectType = {
  CONTENT: 'CONTENT',
  ACCOUNT: 'ACCOUNT',
  CREATOR: 'CREATOR',
  LIVESTREAM: 'LIVESTREAM',
  MESSAGE: 'MESSAGE',
  COMMENT: 'COMMENT'
};

exports.ModerationPriority = exports.$Enums.ModerationPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL_URGENT_UNDERAGE: 'CRITICAL_URGENT_UNDERAGE'
};

exports.ModerationCaseStatus = exports.$Enums.ModerationCaseStatus = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  AWAITING_ID_REAUTH: 'AWAITING_ID_REAUTH',
  ESCALATED_LEGAL: 'ESCALATED_LEGAL',
  CLOSED_RESOLVED: 'CLOSED_RESOLVED'
};

exports.ModerationActionType = exports.$Enums.ModerationActionType = {
  NONE: 'NONE',
  WARNING_MESSAGE: 'WARNING_MESSAGE',
  SHADOWBAN: 'SHADOWBAN',
  TEMPORARY_SUSPENSION: 'TEMPORARY_SUSPENSION',
  PERMANENT_BAN: 'PERMANENT_BAN',
  COMPLIANCE_2257_REVOCATION: 'COMPLIANCE_2257_REVOCATION',
  NCMEC_LEGAL_ESCALATION: 'NCMEC_LEGAL_ESCALATION'
};

exports.AppealStatus = exports.$Enums.AppealStatus = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  CREATOR_WENT_LIVE: 'CREATOR_WENT_LIVE',
  TIP_RECEIVED: 'TIP_RECEIVED',
  NEW_SUBSCRIBER: 'NEW_SUBSCRIBER',
  SUB_RENEWAL: 'SUB_RENEWAL',
  INTERACTION_QUEUED: 'INTERACTION_QUEUED',
  INTERACTION_EXECUTED: 'INTERACTION_EXECUTED',
  GOAL_REACHED: 'GOAL_REACHED',
  GOAL_COMPLETED: 'GOAL_COMPLETED',
  PRIVATE_BOOKING_REQUEST: 'PRIVATE_BOOKING_REQUEST',
  PRIVATE_BOOKING_CONFIRMED: 'PRIVATE_BOOKING_CONFIRMED',
  PRIVATE_SESSION_REMINDER: 'PRIVATE_SESSION_REMINDER',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  CONTENT_RELEASE: 'CONTENT_RELEASE',
  CREATOR_EVENT: 'CREATOR_EVENT',
  DROP_RELEASE: 'DROP_RELEASE',
  MODERATION_WARNING: 'MODERATION_WARNING',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED'
};

exports.GameType = exports.$Enums.GameType = {
  SPIN_THE_WHEEL: 'SPIN_THE_WHEEL',
  TRIVIA_ARENA: 'TRIVIA_ARENA',
  MYSTERY_BOX: 'MYSTERY_BOX',
  PLINKO_DROP: 'PLINKO_DROP',
  DUEL_CHALLENGE: 'DUEL_CHALLENGE'
};

exports.GameSessionStatus = exports.$Enums.GameSessionStatus = {
  LOBBY_WAITING: 'LOBBY_WAITING',
  ACTIVE_IN_PROGRESS: 'ACTIVE_IN_PROGRESS',
  CALCULATING_RESULTS: 'CALCULATING_RESULTS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.GameRewardType = exports.$Enums.GameRewardType = {
  CREDITS_JACKPOT: 'CREDITS_JACKPOT',
  PPV_CONTENT_FREE: 'PPV_CONTENT_FREE',
  VIP_BADGE_PASS: 'VIP_BADGE_PASS',
  FREE_SUB_MONTH: 'FREE_SUB_MONTH',
  EXCLUSIVE_SHOUTOUT: 'EXCLUSIVE_SHOUTOUT',
  PHYSICAL_GIFT: 'PHYSICAL_GIFT',
  XP_BOOST: 'XP_BOOST'
};

exports.RecommendationEventType = exports.$Enums.RecommendationEventType = {
  IMPRESSION: 'IMPRESSION',
  SWIPE: 'SWIPE',
  WATCH: 'WATCH',
  EXIT: 'EXIT',
  FOLLOW: 'FOLLOW',
  UNFOLLOW: 'UNFOLLOW',
  LIKE: 'LIKE',
  CHAT: 'CHAT',
  GIFT: 'GIFT',
  INTERACTION: 'INTERACTION',
  SUBSCRIPTION: 'SUBSCRIPTION',
  CONTENT_PURCHASE: 'CONTENT_PURCHASE',
  PRIVATE_SESSION: 'PRIVATE_SESSION',
  SEARCH: 'SEARCH',
  CREATOR_PROFILE_VIEW: 'CREATOR_PROFILE_VIEW'
};

exports.Prisma.ModelName = {
  User: 'User',
  CreatorProfile: 'CreatorProfile',
  CreatorVerification: 'CreatorVerification',
  AgeAssuranceRecord: 'AgeAssuranceRecord',
  Follow: 'Follow',
  Livestream: 'Livestream',
  LivestreamParticipant: 'LivestreamParticipant',
  Seat: 'Seat',
  CoStreamSession: 'CoStreamSession',
  CoStreamParticipant: 'CoStreamParticipant',
  SubscriptionProduct: 'SubscriptionProduct',
  Subscription: 'Subscription',
  SubscriptionPayment: 'SubscriptionPayment',
  Product: 'Product',
  Content: 'Content',
  ContentPurchase: 'ContentPurchase',
  JointProduct: 'JointProduct',
  JointProductCoCreator: 'JointProductCoCreator',
  JointEvent: 'JointEvent',
  JointEventCoHost: 'JointEventCoHost',
  JointProductPurchase: 'JointProductPurchase',
  JointEventTicket: 'JointEventTicket',
  Conversation: 'Conversation',
  Message: 'Message',
  Wallet: 'Wallet',
  CreditLot: 'CreditLot',
  CreditLotDeduction: 'CreditLotDeduction',
  WalletTransaction: 'WalletTransaction',
  PaymentTransaction: 'PaymentTransaction',
  CreatorEarning: 'CreatorEarning',
  Payout: 'Payout',
  InteractionDefinition: 'InteractionDefinition',
  InteractionPurchase: 'InteractionPurchase',
  InteractionQueueEntry: 'InteractionQueueEntry',
  CollectiveGoal: 'CollectiveGoal',
  GoalContribution: 'GoalContribution',
  CreatorRelationship: 'CreatorRelationship',
  RelationshipXPEvent: 'RelationshipXPEvent',
  PlatformXPEvent: 'PlatformXPEvent',
  Achievement: 'Achievement',
  UserAchievement: 'UserAchievement',
  LeaderboardRecord: 'LeaderboardRecord',
  PrivateSessionAvailability: 'PrivateSessionAvailability',
  Booking: 'Booking',
  Report: 'Report',
  ModerationCase: 'ModerationCase',
  AuditEvent: 'AuditEvent',
  Notification: 'Notification',
  GameSession: 'GameSession',
  GameReward: 'GameReward',
  RecommendationEvent: 'RecommendationEvent',
  RiskAssessmentRecord: 'RiskAssessmentRecord',
  DeviceFingerprintRecord: 'DeviceFingerprintRecord',
  PaymentInstrumentFingerprint: 'PaymentInstrumentFingerprint',
  WalletHold: 'WalletHold'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
