export const XBOX_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'] as const;

export const XBOX_ACTIONS = {
  action: 'Ação / ataque básico',
  spell1: 'Raio Rápido',
  spell2: 'Impacto Rúnico',
  spell3: 'Tempestade Arcana',
  monsters: 'Selecionar monstro',
  health: 'Poção de vida',
  players: 'Selecionar jogador',
  mana: 'Poção de mana',
  map: 'Mapa',
  menu: 'Menu',
  clear: 'Limpar alvo',
  social: 'Opções do jogador',
} as const;

export type XboxAction = keyof typeof XBOX_ACTIONS;
export type XboxBindings = Record<XboxAction, number>;

export const DEFAULT_XBOX_BINDINGS: Readonly<XboxBindings> = {
  action: 0,
  spell1: 2,
  spell2: 1,
  spell3: 3,
  monsters: 5,
  health: 7,
  players: 4,
  mana: 6,
  map: 8,
  menu: 9,
  clear: 10,
  social: 11,
};

export const XBOX_ACTION_IDS = Object.keys(XBOX_ACTIONS) as XboxAction[];
const STORAGE_KEY = 'rpgzimx:xbox';

export function loadXboxBindings(): XboxBindings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as XboxBindings | null;
    const buttons = XBOX_ACTION_IDS.map((action) => raw?.[action]);
    if (raw && new Set(buttons).size === XBOX_BUTTONS.length &&
        buttons.every((button) => Number.isInteger(button) && button! >= 0 && button! < XBOX_BUTTONS.length)) {
      return raw;
    }
  } catch {
    // Storage can be unavailable or corrupt.
  }
  return { ...DEFAULT_XBOX_BINDINGS };
}

export function assignXboxButton(bindings: XboxBindings, action: XboxAction, button: number): XboxBindings {
  const previousAction = XBOX_ACTION_IDS.find((candidate) => bindings[candidate] === button);
  if (!previousAction || previousAction === action) return bindings;
  return { ...bindings, [previousAction]: bindings[action], [action]: button };
}

export function saveXboxBindings(bindings: XboxBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // The new bindings still apply until the tab is closed.
  }
}

export function stickVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < 0.24) return { x: 0, y: 0 };
  // Quantize to eight directions before handing off to tile movement.
  const angle = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: Math.round(Math.cos(angle)), y: Math.round(Math.sin(angle)) };
}

export function xboxButtonMask(buttons: readonly GamepadButton[]): number {
  let mask = 0;
  for (let i = 0; i < 16; i++) {
    const button = buttons[i];
    if (button && (button.pressed || button.value >= 0.55)) mask |= 1 << i;
  }
  return mask;
}
