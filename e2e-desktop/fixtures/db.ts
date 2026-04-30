import { existsSync, rmSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const TEST_APP_ID = 'io.alpaka.desktop.test'

export function getTestDataDir(): string {
  return join(homedir(), '.local', 'share', TEST_APP_ID)
}

export function clearTestDb(): void {
  const dbPath = join(getTestDataDir(), 'alpaka-desktop.db')
  if (existsSync(dbPath)) {
    rmSync(dbPath)
  }
}

export function clearTestDataDir(): void {
  const dataDir = getTestDataDir()
  if (existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true })
  }
}
