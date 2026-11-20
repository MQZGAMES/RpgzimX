import type { BalanceConfig, HeroDef, ItemDef, MonsterDef, NpcDef, ShopDef, SpellDef, VocationDef } from './definitions';
import type { VocationId } from '../value-objects/ids';

/** Pacote imutável com todas as definições configuráveis consumidas pelas regras e pela simulação. */
export interface GameData {
  items: Readonly<Record<string, ItemDef>>;
  spells: Readonly<Record<string, SpellDef>>;
  playerAttacks?: readonly string[];
  vocations: Readonly<Record<VocationId, VocationDef>>;
  monsters: Readonly<Record<string, MonsterDef>>;
  npcs: Readonly<Record<string, NpcDef>>;
  shops: Readonly<Record<string, ShopDef>>;
  heroes: Readonly<Record<string, HeroDef>>;
  balance: BalanceConfig;
}

export function itemDef(data: GameData, id: string): ItemDef {
  const def = data.items[id];
  if (!def) throw new Error(`Item desconhecido: ${id}`);
  return def;
}

export function playerSpellIds(data: GameData, vocation: VocationId): readonly string[] {
  const spells = data.vocations[vocation].spells;
  if (!data.playerAttacks) return spells;
  return [...data.playerAttacks, ...spells.filter((id) => data.spells[id]?.effect !== 'damage')];
}

export function hasPlayerSpell(data: GameData, spell: SpellDef): boolean {
  return !data.playerAttacks || spell.effect !== 'damage' || data.playerAttacks.includes(spell.id);
}
