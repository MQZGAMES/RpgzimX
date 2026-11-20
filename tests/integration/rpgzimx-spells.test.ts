import { expect, it } from 'vitest';
import { RPGZIMX_DATA } from '../../src/data';
import { PLAYER_ATTACK_IDS } from '../../src/data/playerAttacks';
import { createCharacter } from '../../src/domain/rules/character';
import { playerSpellIds } from '../../src/domain/entities/gameData';
import { VOCATION_IDS } from '../../src/domain/value-objects/ids';
import { spellCooldownRemaining } from '../../src/game/abilities/spells';
import { GameSimulation } from '../../src/game/simulation/GameSimulation';
import { worldMap } from '../helpers';

it.each(VOCATION_IDS)('exposes only the three offensive spells for %s from level one', (vocation) => {
  const ids = playerSpellIds(RPGZIMX_DATA, vocation);
  expect(ids.filter((id) => RPGZIMX_DATA.spells[id]?.effect === 'damage')).toEqual(PLAYER_ATTACK_IDS);
  expect(PLAYER_ATTACK_IDS.map((id) => RPGZIMX_DATA.spells[id]!.minLevel)).toEqual([1, 1, 1]);
});

it.each([
  ['swift_bolt', 2000],
  ['runic_burst', 4000],
  ['arcane_storm', 6000],
] as const)('%s imposes %s ms of shared attack exhaustion and leaves healing available', (id, exhaustion) => {
  const map = worldMap();
  const data = RPGZIMX_DATA;
  const character = createCharacter(data, { id: 'x', name: 'Teste', vocation: 'druid', now: 0, position: map.playerStart });
  const sim = new GameSimulation({ data, map, character });
  const w = sim.world;
  const monster = [...w.monsters.values()].find((m) => m.def.id === 'slime')!;
  const x = monster.x + 1;
  const y = monster.y;
  sim.teleportPlayer(x, y);
  expect({ x: w.human.x, y: w.human.y }).toEqual({ x, y });
  sim.setTarget(monster.id);
  expect(sim.castSpell('earth_thorn')).toBe(false);
  expect(sim.castSpell(id)).toBe(true);
  for (const other of PLAYER_ATTACK_IDS) {
    expect(spellCooldownRemaining(w, other)).toBe(exhaustion);
    expect(sim.castSpell(other)).toBe(false);
  }
  expect(sim.castSpell('light_heal')).toBe(true);
  w.now += exhaustion - 1;
  expect(spellCooldownRemaining(w, id)).toBe(1);
  w.now++;
  expect(PLAYER_ATTACK_IDS.map((other) => spellCooldownRemaining(w, other))).toEqual([0, 0, 0]);
});
