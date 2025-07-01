// electron/main.ts
import { app, BrowserWindow } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
import { AuthHandler, AuthData } from "./authHandler"
import { AuthManager } from "./AuthManager"

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

// Use the working approach but fix the path issue
// Force it to NOT use defaultApp mode to avoid the "." bug
// Cross-platform protocol registration
function registerProtocol() {
  if (process.platform === 'darwin') {
    // macOS: Use Electron's built-in protocol registration
    console.log('🍎 Registering protocol for macOS')
    
    // Set as default protocol client - this is the key for macOS!
    if (!app.isDefaultProtocolClient(protocol)) {
      const success = app.setAsDefaultProtocolClient(protocol)
      console.log(`macOS protocol registration ${success ? 'successful' : 'failed'} for ${protocol}://`)
    } else {
      console.log(`Already registered as default client for ${protocol}://`)
    }
  } else if (process.platform === 'win32') {
    // Windows: Use registry approach
    const { execSync } = require('child_process')
    
    const electronPath = process.execPath
    const appPath = path.resolve(__dirname, '..')
    const command = `"${electronPath}" "${appPath}" "%1"`
    
    try {
      // Delete any existing registration
      execSync(`reg delete "HKEY_CURRENT_USER\\Software\\Classes\\${protocol}" /f`, { stdio: 'ignore' })
      console.log('Deleted old registry entry')
    } catch (e) {
      console.log('No old registry entry to delete')
    }
    
    try {
      const protocolKey = `HKEY_CURRENT_USER\\Software\\Classes\\${protocol}`
      const commandKey = `${protocolKey}\\shell\\open\\command`
      
      execSync(`reg add "${protocolKey}" /ve /d "Paradigm" /f`, { stdio: 'ignore' })
      execSync(`reg add "${protocolKey}" /v "URL Protocol" /d "" /f`, { stdio: 'ignore' })
      execSync(`reg add "${commandKey}" /ve /d "${command}" /f`, { stdio: 'ignore' })
      
      console.log('Successfully added Windows registry entry')
    } catch (e) {
      console.error('Failed to add registry entry:', e)
    }
  }
}

// Call the registration function
registerProtocol()

// Make this a single-instance app - MUST be after protocol registration
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('Another instance already running, quitting...')
  app.quit()
} else {
  console.log('✅ Got single instance lock')
  
  // Handle second instance attempts (important for protocol handling)
  // Handle second instance attempts (important for protocol handling)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('🔥 Second instance detected!')
    console.log('Command line:', commandLine)
    
    // Focus existing window
    const appState = AppState.getInstance()
    const mainWindow = appState.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }

    // NEW: Handle protocol URLs on Windows
    if (process.platform === 'win32') {
      const protocol = process.env.CUSTOM_PROTOCOL || 'paradigm'
      const protocolUrl = commandLine.find(arg => arg.startsWith(`${protocol}://`))
      if (protocolUrl) {
        console.log('🪟 Windows protocol URL found:', protocolUrl)
        // We need to get the AuthHandler instance to process this
        // Add this method to AppState to expose the auth handler
        const authHandler = appState.getAuthHandler()
        if (authHandler) {
          authHandler.handleProtocolUrl(protocolUrl)
        }
      }
    }
  })
}


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
  private authManager: AuthManager

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
    // Initialize AuthManager
    this.authManager = AuthManager.getInstance()

    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public getAuthHandler(): AuthHandler | null {
    return this.authHandler
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Auth methods
  public async initializeAuth(): Promise<void> {
    const mainWindow = this.getMainWindow()
    if (!mainWindow) return
  
    try {
      // Initialize AuthManager first (loads and validates stored auth)
      await this.authManager.initialize()
  
      // Set up AuthHandler for protocol callbacks
      this.authHandler = new AuthHandler(mainWindow)
      this.authHandler.registerProtocol()
      this.authHandler.setCallbacks({
        onSuccess: (data: AuthData) => this.handleAuthSuccess(data),
        onError: (error: string) => this.handleAuthError(error)
      })
  
      // Notify renderer of initial auth state
      this.notifyAuthStateChanged()
  
      console.log('🔐 Auth system initialized')
    } catch (error) {
      console.error('💥 Failed to initialize auth system:', error)
    }
  }

  private async handleAuthSuccess(data: AuthData): Promise<void> {
    try {
      // Let AuthManager handle the success
      await this.authManager.handleAuthSuccess(data)
  
      // Notify renderer process
      this.notifyAuthStateChanged()
      
      const mainWindow = this.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_SUCCESS, {
          user: this.authManager.getUserData(),
          token: '***' // Don't send actual token to renderer
        })
      }
  
      console.log('✅ User authenticated successfully')
    } catch (error) {
      console.error('💥 Auth success handling failed:', error)
      this.handleAuthError('Authentication failed')
    }
  }

  private handleAuthError(error: string): void {
    console.error('Authentication error:', error)
    
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_ERROR, { error })
    }
  }

  private notifyAuthStateChanged(): void {
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      const authState = this.authManager.getAuthState()
      mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_STATE_CHANGED, { 
        isAuthenticated: authState.isAuthenticated 
      })
    }
  }

  public async openLoginUrl(): Promise<void> {
    if (this.authHandler) {
      await this.authHandler.openLoginUrl()
    }
  }

  public async logout(): Promise<void> {
    try {
      // Use AuthManager to handle logout
      await this.authManager.logout()
  
      // Clear app state
      this.clearQueues()
  
      // Notify renderer process
      this.notifyAuthStateChanged()
      
      const mainWindow = this.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send(this.AUTH_EVENTS.AUTH_LOGOUT)
      }
  
      console.log('👋 User logged out successfully')
    } catch (error) {
      console.error('💥 Logout failed:', error)
    }
  }

  
  // Auth getters
  public getAuthState(): { isAuthenticated: boolean; user: any } {
    const authState = this.authManager.getAuthState()
    return {
      isAuthenticated: authState.isAuthenticated,
      user: authState.user
    }
  }
  
  public isUserAuthenticated(): boolean {
    return this.authManager.isAuthenticated()
  }
  
  public getAuthToken(): string | null {
    return this.authManager.getAuthToken()
  }
  
  public getUserData(): any {
    return this.authManager.getUserData()
  }

  public async refreshAuthToken(): Promise<boolean> {
    const success = await this.authManager.refreshToken()
    if (success) {
      this.notifyAuthStateChanged()
    }
    return success
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
    setTimeout(() => this.initializeAuth(), 500)
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

  // Add macOS protocol handler
  if (process.platform === 'darwin') {
    app.on('open-url', (event, url) => {
      console.log('🍎 macOS open-url event:', url)
      event.preventDefault()
      
      // Ensure app is ready and window exists
      if (app.isReady()) {
        const mainWindow = appState.getMainWindow()
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
          mainWindow.show()
        }
      }
    })
  }

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