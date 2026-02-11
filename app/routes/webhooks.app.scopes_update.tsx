import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[]; // eslint-disable-line @typescript-eslint/no-unused-vars
    // Verify usage with Supabase or Shopify session storage if needed, but removing Prisma for now.
    if (session) {
      console.log("Scopes updated for session:", session.id);
    }
    return new Response();
};
