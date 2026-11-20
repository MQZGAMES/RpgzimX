import { assignXboxButton, DEFAULT_XBOX_BINDINGS, XBOX_ACTION_IDS, XBOX_ACTIONS, XBOX_BUTTONS, type XboxBindings } from '../../game/input/xbox';
import { Panel, PixelButton } from '../common/primitives';

export function XboxSettings({ bindings, onChange, onClose, connected }: {
  bindings: XboxBindings;
  onChange: (bindings: XboxBindings) => void;
  onClose: () => void;
  connected: boolean;
}) {
  return (
    <Panel title="Controle Xbox" onClose={onClose}>
      <p className="mb-2 text-[13px] text-muted" data-testid="xbox-status">
        {connected ? 'Controle conectado.' : 'Conecte o controle por USB ou Bluetooth e pressione um botão.'}
        {' '}Escolher um botão troca os dois atalhos. Nos menus, A confirma e B volta.
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {XBOX_ACTION_IDS.map((action) => (
          <label key={action} className="flex items-center justify-between gap-1 border-b border-dusk py-1 text-[12px]">
            {XBOX_ACTIONS[action]}
            <select
              className="min-h-9 rounded-sm border border-dusk bg-[#1b1424] px-1 text-parchment"
              value={bindings[action]}
              onChange={(e) => onChange(assignXboxButton(bindings, action, Number(e.target.value)))}
            >
              {XBOX_BUTTONS.map((button, id) => <option key={button} value={id}>{button}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3">
        <PixelButton onClick={() => onChange({ ...DEFAULT_XBOX_BINDINGS })}>Restaurar padrão</PixelButton>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Analógico esquerdo: andar. Direcional: cima mapa, baixo mochila, esquerda personagem, direita jogadores.
        Nos menus, use o direcional para navegar. Em listas de opções, esquerda e direita alteram a escolha.
      </p>
    </Panel>
  );
}
