import type { SpellDef } from '../domain/entities/definitions';
import { VOCATION_IDS } from '../domain/value-objects/ids';
import { SPELLS } from './spells';

export const PLAYER_ATTACK_IDS = ['swift_bolt', 'runic_burst', 'arcane_storm'] as const;

const common = { effect: 'damage', minLevel: 1, minMagicLevel: 0, vocations: VOCATION_IDS, range: 6 } as const;

export const PLAYER_ATTACKS: Readonly<Record<(typeof PLAYER_ATTACK_IDS)[number], SpellDef>> = {
  swift_bolt: {
    ...common,
    id: 'swift_bolt',
    name: 'Raio Rápido',
    words: 'Vel Ara',
    description: 'Um disparo econômico contra um alvo. Exaustão de ataque: 2 s.',
    icon: SPELLS.arcane_bolt!.icon,
    vfx: SPELLS.arcane_bolt!.vfx,
    cooldownMs: 2000,
    manaCost: 4,
    target: 'target',
    element: SPELLS.arcane_bolt!.element,
    formula: { kind: 'magic', levelFactor: 0.4, powerFactor: 1.5, base: 8, min: 0.9, max: 1.1 },
  },
  runic_burst: {
    ...common,
    id: 'runic_burst',
    name: 'Impacto Rúnico',
    words: 'Runa Fer',
    description: 'Um impacto concentrado contra um alvo. Exaustão de ataque: 4 s.',
    icon: SPELLS.flame_lance!.icon,
    vfx: SPELLS.flame_lance!.vfx,
    cooldownMs: 4000,
    manaCost: 8,
    target: 'target',
    element: SPELLS.flame_lance!.element,
    formula: { kind: 'magic', levelFactor: 0.7, powerFactor: 2.5, base: 17, min: 0.9, max: 1.1 },
  },
  arcane_storm: {
    ...common,
    id: 'arcane_storm',
    name: 'Tempestade Arcana',
    words: 'Ara Tempes',
    description: 'A magia mais forte, centrada no alvo e com dano aos inimigos ao redor. Exaustão de ataque: 6 s.',
    icon: SPELLS.inferno_rain!.icon,
    vfx: SPELLS.inferno_rain!.vfx,
    cooldownMs: 6000,
    manaCost: 14,
    target: 'areaTarget',
    radius: 2,
    element: SPELLS.inferno_rain!.element,
    formula: { kind: 'magic', levelFactor: 1, powerFactor: 4, base: 32, min: 0.9, max: 1.1 },
  },
};
