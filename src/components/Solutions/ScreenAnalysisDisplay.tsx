import React, { useState, useMemo } from 'react';
import { DetailedScreenAnalysis } from '../../types/solutions';

interface ScreenAnalysisDisplayProps {
  analysis: DetailedScreenAnalysis;
  isVisible?: boolean;
}

const ScreenAnalysisDisplay: React.FC<ScreenAnalysisDisplayProps> = ({
  analysis,
  isVisible = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ui' | 'text' | 'visual' | 'layout'>('overview');
  if (!isVisible) return null;

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', count: 1 },
    { id: 'ui', label: 'UI Elements', count: analysis.ui_elements?.length || 0 },
    { id: 'text', label: 'Text Content', count: analysis.text_content?.length || 0 },
    { id: 'visual', label: 'Visual Elements', count: analysis.visual_elements?.length || 0 },
    { id: 'layout', label: 'Layout Info', count: 1 },
  ], [analysis]);

  const {
    context,
    main_problem,
    user_actions_needed = [],
    technical_details,
    ui_elements = [],
    text_content = [],
    visual_elements = [],
    layout_info = {},
  } = analysis;

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="bg-black/30 rounded-lg p-4 border border-white/10">
        <h3 className="text-white font-semibold text-sm mb-2">Main Problem</h3>
        <p className="text-white/90 text-xs">{main_problem}</p>
      </div>

      {context && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Context</h3>
          <p className="text-white/90 text-xs">{context}</p>
        </div>
      )}

      {user_actions_needed.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">User Actions Needed</h3>
          <ul className="space-y-1">
            {user_actions_needed.map((action) => (
              <li key={action} className="text-white/90 text-xs flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {technical_details && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Technical Details</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {technical_details.platform && (
              <div>
                <span className="text-white/60">Platform:</span>
                <span className="text-white/90 ml-1">{technical_details.platform}</span>
              </div>
            )}
            {technical_details.application && (
              <div>
                <span className="text-white/60">Application:</span>
                <span className="text-white/90 ml-1">{technical_details.application}</span>
              </div>
            )}
            {technical_details.theme && (
              <div>
                <span className="text-white/60">Theme:</span>
                <span className="text-white/90 ml-1">{technical_details.theme}</span>
              </div>
            )}
            {'responsive' in technical_details && (
              <div>
                <span className="text-white/60">Responsive:</span>
                <span className="text-white/90 ml-1">{technical_details.responsive ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderUIElements = () => (
    <div className="space-y-3">
      {ui_elements.map((element, index) => (
        <div key={`${element.type}-${index}`} className="bg-black/30 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-400 text-xs font-medium uppercase">{element.type}</span>
            {element.interactive && (
              <span className="text-cyan-400 text-xs bg-cyan-400/10 px-2 py-1 rounded">Interactive</span>
            )}
          </div>

          {element.text && <p className="text-white/90 text-xs mb-2">{element.text}</p>}

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

          {element.description && <p className="text-white/70 text-xs mt-2">{element.description}</p>}
        </div>
      ))}
    </div>
  );

  const renderTextContent = () => (
    <div className="space-y-3">
      {text_content.map((text, index) => (
        <div key={`${text.content}-${index}`} className="bg-black/30 rounded-lg p-3 border border-white/10">
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
          {text.context && <p className="text-white/70 text-xs">{text.context}</p>}
        </div>
      ))}
    </div>
  );

  const renderVisualElements = () => (
    <div className="space-y-3">
      {visual_elements.map((element, index) => (
        <div key={`${element.type}-${index}`} className="bg-black/30 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 text-xs font-medium uppercase">{element.type}</span>
            <span className="text-orange-400 text-xs bg-orange-400/10 px-2 py-1 rounded">{element.purpose}</span>
          </div>
          {element.description && <p className="text-white/90 text-xs">{element.description}</p>}
        </div>
      ))}
    </div>
  );

  const renderLayoutInfo = () => (
    <div className="space-y-4">
      {layout_info.page_title && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Page Title</h3>
          <p className="text-white/90 text-xs">{layout_info.page_title}</p>
        </div>
      )}

      {layout_info.current_view && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Current View</h3>
          <p className="text-white/90 text-xs">{layout_info.current_view}</p>
        </div>
      )}

      {layout_info.navigation_elements?.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Navigation Elements</h3>
          <div className="flex flex-wrap gap-2">
            {layout_info.navigation_elements.map((item) => (
              <span key={item} className="text-white/90 text-xs bg-white/10 px-2 py-1 rounded">{item}</span>
            ))}
          </div>
        </div>
      )}

      {layout_info.form_fields?.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Form Fields</h3>
          <div className="flex flex-wrap gap-2">
            {layout_info.form_fields.map((field) => (
              <span key={field} className="text-white/90 text-xs bg-white/10 px-2 py-1 rounded">{field}</span>
            ))}
          </div>
        </div>
      )}

      {layout_info.action_buttons?.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Action Buttons</h3>
          <div className="flex flex-wrap gap-2">
            {layout_info.action_buttons.map((button) => (
              <span key={button} className="text-white/90 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-1 rounded">
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
      <div className="flex border-b border-white/10">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === id
                ? 'text-white bg-white/10 border-b-2 border-emerald-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

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
