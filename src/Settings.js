import React, { useEffect, useState } from "react";
import { requestForToken } from "./firebase";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("train_notifications") === "true"
  );
  const [category, setCategory] = useState(
    localStorage.getItem("train_category_v1") || "Random"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (notificationsEnabled) {
      requestForToken().then(async (token) => {
        if (token) {
          await saveToken(token, category);
        }
      });
    }
  }, [notificationsEnabled, category]);

  const saveToken = async (token, category) => {
    try {
      setSaving(true);
      await fetch("/api/saveToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, category }),
      });
      localStorage.setItem("train_category_v1", category);
      localStorage.setItem("train_notifications", notificationsEnabled);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col items-center p-6 font-mono">
      <h1 className="text-green-700 text-lg mb-6">⚙️ User Settings</h1>

      <div className="w-full max-w-md bg-slate-900 border border-green-600 rounded-lg p-6 shadow-lg space-y-6">
        {/* Notifications Toggle */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
            <span>Enable Daily Fact Notifications</span>
          </label>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-green-400 mb-2">Preferred Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-800 text-green-300 border border-green-600 rounded px-3 py-1 w-full"
          >
            <option>Random</option>
            <option>Science</option>
            <option>History</option>
            <option>Pop Culture</option>
            <option>Weird</option>
          </select>
        </div>

        {/* Status */}
        {saving && <p className="text-yellow-500 text-sm">Saving...</p>}
        {!saving && notificationsEnabled && (
          <p className="text-green-400 text-sm">
            ✅ Notifications enabled ({category})
          </p>
        )}
        {!saving && !notificationsEnabled && (
          <p className="text-gray-400 text-sm">❌ Notifications disabled</p>
        )}
      </div>
    </div>
  );
}
