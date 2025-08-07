export interface Solution {
  initial_thoughts: string[]
  thought_steps: string[]
  description: string
  code: string
}

export interface SolutionsResponse {
  [key: string]: Solution
}

export interface ProblemStatementData {
  problem_statement: string;
  input_format: {
    description: string;
    parameters: any[];
    detailed_analysis?: DetailedScreenAnalysis;
  };
  output_format: {
    description: string;
    type: string;
    subtype: string;
  };
  complexity: {
    time: string;
    space: string;
  };
  test_cases: any[];
  validation_type: string;
  difficulty: string;
  ui_elements?: UIElement[];
  text_content?: TextContent[];
  visual_elements?: VisualElement[];
  layout_info?: LayoutInfo;
  context?: string;
  user_actions_needed?: string[];
  technical_details?: TechnicalDetails;
}

export interface UIElement {
  type: 'button' | 'text' | 'input' | 'image' | 'icon' | 'menu' | 'tab' | 'link' | 'form' | 'table' | 'list' | 'chart' | 'graph' | 'video' | 'audio' | 'other';
  text?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  description?: string;
  interactive?: boolean;
  state?: 'enabled' | 'disabled' | 'active' | 'inactive' | 'selected' | 'unselected' | 'hovered' | 'focused' | 'error' | 'success' | 'warning' | 'info';
}

export interface TextContent {
  content: string;
  type: 'heading' | 'paragraph' | 'label' | 'button_text' | 'error_message' | 'success_message' | 'instruction' | 'help_text' | 'placeholder' | 'other';
  importance: 'high' | 'medium' | 'low';
  context?: string;
}

export interface VisualElement {
  type: 'image' | 'icon' | 'logo' | 'chart' | 'graph' | 'diagram' | 'screenshot' | 'video_thumbnail' | 'avatar' | 'banner' | 'other';
  description?: string;
  purpose: 'decorative' | 'functional' | 'informational' | 'branding' | 'navigation' | 'other';
}

export interface LayoutInfo {
  page_title?: string;
  current_view?: string;
  navigation_elements?: string[];
  form_fields?: string[];
  action_buttons?: string[];
}

export interface TechnicalDetails {
  platform?: 'web' | 'desktop' | 'mobile' | 'tablet' | 'other';
  application?: string;
  theme?: 'light' | 'dark' | 'custom';
  responsive?: boolean;
}

export interface DetailedScreenAnalysis {
  main_problem: string;
  ui_elements: UIElement[];
  text_content: TextContent[];
  visual_elements: VisualElement[];
  layout_info: LayoutInfo;
  context?: string;
  user_actions_needed?: string[];
  technical_details: TechnicalDetails;
}

export interface ImageAnalysisResult {
  text: string;
  detailed_analysis: DetailedScreenAnalysis;
  timestamp: number;
}