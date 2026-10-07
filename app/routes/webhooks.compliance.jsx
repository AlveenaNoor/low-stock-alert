import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // You don't store customer PII — only shop + merchant email in Settings.
      // Nothing to return here since you hold no customer data.
      break;

    case "CUSTOMERS_REDACT":
      // Same reasoning — no customer data stored, nothing to delete.
      break;

    case "SHOP_REDACT":
      // This one applies to you: delete the shop's row from Settings
      // 48h after uninstall, since it holds the merchant's email/threshold.
      await prisma.settings.delete({ where: { shop } }).catch(() => {});
      await prisma.lowStockAlert.deleteMany({ where: { shop } });
      break;

    default:
      return new Response("Unhandled topic", { status: 404 });
  }

  return new Response(null, { status: 200 });
};