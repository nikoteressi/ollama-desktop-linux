import { test, expect } from '@playwright/test';

test.describe('Ollama Linux - Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Tauri IPC to prevent fetch errors when testing outside the Tauri WebView
    await page.addInitScript(() => {
      Object.defineProperty(window, '__TAURI_INTERCEPT_IPC_REQUEST__', {
        value: async (req: any) => {
          console.log('Mocked Tauri IPC request:', req.cmd);
          if (req.cmd === 'list_hosts') return [];
          if (req.cmd === 'get_models') return [];
          if (req.cmd === 'get_conversations') return [];
          if (req.cmd === 'send_message') return null;
          return null;
        },
        writable: true
      });
    });
  });

  test('loads main chat interface and can type a message', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('/');

    // Ensure the main chat container or textarea is visible
    const input = page.locator('textarea');
    await expect(input).toBeVisible();

    // Type a message
    await input.fill('Hello from Playwright E2E!');

    // Since Tauri IPC is mocked, we can click send and ensure it doesn't crash
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    }
  });
});
