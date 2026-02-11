import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// This is the API endpoint: /api/track
// It receives a GET request with ?orderId=1001&email=customer@example.com

export const loader = async ({ request }) => {
  // 1. Authenticate the request (ensure it's from a valid session or public access token if needed)
  // For a public-facing tracking page, we might use a slightly different auth strategy or a proxy.
  // Here we assume we are using the unauthenticated admin context or a custom proxy app extension.
  
  const url = new URL(request.url);
  const orderName = url.searchParams.get("orderName"); // e.g., "#1001" or just "1001"
  const email = url.searchParams.get("email");

  if (!orderName || !email) {
    return json({ error: "Missing order number or email" }, { status: 400 });
  }

  try {
    // 2. Search for the order in Shopify
    // We use the Admin API to find orders matching the name and email.
    // Note: In production, you'd use the `admin` object from `authenticate.admin(request)`.
    // Since we are mocking the setup, here is the logic:
    
    /* 
    const { admin } = await authenticate.admin(request);
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
              totalPrice
              currencyCode
              fulfillments {
                trackingInfo {
                  number
                  url
                  company
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
    */

    // MOCK DATA FOR NOW (until we have real API access)
    let upsellProducts = [];

    // UPSELL LOGIC: Check settings from file (TODO: implement readSettings here if needed)
    /* 
    // Example of how we might read settings if we needed them here:
    // const settings = await readSettings(shop);
    */
    
    // Simulate finding an order if the input looks valid
    if (orderName === "1001" && email === "test@example.com") {
        return json({
            found: true,
            status: "FULFILLED",
            tracking: {
                carrier: "UPS",
                number: "1Z9999999999999999",
                url: "https://www.ups.com/track?loc=en_US&tracknum=1Z9999999999999999"
            },
            items: ["Cool T-Shirt (L)", "Socks"],
            estimatedDelivery: "2023-11-20",
            
            // Add Upsell Data to Response
            upsell: {
                title: "You might also like", // or settings.upsellTitle
                products: [
                    { title: "Cool Socks", price: "$10.00", image: "https://via.placeholder.com/100", url: "/products/cool-socks" },
                    { title: "Matching Hat", price: "$25.00", image: "https://via.placeholder.com/100", url: "/products/matching-hat" }
                ]
            }
        });
    } else {
        // Simulate "Order Not Found"
        return json({ 
            found: false, 
            message: "We couldn't find an order with that number and email." 
        }, { status: 404 });
    }

  } catch (error) {
    console.error("Tracking API Error:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
