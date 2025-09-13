const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const messaging = admin.messaging();

exports.sendDailyFact = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("tokens").get();
    const tokens = snapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      console.log("No tokens to send.");
      return res.send("No tokens to send.");
    }

    // TODO: Replace this with AI-generated fact later
    const fact = "🚂 Daily Sheldon Fact: Bananas are berries, but strawberries are not!";

    const message = {
      notification: {
        title: "Train of Enlightenment",
        body: fact,
      },
      tokens: tokens,
    };

    const response = await messaging.sendMulticast(message);
    console.log("Sent to", tokens.length, "devices:", response.successCount);
    return res.send(`Sent to ${tokens.length} devices.`);
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).send("Error sending notification.");
  }
});
