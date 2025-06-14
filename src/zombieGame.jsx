import React, { useRef, useState, useEffect } from 'react';

/** Dimensions */
const GRID_W = 10;
const GRID_H = 6;
const TILE = 80;
const WIDTH = GRID_W * TILE;
const HEIGHT = GRID_H * TILE;
const CASTLE_POS = { x: WIDTH / 2, y: HEIGHT / 2 };

/** Data tables */
// Increase unit damage so most zombies fall after roughly three hits
const towerData = {
  archer: { range: TILE * 2, damage: 10, reload: 60, color: 'green' },
  cannon: { range: TILE * 2, damage: 20, reload: 80, splash: 30, color: 'orange' },
  fire: { range: TILE * 2, damage: 10, reload: 90, burn: true, color: 'red' },
  sniper: { range: TILE * 2, damage: 40, reload: 120, color: 'purple' },
};

const zombieData = {
  walker: { hp: 30, damage: 5, speed: 20, color: 'lime' },
  runner: { hp: 20, damage: 5, speed: 40, color: 'yellow' },
  armored: { hp: 60, damage: 8, speed: 15, armor: 0.5, color: 'blue' },
  boss: { hp: 200, damage: 20, speed: 10, color: 'black' },
};

let uid = 0;
function nextId() {
  uid += 1;
  return uid;
}

const TOWER_HP = 200;

function useGameLoop(callback, speedRef) {
  useEffect(() => {
    let frame;
    let last = performance.now();
    const loop = (now) => {
      const delta = ((now - last) / (1000 / 60)) * speedRef.current;
      last = now;
      callback(delta);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [callback, speedRef]);
}

const validTiles = [];
for (let y = 0; y < GRID_H; y += 1) {
  for (let x = 0; x < GRID_W; x += 1) {
    if (x === GRID_W / 2 && y === GRID_H / 2) continue; // castle tile
    validTiles.push({ x, y });
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function CastleDefenders() {
  const canvasRef = useRef(null);
  const [coins, setCoins] = useState(20);
  const [wave, setWave] = useState(1);
  const [castleHP, setCastleHP] = useState(100);
  const [towers, setTowers] = useState([]); // {id,type,level,x,y,cooldown,disabled}
  const [zombies, setZombies] = useState([]); // {id,type,x,y,hp,damage,speed}
  const [projectiles, setProjectiles] = useState([]); // {id,x,y,dx,dy,speed,damage,splash}
  const [waveActive, setWaveActive] = useState(false);
  const [selected, setSelected] = useState(null);
  const [modifier, setModifier] = useState(null); // 'fog','haste',null
  const [repairs, setRepairs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [powerOptions, setPowerOptions] = useState(null); // array of power objects
  const [powerCost, setPowerCost] = useState(30);

  const [freeUnit, setFreeUnit] = useState(false);

  const [rangeBonus, setRangeBonus] = useState(0); // squares
  const [fireRateBonus, setFireRateBonus] = useState(0); // percent in decimal
  const [zHealthMod, setZHealthMod] = useState(1);
  const [zSpeedMod, setZSpeedMod] = useState(1);
  const speedRef = useRef(1);
  speedRef.current = speed;

  const powers = [
    { name: 'Increase range by 1 square', action: () => setRangeBonus((b) => b + 1) },
    { name: 'Increase fire rate by 5%', action: () => setFireRateBonus((b) => b + 0.05) },
    { name: 'Decrease zombies health by 5%', action: () => setZHealthMod((m) => m * 0.95) },
    { name: 'Add defences to your castle', action: () => setCastleHP((h) => h + 20) },
    { name: 'Slow down zombies speed by 5%', action: () => setZSpeedMod((m) => m * 0.95) },
    { name: 'Get a free unit of your choice', action: () => setFreeUnit(true) },
    { name: 'Get forty coins', action: () => setCoins((c) => c + 40) },
    { name: 'Increase castle health by 5%', action: () => setCastleHP((h) => Math.round(h * 1.05)) },
  ];

  const spawnRef = useRef({ left: 0, total: 0 });
  const disabledRef = useRef({ id: null, time: 0 });
  const unlockedRef = useRef(['walker']);

  function startWave() {
    if (waveActive) return;
    setWaveActive(true);
    setModifier(Math.random() < 0.33 ? 'fog' : Math.random() < 0.5 ? 'haste' : null);
    if (wave >= 4 && !unlockedRef.current.includes('runner')) unlockedRef.current.push('runner');
    if (wave >= 7 && !unlockedRef.current.includes('armored')) unlockedRef.current.push('armored');
    if (wave >= 10 && !unlockedRef.current.includes('boss')) unlockedRef.current.push('boss');
    spawnRef.current = { left: 5 + wave * 2, total: 5 + wave * 2 };
  }

  function endWave() {
    setWaveActive(false);
    setModifier(null);
    setWave((w) => w + 1);
  }

  function spawnZombie() {
    const types = unlockedRef.current;
    const type = types[Math.floor(Math.random() * types.length)];
    const base = zombieData[type];
    const mult = 1 + 0.2 * (wave - 1);
    const hp = base.hp * mult * zHealthMod;
    const damage = base.damage * mult;
    const speedZ = base.speed * (modifier === 'haste' ? 1.25 : 1) * zSpeedMod;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = Math.random() * WIDTH;
      y = 0;
    } else if (edge === 1) {
      x = WIDTH;
      y = Math.random() * HEIGHT;
    } else if (edge === 2) {
      x = Math.random() * WIDTH;
      y = HEIGHT;
    } else {
      x = 0;
      y = Math.random() * HEIGHT;
    }
    const id = nextId();
    const z = { id, type, x, y, hp, damage, speed: speedZ, color: base.color };
    setZombies((zs) => [...zs, z]);
    if (type === 'boss') {
      for (let i = 0; i < 3; i += 1) spawnZombie();
      if (towers.length) {
        const idx = Math.floor(Math.random() * towers.length);
        disabledRef.current = { id: towers[idx].id, time: 300 }; // 5s at 60fps
      }
    }
  }

  function handlePlacement(e) {
    if (waveActive || !selected) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const gx = Math.floor(mx / TILE);
    const gy = Math.floor(my / TILE);
    const valid = validTiles.find((t) => t.x === gx && t.y === gy);
    if (!valid) return;
    const exists = towers.find((t) => t.gx === gx && t.gy === gy);
    if (exists) {
      const cost = Math.max(1, Math.round(exists.cost * 1.5) - 3);
      if (coins >= cost && exists.level < 5) {
        setCoins((c) => c - cost);
        setTowers((ts) =>
          ts.map((t) =>
            t.id === exists.id
              ? {
                  ...t,
                  level: t.level + 1,
                  cost,
                }
              : t
          )
        );
      }
      return;
    }
    if (!freeUnit && coins < 7) return;
    const id = nextId();
    setTowers((ts) => [
      ...ts,
      {
        id,
        type: selected,
        level: 1,
        gx,
        gy,
        x: CASTLE_POS.x,
        y: CASTLE_POS.y,
        targetX: gx * TILE + TILE / 2,
        targetY: gy * TILE + TILE / 2,
        moving: true,
        cooldown: 0,
        cost: 7,
        disabled: 0,
        hp: TOWER_HP,
      },
    ]);
    if (!freeUnit) setCoins((c) => c - 7);
    setFreeUnit(false);
  }

  function repairCastle() {
    const cost = 2 + 2 * repairs;
    if (coins >= cost && castleHP < 100) {
      setCoins((c) => c - cost);
      setCastleHP((h) => Math.min(100, h + 20));
      setRepairs((r) => r + 1);
    }
  }

  function useSpecialPower() {
    if (coins < powerCost) return;
    const opts = [];
    while (opts.length < 2) {
      const p = powers[Math.floor(Math.random() * powers.length)];
      if (!opts.includes(p)) opts.push(p);
    }
    setPowerOptions(opts);
  }

  useGameLoop((delta) => {
    if (!canvasRef.current) return;
    // spawn
    if (waveActive && spawnRef.current.left > 0) {
      spawnRef.current.left -= delta;
      if (spawnRef.current.left <= spawnRef.current.total - Math.floor(spawnRef.current.left)) {
        spawnZombie();
      }
    }
    // update zombies
    setZombies((zs) =>
      zs
        .map((z) => {
          const targetTower = towers.find((t) => distance(t, z) < 20);
          if (targetTower) {
            setTowers((ts) =>
              ts.map((t) => (t.id === targetTower.id ? { ...t, hp: t.hp - 5 } : t))
            );
            return z;
          }
          const angle = Math.atan2(CASTLE_POS.y - z.y, CASTLE_POS.x - z.x);
          z.x += Math.cos(angle) * z.speed * (delta / 60);
          z.y += Math.sin(angle) * z.speed * (delta / 60);
          if (distance(z, CASTLE_POS) < 20) {
            setCastleHP((hp) => hp - z.damage);
            return null;
          }
          return z;
        })
        .filter(Boolean)
    );
    // update towers
    setTowers((ts) =>
      ts
        .map((t) => {
          if (t.disabled > 0) t.disabled -= delta;
          if (t.cooldown > 0) t.cooldown -= delta;

          if (t.moving) {
            const ang = Math.atan2(t.targetY - t.y, t.targetX - t.x);
            t.x += Math.cos(ang) * 60 * (delta / 60);
            t.y += Math.sin(ang) * 60 * (delta / 60);
            if (distance(t, { x: t.targetX, y: t.targetY }) < 5) {
              t.x = t.targetX;
              t.y = t.targetY;
              t.moving = false;
            }
          }

          const rangeMult = modifier === 'fog' ? 0.7 : 1;
          const base = towerData[t.type];
          const r =
            (base.range + rangeBonus * TILE) * rangeMult * (1 + 0.1 * (t.level - 1));
          if (t.cooldown <= 0 && t.disabled <= 0 && !t.moving) {
            const target = zombies.reduce((acc, z) => {
              const d = distance(z, t);
              return d <= r && (!acc || d < distance(acc, t)) ? z : acc;
            }, null);
            if (target) {
              const dmg = base.damage * (1 + 0.2 * (t.level - 1));
              const speedP = 200;
              const angle = Math.atan2(target.y - t.y, target.x - t.x);
              const p = {
                id: nextId(),
                x: t.x,
                y: t.y,
                dx: Math.cos(angle) * speedP,
                dy: Math.sin(angle) * speedP,
                damage: dmg,
                splash: base.splash,
                burn: t.level >= 5 && base.burn,
                pierce: t.level >= 5 && t.type === 'sniper',
              };
              setProjectiles((ps) => [...ps, p]);
              t.cooldown =
                (base.reload / (1 + 0.1 * (t.level - 1))) / (1 + fireRateBonus);
            }
          }
          return t;
        })
        .filter((t) => t.hp > 0)
    );
    // update projectiles
    setProjectiles((ps) =>
      ps
        .map((p) => {
          p.x += p.dx * (delta / 60);
          p.y += p.dy * (delta / 60);
          if (p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT) return null;
          let hit = false;
          setZombies((zs) =>
            zs
              .map((z) => {
                if (hit) return z;
                if (distance(z, p) < 10) {
                  let dmg = p.damage;
                  if (zombieData[z.type].armor) dmg *= 1 - zombieData[z.type].armor;
                  z.hp -= dmg;
                  if (p.pierce) hit = false; else hit = true;
                }
                return z;
              })
              .filter((z) => {
                if (z.hp <= 0) {
                  setCoins((c) => c + wave);
                  return false;
                }
                return true;
              })
          );
          return hit ? null : p;
        })
        .filter(Boolean)
    );
    if (waveActive && spawnRef.current.left <= 0 && zombies.length === 0) endWave();
    if (castleHP <= 0) setWaveActive(false);
    // drawing
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#555';
    for (let x = 0; x <= GRID_W; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(WIDTH, y * TILE);
      ctx.stroke();
    }
    ctx.fillStyle = '#888';
    ctx.fillRect(CASTLE_POS.x - 30, CASTLE_POS.y - 30, 60, 60);
    towers.forEach((t) => {
      ctx.fillStyle = towerData[t.type].color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
      ctx.fill();
      if (t.disabled > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    zombies.forEach((z) => {
      ctx.fillStyle = zombieData[z.type].color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 15, 0, Math.PI * 2);
      ctx.fill();
    });
    projectiles.forEach((p) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, speedRef);

  function restart() {
    setCoins(20);
    setCastleHP(100);
    setTowers([]);
    setZombies([]);
    setProjectiles([]);
    setRepairs(0);
    setModifier(null);
    unlockedRef.current = ['walker'];
    setRangeBonus(0);
    setFireRateBonus(0);
    setZHealthMod(1);
    setZSpeedMod(1);
    setFreeUnit(false);
    setPowerCost(30);
    setPowerOptions(null);
    setWaveActive(false);
  }

  const pause = () => setSpeed((s) => (s === 0 ? 1 : 0));
  const toggleSpeed = () => setSpeed((s) => (s === 2 ? 1 : 2));

  const over = castleHP <= 0;
  const repairCost = 2 + 2 * repairs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: WIDTH }}>
        <div style={{ flex: '0 0 140px', marginRight: 10 }}>
          <h3>Shop</h3>
          {Object.keys(towerData).map((t) => (
            <button key={t} onClick={() => setSelected(t)} disabled={waveActive || coins < 7} style={{ background: selected === t ? '#ccc' : '' }}>
              {t} (7c)
            </button>
          ))}
          <button onClick={repairCastle} disabled={coins < repairCost || castleHP >= 100}>Repair {repairCost}c</button>
          <button onClick={useSpecialPower} disabled={coins < powerCost}>Power ({powerCost}c)</button>
        </div>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onClick={handlePlacement}
          style={{ border: '1px solid black', background: '#222' }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        Coins: {coins} | Castle HP: {castleHP} | Wave: {wave} {modifier ? ` - ${modifier}` : ''}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={startWave} disabled={waveActive || over}>Start Wave</button>
        <button onClick={toggleSpeed}>{speed === 2 ? '1x Speed' : '2x Speed'}</button>
        <button onClick={pause}>{speed === 0 ? 'Resume' : 'Pause'}</button>
      </div>
      {over && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1>Game Over</h1>
          <button onClick={restart}>Restart</button>
        </div>
      )}
      {powerOptions && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {powerOptions.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                p.action();
                setCoins((c) => c - powerCost);
                setPowerCost((c) => c + 30);
                setPowerOptions(null);
              }}
              style={{ margin: 4 }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
