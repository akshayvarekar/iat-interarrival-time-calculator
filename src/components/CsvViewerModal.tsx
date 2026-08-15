import React, { useState } from 'react';

interface CsvViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileKey: string;
  filename: string;
  csvContent: string;
  onDownloadCsv: (fileKey: string) => void;
}

export const CsvViewerModal: React.FC<CsvViewerModalProps> = ({
  isOpen,
  onClose,
  fileKey,
  filename,
  csvContent,
  onDownloadCsv,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xs font-bold font-mono text-white">{filename}</h3>
            <p className="text-[10px] text-slate-400">Dataset Raw Content</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy Text'}
            </button>

            <button
              onClick={() => onDownloadCsv(fileKey)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 cursor-pointer"
            >
              Download
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-0.5 text-base leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Textarea View */}
        <div className="p-3 bg-slate-950 flex-1 overflow-hidden flex flex-col">
          <textarea
            readOnly
            value={csvContent}
            className="w-full h-full p-2 font-mono text-xs text-slate-200 bg-transparent resize-none focus:outline-hidden leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
