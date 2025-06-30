import React, { useState, useEffect, useRef } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { IoLogOutOutline } from "react-icons/io5"

interface AuthScreenProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  onTooltipVisibilityChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
        onTooltipVisibilityChange(false, 0)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onTooltipVisibilityChange])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
    console.log('Login button clicked!')
      // Open browser to login page
      const result = await window.electronAPI.openLoginUrl()
      if (!result.success) {
        console.error('Failed to open login URL:', result.error)
        setIsLoading(false)
      }
      // Keep loading state - it will be cleared when auth completes or fails
    } catch (error) {
      console.error('Failed to open login URL:', error)
      setIsLoading(false)
    }
  }

  const handleMenuToggle = () => {
    const newMenuState = !isMenuOpen
    setIsMenuOpen(newMenuState)
    onTooltipVisibilityChange(newMenuState, newMenuState ? 150 : 0)
  }

  return (
    <div className="pt-2 w-fit">
      <div className="text-xs text-white/90 backdrop-blur-md bg-black/70 rounded-2xl py-2 px-4 flex items-center justify-center gap-8">
        {/* Login Button */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 transition-colors rounded-lg px-4 py-2 text-sm leading-none text-white/90 disabled:text-white/50 disabled:cursor-not-allowed"
            onClick={handleLogin}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"></div>
                <span>Opening...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </div>

        {/* Three Dots Menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="text-white/70 hover:text-white/90 transition-colors hover:cursor-pointer"
            onClick={handleMenuToggle}
          >
            <BsThreeDotsVertical className="w-3 h-3" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-32">
              <div className="p-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 text-xs text-red-500/70 hover:text-red-500/90 hover:bg-red-500/10 rounded transition-colors"
                  onClick={() => {
                    window.electronAPI.quitApp()
                    setIsMenuOpen(false)
                    onTooltipVisibilityChange(false, 0)
                  }}
                >
                  <IoLogOutOutline className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthScreen