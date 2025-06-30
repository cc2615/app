import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AIContext {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastUsed: string;
  isActive: boolean;
  settings: any;
}

interface ContextCache {
  context: string;
  timestamp: number;
}

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are Wingman AI, a direct problem-solving assistant. When given a task, solve it immediately and concisely. Don't suggest external tools - you ARE the tool. Be brief and actionable.`
  
  // Context caching
  private contextCache: ContextCache | null = null
  private readonly CONTEXT_CACHE_TTL = 2 * 60 * 1000 // 2 minutes
  private authToken: string | null = null

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    console.log("[LLMHelper] Initialized with Gemini 2.0 Flash")
  }

  // Set auth token for API calls
  public setAuthToken(token: string): void {
    this.authToken = token
    console.log("[LLMHelper] Auth token set for context fetching")
  }

  // Clear context cache (for refresh button)
  public clearContextCache(): void {
    this.contextCache = null
    console.log("[LLMHelper] Context cache cleared")
  }

  // Fetch active context from website backend
  private async fetchActiveContext(): Promise<string> {
    if (!this.authToken) {
      console.log("[LLMHelper] No auth token available for context fetch - continuing without context")
      return ""
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'https://paradigm-backend.vercel.app'
      console.log("[LLMHelper] Fetching context from:", `${backendUrl}/api/contexts?isActive=true&limit=1`)
      console.log("[LLMHelper] About to fetch with token:", this.authToken ? 'TOKEN_SET' : 'NO_TOKEN')
      console.log("[LLMHelper] Auth header will be:", `Bearer ${this.authToken}`)

      const response = await fetch(`${backendUrl}/api/contexts?isActive=true&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log("[LLMHelper] Context fetch response status:", response.status)

      if (!response.ok) {
        console.warn("[LLMHelper] Failed to fetch active context:", response.status, response.statusText)
        return ""
      }

      const data = await response.json()
      console.log("[LLMHelper] Context fetch response data:", data)
      
      if (data.success && data.data.contexts && data.data.contexts.length > 0) {
        const context: AIContext = data.data.contexts[0]
        console.log("[LLMHelper] Fetched active context:", context.title)
        const contextString = `ACTIVE CONTEXT: ${context.title}\n${context.description}\nCategory: ${context.category}\n\n`
        console.log("[LLMHelper] Full context string:", contextString)
        return contextString
      } else {
        console.log("[LLMHelper] No active context found")
        return ""
      }
    } catch (error) {
      console.error("[LLMHelper] Error fetching active context:", error)
      return ""
    }
  }

  // Get active context with caching
  private async getActiveContext(): Promise<string> {
    const now = Date.now()
    
    // Check cache first
    if (this.contextCache && (now - this.contextCache.timestamp) < this.CONTEXT_CACHE_TTL) {
      console.log("[LLMHelper] Using cached context")
      console.log("[LLMHelper] Cached context string:", this.contextCache.context)
      return this.contextCache.context
    }

    // Fetch fresh context
    console.log("[LLMHelper] Fetching fresh context...")
    const context = await this.fetchActiveContext()
    console.log("[LLMHelper] Fresh context string:", context)
    
    // Update cache
    this.contextCache = {
      context,
      timestamp: now
    }

    return context
  }

  private async fileToGenerativePart(imagePath: string) {
    console.log("[LLMHelper] Converting image to generative part:", imagePath)
    const imageData = await fs.promises.readFile(imagePath)
    console.log("[LLMHelper] Image data read, size:", imageData.length, "bytes")
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    console.log("[LLMHelper] Starting extractProblemFromImages with", imagePaths.length, "images")
    try {
      console.log("[LLMHelper] Converting images to generative parts...")
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      console.log("[LLMHelper] Image parts created successfully")
      
      const prompt = `Analyze these images comprehensively and extract ALL visible information in JSON format:

{
  "main_problem": "The primary problem or question to solve",
  "ui_elements": [
    {
      "type": "button|text|input|image|icon|menu|tab|link|form|table|list|chart|graph|video|audio|other",
      "text": "Visible text content",
      "position": "top|bottom|left|right|center|top-left|top-right|bottom-left|bottom-right",
      "description": "What this element does or represents",
      "interactive": true|false,
      "state": "enabled|disabled|active|inactive|selected|unselected|hovered|focused|error|success|warning|info"
    }
  ],
  "text_content": [
    {
      "content": "Exact text as shown",
      "type": "heading|paragraph|label|button_text|error_message|success_message|instruction|help_text|placeholder|other",
      "importance": "high|medium|low",
      "context": "What this text relates to"
    }
  ],
  "visual_elements": [
    {
      "type": "image|icon|logo|chart|graph|diagram|screenshot|video_thumbnail|avatar|banner|other",
      "description": "What this visual element shows",
      "purpose": "decorative|functional|informational|branding|navigation|other"
    }
  ],
  "layout_info": {
    "page_title": "Title of the page/window",
    "current_view": "What view or section is currently shown",
    "navigation_elements": ["Menu items", "Breadcrumbs", "Tabs", "Buttons"],
    "form_fields": ["Input fields present"],
    "action_buttons": ["Primary actions available"]
  },
  "context": "Overall context of what this screen is for",
  "user_actions_needed": ["What actions the user might need to take"],
  "technical_details": {
    "platform": "web|desktop|mobile|tablet|other",
    "application": "What application this appears to be",
    "theme": "light|dark|custom",
    "responsive": true|false
  }
}

Be extremely thorough - capture every single visible element, text, button, and detail from all images. Don't miss anything. Return only the JSON object.`

      console.log("[LLMHelper] Sending request to Gemini for image analysis...")
      const fullPrompt = [prompt, ...imageParts]
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", fullPrompt)
      const result = await this.model.generateContent(fullPrompt)
      console.log("[LLMHelper] Received response from Gemini for image analysis")
      
      const response = await result.response
      console.log("[LLMHelper] Extracted response text")
      
      const text = this.cleanJsonResponse(response.text())
      console.log("[LLMHelper] Cleaned JSON response, parsing...")
      
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Successfully parsed JSON response")
      
      return {
        problem_statement: parsed.main_problem || "No main problem identified",
        context: parsed.context || "No context provided",
        suggested_responses: parsed.user_actions_needed || ["Analyze further", "Take action", "Review details"],
        reasoning: "Comprehensive analysis of all visible elements",
        detailed_analysis: parsed
      }
    } catch (error) {
      console.error("[LLMHelper] Error in extractProblemFromImages:", error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    console.log("[LLMHelper] Starting generateSolution...")
    
    // Get active context
    console.log("[LLMHelper] Fetching active context...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched, length:", activeContext.length)
    
    // Extract detailed analysis if available
    const detailedAnalysis = problemInfo.input_format?.detailed_analysis || 
                            problemInfo.ui_elements || 
                            problemInfo.text_content || 
                            problemInfo.visual_elements || 
                            problemInfo.layout_info;

    console.log("[LLMHelper] Building context info from detailed analysis...")
    // Build context from detailed analysis
    let contextInfo = "";
    if (detailedAnalysis) {
      contextInfo = "\n\nDETAILED SCREEN ANALYSIS:\n";
      
      // Add UI elements context
      if (detailedAnalysis.ui_elements && detailedAnalysis.ui_elements.length > 0) {
        contextInfo += "\nUI ELEMENTS FOUND:\n";
        detailedAnalysis.ui_elements.forEach((element: any, index: number) => {
          contextInfo += `- ${element.type}${element.text ? `: "${element.text}"` : ''}${element.state ? ` (${element.state})` : ''}${element.interactive ? ' [Interactive]' : ''}\n`;
        });
      }

      // Add text content context
      if (detailedAnalysis.text_content && detailedAnalysis.text_content.length > 0) {
        contextInfo += "\nTEXT CONTENT:\n";
        detailedAnalysis.text_content.forEach((text: any, index: number) => {
          contextInfo += `- ${text.type} (${text.importance}): "${text.content}"${text.context ? ` - ${text.context}` : ''}\n`;
        });
      }

      // Add visual elements context
      if (detailedAnalysis.visual_elements && detailedAnalysis.visual_elements.length > 0) {
        contextInfo += "\nVISUAL ELEMENTS:\n";
        detailedAnalysis.visual_elements.forEach((element: any, index: number) => {
          contextInfo += `- ${element.type} (${element.purpose})${element.description ? `: ${element.description}` : ''}\n`;
        });
      }

      // Add layout information
      if (detailedAnalysis.layout_info) {
        contextInfo += "\nLAYOUT INFORMATION:\n";
        if (detailedAnalysis.layout_info.page_title) {
          contextInfo += `- Page Title: ${detailedAnalysis.layout_info.page_title}\n`;
        }
        if (detailedAnalysis.layout_info.current_view) {
          contextInfo += `- Current View: ${detailedAnalysis.layout_info.current_view}\n`;
        }
        if (detailedAnalysis.layout_info.navigation_elements && detailedAnalysis.layout_info.navigation_elements.length > 0) {
          contextInfo += `- Navigation: ${detailedAnalysis.layout_info.navigation_elements.join(', ')}\n`;
        }
        if (detailedAnalysis.layout_info.form_fields && detailedAnalysis.layout_info.form_fields.length > 0) {
          contextInfo += `- Form Fields: ${detailedAnalysis.layout_info.form_fields.join(', ')}\n`;
        }
        if (detailedAnalysis.layout_info.action_buttons && detailedAnalysis.layout_info.action_buttons.length > 0) {
          contextInfo += `- Action Buttons: ${detailedAnalysis.layout_info.action_buttons.join(', ')}\n`;
        }
      }

      // Add technical details
      if (detailedAnalysis.technical_details) {
        contextInfo += "\nTECHNICAL CONTEXT:\n";
        if (detailedAnalysis.technical_details.platform) {
          contextInfo += `- Platform: ${detailedAnalysis.technical_details.platform}\n`;
        }
        if (detailedAnalysis.technical_details.application) {
          contextInfo += `- Application: ${detailedAnalysis.technical_details.application}\n`;
        }
        if (detailedAnalysis.technical_details.theme) {
          contextInfo += `- Theme: ${detailedAnalysis.technical_details.theme}\n`;
        }
        if (detailedAnalysis.technical_details.responsive !== undefined) {
          contextInfo += `- Responsive: ${detailedAnalysis.technical_details.responsive ? 'Yes' : 'No'}\n`;
        }
      }

      // Add user actions needed
      if (detailedAnalysis.user_actions_needed && detailedAnalysis.user_actions_needed.length > 0) {
        contextInfo += "\nUSER ACTIONS NEEDED:\n";
        detailedAnalysis.user_actions_needed.forEach((action: string, index: number) => {
          contextInfo += `- ${action}\n`;
        });
      }

      // Add overall context
      if (detailedAnalysis.context) {
        contextInfo += `\nOVERALL CONTEXT: ${detailedAnalysis.context}\n`;
      }
    }

    const prompt = `${activeContext}${this.systemPrompt}

Given this problem: ${JSON.stringify(problemInfo, null, 2)}${contextInfo}

IMPORTANT: Use the detailed screen analysis above to understand the full context. Consider:
- What UI elements are available and their states
- What text content is present and its importance
- What visual elements might be relevant
- What actions the user can take
- The technical context (platform, application, etc.)

Solve it directly, taking into account all the UI elements and context provided. Provide the solution in JSON format:
{
  "solution": {
    "code": "The actual solution with working steps, not suggestions to use other tools",
    "problem_statement": "Problem restatement (brief)",
    "context": "Key details from the screen analysis", 
    "suggested_responses": ["Next step 1", "Next step 2", "Next step 3"],
    "reasoning": "One sentence justification considering the UI context"
  }
}

For math problems: show the work and final answer. For code: provide working code. For UI problems: consider the available elements and their states. Don't suggest external tools - solve it yourself. Return only the JSON object.`

    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    console.log("[LLMHelper] Full prompt (with context) for Gemini:", prompt);
    try {
      const result = await this.model.generateContent(prompt)
      console.log("[LLMHelper] Gemini LLM returned result.");
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    console.log("[LLMHelper] Starting debugSolutionWithImages with", debugImagePaths.length, "debug images")
    
    // Get active context
    console.log("[LLMHelper] Fetching active context for debug...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched for debug")
    
    try {
      console.log("[LLMHelper] Converting debug images to generative parts...")
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      console.log("[LLMHelper] Debug image parts created successfully")
      
      const prompt = `${activeContext}${this.systemPrompt}

Original problem: ${JSON.stringify(problemInfo, null, 2)}
Current approach: ${currentCode}

Analyze the debug images comprehensively and provide an improved solution. Extract ALL visible information and use it to debug the current solution:

{
  "solution": {
    "code": "Updated solution code",
    "problem_statement": "Problem restatement",
    "context": "Relevant details from debug info",
    "suggested_responses": ["Fix action 1", "Fix action 2", "Fix action 3"],
    "reasoning": "What was wrong and how this fixes it"
  },
  "debug_analysis": {
    "ui_elements": [
      {
        "type": "button|text|input|image|icon|menu|tab|link|form|table|list|chart|graph|video|audio|other",
        "text": "Visible text content",
        "position": "top|bottom|left|right|center|top-left|top-right|bottom-left|bottom-right",
        "description": "What this element does or represents",
        "interactive": true|false,
        "state": "enabled|disabled|active|inactive|selected|unselected|hovered|focused|error|success|warning|info"
      }
    ],
    "text_content": [
      {
        "content": "Exact text as shown",
        "type": "heading|paragraph|label|button_text|error_message|success_message|instruction|help_text|placeholder|other",
        "importance": "high|medium|low",
        "context": "What this text relates to"
      }
    ],
    "visual_elements": [
      {
        "type": "image|icon|logo|chart|graph|diagram|screenshot|video_thumbnail|avatar|banner|other",
        "description": "What this visual element shows",
        "purpose": "decorative|functional|informational|branding|navigation|other"
      }
    ],
    "layout_info": {
      "page_title": "Title of the page/window",
      "current_view": "What view or section is currently shown",
      "navigation_elements": ["Menu items", "Breadcrumbs", "Tabs", "Buttons"],
      "form_fields": ["Input fields present"],
      "action_buttons": ["Primary actions available"]
    },
    "issues_found": ["List of specific issues identified"],
    "error_messages": ["Any error messages visible"],
    "success_indicators": ["Any success indicators visible"]
  }
}

Be extremely thorough in analyzing the debug images. Capture every detail that might help identify what's wrong with the current solution. Return only the JSON object.`

      console.log("[LLMHelper] Sending debug request to Gemini...")
      const fullPrompt = [prompt, ...imageParts]
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", fullPrompt)
      const result = await this.model.generateContent(fullPrompt)
      console.log("[LLMHelper] Received debug response from Gemini")
      
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed debug LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in debugSolutionWithImages:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    console.log("[LLMHelper] Starting analyzeAudioFile for:", audioPath)
    
    // Get active context
    console.log("[LLMHelper] Fetching active context for audio...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched for audio")
    
    try {
      console.log("[LLMHelper] Reading audio file...")
      const audioData = await fs.promises.readFile(audioPath);
      console.log("[LLMHelper] Audio file read successfully, size:", audioData.length, "bytes")
      
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      console.log("[LLMHelper] Audio converted to base64")
      
      const prompt = `${activeContext}${this.systemPrompt}

Listen to this audio and respond directly. What was said and what should I do next? Keep it brief and actionable.`;

      console.log("[LLMHelper] Sending audio request to Gemini...")
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", [prompt, audioPart])
      const result = await this.model.generateContent([prompt, audioPart]);
      console.log("[LLMHelper] Received audio response from Gemini")
      
      const response = await result.response;
      const text = response.text();
      console.log("[LLMHelper] Audio analysis completed")
      
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeAudioFile:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    console.log("[LLMHelper] Starting analyzeAudioFromBase64, mimeType:", mimeType)
    
    // Get active context
    console.log("[LLMHelper] Fetching active context for base64 audio...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched for base64 audio")
    
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      console.log("[LLMHelper] Base64 audio part created")
      
      const prompt = `${activeContext}${this.systemPrompt}

Listen to this audio and solve any problem mentioned. If it's a question, answer it directly. If it's a task, complete it. Be brief - give the solution, not suggestions to use other tools.`;

      console.log("[LLMHelper] Sending base64 audio request to Gemini...")
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", [prompt, audioPart])
      const result = await this.model.generateContent([prompt, audioPart]);
      console.log("[LLMHelper] Received base64 audio response from Gemini")
      
      const response = await result.response;
      const text = response.text();
      console.log("[LLMHelper] Base64 audio analysis completed")
      
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeAudioFromBase64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    console.log("[LLMHelper] Starting analyzeImageFile for:", imagePath)
  
    // Get active context for this analysis too
    console.log("[LLMHelper] Fetching active context for image analysis...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched for image analysis")
      try {
      console.log("[LLMHelper] Reading image file...")
      const imageData = await fs.promises.readFile(imagePath);
      console.log("[LLMHelper] Image file read successfully, size:", imageData.length, "bytes")
      
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      console.log("[LLMHelper] Image converted to base64")
      
      const prompt = `${activeContext}Analyze this screenshot comprehensively and extract ALL visible information in JSON format:

{
  "main_problem": "The primary problem or question to solve",
  "ui_elements": [
    {
      "type": "button|text|input|image|icon|menu|tab|link|form|table|list|chart|graph|video|audio|other",
      "text": "Visible text content",
      "position": "top|bottom|left|right|center|top-left|top-right|bottom-left|bottom-right",
      "description": "What this element does or represents",
      "interactive": true|false,
      "state": "enabled|disabled|active|inactive|selected|unselected|hovered|focused|error|success|warning|info"
    }
  ],
  "text_content": [
    {
      "content": "Exact text as shown",
      "type": "heading|paragraph|label|button_text|error_message|success_message|instruction|help_text|placeholder|other",
      "importance": "high|medium|low",
      "context": "What this text relates to"
    }
  ],
  "visual_elements": [
    {
      "type": "image|icon|logo|chart|graph|diagram|screenshot|video_thumbnail|avatar|banner|other",
      "description": "What this visual element shows",
      "purpose": "decorative|functional|informational|branding|navigation|other"
    }
  ],
  "layout_info": {
    "page_title": "Title of the page/window",
    "current_view": "What view or section is currently shown",
    "navigation_elements": ["Menu items", "Breadcrumbs", "Tabs", "Buttons"],
    "form_fields": ["Input fields present"],
    "action_buttons": ["Primary actions available"]
  },
  "context": "Overall context of what this screen is for",
  "user_actions_needed": ["What actions the user might need to take"],
  "technical_details": {
    "platform": "web|desktop|mobile|tablet|other",
    "application": "What application this appears to be",
    "theme": "light|dark|custom",
    "responsive": true|false
  }
}

Be extremely thorough - capture every single visible element, text, button, and detail. Don't miss anything. Return only the JSON object.`;

      console.log("[LLMHelper] Sending request to Gemini for single image analysis...")
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", [prompt, imagePart])
      const result = await this.model.generateContent([prompt, imagePart]);
      console.log("[LLMHelper] Received response from Gemini for single image analysis")
      
      const response = await result.response;
      console.log("[LLMHelper] Extracted response text from Gemini")
      
      const text = this.cleanJsonResponse(response.text());
      console.log("[LLMHelper] Cleaned JSON response, parsing...")
      
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Successfully parsed JSON response for image analysis")
      
      return { 
        text: parsed.main_problem || "No main problem identified", 
        detailed_analysis: parsed,
        timestamp: Date.now() 
      };
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeImageFile:", error);
      throw error;
    }
  }

  public async chatWithHistory(history: { role: 'user' | 'ai', content: string }[], detailedAnalysis?: any) {
    console.log("[LLMHelper] Starting chatWithHistory with", history.length, "messages")
    
    // Get active context
    console.log("[LLMHelper] Fetching active context for chat...")
    const activeContext = await this.getActiveContext()
    console.log("[LLMHelper] Active context fetched for chat")
    
    // Build context from detailed analysis if available
    let contextInfo = "";
    if (detailedAnalysis) {
      console.log("[LLMHelper] Building context info from detailed analysis for chat...")
      contextInfo = "\n\nSCREEN CONTEXT (for reference):\n";
      
      // Add UI elements context
      if (detailedAnalysis.ui_elements && detailedAnalysis.ui_elements.length > 0) {
        contextInfo += "\nAvailable UI Elements:\n";
        detailedAnalysis.ui_elements.forEach((element: any, index: number) => {
          contextInfo += `- ${element.type}${element.text ? `: "${element.text}"` : ''}${element.state ? ` (${element.state})` : ''}${element.interactive ? ' [Interactive]' : ''}\n`;
        });
      }

      // Add text content context
      if (detailedAnalysis.text_content && detailedAnalysis.text_content.length > 0) {
        contextInfo += "\nScreen Text Content:\n";
        detailedAnalysis.text_content.forEach((text: any, index: number) => {
          if (text.importance === 'high') {
            contextInfo += `- ${text.type}: "${text.content}"${text.context ? ` - ${text.context}` : ''}\n`;
          }
        });
      }

      // Add layout information
      if (detailedAnalysis.layout_info) {
        contextInfo += "\nLayout Context:\n";
        if (detailedAnalysis.layout_info.page_title) {
          contextInfo += `- Page: ${detailedAnalysis.layout_info.page_title}\n`;
        }
        if (detailedAnalysis.layout_info.action_buttons && detailedAnalysis.layout_info.action_buttons.length > 0) {
          contextInfo += `- Available Actions: ${detailedAnalysis.layout_info.action_buttons.join(', ')}\n`;
        }
      }

      // Add technical context
      if (detailedAnalysis.technical_details) {
        contextInfo += "\nTechnical Context:\n";
        if (detailedAnalysis.technical_details.application) {
          contextInfo += `- App: ${detailedAnalysis.technical_details.application}\n`;
        }
        if (detailedAnalysis.technical_details.platform) {
          contextInfo += `- Platform: ${detailedAnalysis.technical_details.platform}\n`;
        }
      }

      // Add overall context
      if (detailedAnalysis.context) {
        contextInfo += `\nOverall Context: ${detailedAnalysis.context}\n`;
      }
    }

    // Build a string prompt from the active context, system prompt, context, and chat history
    let prompt = `${activeContext}System: ${this.systemPrompt}${contextInfo}\n`;
    for (const msg of history) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else {
        prompt += `AI: ${msg.content}\n`;
      }
    }
    
    try {
      console.log("[LLMHelper] Sending chat request to Gemini...")
      console.log("[LLMHelper] Full prompt (with context) for Gemini:", prompt)
      const result = await this.model.generateContent(prompt);
      console.log("[LLMHelper] Received chat response from Gemini")
      
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      console.log("[LLMHelper] Chat analysis completed")
      
      return { text };
    } catch (error) {
      console.error('[LLMHelper] Error in chatWithHistory:', error);
      throw error;
    }
  }
}