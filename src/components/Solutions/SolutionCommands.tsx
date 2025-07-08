// src/components/Solutions/SolutionCommands.tsx

import React, { useState, useEffect, useRef } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { IoLogOutOutline } from "react-icons/io5"

interface SolutionCommandsProps {
  extraScreenshots: any[]
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  extraScreenshots
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setRecordingTime(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleRecordClick = async () => {
  if (!isRecording) {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      let capturedDuration = 0;  // ✅ ADD THIS
      recorder.ondataavailable = (e) => chunks.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
        chunks.current = []
        
        // Calculate duration from captured time
        const durationString = formatTime((recorder as any).capturedDuration || 0)  // ✅ CHANGE THIS
                  
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type, durationString)
              setAudioResult(result.text)
            } catch (err) {
              setAudioResult('Audio analysis failed.')
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording.')
      }
    } else {
      // Stop recording
      if (mediaRecorder) {
        // Capture duration before stopping
        (mediaRecorder as any).capturedDuration = recordingTime;  // ✅ ADD THIS
        mediaRecorder.stop()
      }
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const handleRefreshContext = async () => {
    try {
      const result = await window.electronAPI.refreshContext()
      if (result.success) {
        console.log('Context refreshed successfully')
      } else {
        console.error('Failed to refresh context:', result.error)
      }
    } catch (error) {
      console.error('Error refreshing context:', error)
    }
    setIsMenuOpen(false)
  }

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-8">
          {/* Screenshot */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none truncate"> Ask AI</span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                H
              </button>
            </div>
          </div>

          {/* Show/Hide */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none">Show/Hide</span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                B
              </button>
            </div>
          </div>

          {/* Debug Command - Show only when screenshots exist */}
          {extraScreenshots.length > 0 && (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-[11px] leading-none">Debug</span>
              <div className="flex gap-1">
                <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  ⌘
                </button>
                <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  ↵
                </button>
              </div>
            </div>
          )}

          {/* Start Over */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] leading-none">Start over</span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                R
              </button>
            </div>
          </div>

          {/* Timer (Voice Recording) */}
          <div className="flex items-center gap-1">
            {isRecording ? (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            ) : (
              <svg className="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1c-1.66 0-3 1.34-3 3v8c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3zm6.5 9c0 3.59-2.91 6.5-6.5 6.5S5.5 13.59 5.5 10H4c0 4.27 3.18 7.83 7.5 8.46v2.54h-2v1.5h5.5V21h-2v-2.54c4.32-.63 7.5-4.19 7.5-8.46h-1.5z"/>
              </svg>
            )}
            <button
              className="text-[11px] leading-none text-white/70 hover:text-white/90 transition-colors"
              onClick={handleRecordClick}
              type="button"
            >
              {isRecording ? formatTime(recordingTime) : "00:00"}
            </button>
          </div>

          {/* Three Dots Menu */}
          <div className="relative z-50" ref={menuRef}>
            <button
              className="text-white/70 hover:text-white/90 transition-colors hover:cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <BsThreeDotsVertical className="w-3 h-3" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 z-[9999]">
                <div className="p-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-lg relative z-[9999]">
                  {/* Refresh Context Button */}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1 text-xs text-white/70 hover:text-white/90 hover:bg-white/10 rounded transition-colors mb-1"
                    onClick={handleRefreshContext}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh Context</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1 text-xs text-yellow-500/70 hover:text-yellow-500/90 hover:bg-yellow-500/10 rounded transition-colors mb-1"
                    onClick={async () => {
                      try {
                        await window.electronAPI.logout()
                        console.log('User logged out')
                      } catch (error) {
                        console.error('Logout failed:', error)
                      }
                      setIsMenuOpen(false)
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>

                  {/* Close Button */}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1 text-xs text-red-500/70 hover:text-red-500/90 hover:bg-red-500/10 rounded transition-colors"
                    onClick={() => {
                      window.electronAPI.quitApp()
                      setIsMenuOpen(false)
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

      {/* Audio Result Display */}
      {audioResult && (
        <div className="mt-2 backdrop-blur-md bg-black/60 rounded-lg border border-white/10 p-3 max-w-md">
          <span className="font-semibold text-white text-xs">Audio Result:</span> 
          <span className="text-white/90 text-xs ml-1">{audioResult}</span>
        </div>
      )}
      </div>
    </div>
  )
}

export default SolutionCommands