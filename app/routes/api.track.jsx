import shopify from "../shopify.server";
import { supabase } from "../supabase.server";

// This is the API endpoint: /api/track
// Accessed via App Proxy: https://example.com/apps/track?orderName=1001&email=customer@example.com

export const loader = async ({ request }) => {
  // 1. Authenticate the request coming from Shopify Proxy
  console.log("-----------------------[Request Start]----------------------------");
  
  const url = new URL(request.url);
  console.log("Proxy Request URL:", url.toString());

  try {
    let session = null;
    let admin = null;
    const shopDomain = url.searchParams.get("shop");

    // 1. Try standard App Proxy authentication
    try {
      const authResult = await shopify.authenticate.public.appProxy(request);
      session = authResult.session;
      admin = authResult.admin;
      console.log("App Proxy auth succeeded. Session shop:", session?.shop);
    } catch (authError) {
      if (authError instanceof Response) throw authError;
      console.warn("App Proxy Auth failed:", authError.message);
    }

    // 2. Dev mode fallback
    const isDev = process.env.NODE_ENV === "development";

    if (!session && isDev && shopDomain) {
      console.warn("⚠️ DEV MODE: No session found. Creating mock session.");
      session = { shop: shopDomain };
    }

    // 3. Authorization check
    if (!session) {
      return Response.json({
        error: "Unauthorized",
        message: "Must be accessed via App Proxy"
      }, { status: 401 });
    }

    // 4. Admin client check
    if (!admin && session.shop) {
         try {
            admin = (await shopify.unauthenticated.admin(session.shop)).admin;
            console.log("Obtained unauthenticated admin client.");
         } catch (e) {
            console.warn("Failed to get unauthenticated admin:", e.message);
         }
    }
    
    // Mock admin for dev if still missing
    if (!admin && isDev) {
        console.warn("⚠️ DEV MODE: Using mock admin.");
        admin = {
            graphql: async () => ({
                json: async () => ({ data: { orders: { edges: [] } } })
            })
        };
    }

    if (!admin) {
        return Response.json({
            error: "Service unavailable",
            message: "Could not connect to Shopify API."
        }, { status: 503 });
    }

    const orderName = url.searchParams.get("orderName");
    const email = url.searchParams.get("email");

    if (!orderName || !email) {
      return Response.json({ error: "Missing order number or email" }, { status: 400 });
    }

    // Normalize Inputs
    const normalizedEmail = email.toLowerCase().trim();
    let normalizedOrderName = orderName.trim();
    // Prepend # if it's purely numeric
    if (/^\d+$/.test(normalizedOrderName)) {
      normalizedOrderName = `#${normalizedOrderName}`;
    }

    // 5. Query Shopify for Order (Name Only)
    // FIX: Wrapping name in single quotes to handle special characters like #
    console.log(`Querying Shopify for order: name:'${normalizedOrderName}'`);
    
    const orderResponse = await admin.graphql(
      `#graphql
      query getOrder($query: String!) {
        orders(first: 5, query: $query) {
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
      { variables: { query: `name:'${normalizedOrderName}'` } }
    );

    const orderData = await orderResponse.json();
    
    if (orderData.errors) {
        console.error("Shopify GraphQL Errors (Order):", JSON.stringify(orderData.errors));
    }

    // Filter for email match
    const potentialOrders = orderData.data?.orders?.edges?.map(e => e.node) || [];
    const order = potentialOrders.find(o => o.email && o.email.toLowerCase() === normalizedEmail);

    // 6. Fetch Upsell Settings & Products
    let upsellData = null;
    try {
        const { data: settings } = await supabase
            .from("wismo_settings")
            .select("*")
            .eq("shop", session.shop)
            .maybeSingle();

        if (settings?.is_enabled && settings.upsell_collection_id) {
            // FIX: Normalize Collection ID to GID format
            const collectionId = settings.upsell_collection_id.startsWith("gid://")
                ? settings.upsell_collection_id
                : `gid://shopify/Collection/${settings.upsell_collection_id}`;

            const productsResponse = await admin.graphql(
                `#graphql
                query getCollectionProducts($id: ID!) {
                    collection(id: $id) {
                        products(first: 4) {
                            edges {
                                node {
                                    id
                                    title
                                    handle
                                    featuredImage {
                                        url
                                    }
                                    priceRangeV2 {
                                        minVariantPrice {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    onlineStoreUrl
                                }
                            }
                        }
                    }
                }`,
                { variables: { id: collectionId } }
            );
            
            const productsData = await productsResponse.json();
             if (productsData.errors) {
                console.warn("Shopify GraphQL Errors (Products):", JSON.stringify(productsData.errors));
            }

            const products = productsData.data?.collection?.products?.edges?.map(e => {
                const p = e.node;
                return {
                    title: p.title,
                    price: p.priceRangeV2?.minVariantPrice?.amount 
                        ? `${p.priceRangeV2.minVariantPrice.amount} ${p.priceRangeV2.minVariantPrice.currencyCode}` 
                        : "Check Price",
                    image: p.featuredImage?.url || "",
                    url: p.onlineStoreUrl || `/products/${p.handle}`
                };
            }) || [];

            if (products.length > 0) {
                upsellData = {
                    title: settings.upsell_title || "You might also like",
                    collectionId: collectionId,
                    products
                };
            }
        }
    } catch (e) {
        console.warn("Upsell fetch failed:", e.message);
    }

    // 7. Construct Response
    if (order) {
       const fulfillment = order.fulfillments?.[0];
       const tracking = fulfillment?.trackingInfo?.[0];

       return Response.json({
         found: true,
         status: order.displayFulfillmentStatus,
         tracking: tracking ? {
           carrier: tracking.company,
           number: tracking.number,
           url: tracking.url
         } : null,
         items: order.lineItems?.edges?.map(edge => edge.node.name) || [],
         estimatedDelivery: "Calculated based on carrier...", 
         upsell: upsellData
       });
    } else {
       return Response.json({
         found: false,
         message: "We couldn't find an order with that number and email."
       }, { status: 404 });
    }

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("API Error:", error);
    return Response.json({ 
        error: "Internal Server Error", 
        message: "Something went wrong. Please try again later." 
    }, { status: 500 });
  } finally {
    console.log("-----------------------[Request End]----------------------------");
  }
}
