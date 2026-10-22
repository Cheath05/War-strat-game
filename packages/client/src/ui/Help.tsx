import { Backdrop } from './Backdrop';
import { mouseNames } from '../game/input/controls';

export function Help({ back }: { back: () => void }) {
  const m = mouseNames();
  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window help">
        <header className="window-head">
          <h2 className="heading">How to play</h2>
          <button className="btn small ghost" onClick={back}>
            Back
          </button>
        </header>
        <div className="window-body prose">
          <h3>Your role</h3>
          <p>
            As <b>General</b> you command an army: your guard and several detachments, each led by a commander, with a captain in every unit. Give orders to units
            directly, or give a whole detachment an order (hold, advance, attack, flank) and let its commander carry it out. As a <b>Commander</b> you lead one
            detachment under a General; their orders appear on your screen.
          </p>
          <h3>Commanding (General's view)</h3>
          <ul>
            <li>
              <span className="kbd">{m.pick} click</span> select a unit, <span className="kbd">Shift</span> to add, or drag a box around several. Settings → Mouse buttons swaps the two buttons.
            </li>
            <li>
              <span className="kbd">{m.act} click</span> move there; on an enemy, attack. <span className="kbd">Double {m.act.toLowerCase()} click</span> or{' '}
              <span className="kbd">Shift</span> to run.
            </li>
            <li>
              <span className="kbd">{m.act} drag</span> draw the line your units should form: drag wider for a long thin line, shorter for a deep block.
            </li>
            <li>
              <span className="kbd">F</span> formation (phalanx, testudo, wedge...), <span className="kbd">H</span> halt, <span className="kbd">T</span> fire at will,{' '}
              <span className="kbd">K</span> skirmish mode, <span className="kbd">G</span> guard mode.
            </li>
            <li>
              <span className="kbd">Ctrl+1..9</span> make a group, <span className="kbd">1..9</span> select it (twice to jump there).
            </li>
            <li>
              Camera: <span className="kbd">W A S D</span> pan, <span className="kbd">Q</span>/<span className="kbd">E</span> rotate, mouse wheel zoom,{' '}
              <span className="kbd">Home</span> your general, <span className="kbd">Space</span> pause (solo).
            </li>
          </ul>
          <h3>Leading in person</h3>
          <p>
            Select a unit and press <span className="kbd">P</span> (or the ♛ button on its card) to take command of its captain. A commander brings his whole
            detachment along; the general strengthens his aura.
          </p>
          <ul>
            <li>
              <span className="kbd">W A S D</span> move, <span className="kbd">Shift</span> run, mouse to look.
            </li>
            <li>
              <span className="kbd">Space</span> charge the enemy ahead, <span className="kbd">R</span> rallying shout, <span className="kbd">Q</span> volley at the cursor,{' '}
              <span className="kbd">E</span> hold here, <span className="kbd">F</span> formation.
            </li>
            <li>
              <span className="kbd">Tab</span> back to the General's view.
            </li>
          </ul>
          <h3>Winning</h3>
          <p>
            Battles are won by breaking the enemy's will. Units rout when morale collapses: from losses, flank and rear attacks, charges, exhaustion, friends fleeing
            and the death of their general. Hit them in the flank, keep your general alive and close, rest tired men, and use the ground: uphill fights are hard and
            forests break formations.
          </p>
          <h3>The battles</h3>
          <ul>
            <li>
              <b>Thermopylae:</b> hold the pass for 18 minutes against wave after wave. Keep the Phocians on the mountain path: if the Immortals get round, they
              come down behind you. Xerxes and the Immortals arrive later; a friend can claim them in the lobby and play the Persians.
            </li>
            <li>
              <b>Last Stand:</b> four armies hold a hilltop camp, a river crossing or the Hot Gates against ten waves, each bigger than the last. Beating a wave pays
              gold; your score is how many you beat.
            </li>
            <li>
              <b>Capture &amp; Hold:</b> every point you hold scores a victory point a second. First to 1,200 wins.
            </li>
            <li>
              <b>Defend the Bridge:</b> the attackers need sixty men across the river, by the bridge or the fords, within fifteen minutes.
            </li>
          </ul>
          <h3>Gold</h3>
          <p>
            In Last Stand and the objective battles, a General recruits the army before the battle (<b>Recruit army</b> in the lobby). What you don't spend, and the
            gold you earn from kills and beaten waves, buys more in battle: <b>Reinforce</b> (top left) sends new units in from your map edge, and{' '}
            <b>Replenish</b> refills worn units resting near your general or your map edge.
          </p>
          <h3>Strength and help from the AI</h3>
          <p>
            <b>Strength</b> (a rule in the lobby) makes every soldier on one side tougher and harder-hitting: at ×2 each man fights like two. Use it as a
            handicap when the AI side is too much, or to even out a PVP game. In battle, <b>Menu → Let the AI lead my troops</b> hands your army to the AI
            general and commanders until you take it back.
          </p>
          <h3>Whose troops are whose</h3>
          <p>
            Every unit has a banner and a faint outline on the ground: <b>gold</b> for yours, <b>blue</b> for allies, <b>red</b> (and a square-cut banner) for the
            enemy. The minimap frames each unit the same way.
          </p>
          <h3>Super units</h3>
          <p>
            Each faction has one: the Black Spartans, the Praetorian Guard, the Apple-Bearers, Hannibal's Veterans and the Silver Shields. They are bigger men in
            gold-edged armour, nearly unbreakable, frighten enemies nearby and can Inspire their friends, and they cost a fortune. Recruit them in Last Stand and
            the objective battles, and watch for them in the last waves of Last Stand.
          </p>
          <h3>Fog of war</h3>
          <p>
            With fog on (a lobby rule), you only see enemies your troops can see: about 130 m on foot, 160 m on horseback, and only 40 m into forest. Scouts and
            cavalry earn their keep.
          </p>
        </div>
      </div>
    </div>
  );
}
