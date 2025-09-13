// api/sendDailyFact.js
import admin from "firebase-admin";
import fetch from "node-fetch";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const messaging = admin.messaging();
const db = admin.firestore();

export default async function handler(req, res) {
  try {
    // --- Get tokens ---
    const snapshot = await db.collection("tokens").get();
    const tokens = snapshot.docs.map((doc) => doc.id);

    if (tokens.length === 0) {
      return res.status(200).json({ message: "No tokens to send." });
    }

    // --- Get a new fact from OpenRouter ---
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are Sheldon Cooper — sarcastically intelligent. Provide exactly one concise fun fact (max 200 characters). No lists. Then provide an explanation starting with 'Explanation:'.",
          },
          {
            role: "user",
            content: "Give me one fun fact and its explanation.",
          },
        ],
      }),
    });

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || "";

    // --- Parse Fact + Explanation ---
    const factMatch = content.match(/Fact\s*:\s*([\s\S]*?)(?:\n|$)/i);
    const explMatch = content.match(/Explanation\s*:\s*([\s\S]*)/i);

    let fact = factMatch ? factMatch[1].trim() : content.trim();
    let explanation = explMatch ? explMatch[1].trim() : "";

    // --- Build Notification ---
    const message = {
      notification: {
        title: "🚂 Train of Enlightenment",
        body: fact,
      },
      tokens: tokens,
    };

    const fcmResponse = await messaging.sendMulticast(message);

    return res.status(200).json({
      message: `Sent fact to ${tokens.length} devices`,
      fact,
      explanation,
      success: fcmResponse.successCount,
      failure: fcmResponse.failureCount,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Error sending notification" });
  }
}
