import { globalShortcut, app } from "electron"
import { AppState } from "./main" // Adjust the import path if necessary

export class ShortcutsHelper {
  private appState: AppState
  private isToggling: boolean = false // Prevent rapid toggling

  constructor(appState: AppState) {
    this.appState = appState
    // Register will-quit listener only once
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }

  // Register all shortcuts
  public registerGlobalShortcuts(): void {
    this.unregisterAllShortcuts()
    this.registerScreenshotShortcut()
    this.registerProcessShortcut()
    this.registerResetShortcut()
    this.registerMoveShortcuts()
    this.registerShowHideShortcut()
  }

  // Register only the show/hide shortcut (Ctrl+B)
  public registerShowHideShortcutOnly(): void {
    this.unregisterAllShortcuts()
    // Add small delay to prevent immediate re-triggering
    setTimeout(() => {
      this.registerShowHideShortcut()
    }, 50)
  }

  // Register all shortcuts except show/hide (for when window is shown)
  public registerNonToggleShortcuts(): void {
    // Add small delay to prevent immediate triggering
    setTimeout(() => {
      this.unregisterNonToggleShortcuts()
      this.registerScreenshotShortcut()
      this.registerProcessShortcut()
      this.registerResetShortcut()
      this.registerMoveShortcuts()
    }, 50)
  }

  // Unregister all shortcuts
  public unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll()
  }

  // Unregister only non-toggle shortcuts (keep show/hide active)
  private unregisterNonToggleShortcuts(): void {
    globalShortcut.unregister("CommandOrControl+H")
    globalShortcut.unregister("CommandOrControl+Enter")
    globalShortcut.unregister("CommandOrControl+R")
    globalShortcut.unregister("CommandOrControl+Left")
    globalShortcut.unregister("CommandOrControl+Right")
    globalShortcut.unregister("CommandOrControl+Down")
    globalShortcut.unregister("CommandOrControl+Up")
  }

  private registerScreenshotShortcut() {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.appState.takeScreenshot()
          const preview = await this.appState.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })
  }

  private registerProcessShortcut() {
    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.appState.processingHelper.processScreenshots()
    })
  }

  private registerResetShortcut() {
    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )
      this.appState.processingHelper.cancelOngoingRequests()
      this.appState.clearQueues()
      console.log("Cleared queues.")
      this.appState.setView("queue")
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
      }
    })
  }

  private registerMoveShortcuts() {
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.appState.moveWindowLeft()
    })
    
    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.appState.moveWindowRight()
    })
    
    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.appState.moveWindowDown()
    })
    
    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.appState.moveWindowUp()
    })
  }

  private registerShowHideShortcut() {
    globalShortcut.register("CommandOrControl+B", () => {
      // Prevent rapid toggling
      if (this.isToggling) return
      
      this.isToggling = true
      this.appState.toggleMainWindow()
      
      // Reset the flag after a short delay
      setTimeout(() => {
        this.isToggling = false
      }, 200)
      
      // If window exists and we're showing it, bring it to front
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && this.appState.isVisible()) {
        // Force the window to the front on macOS
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })
  }
}