import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Realistic model fixture matching the Ollama API / Rust backend shape
// ---------------------------------------------------------------------------
const MOCK_MODELS = [
  {
    name: 'llama3:latest',
    model: 'llama3:latest',
    modified_at: '2024-01-01T00:00:00Z',
    size: 4700000000,
    digest: 'abc123',
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'llama',
      families: ['llama'],
      parameter_size: '8B',
      quantization_level: 'Q4_K_M',
    },
  },
  {
    name: 'mistral:latest',
    model: 'mistral:latest',
    modified_at: '2024-01-01T00:00:00Z',
    size: 4100000000,
    digest: 'def456',
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'mistral',
      families: ['mistral'],
      parameter_size: '7B',
      quantization_level: 'Q4_0',
    },
  },
];

// ---------------------------------------------------------------------------
// Helper: inject a full __TAURI_INTERNALS__ stub so that @tauri-apps/api/core
// `invoke` and @tauri-apps/api/event `listen` both resolve cleanly.
//
// Tauri v2 `invoke`  → window.__TAURI_INTERNALS__.invoke(cmd, args)
// Tauri v2 `listen`  → invoke('plugin:event|listen', { event, handler, target })
//                       where `handler` is a numeric callback id registered via
//                       window.__TAURI_INTERNALS__.transformCallback(fn)
//
// We replicate the minimal bookkeeping from @tauri-apps/api/mocks so that
// `listen` resolves with an unlisten no-op instead of throwing.
// ---------------------------------------------------------------------------
function buildTauriMockScript(modelsPayload: unknown[]): string {
  // Serialise the models array into the script so it is available inline
  const modelsJson = JSON.stringify(modelsPayload);

  return `
    (function () {
      const callbacks = new Map();
      let nextId = 1;

      function transformCallback(fn, once) {
        const id = nextId++;
        callbacks.set(id, (data) => {
          if (once) callbacks.delete(id);
          if (fn) fn(data);
        });
        return id;
      }

      function unregisterCallback(id) {
        callbacks.delete(id);
      }

      function runCallback(id, data) {
        const cb = callbacks.get(id);
        if (cb) cb(data);
      }

      async function invoke(cmd, args, _options) {
        // Tauri event plugin — just return a numeric event-id so listen() resolves
        if (cmd === 'plugin:event|listen')   return transformCallback(() => {}, false);
        if (cmd === 'plugin:event|unlisten') return null;
        if (cmd === 'plugin:event|emit')     return null;

        // Application commands
        if (cmd === 'list_models')   return ${modelsJson};
        if (cmd === 'delete_model')  return null;
        if (cmd === 'pull_model')    return null;
        if (cmd === 'list_hosts')    return [];
        if (cmd === 'get_conversations') return [];

        console.log('[tauri-mock] unhandled cmd:', cmd, args);
        return null;
      }

      window.__TAURI_INTERNALS__ = {
        invoke,
        transformCallback,
        unregisterCallback,
        runCallback,
        callbacks,
      };

      // event plugin needs this to not throw on unlisten
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
        unregisterListener: () => {},
      };
    })();
  `;
}

// ---------------------------------------------------------------------------
// Navigate to the models page (hash-history router: /#/models)
// ---------------------------------------------------------------------------
async function goToModelsPage(page: Page): Promise<void> {
  await page.goto('/#/models');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Models Page E2E', () => {
  test('navigates to models page and lists installed models', async ({ page }) => {
    await page.addInitScript(buildTauriMockScript(MOCK_MODELS));

    await goToModelsPage(page);

    // Both model names must be rendered in the model card headings
    await expect(page.getByText('llama3:latest')).toBeVisible();
    await expect(page.getByText('mistral:latest')).toBeVisible();
  });

  test('shows pull input and allows typing a model name', async ({ page }) => {
    await page.addInitScript(buildTauriMockScript(MOCK_MODELS));

    await goToModelsPage(page);

    // The pull input placeholder is "e.g. llama3, mistral, phi3"
    const pullInput = page.getByPlaceholder('e.g. llama3, mistral, phi3');
    await expect(pullInput).toBeVisible();

    // Pull button is disabled while the input is empty
    const pullButton = page.getByRole('button', { name: 'Pull' });
    await expect(pullButton).toBeDisabled();

    // Typing a model name enables the Pull button
    await pullInput.fill('phi3');
    await expect(pullButton).toBeEnabled();
  });

  test('shows empty state when no models are installed', async ({ page }) => {
    await page.addInitScript(buildTauriMockScript([]));

    await goToModelsPage(page);

    // ModelBrowser.vue renders this text when store.models.length === 0
    await expect(page.getByText('No models installed yet.')).toBeVisible();
  });
});
