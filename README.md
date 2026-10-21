# War-strat-game: Pixel Legions

2d game like total war to play with friends.

**Pixel Legions** is an HD-2D battle game in the style of Octopath Traveler and Final Fantasy Resonance: pixel-art soldiers fighting in a lit 3D diorama.

Up to four friends command ancient armies from **Rome, Greece, Carthage, Persia and Macedon** in real-time, Total War-style battles. You play in the browser on Windows or Mac, with nothing to install.

- **Be a General.** Command your detachments, or take command of any captain or commander and lead their unit in person (WASD).
- **Or serve as a Commander** under a friend's General: their orders show up on your map.
- **Co-op against the AI, or player vs player.** Every battle has two sides; pick yours in the lobby, and the AI fills empty slots.
- **Modes:** Thermopylae (480 BC), Last Stand (survive the waves) and Objective battles (Capture & Hold, Defend the Bridge).
- **Gold modes:** Generals recruit their own armies, then buy reinforcements during the battle.
- **16-bit soundtrack and effects**, all generated in code; volumes are in Settings.

## Play

**Play now: https://pixel-legions.pl-worker.workers.dev**

Open the game link, enter a name, then either **Host** (you get a room code to share) or **Join** with a friend's code. **Solo** runs entirely in your browser.

## Play together

1. One of you clicks **Host a game** and shares the room code, or the invite link (`…/#join=ABCD`).
2. Everyone else clicks **Join a game** and types the code.
3. In the room, each of you picks an army to lead as **General**, or a detachment to **Command** under someone else's General. The AI fills every empty place.
4. The host picks the battle and the rules and presses **Start**.
5. If your connection drops, reload the page: you come back as the same player, and the AI looks after your troops until then.

Not enough friends tonight? `npm run bots -- ABCD 2` adds two bot players to room ABCD.

**Tips for game night**
- Chrome, Edge, Firefox and Safari all work. On an older laptop, choose **Low** in Settings or a bigger **pixel size**.
- If the game ever says a player went out of sync, it fixes itself: that player's battle is copied from a healthy one.
- **How to play** on the title screen lists every key.

## The public link (Cloudflare, free)

The game runs on Cloudflare's free plan: a Worker serves the game, and each room is a small Durable Object that passes orders between players. Every player's own computer runs the battle, so the server does very little.

One-time setup:

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. In this folder, run `npx wrangler login` and approve it in the browser.
3. Run `npm run deploy`. The first time, Cloudflare asks you to pick a `workers.dev` subdomain. Your link is then `https://pixel-legions.<subdomain>.workers.dev`.

After that, `npm run deploy` publishes each new version. `npm run cf:dev` runs the same Worker on your own computer (http://localhost:8787) without an account.

**Free-plan budget:** each player sends a few messages a second. Cloudflare counts 20 incoming WebSocket messages as one request and doesn't count outgoing ones. A four-player evening is a few thousand of the 100,000 free daily requests.

## Develop

You need Node.js 22 or newer.

```bash
npm install
npm run dev        # relay on :8090 + game on http://localhost:5190
npm run check      # determinism scan, typecheck, tests
```

Host on your own network: `npm run host`, then friends open `http://<your-ip>:8090`.

Headless tools:

```bash
npm run battle -- thermopylae --seed 1 --difficulty 2 --log     # an AI-only battle, with timing
npm run bots -- ABCD 3 --start --scenario laststand --seconds 60 # bots play a room and check they stay in sync
```

See [CLAUDE.md](CLAUDE.md) for a map of the code and [docs/roadmap.md](docs/roadmap.md) for progress and ideas.
