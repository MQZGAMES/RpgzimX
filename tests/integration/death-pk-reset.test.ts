import { describe, expect, it } from 'vitest';
import { GAME_DATA } from '../../src/data';
import { createCharacter } from '../../src/domain/rules/character';
import { damagePlayer, respawnPlayer } from '../../src/game/combat/combat';
import { asActor } from '../../src/game/simulation/World';
import { isPzLocked, recordDamage, registerAggression, savePk, skullOf } from '../../src/game/social/social';
import { makeSim } from '../helpers';

function rig(hero: boolean) {
  const sim = makeSim();
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
  const actor = hero ? h : w.human;
  const victim = hero ? w.human : h;
  const die = () =>
    asActor(w, actor, () => {
      actor.invulnerableUntil = 0;
      damagePlayer(w, 999999, 'fire', { id: 'monster:test', name: 'Test', kind: 'monster' }, true);
      expect(actor.dead).toBe(true);
      respawnPlayer(w);
    });
  return { w, actor, victim, die };
}

describe.each([false, true])('death PK reset, hero=%s', (hero) => {
  it('clears white skull and PZ lock including persisted state', () => {
    const { w, actor, victim, die } = rig(hero);
    registerAggression(w, actor.id, victim.id);
    savePk(w, actor);
    expect(skullOf(w, actor.id)?.kind).toBe('white');
    die();
    expect(skullOf(w, actor.id)).toBeNull();
    expect(isPzLocked(w, actor.id)).toBe(false);
    expect(actor.character.pk?.skull).toBeNull();
    expect(actor.character.pk?.pzLockUntil).toBe(0);
  });

  it('does not regain white skull or lock in the temple from damage in the previous life', () => {
    const { w, actor, victim, die } = rig(hero);
    recordDamage(w, victim.id, actor.id, 20);
    die();
    asActor(w, victim, () => {
      victim.invulnerableUntil = 0;
      damagePlayer(w, 999999, 'fire', { id: 'monster:test', name: 'Test', kind: 'monster' }, true);
    });
    expect(skullOf(w, actor.id)).toBeNull();
    expect(isPzLocked(w, actor.id)).toBe(false);
  });

  it('keeps red skull with its original deadline but clears PZ lock', () => {
    const { w, actor, die } = rig(hero);
    const until = w.now + 86400000;
    w.social.skulls.set(actor.id, { kind: 'red', until });
    w.social.pzLocks.set(actor.id, w.now + 120000);
    die();
    expect(skullOf(w, actor.id)).toEqual({ kind: 'red', until });
    expect(isPzLocked(w, actor.id)).toBe(false);
    expect(actor.character.pk?.skull).toBe('red');
  });
});
