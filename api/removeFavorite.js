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
    const { token, factId } = req.body;
    if (!token || !factId) {
      return res.status(400).json({ error: "Missing token or factId" });
    }

    await db.collection("favorites").doc(token).collection("items").doc(factId).delete();

    return res.status(200).json({ message: "Favorite removed" });
  } catch (err) {
    console.error("Error removing favorite:", err);
    return res.status(500).json({ error: "Error removing favorite" });
  }
}
