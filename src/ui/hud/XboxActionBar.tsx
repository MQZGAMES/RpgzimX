import { PLAYER_ATTACK_IDS } from '../../data/playerAttacks';
import { XBOX_BUTTONS, type XboxAction, type XboxBindings } from '../../game/input/xbox';
import { useSession, useSnap } from '../../integration/game-ui-bridge/hooks';
import { ItemIcon } from '../common/primitives';
import { SpellButton } from './SpellButton';

const SPELL_SHORTCUTS = ['spell1', 'spell2', 'spell3'] as const;
const FACE_COLORS: Record<string, string> = { A: '#8fea9a', B: '#ff9b91', X: '#86ceff', Y: '#ffe284' };

export function XboxActionBar({ bindings }: { bindings: XboxBindings }) {
  const session = useSession();
  const book = useSnap((s) => s.spellbook);
  const selectedMonster = useSnap((s) => s.selectedMonster);
  const selectedActor = useSnap((s) => s.selectedActor);
  const interaction = useSnap((s) => s.interaction);
  const potions = useSnap((s) => s.potions);
  const label = (action: XboxAction) => XBOX_BUTTONS[bindings[action]];
  const badge = (action: XboxAction) => (
    <span className="text-outline font-bold" style={{ color: FACE_COLORS[label(action)!] ?? '#ffe6b0' }}>
      {label(action)}
    </span>
  );
  const potion = (kind: 'health' | 'mana', name: string) => (
    <button
      type="button"
      className="btn-pixel min-w-10 !border-[6px] p-1 text-[11px]"
      title={name}
      aria-label={name}
      onClick={() => session.quickPotion(kind)}
    >
      {badge(kind)}
      <ItemIcon icon={kind === 'health' ? 'item_potion_health' : 'item_potion_mana'} size={19} />
      <span>{potions.cooldown > 0 ? '…' : potions[kind]}</span>
    </button>
  );
  return (
    <div className="safe-bottom absolute bottom-1 right-1 z-20 max-w-[99%] sm:bottom-3 sm:right-3" data-testid="xbox-hud">
      <div className="mb-1 flex justify-end gap-1">
        <button type="button" className="btn-pixel pointer-events-auto !border-[6px] px-1 text-[11px]" onClick={() => session.selectNearbyPlayer()}>
          {badge('players')} {selectedActor?.name ?? 'Jogadores'}
        </button>
        <button type="button" className="btn-pixel pointer-events-auto !border-[6px] px-1 text-[11px]" onClick={() => session.selectNearbyMonster()}>
          {badge('monsters')} {selectedMonster ?? 'Monstros'}
        </button>
      </div>
      <div className="frame-dark pointer-events-auto flex items-end gap-1 !border-[8px]">
        <button
          type="button"
          className="btn-gold max-w-24 !border-[6px] p-1 text-[11px]"
          onClick={() => session.action()}
        >
          {badge('action')}
          <span className="block truncate">{selectedMonster || selectedActor ? 'Atacar' : interaction?.label ?? 'Ação'}</span>
        </button>
        {PLAYER_ATTACK_IDS.map((id, i) => {
          const spell = book.find((entry) => entry.id === id);
          return spell && (
            <div key={id} className="flex flex-col items-center text-[11px]">
              {badge(SPELL_SHORTCUTS[i]!)}
              <SpellButton spell={spell} size={40} onCast={() => session.castControllerSpell(id)} />
            </div>
          );
        })}
        {potion('health', 'Poção de vida')}
        {potion('mana', 'Poção de mana')}
      </div>
    </div>
  );
}
