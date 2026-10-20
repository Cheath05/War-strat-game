export function Help({ back }: { back: () => void }) {
  return (
    <div className="screen title-bg">
      <div className="ff-window help" style={{ position: 'relative', zIndex: 1 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ff-title">How to play</h2>
          <button className="ff-btn small" onClick={back}>
            Back
          </button>
        </div>
        <h3>Your role</h3>
        <p>
          As <b>General</b> you command an army: your guard and several detachments, each led by a commander, with a captain in every unit. Give orders to units
          directly, or give a whole detachment an order (hold, advance, attack, flank) and let its commander carry it out. As a <b>Commander</b> you lead one
          detachment under a General; their orders appear on your screen.
        </p>
        <h3>Commanding (General's view)</h3>
        <ul>
          <li>
            <span className="kbd">Left click</span> select a unit, <span className="kbd">Shift</span> to add, or drag a box around several.
          </li>
          <li>
            <span className="kbd">Right click</span> move there; on an enemy, attack. <span className="kbd">Double right click</span> or{' '}
            <span className="kbd">Shift</span> to run.
          </li>
          <li>
            <span className="kbd">Right drag</span> draw the line your units should form: drag wider for a long thin line, shorter for a deep block.
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
      </div>
    </div>
  );
}
