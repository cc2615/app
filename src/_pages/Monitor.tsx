import React, { useEffect, useRef, useState } from "react";

const Monitor: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate monitoring loading for demonstration
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Height update logic (optional, for Electron window sizing)
  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        const contentWidth = contentRef.current.scrollWidth;
        if (window.electronAPI?.updateContentDimensions) {
          window.electronAPI.updateContentDimensions({
            width: contentWidth,
            height: contentHeight
          });
        }
      }
    };
    updateDimensions();
  }, [isLoading]);

  return (
    <div ref={contentRef} className="space-y-2 flex flex-col items-center justify-center min-h-[200px]">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        Monitor
      </h2>
      {isLoading ? (
        <div className="mt-4 flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Monitoring screen...
          </p>
        </div>
      ) : (
        <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
          Monitoring is active.
        </div>
      )}
    </div>
  );
};

export default Monitor; 