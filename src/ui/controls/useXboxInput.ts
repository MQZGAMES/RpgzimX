import { useEffect, useRef, useState } from 'react';
import type { GameSession } from '../../integration/game-ui-bridge/GameSession';
import type { AudioService } from '../../game/audio/AudioService';
import { stickVector, XBOX_ACTION_IDS, xboxButtonMask, type XboxAction, type XboxBindings } from '../../game/input/xbox';

const FOCUSABLE = 'button, a[href], select, input:not([type=hidden]), textarea, [tabindex]:not([tabindex="-1"])';
const MODALS = '[role="dialog"], [data-xbox-modal]';

function focusable(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.matches(':disabled, [aria-disabled="true"]') && !el.closest('[inert]') &&
      el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible',
  );
}

function focus(el: HTMLElement): void {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function modal(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(MODALS)]
    .reverse()
    .find((root) => root.getClientRects().length > 0);
}

function navigate(root: HTMLElement, x: number, y: number, confirm: boolean): void {
  const elements = focusable(root);
  const current = document.activeElement;
  const active = elements.find((el) => el === current);
  if (!active) {
    const first = elements.find((el) => el.matches('[data-xbox-first], [data-testid=new-character]')) ?? elements[0];
    if (first) focus(first);
    return;
  }
  if (active instanceof HTMLSelectElement && (confirm || x)) {
    const options = active.options;
    if (options.length < 2) return;
    const next = (active.selectedIndex + (x || 1) + options.length) % options.length;
    active.selectedIndex = next;
    active.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (active instanceof HTMLInputElement && active.type === 'range' && (x || confirm)) {
    if (x) {
      const next = Math.max(Number(active.min), Math.min(Number(active.max), Number(active.value) + x * Number(active.step || 1)));
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      set?.call(active, String(next));
      active.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }
  if (confirm) {
    const proxy = active.dataset.xboxActivate;
    if (proxy) root.querySelector<HTMLElement>(proxy)?.click();
    else active.click();
    return;
  }
  if (!x && !y) return;
  const rect = active.getBoundingClientRect();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  let best: HTMLElement | undefined;
  let score = Infinity;
  for (const candidate of elements) {
    if (candidate === active) continue;
    const bounds = candidate.getBoundingClientRect();
    const dx = bounds.x + bounds.width / 2 - cx;
    const dy = bounds.y + bounds.height / 2 - cy;
    const forward = dx * x + dy * y;
    if (forward <= 2) continue;
    const offset = Math.abs(dx * y - dy * x);
    const distance = forward + offset * 3;
    if (distance < score) {
      best = candidate;
      score = distance;
    }
  }
  if (best) focus(best);
}

function perform(session: GameSession, action: XboxAction): void {
  switch (action) {
    case 'action': session.action(); break;
    case 'spell1':
    case 'spell2':
    case 'spell3': session.castControllerSpell(action); break;
    case 'monsters': session.selectNearbyMonster(); break;
    case 'players': session.selectNearbyPlayer(); break;
    case 'health': session.quickPotion('health'); break;
    case 'mana': session.quickPotion('mana'); break;
    case 'map': session.setPanel('minimap'); break;
    case 'menu': session.setPanel('settings'); break;
    case 'clear': session.clearControllerTarget(); break;
    case 'social': session.openSelectedPlayer(); break;
  }
}

export function useXboxInput({
  session,
  audio,
  bindings,
  menuScreen,
  onBack,
}: {
  session?: GameSession;
  audio: AudioService;
  bindings: XboxBindings;
  menuScreen?: boolean;
  onBack?: () => void;
}): boolean {
  const [connected, setConnected] = useState(false);
  // Preserve button history and menu focus when a binding changes.
  const currentBindings = useRef(bindings);
  useEffect(() => {
    currentBindings.current = bindings;
  }, [bindings]);
  useEffect(() => {
    if (!navigator.getGamepads || (!session && !menuScreen)) return;
    let frame = 0;
    let index: number | undefined;
    let previous = 0;
    let direction = '';
    let attackDirectionArmed = false;
    let isConnected = false;
    let repeatAt = 0;
    let activeRoot: HTMLElement | undefined;
    let usingPad = false;
    const pressed = (mask: number, button: number) => !!(mask & (1 << button));
    const markControllerUse = () => {
      usingPad = true;
      document.documentElement.classList.add('xbox-ui');
    };
    const resetFocus = () => {
      usingPad = false;
      document.documentElement.classList.remove('xbox-ui');
    };
    const resetInput = () => {
      index = undefined;
      attackDirectionArmed = false;
      direction = '';
      activeRoot = undefined;
      session?.moveFromController(0, 0);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden || !document.hasFocus()) return;
      let pad: Gamepad | null | undefined;
      try {
        const pads = Array.from(navigator.getGamepads());
        const standard = (p: Gamepad | null): p is Gamepad => !!p?.connected && p.mapping === 'standard';
        pad = pads.find((p) => standard(p) && p.index === index) ?? pads.find(standard);
      } catch {
        // Some embedded browsers deny Gamepad API access.
      }
      if (!!pad !== isConnected) {
        isConnected = !!pad;
        setConnected(isConnected);
        if (!isConnected) resetFocus();
      }
      if (!pad) {
        resetInput();
        return;
      }
      const mask = xboxButtonMask(pad.buttons);
      if (index !== pad.index) {
        resetInput();
        index = pad.index;
        previous = mask;
        markControllerUse();
      }
      const justPressed = mask & ~previous;
      previous = mask;
      const stick = stickVector(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      const dpadX = Number(pressed(mask, 15)) - Number(pressed(mask, 14));
      const dpadY = Number(pressed(mask, 13)) - Number(pressed(mask, 12));
      const root = modal() ?? (menuScreen ? document.body : undefined);
      if (justPressed || stick.x || stick.y || dpadX || dpadY) {
        if (justPressed) audio.unlock();
        markControllerUse();
      }
      if (root || !session?.local.get().ready || session.hasOverlay() || session.sim.world.human.dead) {
        session?.moveFromController(0, 0);
        attackDirectionArmed = false;
        if (!root) return;
        const x = dpadX || (dpadY ? 0 : stick.x);
        const y = dpadY || (x ? 0 : stick.y);
        const key = x || y ? x + ':' + y : '';
        if (root !== activeRoot) {
          activeRoot = root;
          direction = '';
          if (usingPad) navigate(root, 0, 0, false);
        }
        if (pressed(justPressed, 1) || pressed(justPressed, 9)) {
          const close = root.querySelector<HTMLElement>('[data-xbox-back], [aria-label="Fechar"]');
          if (close) close.click();
          else if (session) session.closeOverlays();
          else onBack?.();
          return;
        }
        if (pressed(justPressed, 0)) {
          navigate(root, 0, 0, true);
          return;
        }
        if ((key && direction !== key) || (key && now >= repeatAt)) {
          navigate(root, x, y, false);
          repeatAt = now + (direction === key ? 115 : 285);
        }
        direction = key;
        return;
      }
      activeRoot = undefined;
      direction = '';
      if (!stick.x && !stick.y) attackDirectionArmed = true;
      if (attackDirectionArmed) session.moveFromController(stick.x, stick.y);
      if (pressed(justPressed, 12)) session.setPanel('minimap');
      else if (pressed(justPressed, 13)) session.setPanel('inventory');
      else if (pressed(justPressed, 14)) session.setPanel('character');
      else if (pressed(justPressed, 15)) session.setPanel('players');
      else {
        for (const action of XBOX_ACTION_IDS) {
          if (pressed(justPressed, currentBindings.current[action])) perform(session, action);
          if (session.hasOverlay()) break;
        }
      }
    };

    const onBlur = () => {
      resetInput();
      resetFocus();
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onBlur);
    window.addEventListener('pointerdown', resetFocus);
    window.addEventListener('keydown', resetFocus);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      window.removeEventListener('pointerdown', resetFocus);
      window.removeEventListener('keydown', resetFocus);
      onBlur();
    };
  }, [session, audio, menuScreen, onBack]);
  return connected;
}
