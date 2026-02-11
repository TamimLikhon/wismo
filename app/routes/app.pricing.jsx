import { useLoaderData, Form } from "react-router";
import { authenticate } from "../shopify.server";

// Define our plans here
export const PLANS = [
  {
    name: "Free",
    price: 0,
    interval: "EVERY_30_DAYS",
    test: true, // For development stores
    features: [
      "50 Lookups / Month",
      "Standard Branding",
      "Email Support"
    ],
  },
  {
    name: "Pro",
    price: 29,
    interval: "EVERY_30_DAYS",
    test: true,
    features: [
      "Unlimited Lookups",
      "Remove 'Powered by WISMO'",
      "Upsell Engine (Show Products on Tracking Page)",
      "Priority Support"
    ],
    isPopular: true
  }
];

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const billingCheck = await billing.require({
    plans: [PLANS[1].name], // Check if they have the Pro plan
    isTest: true,
    onFailure: async () => billing.request({ plan: PLANS[1].name, isTest: true }), // Redirect to payment if failed
  });

  return Response.json({ plans: PLANS });
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const planName = formData.get("plan");
  
  const selectedPlan = PLANS.find((p) => p.name === planName);
  
  if (selectedPlan) {
    // Redirect them to Shopify's billing approval page
    const response = await billing.request({
      plan: selectedPlan.name,
      isTest: true, // Important for dev stores!
      returnUrl: `https://${process.env.SHOPIFY_APP_URL}/app`,
    });
    return response;
    // Note: billing.request usually returns a redirect Response, so we can just return it.
    // If it throws, we might need to handle it, but for now we follow the pattern.
  }
  
  return null;
};

export default function Pricing() {
  const { plans } = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>Choose Your Plan</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {plans.map((plan) => (
          <div key={plan.name} style={{ 
            border: plan.isPopular ? "2px solid #008060" : "1px solid #ccc",
            borderRadius: "8px",
            padding: "30px",
            textAlign: "center",
            position: "relative",
            backgroundColor: "white"
          }}>
            {plan.isPopular && (
              <span style={{ 
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", 
                backgroundColor: "#008060", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8em", fontWeight: "bold" 
              }}>
                MOST POPULAR
              </span>
            )}
            
            <h2>{plan.name}</h2>
            <div style={{ fontSize: "2.5em", fontWeight: "bold", margin: "20px 0" }}>
              ${plan.price}<span style={{ fontSize: "0.4em", fontWeight: "normal", color: "#666" }}>/mo</span>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, textAlign: "left", margin: "20px 0" }}>
              {plan.features.map((feature) => (
                <li key={feature} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  ✅ {feature}
                </li>
              ))}
            </ul>
            
            <Form method="post">
              <input type="hidden" name="plan" value={plan.name} />
              <button type="submit" style={{
                width: "100%",
                padding: "12px",
                backgroundColor: plan.isPopular ? "#008060" : "white",
                color: plan.isPopular ? "white" : "#333",
                border: plan.isPopular ? "none" : "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1em"
              }}>
                {plan.price === 0 ? "Select Free Plan" : "Upgrade to Pro"}
              </button>
            </Form>
          </div>
        ))}
      </div>
    </div>
  );
}
