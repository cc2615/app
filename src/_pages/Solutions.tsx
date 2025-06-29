// Solutions.tsx
import React, { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "react-query"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import remarkGfm from "remark-gfm"
import ChatUI from "../components/Solutions/ChatUI"
import ScreenAnalysisDisplay from "../components/Solutions/ScreenAnalysisDisplay"

import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"
import { ProblemStatementData } from "../types/solutions"
import { AudioResult } from "../types/audio"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import Debug from "./Debug"
import type { ElectronAPI } from '../types/electron.d'

// (Using global ElectronAPI type from src/types/electron.d.ts)

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const ret = { ...obj }
  for (const key of keys) {
    delete ret[key]
  }
  return ret
}

export const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Extracting problem statement...
        </p>
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px] markdown-content">
        {typeof content === 'string' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                return !(node && "inline" in node && (node as any).inline) && match ? (
                  <SyntaxHighlighter
                    style={dracula as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: '0.5rem 0',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    {...omit(props, ['ref'])}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs" {...props}>
                    {children}
                  </code>
                )
              },
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-[13px]">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-300 mb-2">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          content
        )}
      </div>
    )}
  </div>
)

const SolutionSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="space-y-1.5">
        <div className="mt-4 flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Loading solutions...
          </p>
        </div>
      </div>
    ) : (
      <div className="w-full markdown-content">
        {typeof content === 'string' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                return !(node && "inline" in node && (node as any).inline) && match ? (
                  <SyntaxHighlighter
                    showLineNumbers
                    language={match[1]}
                    style={dracula as any}
                    customStyle={{
                      maxWidth: "100%",
                      margin: 0,
                      padding: "1rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all"
                    }}
                    wrapLongLines={true}
                    {...omit(props, ['ref'])}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-800 px-1 py-0.5 rounded text-xs" {...props}>
                    {children}
                  </code>
                )
              },
              p: ({ children }) => <p className="mb-2 text-[13px] leading-[1.4] text-gray-100">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-[13px] text-gray-100">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-white">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium mb-1 text-white">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-300 mb-2">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          content
        )}
      </div>
    )}
  </div>
)

export const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading
}: {
  timeComplexity: string | null
  spaceComplexity: string | null
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      Complexity (Updated)
    </h2>
    {isLoading ? (
      <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
        Calculating complexity...
      </p>
    ) : (
      <div className="space-y-1">
        <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
          <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          <div>
            <strong>Time:</strong> {timeComplexity}
          </div>
        </div>
        <div className="flex items-start gap-2 text-[13px] leading-[1.4] text-gray-100">
          <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
          <div>
            <strong>Space:</strong> {spaceComplexity}
          </div>
        </div>
      </div>
    )}
  </div>
)

interface SolutionsProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
}
const Solutions: React.FC<SolutionsProps> = ({ setView }) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  // Audio recording state
  const [audioRecording, setAudioRecording] = useState(false)
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null)

  const [debugProcessing, setDebugProcessing] = useState(false)
  const [problemStatementData, setProblemStatementData] =
    useState<ProblemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(
    null
  )
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(
    null
  )
  const [customContent, setCustomContent] = useState<string | null>(null)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  const [isResetting, setIsResetting] = useState(false)

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatting, setIsChatting] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [showScreenAnalysis, setShowScreenAnalysis] = useState(false)

  const { data: extraScreenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["extras"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading extra screenshots:", error)
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch() // Refetch screenshots instead of managing state directly
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
    }
  }

  useEffect(() => {
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => {
        // Set resetting state first
        setIsResetting(true)

        // Clear the queries
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["new_solution"])

        // Reset other states
        refetch()

        // After a small delay, clear the resetting state
        setTimeout(() => {
          setIsResetting(false)
        }, 0)
      }),
      window.electronAPI.onSolutionStart(async () => {
        // Reset UI state for a new solution
        setSolutionData(null)
        setThoughtsData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
        setCustomContent(null)
        setAudioResult(null)

        // Start audio recording from user's microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const mediaRecorder = new MediaRecorder(stream)
          const chunks: Blob[] = []
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
          mediaRecorder.start()
          setAudioRecording(true)
          // Record for 5 seconds (or adjust as needed)
          setTimeout(() => mediaRecorder.stop(), 5000)
          mediaRecorder.onstop = async () => {
            setAudioRecording(false)
            const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
            const reader = new FileReader()
            reader.onloadend = async () => {
              const base64Data = (reader.result as string).split(',')[1]
              // Send audio to Gemini for analysis
              try {
                const result = await window.electronAPI.analyzeAudioFromBase64(
                  base64Data,
                  blob.type
                )
                // Store result in react-query cache
                queryClient.setQueryData(["audio_result"], result)
                setAudioResult(result)
              } catch (err) {
                console.error('Audio analysis failed:', err)
              }
            }
            reader.readAsDataURL(blob)
          }
        } catch (err) {
          console.error('Audio recording error:', err)
        }

        // Simulate receiving custom content shortly after start
        setTimeout(() => {
          setCustomContent(
            "This is the dynamically generated content appearing after loading starts."
          )
        }, 1500) // Example delay
      }),
      //if there was an error processing the initial solution
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your extra screenshots.",
          "error"
        )
        // Reset solutions in the cache (even though this shouldn't ever happen) and complexities to previous states
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null
        if (!solution) {
          setView("queue") //make sure that this is correct. or like make sure there's a toast or something
        }
        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        setTimeComplexityData(solution?.time_complexity || null)
        setSpaceComplexityData(solution?.space_complexity || null)
        console.error("Processing error:", error)
      }),
      //when the initial solution is generated, we'll set the solution data to that
      window.electronAPI.onSolutionSuccess((data) => {
        if (!data?.solution) {
          console.warn("Received empty or invalid solution data")
          return
        }

        console.log({ solution: data.solution })

        const solutionData = {
          code: data.solution.code,
          thoughts: data.solution.thoughts,
          time_complexity: data.solution.time_complexity,
          space_complexity: data.solution.space_complexity
        }

        queryClient.setQueryData(["solution"], solutionData)
        setSolutionData(solutionData.code || null)
        setThoughtsData(solutionData.thoughts || null)
        setTimeComplexityData(solutionData.time_complexity || null)
        setSpaceComplexityData(solutionData.space_complexity || null)
      }),

      //########################################################
      //DEBUG EVENTS
      //########################################################
      window.electronAPI.onDebugStart(() => {
        //we'll set the debug processing state to true and use that to render a little loader
        setDebugProcessing(true)
      }),
      //the first time debugging works, we'll set the view to debug and populate the cache with the data
      window.electronAPI.onDebugSuccess((data) => {
        console.log({ debug_data: data })

        queryClient.setQueryData(["new_solution"], data.solution)
        setDebugProcessing(false)
      }),
      //when there was an error in the initial debugging, we'll show a toast and stop the little generating pulsing thing.
      window.electronAPI.onDebugError(() => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setDebugProcessing(false)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no extra screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    setSolutionData(queryClient.getQueryData(["solution"]) || null)

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
        // If this is from audio processing, show it in the custom content section
        const audioResult = queryClient.getQueryData(["audio_result"]) as AudioResult | undefined;
        if (audioResult) {
          // Update all relevant sections when audio result is received
          setProblemStatementData({
            problem_statement: audioResult.text,
            input_format: {
              description: "Generated from audio input",
              parameters: []
            },
            output_format: {
              description: "Generated from audio input",
              type: "string",
              subtype: "text"
            },
            complexity: {
              time: "N/A",
              space: "N/A"
            },
            test_cases: [],
            validation_type: "manual",
            difficulty: "custom"
          });
          setSolutionData(null); // Reset solution to trigger loading state
          setThoughtsData(null);
          setTimeComplexityData(null);
          setSpaceComplexityData(null);
        }
      }
      if (event?.query.queryKey[0] === "solution") {
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        setSolutionData(solution?.code ?? null)
        setThoughtsData(solution?.thoughts ?? null)
        setTimeComplexityData(solution?.time_complexity ?? null)
        setSpaceComplexityData(solution?.space_complexity ?? null)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  // Robustly reset and initialize chat state whenever a new solution is generated
  useEffect(() => {
    if (!solutionData) return;
    // Always clear chat state first
    setChatHistory([]);
    setIsChatting(false);
    setChatInput("");
    setChatLoading(false);

    // Use a microtask to ensure state is cleared before initializing
    setTimeout(() => {
      // Always show chat when solutionData exists
      if (chatHistory.length === 0) {
        if (problemStatementData?.validation_type === 'manual' && problemStatementData?.problem_statement) {
          setChatHistory([
            { role: 'user', content: problemStatementData.problem_statement },
            { role: 'ai', content: solutionData }
          ]);
        } else {
          setChatHistory([{ role: 'ai', content: solutionData }]);
        }
      }
      setIsChatting(true);
    }, 0);
  }, [solutionData]);

  // Handler for sending a follow-up chat message
 const handleSendChat = useCallback(async () => {
  if (!chatInput.trim()) return;

  setChatLoading(true);
  const userMessage = { role: 'user' as const, content: chatInput };
  const contextMessages: { role: 'user' | 'ai'; content: string }[] = [];
  if (problemStatementData?.validation_type === 'manual' && problemStatementData.problem_statement) {
    contextMessages.push({
      role: 'user',
      content: `This was extracted from the screenshot:\n${problemStatementData.problem_statement}`
    });
  }

  // initial solution
  if (solutionData) {
    contextMessages.push({
      role: 'ai',
      content: `Here is the AI's original solution:\n${solutionData}`
    });
  }

  // thoughts / analysis
  if (thoughtsData?.length) {
    contextMessages.push({
      role: 'ai',
      content: `AI analysis:\n${thoughtsData.map(t => `• ${t}`).join('\n')}`
    });
  }

  // combine once-off context, full chat history, and current user message
  const fullChatHistory = [...contextMessages, ...chatHistory, userMessage];

  setChatHistory(prev => [...prev, userMessage]);
  setChatInput("");

  try {
    // Extract detailed analysis if available
    const detailedAnalysis = problemStatementData?.input_format?.detailed_analysis || 
                            problemStatementData?.ui_elements || 
                            problemStatementData?.text_content || 
                            problemStatementData?.visual_elements || 
                            problemStatementData?.layout_info;

    const aiReply = await (window.electronAPI as ElectronAPI).aiChatFollowup(fullChatHistory, detailedAnalysis);
    setChatHistory(prev => [...prev, { role: 'ai', content: aiReply.text }]);
  } catch (err) {
    console.error("AI chat follow-up failed:", err);
    setChatHistory(prev => [...prev, { role: 'ai', content: 'Error: Could not get AI response.' }]);
  }

  setChatLoading(false);
}, [chatInput, chatHistory, solutionData, thoughtsData, problemStatementData]);


  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <>
      {!isResetting && queryClient.getQueryData(["new_solution"]) ? (
        <>
          <Debug
            isProcessing={debugProcessing}
            setIsProcessing={setDebugProcessing}
          />
        </>
      ) : (
        <div ref={contentRef} className="relative space-y-3 px-4 py-3">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>

          {/* Conditionally render the screenshot queue if solutionData is available */}
          {solutionData && (
            <div className="bg-transparent w-fit">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={debugProcessing}
                    screenshots={extraScreenshots}
                    onDeleteScreenshot={handleDeleteExtraScreenshot}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navbar of commands with the SolutionsHelper */}
          <SolutionCommands
            extraScreenshots={extraScreenshots}
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
          />

          {/* Main Content - Modified width constraints */}
          <div className="w-full text-sm text-black bg-black/60 rounded-md">
            <div className="rounded-lg overflow-hidden">
              <div className="px-4 py-3 space-y-4 max-w-full">
                {/* Show Screenshot or Audio Result as main output if validation_type is manual */}
                {problemStatementData?.validation_type === "manual" ? (
                  <ContentSection
                    title={problemStatementData?.output_format?.subtype === "voice" ? "Audio Result" : "Screenshot Result"}
                    content={problemStatementData.problem_statement}
                    isLoading={false}
                  />
                ) : (
                  <>
                    {/* Problem Statement Section - Only for non-manual */}
                    <ContentSection
                      title={problemStatementData?.output_format?.subtype === "voice" ? "Voice Input" : "Problem Statement"}
                      content={problemStatementData?.problem_statement}
                      isLoading={!problemStatementData}
                    />
                    {/* Show loading state when waiting for solution */}
                    {problemStatementData && !solutionData && (
                      <div className="mt-4 flex">
                        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                          {problemStatementData?.output_format?.subtype === "voice" 
                            ? "Processing voice input..." 
                            : "Generating solutions..."}
                        </p>
                      </div>
                    )}
                    {/* Solution Sections (legacy, only for non-manual) */}
                    {solutionData && (
                      <>
                        <ContentSection
                          title="Analysis"
                          content={
                            thoughtsData && (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  {thoughtsData.map((thought, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                                      <div>{thought}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          isLoading={!thoughtsData}
                        />
                        <SolutionSection
                          title={problemStatementData?.output_format?.subtype === "voice" ? "Response" : "Solution"}
                          content={solutionData}
                          isLoading={!solutionData}
                        />
                        {problemStatementData?.output_format?.subtype !== "voice" && (
                          <ComplexitySection
                            timeComplexity={timeComplexityData}
                            spaceComplexity={spaceComplexityData}
                            isLoading={!timeComplexityData || !spaceComplexityData}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* screen Analysis Display --- show when detailed analysis is available */}
          {problemStatementData?.validation_type === "manual" && problemStatementData?.input_format?.detailed_analysis && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-medium text-white tracking-wide">
                  Detailed Screen Analysis
                </h2>
                <button
                  onClick={() => setShowScreenAnalysis(!showScreenAnalysis)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition-colors"
                >
                  {showScreenAnalysis ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              <ScreenAnalysisDisplay
                analysis={problemStatementData.input_format.detailed_analysis}
                isVisible={showScreenAnalysis}
              />
            </div>
          )}

          {(solutionData || (problemStatementData?.validation_type === "manual" && problemStatementData?.problem_statement)) && (
            <div className="w-full">
              <ChatUI
                chatHistory={chatHistory}
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatLoading={chatLoading}
                handleSendChat={handleSendChat}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Solutions