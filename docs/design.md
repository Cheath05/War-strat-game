# Game design

This is the living design: it starts as the approved v1 design in [plans/v1.md](plans/v1.md) and changes as the game does.

### Command hierarchy and roles
- **The chain of command:**
  - An **army** is a General with a bodyguard, plus 2–4 **detachments**.
  - Each detachment has a **Commander** and 1–4 **units**.
  - Each unit has about 24 soldiers, led by a **Captain** with a crest or plume.
- **Lobby slots.** Each side lists its army slots (e.g. "Leonidas: Spartans") and their detachments.
  - Claim an army to be its **General**.
  - Claim a detachment to be a **Commander** under that army's General, who can be human or AI. Serving under AI Leonidas works too.
  - The AI takes any unclaimed slot. Anyone can also spectate.
- **General view (real-time strategy).** You can order units directly, or give detachment orders to AI Commanders, who carry them out:
  - Hold here, Advance to, Attack target;
  - Flank left / Flank right;
  - Skirmish, Reserve (plug gaps), Guard the General, Fall back.
- **Human Commanders.** When their General gives an order, it appears on their map as a marker, an arrow and a message, but they decide how to carry it out. Everyone can ping the map ("attack here", "help!").
- **Take command (possession).** Press P, or double-click a captain; Tab takes you back.
  - **Controls:** WASD to move, Shift to run, aim with the mouse, Space to charge, F to change formation, R for a rally shout, Q to fire a volley at the cursor, E to brace/hold.
  - The unit follows you in formation, and the camera drops in behind your captain.
  - **Possessing a Commander** brings the whole detachment with you. **Possessing the General** strengthens the General's aura.
  - **Led from the front:** a unit you're leading gets bonus morale. If your captain falls, the unit loses morale, another soldier becomes captain, and you go back to the map view.
- **If a General dies,** the whole army takes a morale shock, but the player keeps command, as in Total War.

## Battle rules
- **Lobby switches** (* = can be turned off):
  - morale and routing*: units waver, rout, then rally or shatter;
  - fatigue*;
  - limited ammo*;
  - fog of war*;
  - unit size: Small, Medium, Large or Huge;
  - difficulty from Easy to Legendary, scaled by the number of human players.
- **Formations:** line, loose, phalanx, testudo, shield wall and wedge. Units squeeze into a column automatically on narrow paths, which matters at Thermopylae.
- **Combat:**
  - hit chance comes from attack vs defence, damage from armour and armour-piercing;
  - charges hit hard, but bracing spears and phalanxes stop them;
  - flank and rear attacks get a bonus;
  - shields and testudo block missiles;
  - elephants and chariots cause terror and trample, and panicked elephants run amok.
- **Morale:**
  - Rises with the General's aura, a winning fight, and being led in person.
  - Falls with casualties, flank or rear attacks, being charged, nearby friends routing, terror, and exhaustion.
- **Terrain:**
  - hills: a height bonus, and slower going uphill;
  - forests: cover, slow cavalry, and break a phalanx;
  - fords and shallows;
  - impassable cliffs, sea and walls.

## Factions (about 7 unit types each, plus the General's bodyguard)

| Faction | Units |
|---|---|
| **Rome** (Republic) | Velites, Hastati, Principes, Triarii, Equites, allied Socii infantry |
| **Greece** (city-states) | Spartan Hoplites, Hoplites, Peltasts, Psiloi slingers, Cretan Archers, Hippeis |
| **Persia** | Immortals, Sparabara, Takabara, Median/Cissian Levy, Persian Archers, Persian Cavalry, Saka Horse Archers, Scythed Chariots |
| **Carthage** | Libyan Spearmen, Sacred Band, Iberian Scutarii, Gallic mercenaries, Balearic Slingers, Numidian Cavalry, Iberian Cavalry, War Elephants |
| **Macedon** | Pezhetairoi pike phalanx, Hypaspists, Agrianian Javelinmen, Cretan Archers, Companion Cavalry, Thessalian Cavalry, Prodromoi |

All of this is data files, so adding a unit or a faction later is one file and doesn't change the engine.

## Modes for v1
Every battle has two sides. If all of you are on one side, it's co-op against the AI; split up and it's PVP. The AI fills empty slots, so 1–4 players and spectators all work.

- **Thermopylae (480 BC).**
  - **The map:** the hand-made coastal pass between the cliffs and the sea, with the Phocian wall.
  - **Greek slots:** Leonidas and the Spartans, Demophilus and the Thespians, the Peloponnesian allies, and the Phocians guarding the mountain path.
  - **Persian slots:** Xerxes' waves (Medes and Cissians, archers and Sparabara), and Hydarnes with the Immortals.
  - **The betrayal:** partway through, a shepherd reveals the mountain path, and the Immortals try to take the Greeks from behind. If the Phocians hold the path, history changes.
  - **Winning:** the Greeks win by holding until the timer ends or by breaking the Persians. The Persians win by forcing enough soldiers through the pass or routing every Greek.
  - **In PVP,** the Persian players spend gold to choose and time their waves.
- **Last Stand (survival).**
  - Choose a map template (hill fort, river ford or coastal pass), your factions and the enemy faction.
  - Recruit with gold, then hold out against bigger and bigger waves.
  - Between waves you get a breather and gold for reinforcements. Your score is the number of waves survived.
- **Objective battles** (PVE or PVP):
  - **Capture & Hold:** three points earn victory points.
  - **Defend the Bridge:** the attackers must get across the river, by the bridge or the fords, before time runs out.

## Economy (Last Stand, Objective battles, and the Persian side in PVP Thermopylae)
- **Gold is per player.** A General's gold buys units for their army; a Commander's gold buys units for their own detachment.
- **Before the battle:** recruit on the recruitment screen. Units group into detachments automatically, and you can rearrange them. Each army has a unit cap.
- **During the battle:** earn gold from kills, from holding objectives and from surviving waves. Spend it on:
  - new units, which march in from your edge of the map after about 20 s;
  - topping up worn-down units that are out of combat near your General or your map edge.

## The look: HD-2D
- **What makes HD-2D.** 2D pixel-art characters stand in a 3D world that's lit like a modern game, with:
  - soft shadows, and glowing highlights (bloom);
  - the miniature-diorama blur at the top and bottom of the screen (tilt-shift depth of field);
  - haze, drifting dust and sparks;
  - shimmering water.
- **Soldiers:**
  - pixel-art sprites about 32 px tall, with Octopath-like proportions (big heads, about 2.5 heads tall), shaded and outlined;
  - a "paper doll" generator mixes faction helmets, shields and weapons, and each army gets its own team colours;
  - 4 facing directions relative to the camera, with idle, walk, attack, hit and death frames;
  - bigger sprites for cavalry, elephants and chariots.
- **The battlefield:**
  - a 3D landscape with pixel-art textures: grass, dirt, sand, rock and cliff faces;
  - real hills and cliffs, water with reflections, and fallen soldiers left on the field;
  - trees, and pixel-textured props such as the Phocian wall, tents and ruins.
- **Camera:**
  - **Tactical view:** Q/E rotate and the mouse wheel zooms. The tilt follows the zoom: nearly overhead far out, cinematic up close.
  - **Taking command:** the camera drops in behind your captain, with the focus blur on your unit.
  - **Battle intro:** each battle opens with a sweeping fly-over, in the style of Final Fantasy Resonance's dynamic camera.
- **Graphics settings:**
  - Low, Medium, High and Ultra presets, picked automatically from your computer's speed on first launch.
  - A "pixel size" (render scale) slider: chunkier pixels also run faster on weak laptops.
- **The interface:** classic Final Fantasy-style blue windows with white borders, and pixel fonts under the free OFL licence. The screens:
  1. Title screen.
  2. Host, Join (with a room code or link) or Solo.
  3. The lobby.
  4. Recruitment, in gold modes.
  5. Deployment: drag your detachments into your zone.
  6. The battle.
  7. Results, with stats and an MVP captain.
- **Sound:** 16-bit, SNES-style music and sound effects, synthesised in code with Web Audio instruments and hall reverb. All melodies are original; nothing is copied from Square Enix games.
- **Code-drawn art.**
  - All art and sound are generated by code, so there are no downloaded assets and no licensing questions.
  - The HD-2D feel comes mostly from the lighting, blur and pixel textures. Code-drawn sprites won't match Square Enix's hand-made art.
  - Hand-drawn sprite sheets can replace them later without touching the engine.
