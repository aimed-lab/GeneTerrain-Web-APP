import { getAuth } from "firebase/auth";

export interface FeedbackPayload {
  user_id: string;
  name?: string;
  email: string;
  category: string;
  message: string;
  screenshot_filename?: string | null;
  screenshot_mime_type?: string | null;
}

const ENDPOINT = "https://aimed.uab.edu/apex/gtkb/feedabck/saveFeedbck/"; // final APEX REST URL

export async function sendFeedback(payload: FeedbackPayload) {
  // Obtain Firebase token if user is logged in
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feedback API error ${res.status}: ${text}`);
  }

  // Some endpoints may return a 204 No Content or an empty body even on success.
  // Safely attempt to parse JSON only when the response actually contains JSON.
  try {
    const contentType = res.headers.get("content-type");
    // If the server indicates JSON and the body is not empty, parse it. Otherwise return a generic success.
    if (contentType && contentType.includes("application/json")) {
      // Using text() first avoids "Unexpected end of JSON input" for empty bodies
      const text = await res.text();
      if (text.trim().length > 0) {
        return JSON.parse(text);
      }
    }
  } catch (err) {
    // Log but don't fail the overall request if parsing fails.
    console.warn("sendFeedback: Unable to parse JSON response", err);
  }

  // Fallback: assume success when no JSON payload is provided
  return { success: true };
}
