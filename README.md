# War-strat-game: Pixel Legions

2d game like total war to play with friends.

**Pixel Legions** is an HD-2D battle game in the style of Octopath Traveler and Final Fantasy Resonance: pixel-art soldiers fighting in a lit 3D diorama.

Up to four friends command ancient armies from **Rome, Greece, Carthage, Persia and Macedon** in real-time, Total War-style battles. You play in the browser on Windows or Mac, with nothing to install.

- **Be a General.** Command your detachments, or take command of any captain or commander and lead their unit in person (WASD).
- **Or serve as a Commander** under a friend's General: their orders show up on your map.
- **Co-op against the AI, or player vs player.** Every battle has two sides; pick yours in the lobby, and the AI fills empty slots.
- **Modes:** Thermopylae (480 BC), Last Stand (survive the waves) and Objective battles (Capture & Hold, Defend the Bridge).

## Play

Open the game link, enter a name, then either **Host** (you get a room code to share) or **Join** with a friend's code. **Solo** runs entirely in your browser.

## Develop

You need Node.js 22 or newer.

```bash
npm install
npm run dev        # relay on :8090 + game on http://localhost:5190
npm run check      # determinism scan, typecheck, tests
```

Host on your own network: `npm run host`, then friends open `http://<your-ip>:8090`.

See [CLAUDE.md](CLAUDE.md) for a map of the code and [docs/roadmap.md](docs/roadmap.md) for progress and ideas.
