import React, { useState, useEffect, useRef } from "react";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import "./index.css";
import { requestForToken, onMessageListener } from "./firebase";

const MODEL_PRIORITY = [
  "mistralai/mistral-small-3.1-24b-instruct",
  "openai/gpt-3.5-turbo",
  "google/gemini-pro",
  "meta-llama/llama-3-8b-instruct"
];

const MAX_FACT_CHARS = 300;
const CATEGORY_KEY = "train_category_v1";

export default function App() {
  // --- State ---
  const [fact, setFact] = useState("");
  const [fullFact, setFullFact] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState("Random");
  const [speaking, setSpeaking] = useState({ fact: false, explanation: false });

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("train_notifications") === "true"
  );

  const abortRef = useRef(null);
  const cardRef = useRef(null);

  // --- Load category from localStorage ---
  useEffect(() => {
    const savedCategory = localStorage.getItem(CATEGORY_KEY);
    if (savedCategory) setCategory(savedCategory);
  }, []);
  useEffect(() => {
    localStorage.setItem(CATEGORY_KEY, category);
  }, [category]);

  // --- Handle Notifications ---
  useEffect(() => {
    if (notificationsEnabled) {
      requestForToken().then((token) => {
        if (token) {
          console.log("User subscribed with token:", token);
          // TODO: Send token to your backend API (/api/saveToken)
        }
      });

      onMessageListener().then((payload) => {
        console.log("Foreground notification:", payload);
        alert(`🚂 Sheldon says: ${payload.notification.body}`);
      });
    }
  }, [notificationsEnabled]);

  const enableNotifications = () => {
    setNotificationsEnabled(true);
    localStorage.setItem("train_notifications", "true");
  };

  // --- Text-to-Speech ---
  const getSheldonVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => /en-?us/i.test(v.name)) ||
      voices.find(v => v.lang?.startsWith("en")) ||
      voices[0]
    );
  };

  const toggleSpeak = (type) => {
    const text = type === "fact" ? (fullFact || fact) : explanation;
    if (!text) return;

    if (speaking[type]) {
      window.speechSynthesis.cancel();
      setSpeaking(prev => ({ ...prev, [type]: false }));
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getSheldonVoice();
    utter.lang = "en-US";
    utter.rate = type === "fact" ? 1.05 : 0.95;
    utter.pitch = type === "fact" ? 1.25 : 1.1;
    utter.onend = () => setSpeaking(prev => ({ ...prev, [type]: false }));

    setSpeaking(prev => ({ ...prev, [type]: true }));
    window.speechSynthesis.speak(utter);
  };

  // --- Fetch Fact from OpenRouter ---
  const getSheldonWisdom = async () => {
    if (loading) return;
    setLoading(true);
    setShowExplanation(false);
    setFact("");
    setFullFact(null);
    setExplanation("");

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const headers = {
      Authorization: `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "train-of-enlightenment"
    };

    const categoryInstruction =
      category === "Random"
        ? "from any domain"
        : `specifically about ${category.toLowerCase()}`;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `You are Sheldon Cooper — sarcastically intelligent. Provide exactly one concise fun fact ${categoryInstruction}. Prefix with 'Fact:' then 'Explanation:'. Fact should be under ${MAX_FACT_CHARS} characters if possible.`
              },
              {
                role: "user",
                content: "Give me one fun fact and its explanation. Only one fact."
              }
            ]
          })
        });

        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        if (!content) continue;

        const factMatch = content.match(/Fact\s*:\s*([\s\S]*?)(?:\n|$)/i);
        const explMatch = content.match(/Explanation\s*:\s*([\s\S]*)/i);

        let factRaw = factMatch ? factMatch[1].trim() : content.trim();
        let explanationRaw = explMatch ? explMatch[1].trim() : "";

        if (factRaw.length > MAX_FACT_CHARS) {
          setFullFact(factRaw);
          factRaw = factRaw.slice(0, MAX_FACT_CHARS - 1) + "…";
        }

        setFact(factRaw);
        setExplanation(explanationRaw || "Explanation not clearly provided.");
        setLoading(false);
        return;
      } catch {
        continue; // try next model
      }
    }

    // All models failed
    setFact("Oops! Sheldon had a brain freeze.");
    setExplanation("");
    setLoading(false);
  };

  // --- Download Card as Image ---
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const dataUrl = await htmlToImage.toPng(cardRef.current);
    download(dataUrl, "sheldon-fact-card.png");
  };

  // --- Social Sharing ---
  const shareText = `🧐 DID YOU KNOW?\n${fact}\n\n🚂 Train of Enlightenment`;
  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };
  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    alert("Copied fact to clipboard!");
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col items-center p-6 font-mono">
      <h1 className="text-green-700 text-lg mb-4">🚂 Train of Enlightenment</h1>

      {/* Category Selection */}
      <div className="mb-4">
        <label className="text-green-400 mr-2">Choose Category:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-800 text-green-300 border border-green-600 rounded px-3 py-1"
        >
          <option>Random</option>
          <option>Science</option>
          <option>History</option>
          <option>Pop Culture</option>
          <option>Weird</option>
        </select>
      </div>

      {/* Fact Card */}
      <div
        ref={cardRef}
        className="w-full max-w-2xl bg-slate-900 border border-green-600 rounded-lg p-6 shadow-lg"
      >
        <div className="border-l-4 pl-4 border-pink-500 mb-4">
          <div className="text-pink-500 font-semibold">🧐 DID YOU KNOW:</div>
          <div className="text-green-300 mt-2 whitespace-pre-wrap break-words">
            {fact || (loading ? "Fetching Sheldon-approved wisdom..." : "Click below for a fact.")}
          </div>
          {fullFact && (
            <button
              onClick={() => {
                setFact(fullFact);
                setFullFact(null);
              }}
              className="mt-2 text-xs bg-gray-800 border border-green-600 px-2 py-1 rounded"
            >
              Show full fact
            </button>
          )}
        </div>

        {showExplanation && explanation && (
          <div className="mt-4 border border-green-600 rounded-md p-3 bg-slate-800">
            <div className="text-green-400 font-semibold">✏️ EXPLANATION:</div>
            <div className="text-green-300 mt-2 whitespace-pre-wrap">{explanation}</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={() => toggleSpeak("fact")}
          className={`px-3 py-2 rounded text-sm ${
            speaking.fact ? "bg-red-700" : "bg-blue-700 hover:bg-blue-800"
          } text-white`}
        >
          {speaking.fact ? "🛑 Stop" : "🔊 Hear Sheldon Say It"}
        </button>

        {!showExplanation && fact && (
          <button
            onClick={() => setShowExplanation(true)}
            className="px-3 py-2 rounded text-sm bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            🤔 Explain?
          </button>
        )}

        {showExplanation && (
          <button
            onClick={() => toggleSpeak("explanation")}
            className={`px-3 py-2 rounded text-sm ${
              speaking.explanation ? "bg-red-700" : "bg-purple-700 hover:bg-purple-800"
            } text-white`}
          >
            {speaking.explanation ? "🛑 Stop" : "📢 Explain Out Loud"}
          </button>
        )}

        <button
          onClick={getSheldonWisdom}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white font-bold"
        >
          {loading ? "Thinking..." : "🤖 New Fact"}
        </button>
      </div>

      {/* Notifications */}
      <div className="mt-6">
        {notificationsEnabled ? (
          <p className="text-green-400 text-sm">✅ Daily notifications enabled!</p>
        ) : (
          <button
            onClick={enableNotifications}
            className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white text-sm"
          >
            🔔 Enable Daily Fact Notifications
          </button>
        )}
      </div>

      {/* Share Options */}
      {fact && (
        <div className="flex flex-wrap gap-3 mt-6">
          <button onClick={downloadCard} className="px-3 py-2 rounded bg-gray-700 text-white">
            📸 Download Card
          </button>
          <button onClick={shareOnTwitter} className="px-3 py-2 rounded bg-sky-600 text-white">
            🐦 Share on Twitter
          </button>
          <button onClick={shareOnWhatsApp} className="px-3 py-2 rounded bg-green-600 text-white">
            📱 Share on WhatsApp
          </button>
          <button onClick={copyToClipboard} className="px-3 py-2 rounded bg-gray-600 text-white">
            📋 Copy Fact
          </button>
        </div>
      )}
    </div>
  );
}
