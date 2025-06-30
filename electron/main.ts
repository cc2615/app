// electron/main.ts
import { app, BrowserWindow } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
import { AuthHandler, AuthData } from "./authHandler"

// Load environment variables from .env file
try {
  const dotenv = require('dotenv')
  const path = require('path')
  
  // Configure dotenv to load from the correct path
  // In development, load from project root
  // In production, load from the app's resource directory
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    dotenv.config({ path: path.join(__dirname, '../.env') })
  } else {
    dotenv.config({ path: path.join(process.resourcesPath, '.env') })
  }
} catch (error) {
  console.warn('Could not load dotenv:', error instanceof Error ? error.message : String(error))
  // Set API key directly if dotenv fails
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = 'AIzaSyDmeRWhbi6WMpre0iarWP8WcVt90QYZ-nM'
  }
}

// Register custom protocol BEFORE app.whenReady() - DISABLE AUTHHANDLER REGISTRATION
const protocol = process.env.CUSTOM_PROTOCOL || 'paradigm'
const path = require('path')

console.log('PROTOCOL REGISTRATION WITH AUTHHANDLER DISABLED')

const electronPath = process.execPath
const appPath = path.resolve(__dirname, '..')
const command = `"${electronPath}" "${appPath}" "%1"`

console.log('Target command:', command)

// Make this a single-instance app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // This is the first instance, continue
  console.log('Got single instance lock')
}

// Use the working approach but fix the path issue
// Force it to NOT use defaultApp mode to avoid the "." bug
if (process.platform === 'win32') {
  const { execSync } = require('child_process')
  
  try {
    // Delete any existing registration (suppress output)
    execSync(`reg delete "HKEY_CURRENT_USER\\Software\\Classes\\${protocol}" /f`, { stdio: 'ignore' })
    console.log('Deleted old registry entry')
  } catch (e) {
    console.log('No old registry entry to delete (or delete failed)')
  }
  
  try {
    // Create the protocol key structure (suppress output)
    const protocolKey = `HKEY_CURRENT_USER\\Software\\Classes\\${protocol}`
    const commandKey = `${protocolKey}\\shell\\open\\command`
    
    // Add protocol key
    execSync(`reg add "${protocolKey}" /ve /d "URL:Custom Protocol" /f`, { stdio: 'ignore' })
    
    // Add URL Protocol value  
    execSync(`reg add "${protocolKey}" /v "URL Protocol" /d "" /f`, { stdio: 'ignore' })
    
    // Add the command
    execSync(`reg add "${commandKey}" /ve /d "${command}" /f`, { stdio: 'ignore' })
    
    console.log('Successfully added registry entry with command:', command)
  } catch (e) {
    console.error('Failed to add registry entry:', e)
  }
}

console.log(`Manual protocol registration completed: ${protocol}://`)

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper
  private authHandler: AuthHandler | null = null

  // View management
  private view: "queue" | "solutions" = "queue"

  // Auth state
  private isAuthenticated: boolean = false
  private authToken: string | null = null
  private userData: any = null

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  // Auth events
  public readonly AUTH_EVENTS = {
    AUTH_SUCCESS: "auth-success",
    AUTH_ERROR: "auth-error",
    AUTH_LOGOUT: "auth-logout",
    AUTH_STATE_CHANGED: "auth-state-changed"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)

    // Load saved auth state
    this.loadAuthState()
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Auth methods
  public initializeAuth(): void {
    const mainWindow = this.getMainWindow()
    if (!mainWindow) return

    this.authHandler = new AuthHandler(mainWindow)
    this.authHandler.registerProtocol()
    this.authHandler.setCallbacks({
      onSuccess: (data: AuthData) => this.handleAuthSuccess(data),
      onError: (error: string) => this.handleAuthError(error)
    })
  }

  private async handleAuthSuccess(data: AuthData): Promise<void> {
    this.isAuthenticated = true
    this.authToken = data.token
    this.userData = data.user

    // Save auth state to secure storage
    await this.saveAuthState()

    // Notify renderer process
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_SUCCESS, {
        user: this.userData,
        token: '***' // Don't send actual token to renderer
      })
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_STATE_CHANGED, { 
        isAuthenticated: true 
      })
    }

    console.log('User authenticated successfully')
  }

  private handleAuthError(error: string): void {
    console.error('Authentication error:', error)
    
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_ERROR, { error })
    }
  }

  public async openLoginUrl(): Promise<void> {
    if (this.authHandler) {
      await this.authHandler.openLoginUrl()
    }
  }

  public async logout(): Promise<void> {
    this.isAuthenticated = false
    this.authToken = null
    this.userData = null

    // Clear saved auth state
    await this.clearAuthState()

    // Clear app state
    this.clearQueues()

    // Notify renderer process
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_LOGOUT)
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_STATE_CHANGED, { 
        isAuthenticated: false 
      })
    }

    console.log('User logged out')
  }

  private async saveAuthState(): Promise<void> {
    try {
      const { safeStorage } = require('electron')
      if (safeStorage.isEncryptionAvailable() && this.authToken) {
        const authData = {
          token: this.authToken,
          user: this.userData,
          timestamp: Date.now()
        }
        const encrypted = safeStorage.encryptString(JSON.stringify(authData))
        
        // Save to app data (you might want to use electron-store here)
        const fs = require('fs')
        const path = require('path')
        const userDataPath = app.getPath('userData')
        const authFilePath = path.join(userDataPath, 'auth.dat')
        
        fs.writeFileSync(authFilePath, encrypted)
      }
    } catch (error) {
      console.error('Failed to save auth state:', error)
    }
  }

  private async loadAuthState(): Promise<void> {
    try {
      const { safeStorage } = require('electron')
      const fs = require('fs')
      const path = require('path')
      
      if (!safeStorage.isEncryptionAvailable()) return

      const userDataPath = app.getPath('userData')
      const authFilePath = path.join(userDataPath, 'auth.dat')
      
      if (!fs.existsSync(authFilePath)) return

      const encrypted = fs.readFileSync(authFilePath)
      const decrypted = safeStorage.decryptString(encrypted)
      const authData = JSON.parse(decrypted)

      // Check if token is not too old (optional - implement token refresh)
      const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
      if (Date.now() - authData.timestamp > maxAge) {
        await this.clearAuthState()
        return
      }

      this.isAuthenticated = true
      this.authToken = authData.token
      this.userData = authData.user

      console.log('Auth state loaded from storage')
    } catch (error) {
      console.error('Failed to load auth state:', error)
      await this.clearAuthState()
    }
  }

  private async clearAuthState(): Promise<void> {
    try {
      const fs = require('fs')
      const path = require('path')
      const userDataPath = app.getPath('userData')
      const authFilePath = path.join(userDataPath, 'auth.dat')
      
      if (fs.existsSync(authFilePath)) {
        fs.unlinkSync(authFilePath)
      }
    } catch (error) {
      console.error('Failed to clear auth state:', error)
    }
  }

  // Auth getters
  public isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  public getAuthToken(): string | null {
    return this.authToken
  }

  public getUserData(): any {
    return this.userData
  }

  // Existing getters and setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
    // Initialize auth after window is created
    setTimeout(() => this.initializeAuth(), 100)
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  // Add second-instance handler with detailed logging
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('🔥 SECOND-INSTANCE EVENT FIRED!')
    console.log('Command line arguments:', commandLine)
    console.log('Working directory:', workingDirectory)
    
    // Check for protocol URL
    const protocolUrl = commandLine.find(arg => arg.startsWith('paradigm://'))
    if (protocolUrl) {
      console.log('📡 Found protocol URL in command line:', protocolUrl)
      // The AuthHandler should handle this, but let's log it
    } else {
      console.log('❌ No protocol URL found in command line')
    }

    // Focus the main window
    const mainWindow = appState.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      console.log('🎯 Focused main window')
    }
  })

  app.whenReady().then(() => {
    console.log("App is ready")
    appState.createWindow()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
  })

  app.on("activate", () => {
    console.log("App activated")
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch(console.error)