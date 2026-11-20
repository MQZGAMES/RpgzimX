import { expect, it } from 'vitest';
import { GAME_DATA } from '../../src/data';
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
  const sim = new GameSimulation({ data: GAME_DATA, map, character });
  const snapshot = buildSnapshot(sim, 0);
  const original = GAME_DATA.vocations[vocation].spells;
  expect(snapshot.spellbook.map((spell) => spell.id)).toEqual(original);
  expect(snapshot.xboxSpells).toEqual(original.filter((id) => GAME_DATA.spells[id]?.effect === 'damage').slice(0, 3));
  expect(snapshot.spellbook.find((spell) => spell.id === snapshot.xboxSpells[1])?.unlocked).toBe(false);
});

it('migrates old shared hotbar spells and validates per-character controller choices on save', () => {
  const data = GAME_DATA;
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

it('keeps the original 2-second attack exhaustion and the individual 6-second spell cooldown', () => {
  const map = worldMap();
  const data = GAME_DATA;
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
  expect(sim.castSpell('fire_nova')).toBe(true);
  expect(spellCooldownRemaining(w, 'fire_nova')).toBe(6000);
  expect(spellCooldownRemaining(w, 'arcane_bolt')).toBe(2000);
  expect(sim.castSpell('arcane_bolt')).toBe(false);
  expect(sim.castSpell('light_heal')).toBe(true);
  w.now += 2000;
  expect(spellCooldownRemaining(w, 'fire_nova')).toBe(4000);
  expect(spellCooldownRemaining(w, 'arcane_bolt')).toBe(0);
  sim.setTarget(monster.id);
  expect(sim.castSpell('arcane_bolt')).toBe(true);
});
