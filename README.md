🚂 Train of Enlightenment

Sheldon Cooper’s sarcastic brain… in a website.
Get one fascinating (or at least interesting) fact at a time, explained in detail — with Sheldon’s wit and voice.

📸 Preview

(screenshot placeholder — add one later)

✨ Features

🧐 Did You Know? → One random fact, never a list.

✏️ Explanation → Hidden until you ask “Explain?”, then revealed with detail.

🔊 Sheldon Speaks → Fact & explanation read aloud in Sheldon-style voice.

⏯️ Play/Stop Toggle → Click once to play, click again to stop.

🤖 AI Powered → Facts generated via OpenRouter API, with automatic model fallback.

🛡️ Error Handling → No crashes if API fails — Sheldon just says he had a brain freeze.

🎨 Retro Style → Black terminal-like theme with neon highlights.

🚀 Getting Started
1. Clone the repo
git clone https://github.com/yourusername/train-of-enlightenment.git
cd train-of-enlightenment

2. Install dependencies
npm install

3. Add your API key

Create a .env file in the root:

REACT_APP_OPENROUTER_API_KEY=your_api_key_here


Get a key from OpenRouter
.

4. Run locally
npm start


Open → http://localhost:3000

⚙️ Tech Stack

React (frontend framework)

Tailwind CSS (styling)

OpenRouter API (fact + explanation generation)

Web Speech API (text-to-speech)

🧠 How It Works

Prompt Engineering

Fact is presented as:

“🧐 DID YOU KNOW”

Explanation hidden until requested.

Clear instructions to AI: One fact only, then a separate explanation.

Model Priority Fallback

Tries models in order until one responds:

mistralai/mistral-small-3.1-24b-instruct

openai/gpt-3.5-turbo

google/gemini-pro

meta-llama/llama-3-8b-instruct

Voice Playback

Uses Web Speech API.

Adjusted pitch/rate for “Sheldon-like” delivery.

Play/Stop toggle prevents endless playback.

🐞 Known Issues

Sometimes facts may repeat.

Occasionally AI mixes explanation into the fact section.

Voices depend on the browser (Chrome works best).

🌱 Future Improvements

✨ Animated transitions (Framer Motion).

⭐ Save & favorite facts locally.

🔄 Share facts on social media.

📅 Daily fact notifications (PWA support).

🌍 Multilingual support.

❓ Quiz mode (guess true/false).

📱 Mobile app or browser extension.

👨‍💻 Contributing

PRs welcome!

Fork the repo

Create a branch

Submit a pull request

📜 License

MIT License.

💡 Built with sarcasm, curiosity, and just a hint of Bazinga!