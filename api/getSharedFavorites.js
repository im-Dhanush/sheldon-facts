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
  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: "User ID required" });
  }

  try {
    const snapshot = await db
      .collection("favorites")
      .doc(user)
      .collection("items")
      .orderBy("savedAt", "desc")
      .get();

    const favorites = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ favorites });
  } catch (err) {
    console.error("Error fetching shared favorites:", err);
    return res.status(500).json({ error: "Error fetching shared favorites" });
  }
}
