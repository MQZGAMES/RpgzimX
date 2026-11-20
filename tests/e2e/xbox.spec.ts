import { expect, test, type Page } from '@playwright/test';

type VirtualXbox = { connected: boolean; axes: number[]; buttons: number[] };
type DebugGame = {
  ready(): boolean;
  player(): { x: number; y: number; target: string | null };
  teleport(x: number, y: number): void;
  teleportNear(type: string, distance: number): string | null;
  npcs(): { id: string; x: number; y: number }[];
  ui(): { selectedActor?: string; selectedMonster?: string };
  castLog(): { spellId: string }[];
};
const controller = (page: Page, patch: Partial<VirtualXbox>) =>
  page.evaluate(async (next) => {
    Object.assign((window as typeof window & { xbox: VirtualXbox }).xbox, next);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }, patch);

async function press(page: Page, button: number, value = 1) {
  const buttons = Array<number>(16).fill(0);
  buttons[button] = value;
  await controller(page, { buttons });
  await controller(page, { buttons: Array<number>(16).fill(0) });
}

test('Xbox cria personagem, navega, anda, interage, seleciona, lança magia e remapeia no Edge', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'controle testado no desktop');
  await page.addInitScript(() => {
    const xbox: VirtualXbox = { connected: false, axes: [0, 0, 0, 0], buttons: Array<number>(16).fill(0) };
    Object.assign(window, { xbox });
    Object.defineProperty(navigator, 'getGamepads', { value: () => xbox.connected ? [{
      connected: true, index: 0, mapping: 'standard', axes: xbox.axes,
      buttons: xbox.buttons.map((value) => ({ value, pressed: value === 1, touched: value > 0 })),
    }] : [null] });
  });
  await page.goto('./?debug');
  await expect(page.getByTestId('new-character')).toBeVisible();
  await controller(page, { connected: true });
  await expect(page.getByTestId('xbox-title-status')).toContainText('Xbox conectado');
  await page.getByTestId('new-character').focus();
  await press(page, 0);
  await expect(page.getByRole('heading', { name: 'Escolha sua vocação' })).toBeVisible();
  await expect(page.getByTestId('voc-knight')).toBeFocused();
  await press(page, 14);
  await expect(page.getByTestId('voc-paladin')).toBeFocused();
  await page.getByTestId('name-input').focus();
  await press(page, 0);
  const keyboard = page.getByRole('dialog', { name: 'Nome do personagem' });
  await expect(keyboard.getByRole('button', { name: 'A', exact: true })).toBeFocused();
  await press(page, 0);
  await press(page, 15);
  await press(page, 0);
  await press(page, 15);
  await press(page, 0);
  await press(page, 1);
  await expect(page.getByTestId('name-input')).toHaveValue('Abc');
  await page.getByRole('button', { name: 'Começar aventura' }).focus();
  await press(page, 0);
  await expect(page.getByTestId('xbox-hud')).toBeVisible({ timeout: 45_000 });

  const getPlayer = () => page.evaluate(() => (window.__RPGZIM__ as DebugGame).player());
  const start = await getPlayer();
  await controller(page, { axes: [0.1, 0.1, 0, 0] });
  expect(await getPlayer()).toMatchObject({ x: start.x, y: start.y });
  await controller(page, { axes: [0, 1, 0, 0] });
  await expect.poll(async () => (await getPlayer()).y).toBeGreaterThan(start.y);
  await controller(page, { axes: [0, 0, 0, 0] });

  await press(page, 13);
  await expect(page.getByRole('dialog', { name: 'Mochila' })).toBeVisible();
  await press(page, 1);
  await expect(page.getByRole('dialog', { name: 'Mochila' })).toBeHidden();

  await page.evaluate(() => {
    const game = window.__RPGZIM__ as DebugGame;
    const npc = game.npcs().find((candidate) => candidate.id.includes('priest'))!;
    game.teleport(npc.x, npc.y + 1);
  });
  await press(page, 0);
  await expect(page.getByTestId('npc-dialog')).toBeVisible();
  await press(page, 1);
  await expect(page.getByTestId('npc-dialog')).toBeHidden();

  await page.evaluate(() => {
    const game = window.__RPGZIM__ as DebugGame;
    game.teleport(216, 158);
    game.teleportNear('slime', 3);
  });
  await press(page, 5);
  const selected = () => page.evaluate(() => (window.__RPGZIM__ as DebugGame).ui().selectedMonster);
  await expect.poll(selected).toBeTruthy();
  expect((await getPlayer()).target).toBeNull();
  const monster = await selected();
  await press(page, 0);
  await expect.poll(async () => (await getPlayer()).target).toBe(monster);
  await press(page, 2);
  await expect.poll(() => page.evaluate(() => (window.__RPGZIM__ as DebugGame).castLog().map((entry) => entry.spellId))).toContain('swift_bolt');

  await press(page, 9);
  await expect(page.getByRole('dialog', { name: 'Menu (pausado)' })).toBeVisible();
  await page.getByTestId('settings-xbox').focus();
  await press(page, 0);
  const settings = page.getByRole('dialog', { name: 'Controle Xbox' });
  await expect(settings).toBeVisible();
  const binding = settings.getByLabel('Raio Rápido');
  await binding.selectOption('3');
  await expect(settings.getByLabel('Tempestade Arcana')).toHaveValue('2');
  await press(page, 1);
  await expect(settings).toBeHidden();
  await press(page, 1);
  await expect(page.getByTestId('xbox-hud').getByText('Y', { exact: true })).toBeVisible();
  await controller(page, { connected: false });
  await expect(page.getByTestId('xbox-hud')).toBeHidden();
  await expect(page.getByTestId('desktop-hotbar')).toBeVisible();
});
