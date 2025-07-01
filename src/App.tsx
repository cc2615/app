import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"
import AuthScreen from "./components/Auth/AuthScreen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue")
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check auth state on app startup
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { isAuthenticated, user } = await window.electronAPI.getAuthState()
        console.log('Initial auth state:', { isAuthenticated, user })
        
        if (isAuthenticated && user) {
          setAuthState("authenticated")
          setUser(user)
          console.log('User automatically logged in:', user.email || 'Unknown')
        } else {
          setAuthState("unauthenticated")
        }
      } catch (error) {
        console.error("Failed to get auth state:", error)
        setAuthState("unauthenticated")
      }
    }

    checkAuthState()
  }, [])

  // Auth event listeners
  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onAuthSuccess((data) => {
        console.log("Auth success:", data)
        setAuthState("authenticated")
        setUser(data.user)
        setAuthError(null)
      }),

      window.electronAPI.onAuthError((data) => {
        console.error("Auth error:", data.error)
        setAuthError(data.error)
        setAuthState("unauthenticated")
      }),

      window.electronAPI.onAuthStateChanged((data) => {
        console.log("Auth state changed:", data)
        if (data.isAuthenticated) {
          setAuthState("authenticated")
        } else {
          setAuthState("unauthenticated")
          setUser(null)
        }
      }),

      window.electronAPI.onAuthLogout(() => {
        console.log("User logged out")
        setAuthState("unauthenticated")
        setUser(null)
        setAuthError(null)
        // Clear all app data
        queryClient.clear()
        setView("queue")
      })
    ]

    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  // Effect for height monitoring
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process.")
      queryClient.invalidateQueries(["screenshots"])
      queryClient.invalidateQueries(["problem_statement"])
      queryClient.invalidateQueries(["solution"])
      queryClient.invalidateQueries(["new_solution"])
      setView("queue")
    })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      const width = containerRef.current.scrollWidth
      window.electronAPI?.updateContentDimensions({ width, height })
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view, authState]) // Re-run when view or auth state changes

  // App functionality event listeners (only when authenticated)
  useEffect(() => {
    if (authState !== "authenticated") return

    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions")
        console.log("starting processing")
      }),

      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("Unauthorized - logging out")
        // Trigger logout
        window.electronAPI.logout()
      }),

      window.electronAPI.onResetView(() => {
        console.log("Received 'reset-view' message from main process")
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("View reset to 'queue' via Command+R shortcut")
      }),

      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          console.log("Problem extracted successfully")
          queryClient.invalidateQueries(["problem_statement"])
          queryClient.setQueryData(["problem_statement"], data)
        }
      })
    ]
    
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [authState, view]) // Only setup when authenticated

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    // Handle tooltip visibility changes if needed
    console.log("Tooltip visibility:", visible, "height:", height)
  }

  // Show loading state
  if (authState === "loading") {
    return (
      <div ref={containerRef} className="min-h-0">
        <div className="flex items-center justify-center min-h-[100px]">
          <div className="text-white/70 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  // Show auth screen if not authenticated
  if (authState === "unauthenticated") {
    return (
      <div ref={containerRef} className="min-h-0">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <div className="flex flex-col items-center justify-center min-h-[150px] p-4">
              <AuthScreen onTooltipVisibilityChange={handleTooltipVisibilityChange} />
              {authError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm max-w-md text-center">
                  {authError}
                </div>
              )}
            </div>
            <ToastViewport />
          </ToastProvider>
        </QueryClientProvider>
      </div>
    )
  }

  // Show main app when authenticated
  return (
    <div ref={containerRef} className="min-h-0">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {view === "queue" ? (
            <Queue setView={setView} />
          ) : view === "solutions" ? (
            <Solutions setView={setView} />
          ) : (
            <></>
          )}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App