import React, { useState } from 'react';
import { DetailedScreenAnalysis, UIElement, TextContent, VisualElement } from '../../types/solutions';

interface ScreenAnalysisDisplayProps {
  analysis: DetailedScreenAnalysis;
  isVisible?: boolean;
}

const ScreenAnalysisDisplay: React.FC<ScreenAnalysisDisplayProps> = ({ 
  analysis, 
  isVisible = true 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ui' | 'text' | 'visual' | 'layout'>('overview');

  if (!isVisible) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', count: 1 },
    { id: 'ui', label: 'UI Elements', count: analysis.ui_elements?.length || 0 },
    { id: 'text', label: 'Text Content', count: analysis.text_content?.length || 0 },
    { id: 'visual', label: 'Visual Elements', count: analysis.visual_elements?.length || 0 },
    { id: 'layout', label: 'Layout Info', count: 1 }
  ];

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
        <h3 className="text-white font-semibold text-sm mb-2">Main Problem</h3>
        <p className="text-white/90 text-xs">{analysis.main_problem}</p>
      </div>
      
      {analysis.context && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Context</h3>
          <p className="text-white/90 text-xs">{analysis.context}</p>
        </div>
      )}

      {analysis.user_actions_needed && analysis.user_actions_needed.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">User Actions Needed</h3>
          <ul className="space-y-1">
            {analysis.user_actions_needed.map((action, index) => (
              <li key={index} className="text-white/90 text-xs flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.technical_details && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Technical Details</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {analysis.technical_details.platform && (
              <div>
                <span className="text-white/60">Platform:</span>
                <span className="text-white/90 ml-1">{analysis.technical_details.platform}</span>
              </div>
            )}
            {analysis.technical_details.application && (
              <div>
                <span className="text-white/60">Application:</span>
                <span className="text-white/90 ml-1">{analysis.technical_details.application}</span>
              </div>
            )}
            {analysis.technical_details.theme && (
              <div>
                <span className="text-white/60">Theme:</span>
                <span className="text-white/90 ml-1">{analysis.technical_details.theme}</span>
              </div>
            )}
            {analysis.technical_details.responsive !== undefined && (
              <div>
                <span className="text-white/60">Responsive:</span>
                <span className="text-white/90 ml-1">{analysis.technical_details.responsive ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderUIElements = () => (
    <div className="space-y-3">
      {analysis.ui_elements?.map((element, index) => (
        <div key={index} className="bg-black/30 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-400 text-xs font-medium uppercase">{element.type}</span>
            {element.interactive && (
              <span className="text-cyan-400 text-xs bg-cyan-400/10 px-2 py-1 rounded">Interactive</span>
            )}
          </div>
          
          {element.text && (
            <p className="text-white/90 text-xs mb-2">{element.text}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {element.position && (
              <div>
                <span className="text-white/60">Position:</span>
                <span className="text-white/90 ml-1">{element.position}</span>
              </div>
            )}
            {element.state && (
              <div>
                <span className="text-white/60">State:</span>
                <span className="text-white/90 ml-1">{element.state}</span>
              </div>
            )}
          </div>
          
          {element.description && (
            <p className="text-white/70 text-xs mt-2">{element.description}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderTextContent = () => (
    <div className="space-y-3">
      {analysis.text_content?.map((text, index) => (
        <div key={index} className="bg-black/30 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-xs font-medium uppercase">{text.type}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              text.importance === 'high' ? 'bg-red-400/10 text-red-400' :
              text.importance === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
              'bg-green-400/10 text-green-400'
            }`}>
              {text.importance}
            </span>
          </div>
          
          <p className="text-white/90 text-xs mb-2">{text.content}</p>
          
          {text.context && (
            <p className="text-white/70 text-xs">{text.context}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderVisualElements = () => (
    <div className="space-y-3">
      {analysis.visual_elements?.map((element, index) => (
        <div key={index} className="bg-black/30 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 text-xs font-medium uppercase">{element.type}</span>
            <span className="text-orange-400 text-xs bg-orange-400/10 px-2 py-1 rounded">{element.purpose}</span>
          </div>
          
          {element.description && (
            <p className="text-white/90 text-xs">{element.description}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderLayoutInfo = () => (
    <div className="space-y-4">
      {analysis.layout_info?.page_title && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Page Title</h3>
          <p className="text-white/90 text-xs">{analysis.layout_info.page_title}</p>
        </div>
      )}

      {analysis.layout_info?.current_view && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Current View</h3>
          <p className="text-white/90 text-xs">{analysis.layout_info.current_view}</p>
        </div>
      )}

      {analysis.layout_info?.navigation_elements && analysis.layout_info.navigation_elements.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Navigation Elements</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.layout_info.navigation_elements.map((item, index) => (
              <span key={index} className="text-white/90 text-xs bg-white/10 px-2 py-1 rounded">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.layout_info?.form_fields && analysis.layout_info.form_fields.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Form Fields</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.layout_info.form_fields.map((field, index) => (
              <span key={index} className="text-white/90 text-xs bg-white/10 px-2 py-1 rounded">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.layout_info?.action_buttons && analysis.layout_info.action_buttons.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Action Buttons</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.layout_info.action_buttons.map((button, index) => (
              <span key={index} className="text-white/90 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-1 rounded">
                {button}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full bg-black/70 border border-white/10 rounded-lg backdrop-blur-md">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white bg-white/10 border-b-2 border-emerald-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'ui' && renderUIElements()}
        {activeTab === 'text' && renderTextContent()}
        {activeTab === 'visual' && renderVisualElements()}
        {activeTab === 'layout' && renderLayoutInfo()}
      </div>
    </div>
  );
};

export default ScreenAnalysisDisplay; 