import React, { useState, useEffect, useRef } from "react";
import "./index.css";

function App() {
  const [fact, setFact] = useState("");
  const [explanation, setExplanation] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState({ fact: false, explanation: false });
  const [history, setHistory] = useState([]);
  const utteranceRef = useRef(null);

  const MODEL_PRIORITY = [
    "mistralai/mistral-small-3.1-24b-instruct",
    "openai/gpt-3.5-turbo",
    "google/gemini-pro",
    "meta-llama/llama-3-8b-instruct"
  ];

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  const getSheldonVoice = () => {
    const voices = speechSynthesis.getVoices();
    return (
      voices.find(v => v.name.toLowerCase().includes("en-us")) ||
      voices.find(v => v.lang === "en-US") ||
      voices[0]
    );
  };

  const speakText = (text, type) => {
    if (!text) return;
    if (speaking[type]) {
      speechSynthesis.cancel();
      setSpeaking(prev => ({ ...prev, [type]: false }));
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = getSheldonVoice();
    utterance.pitch = type === "fact" ? 1.3 : 1.15;
    utterance.rate = type === "fact" ? 1.05 : 0.95;
    utterance.volume = 1;
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(prev => ({ ...prev, [type]: false }));

    utteranceRef.current = utterance;
    setSpeaking(prev => ({ ...prev, [type]: true }));
    try {
      speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS error:", err);
    }
  };

  const getSheldonWisdom = async () => {
    if (loading) return;
    setLoading(true);
    setShowExplanation(false);
    setFact("");
    setExplanation("");
    speechSynthesis.cancel();

    const headers = {
      Authorization: `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "train-of-enlightenment"
    };

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are Sheldon Cooper — a sarcastically intelligent and precise AI. Present one concise, fun, and interesting fact (max 2 lines). Then separately give a witty, clear explanation labeled 'Explanation:'. Avoid merging them."
              },
              {
                role: "user",
                content: "Give me one fun fact (from any domain) and its explanation. Only one fact, clearly separated from explanation."
              }
            ]
          })
        });

        const result = await response.json();
        if (!result.choices || !result.choices.length) throw new Error("No choices returned");

        const content = result.choices[0].message.content;
        const [rawFact, rawExplanation] = content.split(/Explanation:/i);
        const cleanedFact = rawFact?.trim();
        const cleanedExplanation = rawExplanation?.trim() || "No explanation found.";

        // Check if fact was repeated
        if (history.includes(cleanedFact)) {
          console.warn("Repeated fact detected, skipping...");
          continue;
        }

        setFact(cleanedFact);
        setExplanation(cleanedExplanation);
        setHistory(prev => [cleanedFact, ...prev.slice(0, 9)]);
        setLoading(false);
        return;
      } catch (err) {
        console.warn(`Model \"${model}\" failed, trying next...`);
        continue;
      }
    }

    setFact("Oops! Sheldon had a brain freeze.");
    setExplanation("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col items-center justify-center p-4 font-mono">
      <h1 className="mt-8 text-l text-green-700">🚂 Train of Enlightenment</h1>
      <div className="border border-green-500 rounded-lg p-6 w-full max-w-2xl bg-slate-900 shadow-xl space-y-4">
        <div className="border-l-2 pl-3 border-pink-500">
          <p className="text-pink-500 font-semibold">🧐 DID YOU KNOW:</p>
          <p className="text-green-300 mt-1 whitespace-pre-wrap break-words">{fact}</p>
        </div>

        {fact && (
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => speakText(fact, "fact")}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs px-4 py-2 rounded-md"
            >
              {speaking.fact ? "🛑 Stop" : "🔊 Hear Sheldon Say It"}
            </button>

            {!showExplanation && (
              <button
                onClick={() => setShowExplanation(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-4 py-2 rounded-md"
              >
                🤔 Explain?
              </button>
            )}

            {showExplanation && (
              <button
                onClick={() => speakText(explanation, "explanation")}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs px-4 py-2 rounded-md"
              >
                {speaking.explanation ? "🛑 Stop" : "📢 Explain Out Loud"}
              </button>
            )}
          </div>
        )}

        {showExplanation && explanation && (
          <div className="border border-green-500 rounded-md p-3 bg-slate-800">
            <p className="text-green-400 font-semibold mb-1">✏️ EXPLANATION:</p>
            <p className="text-green-300 whitespace-pre-wrap break-words">{explanation}</p>
          </div>
        )}

        <div className="text-center pt-4">
          <button
            onClick={getSheldonWisdom}
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-bold text-sm"
          >
            🤖 {loading ? "Thinking..." : "Give Me Sheldon’s Wisdom"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
