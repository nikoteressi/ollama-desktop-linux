import { BasePage } from '../pages/BasePage'

describe('App Launch', () => {
  const page = new BasePage()

  it('app window appears and root element is visible', async () => {
    await $('[data-testid="app-root"]').waitForDisplayed({ timeout: 15000 })
  })

  it('window has correct title', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('Alpaka')
  })

  it('app does not show an error screen on cold start', async () => {
    const errorEl = await $('[data-testid="error-screen"]')
    await expect(errorEl).not.toBeExisting()
  })
})
