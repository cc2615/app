// electron/AuthManager.ts
import { app } from 'electron'
import axios from 'axios'

export interface AuthData {
  token: string
  user?: any
  expiresAt?: number
}

export interface AuthState {
  isAuthenticated: boolean
  user: any
  token: string | null
}

export class AuthManager {
  private static instance: AuthManager | null = null
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null
  }

  private readonly BACKEND_URL = process.env.BACKEND_URL || 'https://paradigm-backend.vercel.app'
  private readonly AUTH_FILE_NAME = 'auth.dat'
  
  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  /**
   * Initialize auth manager - load and validate stored auth state
   */
  public async initialize(): Promise<void> {
    console.log('🔐 Initializing AuthManager...')
    
    try {
      // Try to load stored auth state
      const storedAuth = await this.loadStoredAuth()
      
      if (storedAuth && storedAuth.token) {
        console.log('📁 Found stored auth data, validating...')
        
        // Validate token with backend
        const isValid = await this.validateTokenWithBackend(storedAuth.token)
        
        if (isValid) {
          // Get fresh user data from backend
          const userData = await this.getUserDataFromBackend(storedAuth.token)
          
          if (userData) {
            this.authState = {
              isAuthenticated: true,
              user: userData,
              token: storedAuth.token
            }
            console.log('✅ Auth state restored successfully')
          } else {
            console.log('❌ Failed to get user data, clearing auth')
            await this.clearAuthState()
          }
        } else {
          console.log('❌ Stored token is invalid, clearing auth')
          await this.clearAuthState()
        }
      } else {
        console.log('📭 No stored auth data found')
      }
    } catch (error) {
      console.error('💥 Failed to initialize auth:', error)
      await this.clearAuthState()
    }
  }

  /**
   * Handle successful authentication
   */
  public async handleAuthSuccess(authData: AuthData): Promise<void> {
    console.log('🎉 Handling auth success')
    
    try {
      // Validate the new token with backend
      const isValid = await this.validateTokenWithBackend(authData.token)
      
      if (!isValid) {
        throw new Error('Token validation failed')
      }

      // Get user data from backend to ensure it's fresh
      const userData = await this.getUserDataFromBackend(authData.token)
      
      if (!userData) {
        throw new Error('Failed to get user data')
      }

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: userData,
        token: authData.token
      }

      // Save to secure storage
      await this.saveAuthState(authData)
      
      console.log('✅ Auth success handled successfully')
    } catch (error) {
      console.error('💥 Failed to handle auth success:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    console.log('👋 Logging out user')
    
    try {
      // Optional: Call backend logout endpoint if you have one
      // if (this.authState.token) {
      //   await this.callBackendLogout(this.authState.token)
      // }
      
      // Clear local state
      await this.clearAuthState()
      
      console.log('✅ Logout successful')
    } catch (error) {
      console.error('💥 Logout error:', error)
      // Still clear local state even if backend call fails
      await this.clearAuthState()
    }
  }

  /**
   * Get current auth state
   */
  public getAuthState(): AuthState {
    return { ...this.authState }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.token
  }

  /**
   * Get auth token for API calls
   */
  public getAuthToken(): string | null {
    return this.authState.token
  }

  /**
   * Get user data
   */
  public getUserData(): any {
    return this.authState.user
  }

  /**
   * Validate token with backend
   */
  private async validateTokenWithBackend(token: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.BACKEND_URL}/api/auth/verify-token`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      )

      return response.status === 200 && response.data?.success === true
    } catch (error) {
      console.error('🔍 Token validation failed:', error)
      return false
    }
  }

  /**
   * Get user data from backend
   */
  private async getUserDataFromBackend(token: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.BACKEND_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.status === 200 && response.data?.success === true) {
        return response.data.data
      }
      
      return null
    } catch (error) {
      console.error('👤 Failed to get user data:', error)
      return null
    }
  }

  /**
   * Save auth state to secure storage
   */
  private async saveAuthState(authData: AuthData): Promise<void> {
    try {
      const { safeStorage } = require('electron')
      
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️ Encryption not available, storing unencrypted')
      }

      const dataToStore = {
        token: authData.token,
        user: authData.user || this.authState.user,
        timestamp: Date.now(),
        expiresAt: authData.expiresAt
      }

      const jsonString = JSON.stringify(dataToStore)
      const dataToWrite = safeStorage.isEncryptionAvailable() 
        ? safeStorage.encryptString(jsonString)
        : Buffer.from(jsonString, 'utf8')

      // Save to app data directory
      const fs = require('fs')
      const path = require('path')
      const userDataPath = app.getPath('userData')
      const authFilePath = path.join(userDataPath, this.AUTH_FILE_NAME)
      
      fs.writeFileSync(authFilePath, dataToWrite)
      console.log('💾 Auth state saved successfully')
    } catch (error) {
      console.error('💥 Failed to save auth state:', error)
      throw error
    }
  }

  /**
   * Load auth state from secure storage
   */
  private async loadStoredAuth(): Promise<AuthData | null> {
    try {
      const fs = require('fs')
      const path = require('path')
      const { safeStorage } = require('electron')
      
      const userDataPath = app.getPath('userData')
      const authFilePath = path.join(userDataPath, this.AUTH_FILE_NAME)
      
      if (!fs.existsSync(authFilePath)) {
        return null
      }

      const encryptedData = fs.readFileSync(authFilePath)
      
      let jsonString: string
      if (safeStorage.isEncryptionAvailable()) {
        try {
          jsonString = safeStorage.decryptString(encryptedData)
        } catch (decryptError) {
          console.error('🔓 Decryption failed, treating as unencrypted:', decryptError)
          jsonString = encryptedData.toString('utf8')
        }
      } else {
        jsonString = encryptedData.toString('utf8')
      }

      const authData = JSON.parse(jsonString)

      // Check if data is too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000
      if (Date.now() - authData.timestamp > maxAge) {
        console.log('⏰ Stored auth data is too old, clearing')
        await this.clearStoredAuth()
        return null
      }

      return authData
    } catch (error) {
      console.error('💥 Failed to load stored auth:', error)
      // Clear corrupted data
      await this.clearStoredAuth()
      return null
    }
  }

  /**
   * Clear auth state (logout)
   */
  private async clearAuthState(): Promise<void> {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null
    }
    
    await this.clearStoredAuth()
  }

  /**
   * Clear stored auth data
   */
  private async clearStoredAuth(): Promise<void> {
    try {
      const fs = require('fs')
      const path = require('path')
      const userDataPath = app.getPath('userData')
      const authFilePath = path.join(userDataPath, this.AUTH_FILE_NAME)
      
      if (fs.existsSync(authFilePath)) {
        fs.unlinkSync(authFilePath)
        console.log('🗑️ Stored auth data cleared')
      }
    } catch (error) {
      console.error('💥 Failed to clear stored auth:', error)
    }
  }

  /**
   * Refresh token if supported by backend
   */
  public async refreshToken(): Promise<boolean> {
    if (!this.authState.token) {
      return false
    }

    try {
      const response = await axios.post(
        `${this.BACKEND_URL}/api/auth/refresh-token`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.authState.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.status === 200 && response.data?.success === true) {
        const newToken = response.data.data?.customToken
        
        if (newToken) {
          // Update stored token
          await this.saveAuthState({
            token: newToken,
            user: this.authState.user
          })
          
          this.authState.token = newToken
          console.log('🔄 Token refreshed successfully')
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('🔄 Token refresh failed:', error)
      return false
    }
  }
}