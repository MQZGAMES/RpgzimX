import { describe, expect, it } from 'vitest';
import { GAME_DATA } from '../../src/data';
import { createCharacter } from '../../src/domain/rules/character';
import { occupant, teleport, tryStep } from '../../src/game/movement/movement';
import { cellIndex } from '../../src/game/world/GameMap';
import { makeSim } from '../helpers';

function setup(dx = 1, dy = 0) {
  const sim = makeSim('knight', { seed: 17 });
  const w = sim.world;
  const def = GAME_DATA.heroes.boladex!;
  const h = sim.addHero(
    def,
    createCharacter(GAME_DATA, {
      id: def.slotId,
      name: def.name,
      vocation: def.vocation,
      now: 0,
      position: w.map.playerStart,
    }),
  );
  w.occupancy.clear();
  for (let y = 8; y <= 14; y++)
    for (let x = 8; x <= 14; x++) {
      w.map.solid[cellIndex(w.map, x, y)] = 0;
      w.map.pz[cellIndex(w.map, x, y)] = 0;
    }
  teleport(w, w.human, 10, 10);
  teleport(w, h, 10 + dx, 10 + dy);
  w.map.pz[cellIndex(w.map, 10, 10)] = 1;
  const pushUntil = (end: number) => {
    for (let t = w.now; t <= end; t += 100) {
      w.now = t;
      tryStep(w, w.human, dx, dy, 3, false);
    }
  };
  return { sim, w, h, pushUntil };
}

describe('door passage after three seconds', () => {
  it('jumps a stationary actor at the PZ exit only after 3 seconds', () => {
    const { w, h, pushUntil } = setup();
    pushUntil(2900);
    expect(w.human.x).toBe(10);
    pushUntil(3000);
    expect([w.human.x, w.human.y]).toEqual([12, 10]);
    expect([h.x, h.y]).toEqual([11, 10]);
    expect(occupant(w, 10, 10)).toBeUndefined();
    expect(occupant(w, 11, 10)).toBe(h.id);
    expect(occupant(w, 12, 10)).toBe(w.human.id);
  });

  it.each(['terrain', 'occupied'] as const)('does not jump onto %s', (block) => {
    const { w, pushUntil } = setup();
    if (block === 'terrain') w.map.solid[cellIndex(w.map, 12, 10)] = 1;
    else w.occupancy.set(cellIndex(w.map, 12, 10), 'another-actor');
    pushUntil(4000);
    expect(w.human.x).toBe(10);
  });

  it.each([
    [11, 10],
    [12, 11],
  ])('cannot jump diagonally through a corner at %i,%i', (x, y) => {
    const { w, pushUntil } = setup(1, 1);
    w.map.solid[cellIndex(w.map, x, y)] = 1;
    pushUntil(4000);
    expect([w.human.x, w.human.y]).toEqual([10, 10]);
  });
});

describe('joystick diagonal escape', () => {
  it.each([
    [1, 0.2],
    [-1, 0.2],
    [0.2, 1],
    [0.2, -1],
    [1, 1],
  ])('passes between an actor and a creature with input %s,%s', (x, y) => {
    const { sim, w, h } = setup();
    const dx = Math.sign(x);
    const dy = Math.sign(y);
    h.brain.nextThinkAt = Infinity;
    teleport(w, h, 10 + dx, 10);
    const monster = [...w.monsters.values()][0]!;
    w.monsters.clear();
    w.monsters.set(monster.id, monster);
    teleport(w, monster, 10, 10 + dy);
    sim.setMoveVector(x, y);
    sim.update(16);
    expect([w.human.x, w.human.y]).toEqual([10 + dx, 10 + dy]);
  });

  it('keeps terrain corners blocked even with diagonal intent', () => {
    const { sim, w, h } = setup();
    h.brain.nextThinkAt = Infinity;
    w.monsters.clear();
    w.map.solid[cellIndex(w.map, 10, 11)] = 1;
    sim.setMoveVector(1, 0.2);
    sim.update(16);
    expect([w.human.x, w.human.y]).toEqual([10, 10]);
  });
});

describe('joystick escape limits', () => {
  it.each([
    [1, 0],
    [1, 0.05],
    [0, 0],
  ])('does not invent a diagonal for input %s,%s', (x, y) => {
    const { sim, w, h } = setup();
    h.brain.nextThinkAt = Infinity;
    w.monsters.clear();
    sim.setMoveVector(x, y);
    sim.update(16);
    expect([w.human.x, w.human.y]).toEqual([10, 10]);
  });

  it('does not escape into an occupied diagonal destination', () => {
    const { sim, w, h } = setup();
    h.brain.nextThinkAt = Infinity;
    w.monsters.clear();
    w.occupancy.set(cellIndex(w.map, 11, 11), 'occupied');
    sim.setMoveVector(1, 0.2);
    sim.update(16);
    expect([w.human.x, w.human.y]).toEqual([10, 10]);
  });
});
