
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import transporter from "../mail.server";

export const action = async ({ request }) => {
    const { shop, payload, admin } = await authenticate.webhook(request);

    const settings = await prisma.settings.findUnique({
        where: { shop: shop },
        select: { threshold: true, email: true }
    });

    if (!settings || !settings.email) {
        return new Response("No merchant settings found", { status: 200 });
    }

    const threshold = settings.threshold;
    const gid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;

    if (payload.available < threshold) {
        const alreadyAlerted = await prisma.lowStockAlert.findUnique({
            where: { shop_inventoryItemId: { shop, inventoryItemId: gid } }
        });
        if (alreadyAlerted) {
            return new Response("Already alerted", { status: 200 });
        }
        try {
            const response = await admin.graphql(`
                #graphql
                query getProductTitle($id: ID!) {
    inventoryItem(id: $id) {
        variant {
            product {
                title
            }
        }
    }
}
            `, {
                variables: { id: gid }
            });

            const data = await response.json();
            if (data.errors) {
                console.error("GraphQL errors:", JSON.stringify(data.errors));
            }
            // FIX 2 & 3: Safely dig through the new array structure using optional chaining
            const product = data?.data?.inventoryItem?.variant?.product?.title || "Low Stock Item";
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: settings.email,
                subject: `${product} stock alert`,
                text: `${product} is running low — only ${payload.available} units left, below your threshold of ${threshold}. Check your dashboard for details.`,
            });
            await prisma.lowStockAlert.create({
                data: { shop, inventoryItemId: gid }
            });

        } catch (error) {
            console.error("Webhook processing failed:", error);
            // Return a 200 even on error so Shopify doesn't relentlessly retry a broken execution loop
            return new Response("Processing Error", { status: 200 });
        }
        return new Response("Success", { status: 200 });
    }

    await prisma.lowStockAlert.deleteMany({
        where: { shop, inventoryItemId: gid }
    });

    return new Response("No Action Needed", { status: 200 });
};
