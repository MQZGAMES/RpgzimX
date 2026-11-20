import { Panel, PixelButton } from '../common/primitives';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

export function NameKeyboard({ value, onChange, onClose }: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const insert = (key: string) => {
    if (value.length < 16) onChange(value + (value && !value.endsWith(' ') ? key.toLowerCase() : key));
  };
  return (
    <Panel title="Nome do personagem" onClose={onClose}>
      <p className="mb-2 text-base text-gold-light" aria-live="polite">{value || 'Escolha as letras do nome'}</p>
      <div className="grid grid-cols-9 gap-1">
        {KEYS.map((key, index) => (
          <button
            key={key}
            type="button"
            data-xbox-first={index === 0 ? '' : undefined}
            className="btn-pixel min-h-8 !border-[6px] text-[13px]"
            onClick={() => insert(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <PixelButton onClick={() => insert(' ')}>Espaço</PixelButton>
        <PixelButton onClick={() => onChange(value.slice(0, -1))}>Apagar</PixelButton>
        <PixelButton variant="gold" onClick={onClose}>Concluir</PixelButton>
      </div>
    </Panel>
  );
}
