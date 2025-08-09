// ipcHandlers.ts
import { ipcMain, app, shell } from "electron"
import { AppState } from "./main"

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

type IpcHandler<TArgs extends any[] = any[], TResult extends Json = any> =
  (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult

type ThrottleCfg = { ms: number; last: number }
const throttles = new Map<string, ThrottleCfg>()

const now = () => Date.now()
const iso = () => new Date().toISOString()

const log = {
  info: (m: string, extra?: any) => console.log(`[${iso()}] [main] ${m}`, extra ?? ""),
  warn: (m: string, extra?: any) => console.warn(`[${iso()}] [main] ${m}`, extra ?? ""),
  error: (m: string, extra?: any) => console.error(`[${iso()}] [main] ${m}`, extra ?? "")
}

function throttle(channel: string, windowMs: number): boolean {
  const t = throttles.get(channel)
  const tnow = now()
  if (!t) {
    throttles.set(channel, { ms: windowMs, last: tnow })
    return false
  }
  if (tnow - t.last < t.ms) return true
  t.last = tnow
  return false
}

function validateNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

function validateString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0
}

function safeHandle<TArgs extends any[], TResult>(
  channel: string,
  handler: IpcHandler<TArgs, TResult>,
  opts?: { throttleMs?: number }
) {
  ipcMain.handle(channel, async (event, ...args: TArgs) => {
    if (opts?.throttleMs && throttle(channel, opts.throttleMs)) {
      log.warn(`Throttled: ${channel}`)
      return { success: false, error: "Too many requests, slow down." }
    }
    const t0 = now()
    try {
      const res = await handler(event, ...args)
      const dt = now() - t0
      log.info(`IPC ${channel} ok in ${dt}ms`)
      return res
    } catch (e: any) {
      const dt = now() - t0
      log.error(`IPC ${channel} failed in ${dt}ms`, e?.stack || e?.message || e)
      throw e
    }
  })
}

async function buildPreviews(paths: string[], appState: AppState) {
  return Promise.all(
    paths.map(async (p) => ({
      path: p,
      preview: await appState.getImagePreview(p)
    }))
  )
}

export function initializeIpcHandlers(appState: AppState): void {
  safeHandle("update-content-dimensions", async (_e, payload: { width: number; height: number }) => {
    const w = payload?.width
    const h = payload?.height
    if (!validateNumber(w) || !validateNumber(h) || w <= 0 || h <= 0) {
      return { success: false, error: "Invalid dimensions" }
    }
    appState.setWindowDimensions(w, h)
    return { success: true }
  }, { throttleMs: 120 })

  safeHandle("delete-screenshot", async (_e, path: string) => {
    if (!validateString(path)) return { success: false, error: "Invalid path" }
    const ok = await appState.deleteScreenshot(path)
    return { success: !!ok }
  })

  safeHandle("take-screenshot", async () => {
    const screenshotPath = await appState.takeScreenshot()
    const preview = await appState.getImagePreview(screenshotPath)
    return { path: screenshotPath, preview }
  })

  safeHandle("get-screenshots", async () => {
    const view = appState.getView()
    log.info("get-screenshots view", { view })
    const source =
      view === "queue"
        ? appState.getScreenshotQueue()
        : appState.getExtraScreenshotQueue()
    const previews = await buildPreviews(source, appState)
    previews.forEach((p) => log.info("preview path", p.path))
    return previews
  }, { throttleMs: 200 })

  safeHandle("toggle-window", async () => {
    appState.toggleMainWindow()
    return { success: true }
  })

  safeHandle("reset-queues", async () => {
    appState.clearQueues()
    log.info("Screenshot queues cleared")
    return { success: true }
  })

  safeHandle("analyze-audio-base64", async (_e, data: string, mimeType: string, duration?: string) => {
    if (!validateString(data) || !validateString(mimeType)) throw new Error("Invalid audio input")
    const result = await appState.processingHelper.processAudioBase64(data, mimeType, duration)
    return result
  })

  safeHandle("analyze-audio-file", async (_e, path: string) => {
    if (!validateString(path)) throw new Error("Invalid path")
    const result = await appState.processingHelper.processAudioFile(path)
    return result
  })

  safeHandle("analyze-image-file", async (_e, path: string) => {
    if (!validateString(path)) throw new Error("Invalid path")
    const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
    return result
  })

  safeHandle("quit-app", async () => {
    app.quit()
    return { success: true }
  })

  safeHandle("ai-chat-followup", async (_e, chatHistory: Json, detailedAnalysis: Json) => {
    if (
      !Array.isArray(chatHistory) ||
      !chatHistory.every(
        (msg) =>
          typeof msg === "object" &&
          msg !== null &&
          (msg as any).role &&
          ((msg as any).role === "user" || (msg as any).role === "ai") &&
          typeof (msg as any).content === "string"
      )
    ) {
      return { error: "Invalid chat history", success: false }
    }
    const result = await appState.processingHelper.getLLMHelper().chatWithHistory(
      chatHistory as { role: "user" | "ai"; content: string }[],
      detailedAnalysis
    )
    return result
  })

  safeHandle("get-auth-state", async () => {
    return {
      isAuthenticated: appState.isUserAuthenticated(),
      user: appState.getUserData()
    }
  })

  safeHandle("open-login-url", async () => {
    await appState.openLoginUrl()
    return { success: true }
  })

  safeHandle("logout", async () => {
    await appState.logout()
    return { success: true }
  })

  safeHandle("open-external-url", async (_e, url: string) => {
    if (!validateString(url)) return { success: false, error: "Invalid URL" }
    await shell.openExternal(url)
    return { success: true }
  })

  safeHandle("refresh-auth-token", async () => {
    const success = await appState.refreshAuthToken()
    return {
      success,
      message: success ? "Token refreshed successfully" : "Token refresh failed"
    }
  })

  safeHandle("is-authenticated", async () => {
    const isAuth = appState.isUserAuthenticated()
    return { success: true, isAuthenticated: isAuth }
  })

  safeHandle("refresh-context", async () => {
    appState.processingHelper.refreshContext()
    log.info("Context cache refreshed")
    return { success: true }
  })
}
