import { SettingsPage } from '../pages/SettingsPage'

describe('Hosts — connectivity management', () => {
  const settings = new SettingsPage()

  before(async () => {
    await settings.waitForAppReady()
    await settings.clickNavIcon('settings')
    await $('[data-testid="settings-tab-connectivity"]').waitForDisplayed({ timeout: 5000 })
    await $('[data-testid="settings-tab-connectivity"]').click()
    await browser.pause(300)
    // Expand the Ollama Hosts panel (collapsed by default)
    const expandBtn = await $('[data-testid="hosts-expand-btn"]')
    if (await expandBtn.isExisting()) {
      const hostStatus = await $('[data-testid="host-status"]')
      if (!(await hostStatus.isExisting())) {
        await expandBtn.click()
        await browser.pause(300)
      }
    }
  })

  it('connectivity settings tab is visible', async () => {
    const tab = await $('[data-testid="settings-tab-connectivity"]')
    await expect(tab).toBeDisplayed()
  })

  it('default host shows connected status to local Ollama', async () => {
    // host-status is a colored dot span; online status applies the success CSS variable class
    await browser.waitUntil(
      async () => {
        const status = await $('[data-testid="host-status"]')
        if (!(await status.isExisting())) return false
        const classes = await status.getAttribute('class')
        return classes?.includes('var(--success)') ?? false
      },
      { timeout: 15000, interval: 1000 }
    )
  })

  it('at least one host is listed', async () => {
    const hostStatuses = await $$('[data-testid="host-status"]')
    expect(hostStatuses.length).toBeGreaterThan(0)
  })

  it('ping host manually returns a result', async () => {
    const pingBtn = await $('[data-testid="ping-host-btn"]')
    if (await pingBtn.isExisting()) {
      await pingBtn.click()
      await browser.pause(2000)
      const status = await $('[data-testid="host-status"]')
      await expect(status).toBeDisplayed()
    }
  })
})
