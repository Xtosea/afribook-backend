{
    user,

    type: [
        "deposit",
        "withdrawal",
        "transfer",
        "conversion",
        "purchase",
        "ad",
        "boost",
        "premium",
        "marketplace",
        "badge",
        "refund"
    ],

    paymentMethod: [
        "wallet",
        "paystack",
        "bank_transfer",
        "card",
        "ussd"
    ],

    amount,

    reference,

    status: [
        "pending",
        "success",
        "failed",
        "cancelled"
    ],

    description,

    metadata: Object
}