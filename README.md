# 🎮 Imposter Clues

Imposter Clues is a premium, real-time multiplayer social deduction party game designed for **3 to 10 players**. One player is secretly assigned as the **Imposter** with a related but slightly different word, while the rest are **Civilians** with the same secret word. 

The objective? Civilians must root out the Imposter through subtle word clues, while the Imposter must deduce the Civilian word and blend in!

🔗 **Live Game URL**: [https://impostergamemrwhite.netlify.app/](https://impostergamemrwhite.netlify.app/)

---

## ✨ Features & Highlights

- 📝 **Dedicated Live Clues Panel**: Permanent real-time sidebar/panel displaying submitted clues with smooth fade-in animations and waiting indicators across all game phases.
- 🔄 **Dynamic Round Progression & Post-Round Decision Screen**: Unlimited clue rounds! After every round, players vote between `▶ Play One More Round` (keeping exact same secret words) or `🕵 Guess the Imposter`. Majority decides the next step.
- 🔍 **Smart 45-Second Voting Phase**: Maximum 45s timer that automatically finishes and reveals results instantly once all connected players submit their guesses. Includes poll-style cards, large avatars, host badges, and self-vote protection.
- 🟢 **Seamless Multiplayer "Play Again" System**: Instant match queuing directly from the result screen. When all connected players click `Play Again`, a fresh match auto-starts instantly with a **new Imposter** and **new secret words** without room codes, page reloads, or rejoining.
- 👑 **Automatic Host Transfer**: Seamlessly transfers host privileges to the oldest remaining player if the current host leaves, accompanied by real-time toast notifications.
- 🔗 **Share Room via Link & Direct URL Join**: Share invite links using native Web Share API on mobile or clipboard copy on desktop. Direct URLs (`/join/CODE` or `?room=CODE`) automatically pre-fill room codes.
- 🔔 **Global Toast Notifications & Sound System**: Top-center animated toast notifications and custom sound effects for key game events, disconnections, and phase shifts.

---

## 🚀 Game Flow & Rules

### 1. Room Setup & Lobby
- Players join via a unique **6-character room code** (e.g. `XY78AB`) or by clicking a shared invite link.
- The **Host** can customize settings:
  - **Category**: Select from curated pools (**Food, Animals, Technology, Sports, Movies, Places**) or choose **Custom Words** to enter your own secrets safely.
  - **Difficulty**: Toggle between All, Easy, Medium, or Hard pairs.
- Players toggle **Ready** to start the match.

### 2. Clue Submission Phase
- Every player receives their secret role and word on a flip-card.
- Players can take as much time as needed to submit exactly **one clue word**.
- **Rule Constraints**: Clues must contain letters only (no spaces, numbers, emojis, or special characters, max 20 letters).
- Clues appear live in the **Live Clues Panel** as players submit.

### 3. Post-Round Decision Phase
- Once all players submit clues for a round, a decision screen appears:
  - `▶ Play One More Round`: Keeps the exact same secret words and triggers another clue round.
  - `🕵 Guess the Imposter`: Immediately transitions to the Voting phase.
- Votes are counted and majority rules. Ties default to guessing the imposter.

### 4. Voting Phase & Tie-Breakers
- Players vote for the player they suspect is the Imposter.
- **Instant Result Reveal**: If all connected players vote before the 45s timer expires, results reveal immediately.
- **Tie-Breaker System**: If a vote ends in a tie, a tie-breaker vote is triggered among tied candidates only.

### 5. Result Screen & Play Again Queue
- Reveals the Imposter, Civilian Word, Imposter Word, vote summary, and personal victory badges (`🏆 You Won!` / `😢 Oops... You Lost!`).
- Players select either **🟢 Play Again** or **🏠 Return to Home**:
  - **All Ready (≥ 3 Players)**: Fresh match auto-starts immediately with new words and a new Imposter.
  - **Fewer than 3 Players**: Returns room to lobby with `Waiting for more players...`.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion (animations), Lucide React (icons), canvas-confetti.
- **Backend**: Node.js, Express, Socket.IO (WebSockets).
- **Hosting**: Netlify (Client) & Render / Railway (Server).

---

## ⚙️ Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/Akshaynbhat/Imposter_game.git
cd Imposter_game
```

### 2. Configure Environment Files
- **Client**: Copy `client/.env.example` to `client/.env`
- **Server**: Copy `server/.env.example` to `server/.env`

### 3. Run Locally
In the root directory, start both client and server concurrently:
```bash
npm run dev
```
- Frontend will run on: `http://localhost:5173`
- Backend will run on: `http://localhost:3001`

---

## 🌐 Production Deployment

### Frontend (Netlify / Vercel)
Root `netlify.toml` enables simple Netlify deployment.
1. Connect repository to Netlify.
2. Build command: `npm run build` inside `client` with output directory `dist`.
3. Set environment variable `VITE_SERVER_URL` pointing to backend URL.

### Backend (Render / Railway)
1. Deploy as a Web Service on Render.
2. Root Directory: `server`.
3. Build Command: `npm install && npm run build`.
4. Start Command: `node dist/index.js`.
