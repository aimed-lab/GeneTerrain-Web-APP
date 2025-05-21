import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aGR0Y2tiZm1pZWd6ZHhzaGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MTU1NDEsImV4cCI6MjA1NDk5MTU0MX0.Pw6S1OmYrXbW17xxGN6eQ4RkZ1pxnjv5FApS8XB5rMY";
const supabaseUrl = "https://nxhdtckbfmiegzdxshcp.supabase.co";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: "supabase.auth.token",
  },
});

// Helper function to safely sign out
export async function signOut() {
  try {
    // First try to get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // If we have a session, try to sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      // If no session, just clear storage
      localStorage.removeItem("supabase.auth.token");
    }
  } catch (error) {
    console.error("Error during sign out:", error);
    // Clear local storage as a fallback
    localStorage.removeItem("supabase.auth.token");
    // Re-throw to let caller handle UI updates
    throw error;
  }
}
