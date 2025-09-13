import admin from "firebase-admin";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, factId, fact, explanation, category } = req.body;
    if (!token || !factId || !fact) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await db
      .collection("favorites")
      .doc(token)
      .collection("items")
      .doc(factId)
      .set({
        fact,
        explanation,
        category,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.status(200).json({ message: "Favorite saved" });
  } catch (err) {
    console.error("Error saving favorite:", err);
    return res.status(500).json({ error: "Error saving favorite" });
  }
}
