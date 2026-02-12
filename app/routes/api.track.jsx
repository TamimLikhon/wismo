import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

// This is the API endpoint: /api/track
// Accessed via App Proxy: https://example.com/apps/track?orderName=1001&email=customer@example.com

export const loader = async ({ request }) => {
  // 1. Authenticate the request coming from Shopify Proxy
  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const orderName = url.searchParams.get("orderName"); // e.g., "1001"
  const email = url.searchParams.get("email");

  if (!orderName || !email) {
    return Response.json({ error: "Missing order number or email" }, { status: 400 });
  }

  try {
    // 2. Search for the order in Shopify using Admin GraphQL
    const response = await admin.graphql(
      `#graphql
      query getOrder($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              email
              displayFulfillmentStatus
              fulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              fulfillments(first: 5) {
                trackingInfo(first: 5) {
                  number
                  url
                  company
                }
              }
              lineItems(first: 10) {
                edges {
                  node {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          query: `name:${orderName} AND email:${email}`
        },
      }
    );

    const data = await response.json();
    const order = data.data.orders.edges[0]?.node;

    // 3. Fetch Upsell Settings from Supabase
    const { data: settings } = await supabase
      .from("wismo_settings")
      .select("*")
      .eq("shop", session.shop)
      .single();
    
    // 4. Upsell Logic (Mocked product fetching for now, using settings)
    let upsellData = null;
    if (settings?.is_enabled) {
        upsellData = {
            title: settings.upsell_title || "You might also like",
            collectionId: settings.upsell_collection_id,
            products: [
                // In a real scenario, we'd fetch products from the collection via Admin API here
                { title: "Cool Socks", price: "$10.00", image: "https://via.placeholder.com/100", url: "/products/cool-socks" },
                { title: "Matching Hat", price: "$25.00", image: "https://via.placeholder.com/100", url: "/products/matching-hat" }
            ]
        };
    }

    if (order) {
        // Transform Shopify Data to simplified JSON
        const fulfillment = order.fulfillments[0];
        const tracking = fulfillment?.trackingInfo[0];

        return Response.json({
            found: true,
            status: order.displayFulfillmentStatus,
            tracking: tracking ? {
                carrier: tracking.company,
                number: tracking.number,
                url: tracking.url
            } : null,
            items: order.lineItems.edges.map(edge => edge.node.name),
            estimatedDelivery: "Calculated based on carrier...", // Placeholder
            upsell: upsellData
        });
    } else {
        return Response.json({ 
            found: false, 
            message: "We couldn't find an order with that number and email." 
        }, { status: 404 });
    }

  } catch (error) {
    console.error("Tracking API Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
