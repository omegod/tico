# Star Hunter

A terminal-based bullet-hell shoot 'em up game built with the tico engine.

## Screenshots

![Main Menu](images/img1.png)

![Ship Selection](images/img2.png)

![Gameplay](images/img3.png)

![Boss Battle](images/img4.png)

![Victory](images/img5.png)

## Game Features

### 6 Playable Ships
Choose from 6 unique ships, each with distinct stats and playstyles:

| Ship | Type | HP | Speed | Attack | Defense | Special |
|------|------|-----|-------|--------|---------|---------|
| 1 | Assault | 100 | Medium | 25 | 0% | Dual shots |
| 2 | Balanced | 150 | Medium | 20 | 10% | Triple shots |
| 3 | Sniper | 80 | Medium | 35 | 0% | Piercing shots |
| 4 | Tank | 200 | Slow | 15 | 30% | Self-healing |
| 5 | Speed | 120 | Fast | 18 | 0% | Extreme speed |
| 6 | Ultimate | 180 | Fast | 30 | 20% | All-rounder |

### Power-ups
- **★ Missile** - Ship-specific special weapon
- **⊙ Shield** - Block incoming damage
- **✦ Invincible** - 3 seconds of flashing invulnerability
- **» Homing Missile** - Auto-targeting projectiles
- **♥ Life** - Restore HP

### Controls
| Key | Action |
|-----|--------|
| ↑↓←→ or WASD | Move |
| Space | Shoot |
| Q | Fire missile |
| E | Toggle shield |
| P | Pause |

### Gameplay
- Fight through 6 waves of enemies
- Each wave ends with a powerful Boss battle
- Defeat all 6 Bosses to win the game
- Collect power-ups to enhance your ship
- Survive the bullet-hell patterns!

## Story

In the year 2847, humanity's expansion into the stars has awakened something ancient. Six cosmic guardians—once dormant protectors of the galaxy's balance—now see our species as a threat to the cosmic order.

You are the Star Hunter, piloting one of six prototype fighters developed by the United Earth Fleet. Your mission: defeat all six guardians and prove humanity worthy of its place among the stars.

Each guardian commands a unique domain:
1. **The Swarm Queen** - Hive master of endless numbers
2. **The Iron Tyrant** - Unstoppable armored fortress
3. **The Void Phantom** - Master of stealth and misdirection
4. **The Storm Herald** - Lord of chaos and lightning
5. **The Time Weaver** - Manipulator of temporal flows
6. **The Star Eater** - Devourer of worlds, final guardian

## How to Run

```bash
npm run example:star-hunter
```

Or directly:

```bash
node src/index.js
```

## Tech Stack

- **Engine**: [tico](https://github.com/omegod/tico) - Terminal game engine
- **Runtime**: Node.js
- **Rendering**: ASCII art with ANSI colors

---

*Built with tico - Terminal games made simple.*
