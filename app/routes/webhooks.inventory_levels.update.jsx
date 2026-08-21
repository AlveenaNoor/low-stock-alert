// import { authenticate } from "../shopify.server";
// import prisma from "../db.server"
// import transporter from "../mail.server"

// export const action = async ({ request }) => {
//     const { shop, topic, payload, admin } = await authenticate.webhook(request);
//     const settings = await prisma.settings.findUnique({
//         where: { shop: shop },
//         select: { threshold: true, email: true }
//     });
//         if (!settings || !settings.email) {
//         return new Response("No merchant settings found", { status: 200 });
//     }
//     const threshold = settings.threshold;
//     if (payload.available < threshold) {
//         try {
//             const gid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;
//             const response = await admin.graphql(`
//             #graphql
//             query {
//   inventoryItem(id: "${gid}") {
//             variant {
//             displayName
//       product {
//             title
//         }
//     }
// } 
//      }
// `)
//             const merchantEmail = settings.email;
//             if (!merchantEmail) {
//                 return new Response();
//             }

//             const data = await response.json();
//             const product = data.data.inventoryItem.variant.product.title;
//             await transporter.sendMail({
//                 from: process.env.GMAIL_USER,
//                 to: merchantEmail,
//                 subject: `${product} stock alert`,
//                 text: `${product} is running low — only ${payload.available} units left, below your threshold of ${threshold}. Check your dashboard for details.`,
//             })

//         } catch (error) {
//             console.error("Webhook processing failed:", error);
//         }
//         return new Response();
//     }

//     return new Response();
// };

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import transporter from "../mail.server";

export const action = async ({ request }) => {
    const { shop, topic, payload, admin } = await authenticate.webhook(request);
    
    const settings = await prisma.settings.findUnique({
        where: { shop: shop },
        select: { threshold: true, email: true }
    });
    
    if (!settings || !settings.email) {
        return new Response("No merchant settings found", { status: 200 });
    }
    
    const threshold = settings.threshold;
    
    if (payload.available < threshold) {
        try {
            const gid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;
            
            // FIX 1: Pass the variables object as the second argument to admin.graphql
            const response = await admin.graphql(`
                #graphql
                query getProductTitle($id: ID!) {
                    inventoryItem(id: $id) {
                        inventoryLevels(first: 1) {
                            nodes {
                                item {
                                    variants(first: 1) {
                                        nodes {
                                            product {
                                                title
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `, {
                variables: { id: gid }
            });

            const merchantEmail = settings.email;
            if (!merchantEmail) {
                return new Response("No email found", { status: 200 });
            }

            const data = await response.json();
            
            // FIX 2 & 3: Safely dig through the new array structure using optional chaining
            const product = data?.data?.inventoryItem?.inventoryLevels?.nodes?.[0]?.item?.variants?.nodes?.[0]?.product?.title || "Low Stock Item";
            
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: merchantEmail,
                subject: `${product} stock alert`,
                text: `${product} is running low — only ${payload.available} units left, below your threshold of ${threshold}. Check your dashboard for details.`,
            });

        } catch (error) {
            console.error("Webhook processing failed:", error);
            // Return a 200 even on error so Shopify doesn't relentlessly retry a broken execution loop
            return new Response("Processing Error", { status: 200 });
        }
        return new Response("Success", { status: 200 });
    }

    return new Response("No Action Needed", { status: 200 });
};
