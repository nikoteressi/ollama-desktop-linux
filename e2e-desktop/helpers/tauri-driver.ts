import { spawn, ChildProcess } from 'child_process'

let tauriDriver: ChildProcess | undefined

export async function startTauriDriver(): Promise<void> {
  tauriDriver = spawn('tauri-driver', [], {
    stdio: [null, process.stdout, process.stderr],
  })

  await new Promise<void>((resolve) => setTimeout(resolve, 1500))
}

export async function stopTauriDriver(): Promise<void> {
  if (tauriDriver) {
    tauriDriver.kill()
    tauriDriver = undefined
  }
}
