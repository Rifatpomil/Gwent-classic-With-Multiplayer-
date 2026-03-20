# Gwent Classic - Multiplayer Edition
![cover](https://user-images.githubusercontent.com/26311830/116256903-f1599b00-a7b6-11eb-84a1-16dcb5c9bfc6.jpg)

A browser remake of the original Gwent minigame from The Witcher 3: Wild Hunt, now featuring **Real-Time Multiplayer** support! Play against an AI or challenge your friends across different devices — locally or over the internet!

---

## Important Note on Hosting
This project is **self-hostable** — meaning anyone can deploy their own free instance and play with friends without relying on anyone else's server.

> **If you just want to play:** Use the quick play link below OR host your own free instance in 5 minutes using the guide below!

---

##  Quick Play (Hosted Demo)
Want to try it instantly?

🔗 **[Play Now](https://gwent-classic-with-multiplayer.onrender.com)**

>  **Note:** This is my personal free-tier instance hosted on Render.
> - It may **spin down after 15 mins of inactivity** (first load = ~50 sec wait)
> - I **cannot guarantee 24/7 uptime** for everyone
> - For **reliable play**, I strongly recommend **hosting your own instance** (it's free and takes 5 minutes — see below!)

---

##  Features

####  Real-Time Multiplayer
Challenge your friends! Create a room with a unique code and play together from **different devices anywhere in the world** — as long as both players use the same hosted instance.

####  Intelligent AI Opponent
Face off against a fully implemented AI opponent when playing solo. The AI makes strategic decisions based on the board state and its hand.

####  Complete Card Collection (TW3 + DLC)
Includes all cards from the base game, Hearts of Stone, and Blood and Wine (including the Skellige deck).

####  Faithful Recreation
Aims to resemble the original minigame as closely as possible, from fonts and UI layout to animations and notifications.

####  Music Tracks
Gwent music tracks are integrated and can be toggled via the music icon.

---

##  How to Play

### Multiplayer Mode (Same Device/Local Network)
1. Open the game in your browser (local or hosted URL).
2. Go to the **Multiplayer** menu.
3. **Player 1:** Enter a Room Code (e.g., `1234`) and your Name → Click Join.
4. **Player 2:** Enter the **same Room Code** and their Name → Click Join.
5. Game starts automatically when both players are in the room!

### Multiplayer Mode (Different Devices / Over the Internet)
> Both players MUST use the same hosted URL (either yours or a self-hosted one)

1. **Host** your own instance (see hosting guide below) OR use the Quick Play link.
2. **Share the URL** with your friend.
3. Both open the **same URL** in their browsers.
4. Follow the same room code steps above.
5. Play from anywhere in the world! 🌍

### Single Player Mode
1. Customize your deck in the customization screen.
2. Click **Start Game (AI)** to face off against the computer.

---

## Hosting Options

### Option 1: Host on Render (Free — Recommended ⭐)
Host your own instance for free in ~5 minutes:

1. **Fork this repository** (click Fork on GitHub top right)
2. Go to **[render.com](https://render.com)** → Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your forked repo
5. Fill in these settings:

| Setting | Value |
|---------|-------|
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

6. Click **"Create Web Service"**
7. Wait ~3 minutes → Get your own free URL! 🎉

>  **Keep it awake for free:** Use [UptimeRobot](https://uptimerobot.com) to ping your URL every 5 minutes — prevents the free tier from sleeping!
> 1. Sign up free at uptimerobot.com
> 2. Add New Monitor → HTTP(s)
> 3. Paste your Render URL
> 4. Set interval to 5 minutes
> 5. Done! Server stays awake 

---

### Option 2: Run Locally (Same Device)
For playing on the same machine or local network:

1. **Clone the repository:**

       git clone https://github.com/Rifatpomil/Gwent-classic-With-Multiplayer-.git
       cd Gwent-classic-With-Multiplayer-

2. **Install dependencies:**

       npm install

3. **Start the server:**

       npm start

4. **Open in browser:**

       http://localhost:3000

#### Playing on Local Network (Same WiFi):
- Find your local IP:
  - **Windows:** Open CMD → type `ipconfig` → look for IPv4 Address
  - **Mac:** System Settings → WiFi → Details → IP Address
- Player 2 opens: `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.5:3000`)
- Both use same room code → Play! 

---

### Option 3: Other Cloud Platforms
You can also deploy on:

| Platform | Cost | Notes |
|----------|------|-------|
| **Railway** | Free tier available | Similar to Render |
| **Fly.io** | Free tier available | Slightly more complex setup |
| **Heroku** | Paid only now | No longer free |
| **VPS (DigitalOcean/etc.)** | ~\$5/month | Full control |

---

## 📁 Project Structure

    gwent-classic/
    ├── server.js        # Node.js/Socket.io multiplayer server
    ├── network.js       # Client-side networking
    ├── gwent.js         # Core game logic
    ├── abilities.js     # Card abilities
    ├── cards.js         # Card definitions
    ├── decks.js         # Deck management
    ├── factions.js      # Faction data
    ├── index.html       # Game frontend
    ├── style.css        # Styling
    └── package.json     # Dependencies

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Server runtime |
| **Express** | Web server |
| **Socket.io** | Real-time multiplayer |
| **HTML/CSS/JS** | Game frontend |

---

##  FAQ

**Q: Can I play with someone across the world?**
> Yes! As long as both players use the same hosted URL (Render or any cloud host), you can play from anywhere!

**Q: Is it free to host?**
> Yes! Render's free tier is enough for casual play with friends.

**Q: The game takes forever to load!**
> Free tier servers sleep after inactivity. Wait ~50 seconds for first load. Use UptimeRobot to prevent this.

**Q: Can multiple groups play at the same time?**
> Yes! Each group uses a different room code. Free tier handles ~50 concurrent players easily.

**Q: What if the hosted demo goes down?**
> Host your own instance! It takes 5 minutes and is completely free.

---

## Credits
- Original project by [Arun Sundaram](https://github.com/asundr/gwent-classic)
- Multiplayer implementation and synchronization fixes by [Rifatpomil](https://github.com/Rifatpomil)

---

*This is a fan-made project. Gwent and The Witcher are trademarks of CD Projekt Red.*
