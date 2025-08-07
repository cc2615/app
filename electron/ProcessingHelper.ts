// ProcessingHelper.ts

import { AppState } from "./main"
import { LLMHelper } from "./LLMHelper"
import dotenv from "dotenv"

dotenv.config()

const isDev = process.env.NODE_ENV === "development"
const isDevTest = process.env.IS_DEV_TEST === "true"
const MOCK_API_WAIT_TIME = Number(process.env.MOCK_API_WAIT_TIME) || 500

export class ProcessingHelper {
  private appState: AppState
  private llmHelper: LLMHelper
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables")
    }
    this.llmHelper = new LLMHelper(apiKey)
    
    // Set auth token if available
    this.updateAuthToken()
  }

  // Update auth token in LLMHelper
  private updateAuthToken(): void {
    const authToken = this.appState.getAuthToken()
    if (authToken) {
      console.log("[ProcessingHelper] Setting auth token for context fetching")
      this.llmHelper.setAuthToken(authToken)
    }
  }

  // Refresh context cache
  public refreshContext(): void {
    console.log("[ProcessingHelper] Refreshing context cache")
    this.llmHelper.clearContextCache()
    // Update auth token in case it changed
    this.updateAuthToken()
  }

  public async processScreenshots(): Promise<void> {
    console.log('[ProcessingHelper] processScreenshots called');
    const mainWindow = this.appState.getMainWindow()
    if (!mainWindow) {
      console.log('[ProcessingHelper] No mainWindow, returning');
      return
    }

    // Update auth token before processing
    this.updateAuthToken()

    const view = this.appState.getView()
    console.log('[ProcessingHelper] Current view:', view);

    if (view === "queue") {
      const screenshotQueue = this.appState.getScreenshotHelper().getScreenshotQueue()
      console.log('[ProcessingHelper] Screenshot queue:', screenshotQueue);
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS)
        console.log('[ProcessingHelper] No screenshots, returning');
        return
      }

      // Check if last screenshot is an audio file
      const allPaths = this.appState.getScreenshotHelper().getScreenshotQueue();
      const lastPath = allPaths[allPaths.length - 1];
      console.log('[ProcessingHelper] Last path:', lastPath);
      if (lastPath.endsWith('.mp3') || lastPath.endsWith('.wav')) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START);
        this.appState.setView('solutions');
        try {
          console.log('[ProcessingHelper] Calling analyzeAudioFile');
          const audioResult = await this.llmHelper.analyzeAudioFile(lastPath);
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, audioResult);
          this.appState.setProblemInfo({ problem_statement: audioResult.text, input_format: {}, output_format: {}, constraints: [], test_cases: [] });
          return;
        } catch (err: any) {
          console.error('Audio processing error:', err);
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, err.message);
          return;
        }
      }

      // NEW: Handle screenshot as plain text (like audio)
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START)
      this.appState.setView("solutions")
      this.currentProcessingAbortController = new AbortController()
      try {
        console.log('[ProcessingHelper] Calling analyzeImageFile');
        const imageResult = await this.llmHelper.analyzeImageFile(lastPath);
        console.log('[ProcessingHelper] analyzeImageFile result:', imageResult);
        // create enhanced problem info with detailed analysis
        const problemInfo = {
          problem_statement: imageResult.text,
          input_format: { 
            description: "Generated from screenshot", 
            parameters: [] as any[],
            detailed_analysis: imageResult.detailed_analysis // Include the detailed analysis
          },
          output_format: { description: "Generated from screenshot", type: "string", subtype: "text" },
          complexity: { time: "N/A", space: "N/A" },
          test_cases: [] as any[],
          validation_type: "manual",
          difficulty: "custom",
          // add new fields for detailed analysis
          ui_elements: imageResult.detailed_analysis.ui_elements,
          text_content: imageResult.detailed_analysis.text_content,
          visual_elements: imageResult.detailed_analysis.visual_elements,
          layout_info: imageResult.detailed_analysis.layout_info,
          context: imageResult.detailed_analysis.context,
          user_actions_needed: imageResult.detailed_analysis.user_actions_needed,
          technical_details: imageResult.detailed_analysis.technical_details
        };
        console.log('[ProcessingHelper] Created problemInfo:', problemInfo);
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo);
        this.appState.setProblemInfo(problemInfo);
      } catch (error: any) {
        console.error("Image processing error:", error)
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error.message)
      } finally {
        this.currentProcessingAbortController = null
      }
      return;
    } else {
      // Debug mode
      const extraScreenshotQueue = this.appState.getScreenshotHelper().getExtraScreenshotQueue()
      console.log('[ProcessingHelper] Extra screenshot queue:', extraScreenshotQueue);
      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process")
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START)
      this.currentExtraProcessingAbortController = new AbortController()

      try {
        // Get problem info and current solution
        const problemInfo = this.appState.getProblemInfo()
        console.log('[ProcessingHelper] Problem info:', problemInfo);
        if (!problemInfo) {
          throw new Error("No problem info available")
        }

        // Get current solution from state
        console.log('[ProcessingHelper] Calling generateSolution');
        const currentSolution = await this.llmHelper.generateSolution(problemInfo)
        console.log('[ProcessingHelper] generateSolution result:', currentSolution);
        const currentCode = currentSolution.solution.code

        // Debug the solution using vision model
        console.log('[ProcessingHelper] Calling debugSolutionWithImages');
        const debugResult = await this.llmHelper.debugSolutionWithImages(
          problemInfo,
          currentCode,
          extraScreenshotQueue
        )
        console.log('[ProcessingHelper] debugSolutionWithImages result:', debugResult);

        this.appState.setHasDebugged(true)
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS,
          debugResult
        )

      } catch (error: any) {
        console.error("Debug processing error:", error)
        mainWindow.webContents.send(
          this.appState.PROCESSING_EVENTS.DEBUG_ERROR,
          error.message
        )
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  public cancelOngoingRequests(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
    }

    this.appState.setHasDebugged(false)
  }

  public async processAudioBase64(data: string, mimeType: string, duration?: string) {
    // Update auth token before processing
    this.updateAuthToken()
    // Directly use LLMHelper to analyze inline base64 audio
    return this.llmHelper.analyzeAudioFromBase64(data, mimeType, duration);
  }
  
  // Add audio file processing method
  public async processAudioFile(filePath: string) {
    // Update auth token before processing
    this.updateAuthToken()
    return this.llmHelper.analyzeAudioFile(filePath);
  }

  public getLLMHelper() {
    return this.llmHelper;
  }
}