// ipcHandlers.ts

import { ipcMain, app } from "electron"
import { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    console.log({ view: appState.getView() })
    try {
      let previews = []
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues()
      console.log("Screenshot queues have been cleared.")
      return { success: true }
    } catch (error: any) {
      console.error("Error resetting queues:", error)
      return { success: false, error: error.message }
    }
  })

  // IPC handler for analyzing audio from base64 data
  ipcMain.handle("analyze-audio-base64", async (event, data: string, mimeType: string, duration?: string) => {
    try {
      const result = await appState.processingHelper.processAudioBase64(data, mimeType, duration)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-base64 handler:", error)
      throw error
    }
  })
  
  // IPC handler for analyzing audio from file path
  ipcMain.handle("analyze-audio-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-file handler:", error)
      throw error
    }
  })

  // IPC handler for analyzing image from file path
  ipcMain.handle("analyze-image-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-image-file handler:", error)
      throw error
    }
  })

  ipcMain.handle("quit-app", () => {
    app.quit()
  })

  ipcMain.handle("ai-chat-followup", async (event, chatHistory, detailedAnalysis) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithHistory(chatHistory, detailedAnalysis);
      return result;
    } catch (error) {
      console.error("Error in ai-chat-followup handler:", error);
      throw error;
    }
  });

  // ============ AUTH-RELATED IPC HANDLERS ============

  // Get current auth state
  ipcMain.handle("get-auth-state", async () => {
    return {
      isAuthenticated: appState.isUserAuthenticated(),
      user: appState.getUserData()
    }
  })

  // Open login URL in browser
  ipcMain.handle("open-login-url", async () => {
    try {
      await appState.openLoginUrl()
      return { success: true }
    } catch (error: any) {
      console.error("Error opening login URL:", error)
      return { success: false, error: error.message }
    }
  })

  // Logout user
  ipcMain.handle("logout", async () => {
    try {
      await appState.logout()
      return { success: true }
    } catch (error: any) {
      console.error("Error during logout:", error)
      return { success: false, error: error.message }
    }
  })

  // Open external URL (generic handler for browser opening)
  ipcMain.handle("open-external-url", async (event, url: string) => {
    try {
      const { shell } = require('electron')
      await shell.openExternal(url)
      return { success: true }
    } catch (error: any) {
      console.error("Error opening external URL:", error)
      return { success: false, error: error.message }
    }
  })

  // ============ CONTEXT-RELATED IPC HANDLERS ============

  // Refresh context cache
  ipcMain.handle("refresh-context", async () => {
    try {
      appState.processingHelper.refreshContext()
      console.log("Context cache refreshed successfully")
      return { success: true }
    } catch (error: any) {
      console.error("Error refreshing context:", error)
      return { success: false, error: error.message }
    }
  })
}