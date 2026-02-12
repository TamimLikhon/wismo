/* eslint-disable jsx-a11y/label-has-associated-control */
import { useLoaderData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Find settings for this shop
  const { data: settings, error } = await supabase
    .from("wismo_settings")
    .select("*")
    .eq("shop", session.shop)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is "Row not found"
      console.error("Supabase Error:", error);
  }

  // Use native Response.json()
  return Response.json({ settings: settings || {} });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const upsellCollectionId = formData.get("upsellCollectionId");
  const upsellTitle = formData.get("upsellTitle");
  const isEnabled = formData.get("isEnabled") === "on";

  // Upsert settings (Create if new, Update if exists)
  const { error } = await supabase
    .from("wismo_settings") // Ensure table exists
    .upsert({
      shop: session.shop,
      upsell_collection_id: upsellCollectionId, 
      upsell_title: upsellTitle,
      is_enabled: isEnabled,
    }, { onConflict: 'shop' });

  if (error) {
    console.error("Supabase Write Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
};

export default function Settings() {
  const { settings } = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Upsell Settings</h1>
      <p style={{ color: "#666" }}>Configure which products to show on the tracking page.</p>
      
      <Form method="post" style={{ marginTop: "20px" }}>
        
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1em", fontWeight: "bold" }}>
             <label htmlFor="isEnabled" style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
               <input 
                id="isEnabled"
                type="checkbox" 
                name="isEnabled" 
                defaultChecked={settings?.is_enabled} 
                style={{ width: "20px", height: "20px" }}
              />
              Enable Upsell Engine
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Collection ID
            <input 
              id="upsellCollectionId"
              type="text" 
              name="upsellCollectionId" 
              defaultValue={settings?.upsell_collection_id || ""} 
              placeholder="gid://shopify/Collection/123456789"
              style={{ width: "100%", padding: "10px", fontSize: "1em", border: "1px solid #ccc", borderRadius: "4px", marginTop: "5px" }}
            />
          </label>
          <p style={{ fontSize: "0.85em", color: "#888", marginTop: "5px" }}>
            Paste the Collection GID from your Shopify Admin URL or leave blank to show random products.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Widget Title
            <input 
              id="upsellTitle"
              type="text" 
              name="upsellTitle" 
              defaultValue={settings?.upsell_title || "You might also like"} 
              style={{ width: "100%", padding: "10px", fontSize: "1em", border: "1px solid #ccc", borderRadius: "4px", marginTop: "5px" }}
            />
          </label>
        </div>

        <button type="submit" style={{
          backgroundColor: "#008060", 
          color: "white", 
          padding: "12px 24px", 
          border: "none", 
          borderRadius: "4px", 
          fontSize: "1em", 
          fontWeight: "bold", 
          cursor: "pointer"
        }}>
          Save Settings
        </button>
      </Form>
    </div>
  );
}
