# 🎮 Imposter Clues

Imposter Clues is a premium, real-time multiplayer party game designed for **3 to 10 players**. One player is secretly assigned as the **Imposter** with a related but slightly different word, while the rest are **Civilians** with the same secret word. 

The objective? Civilians must root out the Imposter through word clues, while the Imposter must deduce the Civilian word and blend in!

---

## 🚀 Game Flow & Rules

### 1. Game Setup & Settings (Lobby)
- Players join via a unique **6-character room code** (e.g. `XY78AB`).
- The **Host** can customize the game rules:
  - **Category**: Select from curated lists (**Food, Animals, Technology, Sports, Movies, Places**) or choose **Custom Words** to enter your own secrets safely.
  - **Difficulty**: Toggle between All, Easy, Medium, or Hard pairs.
  - **Timers**: Customize clue submission limits and discussion lengths.
- Players toggle **Ready** to start the match.

### 2. Clue Submission Phase
- Every player receives their secret word on screen. 
- Players submit exactly **one clue word** before the timer expires.
- **Rule Constraints**: Clues must contain letters only (no spaces, numbers, emojis, or special characters) and have a maximum of 20 characters.

### 3. Clue Reveal & Debate Phase
- All clues are displayed in a clean table.
- A **45-second debate timer** starts. Players can discuss using the built-in **Real-Time Text Chat** or external voice channels (like Discord).

### 4. Voting & Tie-Breakers
- Players vote for the player they suspect is the Imposter.
- **Secret Ballots**: Vote counts are hidden until the round finishes.
- **Tie-Breaker Phase**: If a vote ends in a tie, a tie-breaker round starts. Players can only vote for the tied candidates. If a second tie occurs, a random candidate is selected.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion (premium animations), Lucide React (icons), canvas-confetti.
- **Backend**: Node.js, Express, Socket.IO (WebSockets).
- **Hosting**: Preconfigured for **Vercel** / **Netlify** (Frontend) and **Render** / **Railway** (Backend).

---

## ⚙️ Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/Akshaynbhat/Imposter_game.git
cd Imposter_game
```

### 2. Configure Environment Files
Copy the example files and adjust if necessary:
- **Client**: Copy `client/.env.example` to `client/.env`
- **Server**: Copy `server/.env.example` to `server/.env`

### 3. Run Locally
In the root directory, start both the client and server concurrently:
```bash
npm run dev
```
- Frontend will run on: `http://localhost:5173`
- Backend will run on: `http://localhost:3001`

---

## 🌐 Production Deployment

### Frontend (Netlify / Vercel)
The repository contains a `netlify.toml` file at the root to enable one-click deployments on Netlify.
1. Connect the repository to Netlify.
2. Netlify will autoconfigure building inside `client` with output directory `dist`.
3. Add the Environment Variable `VITE_SERVER_URL` pointing to your deployed backend URL.

### Backend (Render / Railway)
1. Deploy as a **Web Service** on Render.
2. Set the **Root Directory** to `server`.
3. Set the **Build Command** to `npm install && npm run build`.
4. Set the **Start Command** to `node dist/index.js`.
5. Environment variables are managed automatically.
