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
    const { cursor, category } = req.query;
    let query = db.collection("facts").orderBy("createdAt", "desc").limit(20);

    // If category is chosen, filter
    if (category && category !== "All") {
      query = db
        .collection("facts")
        .where("category", "==", category)
        .orderBy("createdAt", "desc")
        .limit(20);
    }

    if (cursor) {
      query = query.startAfter(new Date(parseInt(cursor)));
    }

    const snapshot = await query.get();
    const facts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ facts });
  } catch (error) {
    console.error("Error fetching facts:", error);
    return res.status(500).json({ error: "Error fetching facts" });
  }
}
