import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export class LLMHelper {
  private model: GenerativeModel
  private readonly systemPrompt = `You are Wingman AI, a direct problem-solving assistant. When given a task, solve it immediately and concisely. Don't suggest external tools - you ARE the tool. Be brief and actionable.`

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
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
    return text;
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
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

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      return {
        problem_statement: parsed.main_problem || "No main problem identified",
        context: parsed.context || "No context provided",
        suggested_responses: parsed.user_actions_needed || ["Analyze further", "Take action", "Review details"],
        reasoning: "Comprehensive analysis of all visible elements",
        detailed_analysis: parsed
      }
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `Given this problem: ${JSON.stringify(problemInfo, null, 2)}

Solve it directly. Provide the solution in JSON format:
{
  "solution": {
    "code": "The actual solution with working steps, not suggestions to use other tools",
    "problem_statement": "Problem restatement (brief)",
    "context": "Key details only", 
    "suggested_responses": ["Next step 1", "Next step 2", "Next step 3"],
    "reasoning": "One sentence justification"
  }
}

For math problems: show the work and final answer. For code: provide working code. Don't suggest external tools - solve it yourself. Return only the JSON object.`

    console.log("[LLMHelper] Calling Gemini LLM for solution...");
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
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `Original problem: ${JSON.stringify(problemInfo, null, 2)}
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

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed debug LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("Error debugging solution with images:", error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      };
      
      const prompt = `Listen to this audio and respond directly. What was said and what should I do next? Keep it brief and actionable.`;
      
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType
        }
      };
      
      const prompt = `Listen to this audio and solve any problem mentioned. If it's a question, answer it directly. If it's a task, complete it. Be brief - give the solution, not suggestions to use other tools.`;
      
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      };
      
      const prompt = `Analyze this screenshot comprehensively and extract ALL visible information in JSON format:

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
      
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      const parsed = JSON.parse(text);
      return { 
        text: parsed.main_problem || "No main problem identified", 
        detailed_analysis: parsed,
        timestamp: Date.now() 
      };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }

  public async chatWithHistory(history: { role: 'user' | 'ai', content: string }[]) {
    // Build a string prompt from the system prompt and chat history
    let prompt = `System: ${this.systemPrompt}\n`;
    for (const msg of history) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else {
        prompt += `AI: ${msg.content}\n`;
      }
    }
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      return { text };
    } catch (error) {
      console.error('Error in chatWithHistory:', error);
      throw error;
    }
  }
}