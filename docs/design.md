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
- **Allied AI generals.** A General can ask an AI-led army on their side for a plan from the "Allied generals" panel: Attack, Defend a place (hold it and strike at enemies who come near), Hold a place (stay put), or Own plan. The AI keeps to the plan until asked for another.
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
  - **The map:** the hand-made coastal pass between the cliffs and the sea. At the Middle Gate it narrows to about 20 m, closed by the Phocian wall with a gateway. The Anopaea path climbs through the mountains and comes down between the Greek rear and the far exit.
  - **Greek slots:** Leonidas and the Three Hundred, Demophilus and the Thespians, Leontiades with the Thebans and Arcadians, and Hegesander with the Phocians on the mountain path. Armies sharing a narrow zone stand one behind the other, and lines too wide for the pass stack in depth.
  - **Persian slots:** Datis (Medes and Cissians) and Mardonius (Sparabara) at the start. Xerxes' host arrives at 6 minutes, and Hydarnes with the Immortals at 8. Both arrive later and can be claimed in the lobby; until then their players watch.
  - **Waves:** every 100 s until minute 15, fresh troops join an AI-led Persian army. Difficulty shifts all of these times: on Legendary waves come every 70 s and the Immortals at 6 minutes. Hard and Legendary waves are bigger, and each Greek player beyond the first adds a unit.
  - **The betrayal:** a minute of rumours, then the Immortals march the mountain path. If the Phocians break them there, history changes.
  - **Winning:** the Greeks win by holding for 18 minutes, or by breaking the Persians once no more are coming. The Persians win by getting 50 men into the far exit, or by routing every Greek.
  - **In PVP,** human Persians earn 60 gold a minute plus gold for kills, and spend it on reinforcements.
- **Last Stand (survival).**
  - Lobby choices: the battlefield (the hill camp, the river crossing or the Hot Gates), your faction and the enemy's.
  - Four armies hold the position. Each General recruits with 3,000 gold, and the AI leads any army nobody claims.
  - Ten waves come from the map edges, each bigger than the last: two armies at once from wave 5, three from wave 9.
  - A wave counts as beaten when fewer than one in seven of its troops still fight. Each player then gets 250 + 100 × the wave number in gold, AI-led allies get half their missing men back, and the next wave comes 30 s later. A wave not beaten after three minutes doesn't hold back the next.
  - Your score is the number of waves beaten. Beating all ten wins.
- **Sandbox:** pick the ground (Open Plains, Rolling Hills, Woodland, Desert, the River Crossing, the Hill Camp or the Hot Gates), then up to four armies a side, each of any faction and made of any faction's units (up to 30, at no cost; no gold in battle). Each army slot's faction is a lobby option ('a1'...'b4'; 'none' leaves it out). A General picks their own army's faction and units; the host also sets up the AI's armies and adds or removes armies.
- **Objective battles** (PVE or PVP):
  - **Capture & Hold:** three points on the plains, the river crossing or the hill camp. Each point held scores a victory point a second. 1,200 wins; otherwise most points after 20 minutes. 4,000 gold per army, plus 60 a minute.
  - **Defend the Bridge:** the attackers must get 60 men across the river, by the bridge or the fords, within 15 minutes. The defenders have 3,500 gold per army and the attackers 5,500. One AI attacker goes for the bridge and one marches round by the north ford.

## Economy (Last Stand, Objective battles, and the Persian side in PVP Thermopylae)
- **Gold is per player.** A General's gold buys units for their army; a Commander's gold buys units for their own detachment.
- **Before the battle:** Generals recruit in the lobby (or on the solo screen). Units group into detachments automatically: line infantry in blocks of four, then missiles, then cavalry. "Balanced army" picks a mix for you, and the AI uses the same rule for the armies it leads. The relay checks every army against the budget and the unit cap, and unspent gold carries into the battle.
- **During the battle:** earn a fifth of each fallen enemy's price, steady income in some modes, and a bonus for each Last Stand wave beaten. Spend it on:
  - new units, which march in from your edge of the map (the Reinforce panel);
  - topping up worn-down units that are out of combat near your General or your map edge (Replenish, at a quarter over the unit's price per man).
- **AI generals spend too.** An army the AI leads keeps its own purse (what its starting army didn't cost, plus income, kill bounties and wave bonuses). Every ten seconds its general refills units missing a quarter of their men and buys units to keep about half the army line infantry, and its faction's super unit when it can afford a quarter over the price.
- **Super units:** one per faction (Black Spartans, Praetorian Guard, Apple-Bearers, Hannibal's Veterans, Silver Shields). Top stats, terror, the Inspire ability, 1,600–1,800 gold. Never picked by "Balanced army"; they lead the last three waves of Last Stand (one in the eighth and ninth, one per group in the final wave). Drawn 12% larger, with gold trim, a gold glint and a gold-edged banner.
- **Pace:** every unit moves 30% faster than its listed speed (`PACE` in the sim), so armies close sooner.
- **Strength** (lobby setting, per side): ×1, ×1.5, ×2, ×3 or ×5 on every soldier's health and damage, so at ×2 a soldier fights like two. A handicap for co-op against the AI or uneven PVP.
- **Let the AI lead** (battle menu): a player can hand their army or detachment to the AI and take it back; bots do this by default.
- **Fog of war** (lobby switch): enemies show only within sight of your troops: 130 m on foot, 160 m mounted, and 40 m for enemies in forest. Only the view is fogged: the AI sees everything.

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
  - A frame-rate limit (30 to 144 fps, or none), in Settings and the battle menu: it keeps laptops cooler and quieter.
- **The interface:** dark glass panels with hairline borders and one warm gold accent, over a pixel-art backdrop of the Hot Gates at dusk (drawn in code).
  - **Type:** Geist Pixel (free OFL licence, bundled in `packages/client/src/ui/fonts`): its Square style for text, and its Grid style, built from separate square tiles, for the logo and big titles.
  - **The screens:**
    1. Title screen.
    2. Host, Join (with a room code or link) or Solo.
    3. The lobby.
    4. Recruitment, in gold modes.
    5. Deployment: drag your detachments into your zone.
    6. The battle.
    7. Results, with stats and an MVP captain.
- **Sound:** 16-bit, SNES-style music and sound effects, synthesised in code with Web Audio instruments and hall reverb. All melodies are original; nothing is copied from Square Enix games.
- **Code-drawn art.**
  - All art and sound are generated by code, so there are no downloaded assets and no licensing questions. The one exception is the font, which is free under the OFL.
  - The HD-2D feel comes mostly from the lighting, blur and pixel textures. Code-drawn sprites won't match Square Enix's hand-made art.
  - Hand-drawn sprite sheets can replace them later without touching the engine.
