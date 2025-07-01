export interface ElectronAPI {
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  takeScreenshot: () => Promise<void>
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  analyzeAudioFromBase64: (data: string, mimeType: string, duration?: string) => Promise<{ text: string; timestamp: number }>
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>
  analyzeImageFile: (path: string) => Promise<{ text: string; detailed_analysis: any; timestamp: number }>
  quitApp: () => Promise<void>
  aiChatFollowup: (chatHistory: { role: 'user' | 'ai', content: string }[], detailedAnalysis?: any) => Promise<{ text: string }>
  refreshContext: () => Promise<{ success: boolean; error?: string }>
  
  // Add these missing auth methods:
  getAuthState: () => Promise<{ isAuthenticated: boolean; user: any }>
  openLoginUrl: () => Promise<{ success: boolean; error?: string }>
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<{ success: boolean; error?: string }>
  
  // Auth event listeners
  onAuthSuccess: (callback: (data: { user: any; token: string }) => void) => () => void
  onAuthError: (callback: (data: { error: string }) => void) => () => void
  onAuthStateChanged: (callback: (data: { isAuthenticated: boolean }) => void) => () => void
  onAuthLogout: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 