// src/Favorites.js
import React, { useEffect, useState } from "react";

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize] = useState(8);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("fcm_token");
    setToken(t);
    setFavorites([]);
    setNextCursor(null);
    setHasMore(false);
    fetchFavorites({ reset: true, token: t, category: categoryFilter, q: query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, query]);

  const fetchFavorites = async ({ reset = false, token: t = token, category = categoryFilter, q = query } = {}) => {
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      if (reset) {
        setLoading(true);
      }

      let url = `/api/getFavorites?token=${encodeURIComponent(t)}&pageSize=${pageSize}`;
      if (!reset && nextCursor) url += `&cursor=${nextCursor}`;
      if (category && category !== "All") url += `&category=${encodeURIComponent(category)}`;
      if (q && q.trim()) url += `&q=${encodeURIComponent(q)}`;

      const res = await fetch(url);
      const data = await res.json();
      const items = data.items || [];
      if (reset) setFavorites(items);
      else setFavorites(prev => [...prev, ...items]);

      setNextCursor(data.nextCursor || null);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (factId) => {
    if (!token) {
      alert("Enable notifications first to manage favorites.");
      return;
    }
    try {
      await fetch("/api/removeFavorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, factId }),
      });
      setFavorites(prev => prev.filter(f => f.id !== factId));
    } catch (err) {
      console.error("Error removing favorite:", err);
      alert("Failed to remove favorite.");
    }
  };

  const copyShareLink = () => {
    if (!token) return alert("Enable notifications first to share favorites.");
    const link = `${window.location.origin}/share/${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(link);
    alert("Share link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col items-center p-6 font-mono">
      <h1 className="text-green-700 text-lg mb-4">⭐ Your Favorites</h1>

      <div className="w-full max-w-3xl bg-slate-900 border border-green-600 rounded-lg p-4 shadow-lg">
        <div className="flex gap-3 items-center mb-4">
          <div>
            <label className="mr-2 text-green-400">Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 text-green-300 border border-green-600 rounded px-2 py-1">
              <option>All</option>
              <option>Random</option>
              <option>Science</option>
              <option>History</option>
              <option>Pop Culture</option>
              <option>Weird</option>
            </select>
          </div>

          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search favorites..."
              className="w-full bg-slate-800 text-green-300 border border-green-600 rounded px-3 py-1"
            />
          </div>

          <div>
            <button onClick={copyShareLink} className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white">🔗 Copy Share Link</button>
          </div>
        </div>

        {loading && <p className="text-green-400">Loading favorites...</p>}
        {!loading && !favorites.length && <p className="text-green-500">No favorites yet.</p>}

        <div className="space-y-4">
          {favorites.map(f => (
            <div key={f.id} className="border border-green-500 rounded-md p-3 bg-slate-800 flex justify-between items-start">
              <div>
                <p className="text-pink-400 font-semibold">🧐 {f.fact}</p>
                {f.explanation && <p className="text-green-300 whitespace-pre-wrap mt-2">✏️ {f.explanation}</p>}
                {f.category && <p className="text-xs text-green-500 mt-2">📂 {f.category}</p>}
                {f.savedAt?.seconds && <p className="text-xs text-green-600 mt-1">⭐ Saved: {new Date(f.savedAt.seconds * 1000).toLocaleString()}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => removeFavorite(f.id)} className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-sm">❌ Remove</button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && !loading && (
          <div className="mt-4 text-center">
            <button onClick={() => fetchFavorites({ reset: false })} className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white">⬇️ Load More</button>
          </div>
        )}
      </div>
    </div>
  );
}
