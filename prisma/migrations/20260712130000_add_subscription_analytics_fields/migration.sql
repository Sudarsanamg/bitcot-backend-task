ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "amount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "Subscription"
SET "expiresAt" = "expiryDate"
WHERE "expiresAt" IS NULL;

WITH latest_order_amounts AS (
	SELECT DISTINCT ON ("providerSubscriptionId")
		"providerSubscriptionId",
		amount
	FROM "Order"
	WHERE "providerSubscriptionId" IS NOT NULL
	ORDER BY "providerSubscriptionId", "createdAt" DESC
)
UPDATE "Subscription" AS s
SET "amount" = latest_order_amounts.amount
FROM latest_order_amounts
WHERE s."providerSubscriptionId" = latest_order_amounts."providerSubscriptionId";