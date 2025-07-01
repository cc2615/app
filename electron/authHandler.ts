import { app, shell, BrowserWindow } from 'electron'
import { URL } from 'url'

export interface AuthData {
  token: string
  user?: any
  expiresAt?: number
}

export class AuthHandler {
  private mainWindow: BrowserWindow | null = null
  private authCallbacks: {
    onSuccess: (data: AuthData) => void
    onError: (error: string) => void
  } | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  /**
   * Register the custom protocol handler for auth callbacks
   * NOTE: Protocol registration is now handled in main.ts to avoid the "." path bug
   */
  public registerProtocol(): void {
    const protocol = process.env.CUSTOM_PROTOCOL || 'paradigm'
    
    // DON'T register the protocol here - main.ts handles it correctly
    // This method now only sets up the event handlers
    
    console.log('🔧 Setting up protocol event handlers for:', protocol)

    // Handle protocol activation (when app is already running)
    app.on('open-url', (event, url) => {
      console.log('🍎 OPEN-URL EVENT (macOS):', url)
      event.preventDefault()
      this.handleProtocolUrl(url)
    })

    // Handle protocol activation on Windows/Linux (second instance)
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      console.log('🪟 SECOND-INSTANCE EVENT IN AUTHHANDLER!')
      console.log('Command line in AuthHandler:', commandLine)
      
      // Someone tried to run a second instance, focus our window instead
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore()
        this.mainWindow.focus()
        console.log('🎯 AuthHandler focused window')
      }

      // Check if there's a protocol URL in the command line
      const protocolUrl = commandLine.find(arg => arg.startsWith(`${protocol}://`))
      if (protocolUrl) {
        console.log('📡 AuthHandler found protocol URL:', protocolUrl)
        this.handleProtocolUrl(protocolUrl)
      } else {
        console.log('❌ AuthHandler found no protocol URL in command line')
      }
    })
  }

  /**
   * Set auth event callbacks
   */
  public setCallbacks(callbacks: {
    onSuccess: (data: AuthData) => void
    onError: (error: string) => void
  }): void {
    this.authCallbacks = callbacks
  }

  /**
   * Open external browser for login
   */
  public async openLoginUrl(): Promise<void> {
    const baseUrl = process.env.LOGIN_URL || 'https://paradigm-website-five.vercel.app/login'
    const loginUrl = `${baseUrl}?source=electron`
    await shell.openExternal(loginUrl)
  }

  /**
   * Handle incoming protocol URLs
   */
  private handleProtocolUrl(url: string): void {
    console.log('🔍 HANDLING PROTOCOL URL:', url)
    
    try {
      const protocol = process.env.CUSTOM_PROTOCOL || 'paradigm'

      if (!url.startsWith(`${protocol}://`)) {
        console.warn('❌ Invalid protocol URL:', url)
        return
      }

      // For custom protocols, we need to parse differently
      // Extract the path part after the protocol
      const urlWithoutProtocol = url.replace(`${protocol}://`, '')
      const [pathPart, queryPart] = urlWithoutProtocol.split('?')
      
      console.log('📝 Path part:', pathPart)
      console.log('📝 Query part:', queryPart)

      // Create a proper URL for parsing query parameters
      const parsedUrl = new URL(`http://localhost/${pathPart}?${queryPart || ''}`)

      switch (pathPart) {
        case 'auth-success':
          console.log('✅ Handling auth success!')
          this.handleAuthSuccess(parsedUrl)
          break
        case 'auth-error':
          console.log('❌ Handling auth error!')
          this.handleAuthError(parsedUrl)
          break
        default:
          console.warn('❓ Unknown auth callback path:', pathPart)
      }
    } catch (error) {
      console.error('💥 Error handling protocol URL:', error)
      this.authCallbacks?.onError('Invalid callback URL format')
    }
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(url: URL): void {
    console.log('🎉 HANDLING AUTH SUCCESS!')
    console.log('Auth success URL search params:', url.searchParams.toString())
    
    const token = url.searchParams.get('token')
    const userParam = url.searchParams.get('user')
    const expiresParam = url.searchParams.get('expires')

    console.log('Token present:', !!token)
    console.log('User param present:', !!userParam)

    if (!token) {
      console.error('❌ No authentication token received')
      this.authCallbacks?.onError('No authentication token received')
      return
    }

    const authData: AuthData = {
      token,
      user: userParam ? JSON.parse(decodeURIComponent(userParam)) : undefined,
      expiresAt: expiresParam ? parseInt(expiresParam) : undefined
    }

    console.log('🔑 Authentication successful! User:', authData.user?.email)
    console.log('🔄 Calling success callback...')
    this.authCallbacks?.onSuccess(authData)

    // Focus the main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
      this.mainWindow.show()
      console.log('🎯 Focused and showed main window')
    }
  }

  /**
   * Handle authentication error
   */
  private handleAuthError(url: URL): void {
    const error = url.searchParams.get('error') || 'Authentication failed'
    const errorDescription = url.searchParams.get('error_description')
    
    const fullError = errorDescription 
      ? `${error}: ${errorDescription}` 
      : error

    console.error('Authentication error:', fullError)
    this.authCallbacks?.onError(fullError)

    // Focus the main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      this.mainWindow.focus()
      this.mainWindow.show()
    }
  }

  /**
   * Clear auth callbacks (cleanup)
   */
  public cleanup(): void {
    this.authCallbacks = null
  }
}

// Export singleton instance creator
export const createAuthHandler = (mainWindow: BrowserWindow): AuthHandler => {
  return new AuthHandler(mainWindow)
}