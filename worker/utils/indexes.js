export async function ensureApplicationIndexes(db) {
  // ------------------------------------------------------------
  // KYC
  // One KYC record per seller.
  // ------------------------------------------------------------
  await db.collection("sellerkycs").createIndex(
    { user: 1 },
    { unique: true }
  );

  await db.collection("sellerkycs").createIndex(
    { status: 1, submittedAt: 1 }
  );

  // ------------------------------------------------------------
  // PREMIUM SUBSCRIPTIONS
  // Allows fast lookup of an active Premium subscription.
  // ------------------------------------------------------------
  await db.collection("subscriptions").createIndex(
    {
      user: 1,
      plan: 1,
      status: 1,
      expiresAt: 1,
    }
  );

  await db.collection("subscriptions").createIndex(
    { transactionReference: 1 },
    {
      unique: true,
      sparse: true,
    }
  );

  return true;
}