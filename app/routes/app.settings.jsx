import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE = path.resolve(process.cwd(), "wismo-settings.json");

async function readSettings(shop) {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const allSettings = JSON.parse(data);
    return allSettings[shop] || {};
  } catch (error) {
    return {};
  }
}

async function writeSettings(shop, newSettings) {
  let allSettings = {};
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    allSettings = JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, start empty
  }
  
  allSettings[shop] = { ...allSettings[shop], ...newSettings };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(allSettings, null, 2));
  return allSettings[shop];
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await readSettings(session.shop);
  return json({ settings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const upsellCollectionId = formData.get("upsellCollectionId");
  const upsellTitle = formData.get("upsellTitle");
  const isEnabled = formData.get("isEnabled") === "on";

  await writeSettings(session.shop, {
    upsellCollectionId,
    upsellTitle,
    isEnabled,
  });

  return json({ success: true });
};

export default function Settings() {
  const { settings } = useLoaderData();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Upsell Settings</h1>
      <p style={{ color: "#666" }}>Configure which products to show on the tracking page.</p>
      
      <Form method="post" style={{ marginTop: "20px" }}>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1em", fontWeight: "bold" }}>
            <input 
              type="checkbox" 
              name="isEnabled" 
              defaultChecked={settings?.isEnabled} 
              style={{ width: "20px", height: "20px" }}
            />
            Enable Upsell Engine
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Collection ID</label>
          <input 
            type="text" 
            name="upsellCollectionId" 
            defaultValue={settings?.upsellCollectionId || ""} 
            placeholder="gid://shopify/Collection/123456789"
            style={{ width: "100%", padding: "10px", fontSize: "1em", border: "1px solid #ccc", borderRadius: "4px" }}
          />
          <p style={{ fontSize: "0.85em", color: "#888", marginTop: "5px" }}>
            Paste the Collection GID from your Shopify Admin URL or leave blank to show random products.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Widget Title</label>
          <input 
            type="text" 
            name="upsellTitle" 
            defaultValue={settings?.upsellTitle || "You might also like"} 
            style={{ width: "100%", padding: "10px", fontSize: "1em", border: "1px solid #ccc", borderRadius: "4px" }}
          />
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
