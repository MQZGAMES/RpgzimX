import type { GameData } from '../domain/entities/gameData';
import { BALANCE } from './balance';
import { ITEMS } from './items';
import { MONSTERS } from './monsters';
import { NPCS, SHOPS } from './npcs';
import { SPELLS } from './spells';
import { VOCATIONS } from './vocations';
import { HEROES } from './heroes';
import { PLAYER_ATTACKS, PLAYER_ATTACK_IDS } from './playerAttacks';

export const GAME_DATA: GameData = {
  items: ITEMS,
  spells: SPELLS,
  vocations: VOCATIONS,
  monsters: MONSTERS,
  npcs: NPCS,
  shops: SHOPS,
  heroes: HEROES,
  balance: BALANCE,
};

export const RPGZIMX_DATA: GameData = {
  ...GAME_DATA,
  spells: { ...SPELLS, ...PLAYER_ATTACKS },
  playerAttacks: PLAYER_ATTACK_IDS,
};
