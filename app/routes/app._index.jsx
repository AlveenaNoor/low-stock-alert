import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  console.log(JSON.stringify(session, null, 2));

  const settings =await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop, threshold: 5 },
  })

  const response = await admin.graphql(`
    #graphql
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const products = data.data.products.edges.map(({ node }) => node);

  return { products , settings};
};

export default function Index() {
  const { products, settings } = useLoaderData();

  return (
    <s-page heading="Low Stock Dashboard">
      <s-section heading="All Products">
        {products.map((product) =>
          product.variants.edges.map(({ node: variant }) => (
            <s-box key={variant.id} padding="base" borderWidth="base" borderRadius="base">
              <s-text>{product.title} — {variant.title}: {variant.inventoryQuantity} units {variant.inventoryQuantity < settings.threshold ? '🔴 LOW STOCK' : " "} </s-text>
            </s-box>
          ))
        )}
      </s-section>
    </s-page>
  );
}