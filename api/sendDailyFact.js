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

const db = admin.firestore();
const messaging = admin.messaging();

// Config
const MAX_FACT_CHARS = 300;
const MAX_AI_ATTEMPTS_PER_CATEGORY = 5;
const DUPLICATE_LOOKBACK = 200; // number of recent facts to check for duplicates

function normalizeText(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function logError(context, error) {
  try {
    await db.collection("error_logs").add({
      context,
      errorMessage: error?.message || String(error),
      stack: error?.stack || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to write error_log:", e);
  }
}

async function callOpenRouterForFact(category) {
  // system prompt ensures Fact: / Explanation:
  const systemPrompt = category && category !== "Random"
    ? `You are Sheldon Cooper — sarcastically intelligent. Provide exactly one concise fun fact about ${category.toLowerCase()} and then its explanation. ALWAYS prefix the fact with "Fact:" and the explanation with "Explanation:". The fact must be short and self-contained. Do not produce lists.`
    : `You are Sheldon Cooper — sarcastically intelligent. Provide exactly one concise fun fact (any domain) and then its explanation. ALWAYS prefix the fact with "Fact:" and the explanation with "Explanation:". The fact must be short and self-contained. Do not produce lists.`;

  const body = {
    model: process.env.OPENROUTER_MODEL || "mistralai/mistral-small-3.1-24b-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Give me one fun fact and its explanation. Only one fact." }
    ],
    // you can add temperature / max tokens if OpenRouter accepts them
  };

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`OpenRouter returned ${resp.status}: ${text}`);
    err.status = resp.status;
    throw err;
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content || "";
  return content;
}

function splitFactExplanation(content) {
  // Try to robustly split Fact: ... Explanation: ...
  // Ensure both parts exist; return { fact, explanation }
  const factMatch = content.match(/Fact\s*:\s*([\s\S]*?)(?=Explanation\s*:|$)/i);
  const explMatch = content.match(/Explanation\s*:\s*([\s\S]*)/i);

  let fact = factMatch ? factMatch[1].trim() : null;
  let explanation = explMatch ? explMatch[1].trim() : null;

  // fallback heuristics if AI didn't follow exact format:
  if (!fact && content) {
    // If content contains two paragraphs, treat first paragraph as fact
    const parts = content.split(/\n\s*\n/);
    fact = parts[0].trim();
    explanation = parts.slice(1).join("\n\n").trim();
  }

  // Final fallback: whole content -> fact
  if (!fact) fact = content.trim();
  if (!explanation) explanation = "";

  return { fact, explanation };
}

export default async function handler(req, res) {
  try {
    // Step A — get tokens and group by category
    const tokensSnapshot = await db.collection("tokens").get();
    const tokenGroups = {};
    tokensSnapshot.forEach(doc => {
      const { category = "Random" } = doc.data() || {};
      if (!tokenGroups[category]) tokenGroups[category] = [];
      tokenGroups[category].push(doc.id);
    });

    if (Object.keys(tokenGroups).length === 0) {
      return res.status(200).json({ message: "No subscribers found." });
    }

    // Pre-fetch recent facts to check duplicates
    const recentSnap = await db.collection("facts")
      .orderBy("createdAt", "desc")
      .limit(DUPLICATE_LOOKBACK)
      .get();

    const recentFacts = recentSnap.docs.map(d => normalizeText(d.data().fact || ""));
    const results = [];

    // For each category, generate a fact with retries and duplicate checking
    for (const category of Object.keys(tokenGroups)) {
      let attempts = 0;
      let acceptedFact = null;
      let acceptedExplanation = "";
      let rawAIContent = "";

      while (attempts < MAX_AI_ATTEMPTS_PER_CATEGORY && !acceptedFact) {
        attempts++;
        try {
          rawAIContent = await callOpenRouterForFact(category);
          const { fact, explanation } = splitFactExplanation(rawAIContent || "");
          if (!fact || fact.length === 0) {
            // try again
            continue;
          }

          // enforce length
          let finalFact = fact;
          let fullFact = null;
          if (finalFact.length > MAX_FACT_CHARS) {
            fullFact = finalFact;
            finalFact = finalFact.slice(0, MAX_FACT_CHARS - 1).trim() + "…";
          }

          // duplicate detection: compare normalized short form and fullFact
          const norm = normalizeText(finalFact);
          const normFull = normalizeText(fullFact || finalFact);

          const isDup = recentFacts.includes(norm) || recentFacts.includes(normFull);
          if (isDup) {
            // Attempt next generation
            continue;
          }

          // Passed checks
          acceptedFact = finalFact;
          acceptedExplanation = explanation || "";
          // Add to recentFacts so multiple category generations this run won't collide
          recentFacts.unshift(norm);
          if (recentFacts.length > DUPLICATE_LOOKBACK) recentFacts.pop();
        } catch (aiErr) {
          // log and continue attempts
          await logError({ step: "openrouter_call", category, attempt: attempts }, aiErr);
          // small pause could help — omitted in serverless for simplicity
          continue;
        }
      } // end attempts

      if (!acceptedFact) {
        // couldn't generate unique/valid fact for this category
        const errMsg = `Failed to generate unique valid fact for category "${category}" after ${MAX_AI_ATTEMPTS_PER_CATEGORY} attempts.`;
        await logError({ step: "ai_generation_failed", category, attempts }, new Error(errMsg));
        results.push({ category, error: errMsg });
        continue;
      }

      // Save to Firestore archive. Save fullFact if original was long (rawAIContent contains original fact possibly)
      const docData = {
        fact: acceptedFact,
        explanation: acceptedExplanation,
        category,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Optionally include raw AI content and fullFact
      docData.rawAI = rawAIContent;
      // Save fullFact only if truncated (we attempted to keep full in rawAIContent but safe approach)
      // If the explanation contained the long fact, store that in fullFact property for reference:
      // Here we'll set fullFact when acceptedFact ends with ellipsis (…)
      if (acceptedFact.endsWith("…")) {
        docData.fullFact = rawAIContent.match(/Fact\s*:\s*([\s\S]*?)(?=Explanation\s*:|$)/i)?.[1]?.trim() || null;
      }

      await db.collection("facts").add(docData);

      // Send push notification to this category group
      const tokens = tokenGroups[category] || [];
      try {
        const message = {
          notification: {
            title: `🚂 Train of Enlightenment — ${category}`,
            body: acceptedFact,
          },
          tokens,
        };
        const fcmResp = await messaging.sendMulticast(message);
        results.push({
          category,
          fact: acceptedFact,
          explanation: acceptedExplanation,
          success: fcmResp.successCount,
          failure: fcmResp.failureCount,
        });
      } catch (fcmErr) {
        await logError({ step: "fcm_send", category }, fcmErr);
        results.push({ category, fact: acceptedFact, error: "FCM send failed" });
      }
    } // end for categories

    return res.status(200).json({ results });
  } catch (err) {
    console.error("sendDailyFact fatal error:", err);
    await logError({ step: "handler", rawRequestBody: req.body || null }, err);
    return res.status(500).json({ error: "Server error while sending daily facts. Check logs." });
  }
}
