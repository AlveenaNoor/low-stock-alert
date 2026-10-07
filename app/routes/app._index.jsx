// import { useLoaderData, Link } from "react-router";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);

//   const url = new URL(request.url);
//   const cursor = url.searchParams.get("cursor");
//   const direction = url.searchParams.get("direction") || "next";

//   const settings = await prisma.settings.upsert({
//     where: { shop: session.shop },
//     update: {},
//     create: { shop: session.shop, threshold: 5 },
//   });

//   const query =
//     direction === "prev"
//       ? `
//     #graphql
//     query getProducts($cursor: String) {
//       products(last: 10, before: $cursor) {
//         pageInfo {
//           hasNextPage
//           hasPreviousPage
//           endCursor
//           startCursor
//         }
//         edges {
//           node {
//             id
//             title
//             variants(first: 10) {
//               edges {
//                 node {
//                   id
//                   title
//                   inventoryQuantity
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `
//       : `
//     #graphql
//     query getProducts($cursor: String) {
//       products(first: 10, after: $cursor) {
//         pageInfo {
//           hasNextPage
//           hasPreviousPage
//           endCursor
//           startCursor
//         }
//         edges {
//           node {
//             id
//             title
//             variants(first: 10) {
//               edges {
//                 node {
//                   id
//                   title
//                   inventoryQuantity
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const response = await admin.graphql(query, {
//     variables: { cursor },
//   });

//   const data = await response.json();
//   if (data.errors) {
//     console.error("GraphQL errors:", JSON.stringify(data.errors));
//   }

//   const products = data.data.products.edges.map(({ node }) => node);
//   const pageInfo = data.data.products.pageInfo;

//   return { products, settings, pageInfo };
// };

// export default function Index() {
//   const { products, settings, pageInfo } = useLoaderData();

//   return (
//     <s-page heading="Low Stock Dashboard">
//       <s-section heading="All Products">
//         {products.map((product) =>
//           product.variants.edges.map(({ node: variant }) => (
//             <s-box
//               key={variant.id}
//               padding="base"
//               borderWidth="base"
//               borderRadius="base"
//             >
//               <s-text>
//                 {product.title} — {variant.title}: {variant.inventoryQuantity}{" "}
//                 units{" "}
//                 {variant.inventoryQuantity < settings.threshold
//                   ? "🔴 LOW STOCK"
//                   : " "}
//               </s-text>
//             </s-box>
//           )),
//         )}

//         <s-box padding="base">
//           <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
//             {pageInfo.hasPreviousPage && (
//               <Link to={`?cursor=${pageInfo.startCursor}&direction=prev`}>
//                 <s-button variant="secondary">Previous</s-button>
//               </Link>
//             )}
//             {pageInfo.hasNextPage && (
//               <Link to={`?cursor=${pageInfo.endCursor}&direction=next`}>
//                 <s-button variant="primary">Next</s-button>
//               </Link>
//             )}
//           </div>
//         </s-box>
//       </s-section>
//     </s-page>
//   );
// }

import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";

  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop, threshold: 5 },
  });

  const query =
    direction === "prev"
      ? `
    #graphql
    query getVariants($cursor: String) {
      productVariants(last: 10, before: $cursor) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        edges {
          node {
            id
            title
            inventoryQuantity
            product {
              title
            }
          }
        }
      }
    }
  `
      : `
    #graphql
    query getVariants($cursor: String) {
      productVariants(first: 10, after: $cursor) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        edges {
          node {
            id
            title
            inventoryQuantity
            product {
              title
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query, {
    variables: { cursor },
  });

  const data = await response.json();
  if (data.errors) {
    console.error("GraphQL errors:", JSON.stringify(data.errors));
  }

  const variants = data.data.productVariants.edges.map(({ node }) => node);
  const pageInfo = data.data.productVariants.pageInfo;

  return { variants, settings, pageInfo };
};

export default function Index() {
  const { variants, settings, pageInfo } = useLoaderData();

  return (
    <s-page heading="Low Stock Dashboard">
      <s-section heading="All Products">
        {variants.map((variant) => (
          <s-box
            key={variant.id}
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-text>
              {variant.product.title} — {variant.title}:{" "}
              {variant.inventoryQuantity} units{" "}
              {variant.inventoryQuantity < settings.threshold
                ? "🔴 LOW STOCK"
                : " "}
            </s-text>
          </s-box>
        ))}

        <s-box padding="base">
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            {pageInfo.hasPreviousPage && (
              <Link to={`?cursor=${pageInfo.startCursor}&direction=prev`}>
                <s-button variant="secondary">Previous</s-button>
              </Link>
            )}
            {pageInfo.hasNextPage && (
              <Link to={`?cursor=${pageInfo.endCursor}&direction=next`}>
                <s-button variant="primary">Next</s-button>
              </Link>
            )}
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}