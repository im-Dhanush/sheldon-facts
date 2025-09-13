import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SharedFavorites() {
  const { user } = useParams();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/getSharedFavorites?user=${user}`);
        const data = await res.json();
        setFavorites(data.favorites || []);
      } catch (err) {
        console.error("Error fetching shared favorites:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [user]);

  if (loading) return <p className="text-green-400">Loading shared favorites...</p>;

  if (!favorites.length) return <p className="text-green-500">No favorites found.</p>;

  return (
    <div className="w-full max-w-3xl bg-slate-900 border border-green-600 rounded-lg p-6 shadow-lg mt-6">
      <h2 className="text-green-500 text-lg mb-4">⭐ Shared Favorites</h2>

      <div className="space-y-4">
        {favorites.map((f) => (
          <div key={f.id} className="border border-green-500 rounded-md p-3 bg-slate-800">
            <p className="text-pink-400 font-semibold">🧐 {f.fact}</p>
            {f.explanation && (
              <p className="text-green-300 whitespace-pre-wrap">✏️ {f.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
