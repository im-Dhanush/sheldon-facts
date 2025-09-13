import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import Favorites from "./Favorites";
import SharedFavorites from "./SharedFavorites";

export default function App() {
  return (
    <Router>
      <div className="bg-black min-h-screen text-green-400 font-mono">
        {/* Navbar */}
        <nav className="flex gap-6 p-4 bg-slate-900 border-b border-green-600 text-green-400">
          <Link to="/" className="hover:text-pink-400">
            🏠 Home
          </Link>
          <Link to="/archive" className="hover:text-pink-400">
            🗂️ Archive
          </Link>
          <Link to="/favorites" className="hover:text-pink-400">
            ⭐ Favorites
          </Link>
          <Link to="/settings" className="hover:text-pink-400">
            ⚙️ Settings
          </Link>
        </nav>

        {/* Routes */}
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/share/:user" element={<SharedFavorites />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
