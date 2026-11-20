import { expect, it } from 'vitest';
import { GAME_DATA, RPGZIMX_DATA } from '../../src/data';
import { createCharacter } from '../../src/domain/rules/character';
import { VOCATION_IDS } from '../../src/domain/value-objects/ids';
import { spellCooldownRemaining } from '../../src/game/abilities/spells';
import { parseSave, toSaveFile } from '../../src/game/persistence/saveSchema';
import { GameSimulation } from '../../src/game/simulation/GameSimulation';
import { buildSnapshot } from '../../src/integration/game-ui-bridge/snapshot';
import { makeCharacter, worldMap } from '../helpers';

it.each(VOCATION_IDS)('restores the original spellbook and controller defaults for %s', (vocation) => {
  const map = worldMap();
  const character = makeCharacter(vocation);
  const sim = new GameSimulation({ data: RPGZIMX_DATA, map, character });
  const snapshot = buildSnapshot(sim, 0);
  const original = GAME_DATA.vocations[vocation].spells;
  expect(snapshot.spellbook.map((spell) => spell.id)).toEqual(original);
  expect(snapshot.xboxSpells).toEqual(original.filter((id) => GAME_DATA.spells[id]?.effect === 'damage').slice(0, 3));
  expect(snapshot.spellbook.find((spell) => spell.id === snapshot.xboxSpells[1])?.unlocked).toBe(false);
});

it('migrates old shared hotbar spells and validates per-character controller choices on save', () => {
  const data = RPGZIMX_DATA;
  const character = makeCharacter('druid');
  delete character.xboxSpells;
  character.hotbar = ['spell:swift_bolt', 'spell:runic_burst', 'spell:arcane_storm', 'spell:light_heal', 'potion:mana'];
  const migrated = parseSave(data, toSaveFile(character)).character;
  expect(migrated.hotbar.slice(0, 5)).toEqual(['spell:earth_thorn', 'spell:frost_burst', 'spell:ice_shard', 'spell:light_heal', 'potion:mana']);
  expect(migrated.xboxSpells).toEqual(['earth_thorn', 'frost_burst', 'ice_shard']);

  migrated.xboxSpells = ['sap_blessing', 'earth_thorn', 'ice_shard'];
  expect(parseSave(data, toSaveFile(migrated)).character.xboxSpells).toEqual(migrated.xboxSpells);
  migrated.xboxSpells = ['holy_arrow', 'sap_blessing', 'sap_blessing'];
  expect(parseSave(data, toSaveFile(migrated)).character.xboxSpells).toEqual(['earth_thorn', 'sap_blessing', 'frost_burst']);
});

it.each([
  ['arcane_bolt', 2000],
  ['flame_lance', 4000],
  ['fire_nova', 6000],
] as const)('%s imposes %s ms of shared attack exhaustion and leaves healing available', (id, exhaustion) => {
  const map = worldMap();
  const data = RPGZIMX_DATA;
  const character = createCharacter(data, { id: 'x', name: 'Teste', vocation: 'sorcerer', now: 0, position: map.playerStart });
  character.level = 15;
  character.skills.magic.level = 10;
  character.mana = 500;
  const sim = new GameSimulation({ data, map, character });
  const w = sim.world;
  const monster = [...w.monsters.values()].find((m) => m.def.id === 'slime')!;
  const x = monster.x + 1;
  const y = monster.y;
  sim.teleportPlayer(x, y);
  expect({ x: w.human.x, y: w.human.y }).toEqual({ x, y });
  sim.setTarget(monster.id);
  expect(sim.castSpell(id)).toBe(true);
  const attacks = ['arcane_bolt', 'flame_lance', 'fire_nova'];
  for (const other of attacks) {
    expect(spellCooldownRemaining(w, other)).toBe(exhaustion);
    expect(sim.castSpell(other)).toBe(false);
  }
  expect(sim.castSpell('light_heal')).toBe(true);
  w.now += exhaustion - 1;
  expect(spellCooldownRemaining(w, id)).toBe(1);
  w.now++;
  expect(attacks.map((other) => spellCooldownRemaining(w, other))).toEqual([0, 0, 0]);
});
