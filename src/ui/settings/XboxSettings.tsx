import { assignXboxButton, DEFAULT_XBOX_BINDINGS, XBOX_ACTION_IDS, XBOX_ACTIONS, XBOX_BUTTONS, type XboxBindings } from '../../game/input/xbox';
import { XBOX_SPELL_SLOTS } from '../../domain/rules/xboxSpells';
import { useSession, useSnap } from '../../integration/game-ui-bridge/hooks';
import { Panel, PixelButton } from '../common/primitives';

const SELECT_STYLE = 'min-h-9 min-w-0 rounded-sm border border-dusk bg-[#1b1424] px-1 text-parchment';

export function XboxSettings({ bindings, onChange, onClose, connected }: {
  bindings: XboxBindings;
  onChange: (bindings: XboxBindings) => void;
  onClose: () => void;
  connected: boolean;
}) {
  const session = useSession();
  const spellbook = useSnap((s) => s.spellbook);
  const spells = useSnap((s) => s.xboxSpells);
  return (
    <Panel title="Controle Xbox" onClose={onClose}>
      <p className="mb-2 text-[13px] text-muted" data-testid="xbox-status">
        {connected ? 'Controle conectado.' : 'Conecte o controle por USB ou Bluetooth e pressione um botão.'}
        {' '}Escolher um botão troca os dois atalhos. Nos menus, A confirma e B volta.
      </p>
      <fieldset className="mb-3 grid min-w-0 gap-1">
        <legend className="font-pixel text-gold-light">Magias nos atalhos</legend>
        {XBOX_SPELL_SLOTS.map((slot, index) => (
          <label key={slot} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-[12px]">
            <span>{XBOX_ACTIONS[slot]} ({XBOX_BUTTONS[bindings[slot]]})</span>
            <select
              className={SELECT_STYLE}
              data-xbox-first={index === 0 ? true : undefined}
              data-testid={`xbox-${slot}-choice`}
              value={spells[index]}
              onChange={(e) => session.setControllerSpell(slot, e.target.value)}
            >
              {spellbook.map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {spell.name} · {spell.cooldownMs / 1000} s{spell.unlocked ? '' : ` (Nv ${spell.minLevel}${spell.minMagicLevel > 0 ? `, ML ${spell.minMagicLevel}` : ''})`}
                </option>
              ))}
            </select>
          </label>
        ))}
        <p className="text-[12px] text-muted">Escolha no grimório da sua vocação. Magias bloqueadas exigem o nível indicado para lançar.</p>
      </fieldset>
      <h3 className="font-pixel text-gold-light">Botões</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        {XBOX_ACTION_IDS.map((action) => (
          <label key={action} className="flex items-center justify-between gap-1 border-b border-dusk py-1 text-[12px]">
            {XBOX_ACTIONS[action]}
            <select
              className={SELECT_STYLE}
              value={bindings[action]}
              onChange={(e) => onChange(assignXboxButton(bindings, action, Number(e.target.value)))}
            >
              {XBOX_BUTTONS.map((button, id) => <option key={button} value={id}>{button}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3">
        <PixelButton onClick={() => onChange({ ...DEFAULT_XBOX_BINDINGS })}>Restaurar botões padrão</PixelButton>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Analógico esquerdo: andar. Direcional: cima mapa, baixo mochila, esquerda personagem, direita jogadores.
        Nos menus, use o direcional para navegar. Em listas de opções, esquerda e direita alteram a escolha.
      </p>
    </Panel>
  );
}
