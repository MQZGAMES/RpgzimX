import type { GameData } from '../entities/gameData';
import type { VocationId } from '../value-objects/ids';

export const XBOX_SPELL_SLOTS = ['spell1', 'spell2', 'spell3'] as const;
export type XboxSpellSlot = (typeof XBOX_SPELL_SLOTS)[number];

export function defaultXboxSpells(data: GameData, vocation: VocationId): string[] {
  return data.vocations[vocation].spells
    .filter((id) => data.spells[id]?.effect === 'damage')
    .slice(0, XBOX_SPELL_SLOTS.length);
}

export function normalizeXboxSpells(data: GameData, vocation: VocationId, raw: unknown): string[] {
  const choices = data.vocations[vocation].spells;
  const used = new Set<string>();
  const spells = XBOX_SPELL_SLOTS.map((_, index) => {
    const id: unknown = Array.isArray(raw) ? raw[index] : undefined;
    if (typeof id !== 'string' || !choices.includes(id) || !data.spells[id] || used.has(id)) return '';
    used.add(id);
    return id;
  });
  const defaults = defaultXboxSpells(data, vocation).filter((id) => !used.has(id));
  return spells.map((id) => id || defaults.shift() || '');
}
