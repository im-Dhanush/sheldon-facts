import React, { useEffect, useState } from "react";

export default function Archive() {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastCursor, setLastCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    setFacts([]);
    setLastCursor(null);
    setHasMore(true);
    fetchFacts(null, category);
  }, [category]);

  const fetchFacts = async (cursor = null, selectedCategory = category) => {
    try {
      if (cursor) setLoadingMore(true);
      else setLoading(true);

      let url = `/api/getFacts?category=${selectedCategory}`;
      if (cursor) url += `&cursor=${cursor}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.facts.length === 0) {
        setHasMore(false);
      } else {
        setFacts((prev) => [...prev, ...data.facts]);
        const last = data.facts[data.facts.length - 1];
        if (last?.createdAt?.seconds) {
          setLastCursor(last.createdAt.seconds * 1000);
        }
      }
    } catch (err) {
      console.error("Error fetching archive:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  return (
    <div className="w-full max-w-3xl bg-slate-900 border border-green-600 rounded-lg p-6 shadow-lg mt-6">
      <h2 className="text-green-500 text-lg mb-4">🗂️ Fact Archive</h2>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="text-green-400 mr-2">Filter by Category:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-800 text-green-300 border border-green-600 rounded px-3 py-1"
        >
          <option>All</option>
          <option>Random</option>
          <option>Science</option>
          <option>History</option>
          <option>Pop Culture</option>
          <option>Weird</option>
        </select>
      </div>

      {loading && <p className="text-green-400">Loading archive...</p>}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {facts.map((f) => (
          <div
            key={f.id}
            className="border border-green-500 rounded-md p-3 bg-slate-800"
          >
            <p className="text-pink-400 font-semibold mb-1">🧐 {f.fact}</p>
            {f.explanation && (
              <p className="text-green-300 whitespace-pre-wrap">
                ✏️ {f.explanation}
              </p>
            )}
            {f.category && (
              <p className="text-xs text-green-500 mt-2">📂 {f.category}</p>
            )}
            {f.createdAt?.seconds && (
              <p className="text-xs text-green-600 mt-1">
                📅 {new Date(f.createdAt.seconds * 1000).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={() => fetchFacts(lastCursor)}
            disabled={loadingMore}
            className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white"
          >
            {loadingMore ? "Loading..." : "⬇️ Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
