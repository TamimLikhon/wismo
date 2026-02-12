import { Session } from "@shopify/shopify-api";
import { SessionStorage } from "@shopify/shopify-app-session-storage";
import { supabase } from "./supabase.server";

export class SupabaseSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    const { error } = await supabase.from("session").upsert({
      id: session.id,
      shop: session.shop,
      state: session.state,
      isonline: session.isOnline,
      scope: session.scope,
      expires: session.expires ? session.expires.toISOString() : null,
      accesstoken: session.accessToken,
      userid: session.onlineAccessInfo?.associated_user?.id || null,
    });

    if (error) {
      console.error("Failed to store session in Supabase:", error);
      return false;
    }

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from("session")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      if (error && error.code !== "PGRST116") {
        console.error("Failed to load session from Supabase:", error);
      }
      return undefined;
    }

    const session = new Session({
      id: data.id,
      shop: data.shop,
      state: data.state,
      isOnline: data.isonline,
      scope: data.scope,
      expires: data.expires ? new Date(data.expires) : undefined,
      accessToken: data.accesstoken,
    });

    if (data.userid) {
      session.onlineAccessInfo = {
        associated_user: {
          id: Number(data.userid),
        } as any,
      } as any;
    }

    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    const { error } = await supabase.from("session").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete session from Supabase:", error);
      return false;
    }

    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const { error } = await supabase.from("session").delete().in("id", ids);

    if (error) {
      console.error("Failed to delete sessions from Supabase:", error);
      return false;
    }

    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from("session")
      .select("*")
      .eq("shop", shop);

    if (error || !data) {
      console.error("Failed to find sessions by shop in Supabase:", error);
      return [];
    }

    return data.map((d) => {
      const session = new Session({
        id: d.id,
        shop: d.shop,
        state: d.state,
        isOnline: d.isonline,
        scope: d.scope,
        expires: d.expires ? new Date(d.expires) : undefined,
        accessToken: d.accesstoken,
      });

      if (d.userid) {
        session.onlineAccessInfo = {
          associated_user: {
            id: Number(d.userid),
          } as any,
        } as any;
      }

      return session;
    });
  }
}
