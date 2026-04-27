import { test, expect } from '@playwright/test';

test.describe('Ollama Linux - Chat E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Forward console logs from the browser to the test output
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    // Mock Tauri IPC to prevent fetch errors when testing outside the Tauri WebView
    await page.addInitScript(() => {
      const win = window as any;
      win.__TAURI_EVENT_LISTENERS__ = {};
      win.__TAURI_METADATA__ = {
        __windows: [{ label: 'main' }],
        __currentWindow: { label: 'main' }
      };

      // Mock the Tauri V2 internals that the JS bundle expects
      win.__TAURI_INTERNALS__ = {
        transformCallback: (cb: any, once: boolean) => {
          const id = Math.floor(Math.random() * 1e9);
          win[`_${id}`] = (payload: any) => {
            if (once) delete win[`_${id}`];
            cb(payload);
          };
          return id;
        },
        convertFileSrc: (src: string) => src,
        invoke: async (cmd: any, args: any) => {
          return win.__TAURI_INTERCEPT_IPC_REQUEST__({ cmd, ...args });
        }
      };

      Object.defineProperty(win, '__TAURI_INTERCEPT_IPC_REQUEST__', {
        value: async (req: any) => {
          console.log('Mocked Tauri IPC request:', req.cmd, req);

          // Handle event listening in Tauri V2
          if (req.cmd.includes('listen')) {
            const event = req.event || req.message?.event;
            const handler = req.handler || req.message?.handler;
            if (event && handler) {
              if (!win.__TAURI_EVENT_LISTENERS__[event]) {
                win.__TAURI_EVENT_LISTENERS__[event] = [];
              }
              win.__TAURI_EVENT_LISTENERS__[event].push(handler);
            }
            return 0; // Return a listener ID
          }

          if (req.cmd === 'list_hosts') return [];
          if (req.cmd === 'list_models') return [
            { 
              name: 'llama3:latest', 
              model: 'llama3:latest',
              size: 4700000000, 
              modified_at: new Date().toISOString(),
              digest: 'sha256:123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '8B',
                quantization_level: 'Q4_K_M'
              }
            }
          ];
          if (req.cmd === 'get_model_capabilities') return {
            name: 'llama3:latest',
            thinking: false,
            thinking_toggleable: true,
            thinking_levels: [],
            tools: true,
            vision: false,
            embedding: false,
            audio: false,
            cloud: false
          };
          if (req.cmd === 'list_conversations') return [];
          if (req.cmd === 'get_conversations') return [];
          if (req.cmd === 'get_all_settings') return {
            theme: 'dark',
            'chat.font_size': '14',
            'chat.show_performance': 'false'
          };
          if (req.cmd === 'create_conversation') return {
            id: 'test-conv-id',
            title: 'New Chat',
            model: 'llama3:latest',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (req.cmd === 'get_messages') return [];
          if (req.cmd === 'send_message') {
            // Trigger streaming tokens after a short delay
            setTimeout(() => {
              const listeners = win.__TAURI_EVENT_LISTENERS__['chat:token'] || [];
              listeners.forEach((h: number) => {
                if (typeof win[`_${h}`] === 'function') {
                  win[`_${h}`]({
                    payload: { conversation_id: 'test-conv-id', content: 'Hello ', done: false }
                  });
                }
                setTimeout(() => {
                  if (typeof win[`_${h}`] === 'function') {
                    win[`_${h}`]({
                      payload: { conversation_id: 'test-conv-id', content: 'world!', done: false }
                    });
                  }
                  // Emit done
                  const doneListeners = win.__TAURI_EVENT_LISTENERS__['chat:done'] || [];
                  doneListeners.forEach((dh: number) => {
                    if (typeof win[`_${dh}`] === 'function') {
                      win[`_${dh}`]({
                        payload: { conversation_id: 'test-conv-id', total_tokens: 2, tokens_per_sec: 10 }
                      });
                    }
                  });
                }, 100);
              });
            }, 50);
            return null;
          }
          return null;
        },
        writable: true
      });
    });
  });

  test('loads main chat interface, sends message and receives streamed response', async ({ page }) => {
    // Navigate to chat page explicitly (app defaults to /launch)
    await page.goto('/#/chat');

    // Ensure model selector is visible and contains our mocked model
    const input = page.locator('textarea');
    await expect(input).toBeVisible();

    // Select model if not automatically selected
    const modelSelector = page.locator('button').filter({ hasText: /Select model|latest/i });
    await expect(modelSelector).toBeVisible();
    
    const selectorText = await modelSelector.innerText();
    console.log('Current selector text:', selectorText);
    
    if (selectorText.includes('Select model')) {
      await modelSelector.click();
      await page.waitForTimeout(1000); // Wait for transition
      await page.screenshot({ path: 'dropdown-debug.png' });
      
      const allText = await page.evaluate(() => document.body.innerText);
      console.log('Page text after click:', allText);

      await page.locator('text=llama3:latest').last().click();
    }

    // Type a message
    await input.fill('Stream test query');
    await page.keyboard.press('Enter');

    // Verify user message appears
    const userMessage = page.locator('.user-message, [data-role="user"]').last();
    await expect(userMessage).toContainText('Stream test query');

    // Verify streamed response "Hello world!" appears incrementally
    // Use a regex to wait for the text to appear (incrementally)
    const assistantMessage = page.locator('.assistant-message, [data-role="assistant"]').last();
    await expect(assistantMessage).toContainText('Hello world!', { timeout: 10000 });
  });
});
