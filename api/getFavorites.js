// api/getFavorites.js
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
  try {
    const { token, pageSize = 10, cursor, category, q } = req.query;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    let baseRef = db.collection("favorites").doc(token).collection("items");
    if (category) {
      baseRef = baseRef.where("category", "==", category);
    }
    baseRef = baseRef.orderBy("savedAt", "desc").limit(parseInt(pageSize, 10));

    if (cursor) {
      // cursor expected to be ms timestamp
      const date = new Date(parseInt(cursor, 10));
      baseRef = baseRef.startAfter(date);
    }

    const snap = await baseRef.get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // simple search filter (client supplied q) on fact/explanation (case-insensitive)
    if (q && q.trim()) {
      const ql = q.trim().toLowerCase();
      items = items.filter(it => (
        (it.fact || "").toLowerCase().includes(ql) ||
        (it.explanation || "").toLowerCase().includes(ql)
      ));
    }

    // compute nextCursor if more
    const nextCursor = items.length ? (items[items.length - 1].savedAt ? items[items.length - 1].savedAt.seconds * 1000 : null) : null;

    return res.status(200).json({ items, nextCursor });
  } catch (err) {
    console.error("getFavorites error:", err);
    return res.status(500).json({ error: "Error fetching favorites" });
  }
}
