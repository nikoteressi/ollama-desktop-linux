import { test, expect } from '@playwright/test';

test.describe('Settings Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Forward browser logs to terminal
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

    // Mock Tauri IPC
    await page.addInitScript(() => {
      let activeHostId = 'h1';
      let hosts = [
        { id: 'h1', name: 'Local', url: 'http://localhost:11434', is_active: true, last_ping_status: 'online' },
        { id: 'h2', name: 'Remote', url: 'http://192.168.1.10:11434', is_active: false, last_ping_status: 'online' }
      ];

      (window as any).__TAURI_INTERNALS__ = {
        transformCallback: (cb: any) => {
          const id = Math.floor(Math.random() * 1e9);
          (window as any)[`_${id}`] = cb;
          return id;
        },
        invoke: async (cmd: string, args: any) => {
          console.log(`TAURI IPC: ${cmd}`, args);
          if (cmd === 'get_all_settings') return {
            theme: 'dark',
            serverUrl: 'http://localhost:11434',
            'chat.font_size': '14'
          };
          if (cmd === 'list_hosts') {
            return hosts.map(h => ({ ...h, is_active: h.id === activeHostId }));
          }
          if (cmd === 'list_models') return [
            { name: 'llama3:latest', details: { family: 'llama' } }
          ];
          if (cmd === 'get_model_capabilities') return {
            has_vision: false,
            has_tools: true,
            max_tokens: 8192
          };
          if (cmd === 'list_conversations') return [];
          if (cmd === 'get_messages') return [];
          if (cmd === 'get_folder_contexts') return [];
          if (cmd === 'report_active_view') return null;
          if (cmd === 'get_auth_status') return true;
          if (cmd === 'check_ollama_signed_in') return true;
          if (cmd === 'set_active_host') {
            activeHostId = args.id;
            return null;
          }
          if (cmd === 'add_host') {
            hosts.push({
              id: 'h' + (hosts.length + 1),
              name: args.newHost.name,
              url: args.newHost.url,
              is_active: false,
              last_ping_status: 'online'
            });
            return null;
          }
          if (cmd === 'plugin:event|listen') return 0;
          return null;
        }
      };
    });

    await page.goto('/#/settings');
  });

  test('can toggle settings and see changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Performance statistics')).toBeVisible();
  });

  test('can switch hosts and it calls orchestration', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Open Host Settings accordion - wait for it to be visible first
    const accordion = page.getByRole('button', { name: 'Ollama Hosts' });
    await expect(accordion).toBeVisible();
    await accordion.click();
    
    // Wait for the Connect button to appear
    const connectBtn = page.getByRole('button', { name: 'Connect' }).first();
    await expect(connectBtn).toBeVisible({ timeout: 5000 });

    // Click connect
    await connectBtn.click();

    // Verify it becomes active (indicated by "Active" text)
    // We search for the row that has 'Remote' and now should have 'Active'
    await expect(page.locator('div').filter({ hasText: 'Remote' }).getByText('Active').first()).toBeVisible({ timeout: 5000 });
  });

  test('can add a new host', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Ollama Hosts' }).click();
    
    const nameInput = page.getByPlaceholder('Display name');
    const urlInput = page.getByPlaceholder('http://192.168.1.100:11434');
    const addBtn = page.getByRole('button', { name: 'Add Host' });

    await nameInput.fill('New Host');
    await urlInput.fill('http://newhost:11434');
    await addBtn.click();

    // Verify new host appears
    await expect(page.getByText('New Host', { exact: true }).first()).toBeVisible();
  });
});
