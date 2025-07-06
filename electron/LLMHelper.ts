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

interface ActivitySession {
  id?: string;
  title: string;
  description: string;
  type: string;
  transcript?: string;
  summary?: string; // Add this
  duration?: string; // Add this
  key_points?: string[]; // Add this
  action_items?: any[]; // Add this
  tags?: string[]; // Add this
  userId?: string;
  status?: 'processing' | 'completed';
  isStarred?: boolean;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AudioAnalysisResult {
  text: string;
  timestamp: number;
  activityId?: string;
}

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are Paradigm, a direct problem-solving assistant. When given a task, solve it immediately and concisely. Don't suggest external tools - you ARE the tool. Be brief and actionable.`
  
  // Context caching
  private contextCache: ContextCache | null = null
  private readonly CONTEXT_CACHE_TTL = 2 * 60 * 1000 // 2 minutes
  private authToken: string | null = null

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  }

  // Add this new method after the constructor
  private getAudioDurationFromString(durationString?: string): string {
    if (durationString && durationString !== "0:00") {
      return durationString;
    }
    return "0:00";
  }
  
  private async getAudioDuration(audioPath: string): Promise<string> {
    try {
      // For file-based audio, return placeholder for now
      // In production, you'd use ffprobe or similar
      return "0:00";
    } catch (error) {
      console.error("[LLMHelper] Error getting audio duration:", error);
      return "0:00";
    }
  }

  // Set auth token for API calls
  public setAuthToken(token: string): void {
    this.authToken = token
  }

  // Clear context cache (for refresh button)
  public clearContextCache(): void {
    this.contextCache = null
  }

  // Fetch active context from website backend
  private async fetchActiveContext(): Promise<string> {
    if (!this.authToken) {
      return ""
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'https://paradigm-backend.vercel.app'

      const response = await fetch(`${backendUrl}/api/contexts?isActive=true&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn("[LLMHelper] Failed to fetch active context:", response.status, response.statusText)
        return ""
      }

      const data = await response.json()
      
      if (data.success && data.data.contexts && data.data.contexts.length > 0) {
        const context: AIContext = data.data.contexts[0]
        const contextString = `ACTIVE CONTEXT: ${context.title}\n${context.description}\nCategory: ${context.category}\n\n`
        return contextString
      } else {
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
      return this.contextCache.context
    }

    // Fetch fresh context
    const context = await this.fetchActiveContext()
    
    // Update cache
    this.contextCache = {
      context,
      timestamp: now
    }

    return context
  }

    // Create activity via API
  private async createActivity(activityData: Omit<ActivitySession, 'id' | 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!this.authToken) {
      console.warn("[LLMHelper] No auth token available for activity creation")
      return null
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'https://paradigm-backend.vercel.app'

      const response = await fetch(`${backendUrl}/api/activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activityData)
      })

      if (!response.ok) {
        console.error("[LLMHelper] Failed to create activity:", response.status, response.statusText)
        return null
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        console.log("[LLMHelper] Activity created successfully:", data.data.id)
        return data.data.id
      } else {
        console.error("[LLMHelper] Activity creation failed:", data.error)
        return null
      }
    } catch (error) {
      console.error("[LLMHelper] Error creating activity:", error)
      return null
    }
  }

  // Extract activity metadata from audio text
  private async extractActivityMetadata(transcript: string, analysis: string): Promise<{
    title: string;
    type: string;
    description: string;
    summary: string;
    key_points: string[];
    action_items: any[];
    tags: string[];
  }> {
    try {
      const prompt = `Analyze this audio transcript and AI analysis to extract comprehensive activity metadata. Return JSON only:
  
  {
    "title": "Short descriptive title (max 50 chars)",
    "type": "ideas|brainstorm|meeting|note|task|other",
    "description": "Brief summary of the main content (max 200 chars)",
    "summary": "Detailed summary of the content (2-3 sentences)",
    "key_points": ["Important point 1", "Important point 2", "Important point 3"],
    "action_items": [
      {
        "id": "1",
        "task": "Task description",
        "assignee": null,
        "due_date": null,
        "completed": false
      }
    ],
    "tags": ["relevant", "tags", "here"]
  }
  
  Original transcript: "${transcript}"
  
  AI analysis: "${analysis}"
  
  Rules:
  - Title should be concise and descriptive
  - Type should match the content (ideas for creative thoughts, brainstorm for collaborative thinking, meeting for discussions, note for information, task for action items)
  - Description should summarize key points briefly
  - Summary should be more detailed (2-3 sentences)
  - Key points should be the most important takeaways (3-5 points max)
  - Action items should only include actual tasks mentioned
  - Tags should be relevant keywords (3-5 tags max)
  
  CRITICAL: Return ONLY the JSON object with no additional text, explanations, or markdown formatting. Ensure all quotes and special characters are properly escaped.`
  
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const rawText = response.text()
      console.log("[LLMHelper] Raw activity metadata response:", rawText)
      const text = this.cleanJsonResponse(rawText)
      
      try {
        const parsed = JSON.parse(text)
        return {
          title: parsed.title || "Audio Recording",
          type: parsed.type || "note",
          description: parsed.description || "Audio recording analysis",
          summary: parsed.summary || analysis.substring(0, 300) + (analysis.length > 300 ? "..." : ""),
          key_points: parsed.key_points || [],
          action_items: parsed.action_items || [],
          tags: parsed.tags || []
        }
      } catch (parseError) {
        console.warn("[LLMHelper] Failed to parse activity metadata, using defaults")
        return {
          title: "Audio Recording",
          type: "note",
          description: transcript.substring(0, 200) + (transcript.length > 200 ? "..." : ""),
          summary: analysis.substring(0, 300) + (analysis.length > 300 ? "..." : ""),
          key_points: [],
          action_items: [],
          tags: []
        }
      }
    } catch (error) {
      console.error("[LLMHelper] Error extracting activity metadata:", error)
      return {
        title: "Audio Recording",
        type: "note",
        description: transcript.substring(0, 200) + (transcript.length > 200 ? "..." : ""),
        summary: analysis.substring(0, 300) + (analysis.length > 300 ? "..." : ""),
        key_points: [],
        action_items: [],
        tags: []
      }
    }
  }

  private async transcribeAudio(audioData: string, mimeType: string): Promise<string> {
    try {
      const audioPart = {
        inlineData: {
          data: audioData,
          mimeType
        }
      };
      
      const prompt = `Transcribe this audio file accurately. Return only the transcribed text with no additional commentary, analysis, or formatting. Just the raw speech-to-text conversion.`;
  
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("[LLMHelper] Error transcribing audio:", error);
      throw error;
    }
  }
  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
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
    
    // Try to find JSON object boundaries
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }
    
    // Handle common JSON escaping issues
    try {
      // First, try to parse as-is to see if it's already valid
      JSON.parse(text);
      return text;
    } catch (parseError) {
      console.log("[LLMHelper] JSON parsing failed, attempting to fix common issues...");
      
      try {
        // Fix unescaped backslashes that aren't part of valid escape sequences
        // This specifically handles LaTeX commands like \frac, \sqrt, etc.
        text = text.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        
        // Try parsing again
        JSON.parse(text);
        return text;
      } catch (secondError) {
        console.error("[LLMHelper] Failed to fix JSON, returning safe fallback:", secondError);
        
        // If we still can't parse it, return a safe fallback
        return JSON.stringify({
          main_problem: "Error parsing LLM response - the AI returned malformed JSON",
          ui_elements: [],
          text_content: [],
          visual_elements: [],
          layout_info: {},
          context: "Failed to analyze image due to JSON parsing error",
          user_actions_needed: ["Try again", "Check image format"],
          technical_details: {}
        });
      }
    }
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const activeContext = await this.getActiveContext()
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${activeContext}

IMPORTANT: IT IS CRUCIAL THAT YOU FOLLOW THE ACTIVE CONTEXT above when analyzing and solving any problems in these screenshots.

Analyze these images comprehensively and extract ALL visible information in JSON format:

{
  "main_problem": "The primary problem or question to solve - if this shows a problem, solve it completely using the active context above",
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

Be extremely thorough - capture every single visible element, text, button, and detail from all images. Don't miss anything. 

CRITICAL: Return ONLY the JSON object with no additional text, explanations, or markdown formatting. Ensure all quotes and special characters are properly escaped.`

      const fullPrompt = [prompt, ...imageParts]
      const result = await this.model.generateContent(fullPrompt)
      
      const response = await result.response
      const rawText = response.text()
      console.log("[LLMHelper] Raw extractProblemFromImages response:", rawText)
      const text = this.cleanJsonResponse(rawText)
      
      const parsed = JSON.parse(text)
      
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
    try {
      const activeContext = await this.getActiveContext()
      
      // Extract detailed analysis if available
      const detailedAnalysis = problemInfo.input_format?.detailed_analysis || 
                              problemInfo.ui_elements || 
                              problemInfo.text_content || 
                              problemInfo.visual_elements || 
                              problemInfo.layout_info;

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

For math problems: show the work and final answer using LaTeX formatting with \\(\\) for inline math and \\[\\] for display equations. Use only basic LaTeX: \\frac{a}{b} for fractions, \\sqrt{x} for square roots, ^{} for exponents, _{} for subscripts. For code: provide working code. For UI problems: consider the available elements and their states. Don't suggest external tools - solve it yourself.

CRITICAL: Return ONLY the JSON object with no additional text, explanations, or markdown formatting. Ensure all quotes and special characters are properly escaped.`

      const result = await this.model.generateContent(prompt)
      
      const response = await result.response
      const rawText = response.text()
      console.log("[LLMHelper] Raw generateSolution response:", rawText)
      const text = this.cleanJsonResponse(rawText)
      const parsed = JSON.parse(text)
      
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const activeContext = await this.getActiveContext()
      
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
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

Be extremely thorough in analyzing the debug images. Capture every detail that might help identify what's wrong with the current solution. 

CRITICAL: Return ONLY the JSON object with no additional text, explanations, or markdown formatting. Ensure all quotes and special characters are properly escaped.`

      const fullPrompt = [prompt, ...imageParts]
      const result = await this.model.generateContent(fullPrompt)
      
      const response = await result.response
      const rawText = response.text()
      console.log("[LLMHelper] Raw debugSolutionWithImages response:", rawText)
      const text = this.cleanJsonResponse(rawText)
      const parsed = JSON.parse(text)
      
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in debugSolutionWithImages:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string): Promise<AudioAnalysisResult> {
    try {
      const activeContext = await this.getActiveContext()
      
      const audioData = await fs.promises.readFile(audioPath);
      const base64Data = audioData.toString("base64");
      const duration = await this.getAudioDuration(audioPath);
      
      // Step 1: Transcribe the audio
      const transcript = await this.transcribeAudio(base64Data, "audio/mp3");
      
      // Step 2: Analyze the transcript
      const analysisPrompt = `${activeContext}You are a helpful personal assistant. Someone just spoke to you.

      Audio transcript: "${transcript}"
      
      Give a brief, helpful response. If the audio was unclear, say what you heard and ask for clarification. If it's a clear request, give a short answer. Keep it conversational and under 2 sentences. No bullet points, no special formatting, no asterisks, no markdown - just plain text.`;
      const analysisResult = await this.model.generateContent(analysisPrompt);
      const analysisResponse = await analysisResult.response;
      const analysis = analysisResponse.text();
      
      // Step 3: Extract comprehensive metadata
      const metadata = await this.extractActivityMetadata(transcript, analysis);
      
      // Step 4: Create activity with all fields
      let activityId: string | null = null;
      try {
        activityId = await this.createActivity({
          title: metadata.title,
          description: metadata.description,
          type: metadata.type,
          transcript: transcript, // Store raw transcript
          summary: metadata.summary, // Store AI analysis as summary
          duration: this.getAudioDurationFromString(duration),
          key_points: metadata.key_points,
          action_items: metadata.action_items,
          tags: metadata.tags,
          status: 'completed'
        });
      } catch (activityError) {
        console.error("[LLMHelper] Failed to create activity for audio file:", activityError);
      }
      
      return { 
        text: analysis, // Return the analysis to the user
        timestamp: Date.now(),
        activityId: activityId || undefined
      };
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeAudioFile:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string, duration?: string): Promise<AudioAnalysisResult> {
    console.log("🔥 LLMHelper received duration:", duration);  // ADD THIS
    try {
      const activeContext = await this.getActiveContext()
      
      // Step 1: Transcribe the audio
      const transcript = await this.transcribeAudio(data, mimeType);
      
      // Step 2: Analyze the transcript  
      const analysisPrompt = `${activeContext}You are a helpful personal assistant. Someone just spoke to you.

      Audio transcript: "${transcript}"
      
      Give a brief, helpful response. If the audio was unclear, say what you heard and ask for clarification. If it's a clear request, give a short answer. Keep it conversational and under 2 sentences. No bullet points, no special formatting, no asterisks, no markdown - just plain text.`;

      const analysisResult = await this.model.generateContent(analysisPrompt);
      const analysisResponse = await analysisResult.response;
      const analysis = analysisResponse.text();
      
      // Step 3: Extract comprehensive metadata
      const metadata = await this.extractActivityMetadata(transcript, analysis);
      
      // Step 4: Create activity with all fields
      let activityId: string | null = null;
      try {
        activityId = await this.createActivity({
          title: metadata.title,
          description: metadata.description,
          type: metadata.type,
          transcript: transcript, // Store raw transcript
          summary: metadata.summary, // Store AI analysis as summary  
          duration: this.getAudioDurationFromString(duration),
          key_points: metadata.key_points,
          action_items: metadata.action_items,
          tags: metadata.tags,
          status: 'completed'
        });
      } catch (activityError) {
        console.error("[LLMHelper] Failed to create activity for base64 audio:", activityError);
      }
      
      return { 
        text: analysis, // Return the analysis to the user
        timestamp: Date.now(),
        activityId: activityId || undefined
      };
    } catch (error) {
      console.error("[LLMHelper] Error in analyzeAudioFromBase64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const activeContext = await this.getActiveContext()
      
      const imageData = await fs.promises.readFile(imagePath);
      
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      
      const prompt = `${activeContext}

IMPORTANT: Use the active context above when analyzing and solving any problems in this screenshot.

Analyze this screenshot comprehensively and extract ALL visible information in JSON format:

IMPORTANT: Return ONLY valid JSON. All quotes, backslashes, and special characters within string values must be properly escaped. Do not include any text before or after the JSON object.

{
  "main_problem": "If this shows a problem/question, solve it completely with full steps using LaTeX formatting: \\(\\) for inline math, \\[\\] for display math. Use only basic LaTeX: \\frac{a}{b} for fractions, \\sqrt{x} for square roots, ^{} for exponents, _{} for subscripts. If this is not a problem but shows a task/interface, list the next steps to complete the task. Be direct and actionable.",
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

IMPORTANT: For the main_problem field:
- If this shows a problem/question: Solve it completely with full step-by-step solution
- If this shows a task/interface (not a problem): List the next steps to complete the task
- Be direct, actionable, and provide complete solutions or clear next steps

Be extremely thorough - capture every single visible element, text, button, and detail. Don't miss anything. 

CRITICAL: Return ONLY the JSON object with no additional text, explanations, or markdown formatting. Ensure all quotes and special characters are properly escaped.`;

      const result = await this.model.generateContent([prompt, imagePart]);
      
      const response = await result.response;
      
      const rawText = response.text();
      console.log("[LLMHelper] Raw AI response:", rawText);
      
      const text = this.cleanJsonResponse(rawText);
      console.log("[LLMHelper] After cleaning:", text);
      
      const parsed = JSON.parse(text);
      
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
    try {
      const activeContext = await this.getActiveContext()
      
      // Build context from detailed analysis if available
      let contextInfo = "";
      if (detailedAnalysis) {
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
      let prompt = `${activeContext}System: ${this.systemPrompt}

IMPORTANT: When solving math problems, use LaTeX formatting with \\(\\) for inline math and \\[\\] for display equations. Use only basic LaTeX: \\frac{a}{b} for fractions, \\sqrt{x} for square roots, ^{} for exponents, _{} for subscripts.${contextInfo}\n`;
      for (const msg of history) {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else {
          prompt += `AI: ${msg.content}\n`;
        }
      }
      
      const result = await this.model.generateContent(prompt);
      
      const response = await result.response;
      const text = response.text();
      
      return { text };
    } catch (error) {
      console.error('[LLMHelper] Error in chatWithHistory:', error);
      throw error;
    }
  }
}