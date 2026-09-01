import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useLoaderData, useActionData, Form } from "react-router";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const email = session.onlineAccessInfo?.associated_user?.email;
  console.log("SETTINGS LOADER — extracted email:", email);

  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: email ? { email } : {},
    create: { shop: session.shop, threshold: 5, email },
  });

  console.log("SETTINGS LOADER — saved settings:", JSON.stringify(settings));

  return settings;
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const threshold = Number(formData.get("threshold"));
    if (threshold <= 0) {
        return { error: "Threshold must be greater than 0" };
    }

    await prisma.settings.upsert({
        where: { shop: session.shop },
        update: { threshold },
        create: { shop: session.shop, threshold }
    })
    return { success: true }
}

export default function Settings() {
    const { threshold } = useLoaderData();
    const actionData = useActionData();
    return (
        <s-page heading="Settings">
            <s-section heading="Low Stock Threshold">
                <Form method="post">
                    <input type="number" name="threshold" defaultValue={threshold} min="1" />
                    <button type="submit">Save</button>
                </Form>
                {actionData?.error && <s-text tone="critical">{actionData.error}</s-text>}
                {actionData?.success && <s-text tone="success">Saved!</s-text>}
            </s-section>
        </s-page>
    )
}