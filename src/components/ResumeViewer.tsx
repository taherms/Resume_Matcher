import React, { useState } from 'react';
import { Download, Copy, Check, CloudUpload, FileText, Sparkles, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { downloadAsFile, copyToClipboard } from '../utils/fileHelpers';
import { downloadAsDocx } from '../utils/docxUtils';
import { uploadTextFileToDrive } from '../services/workspace';

interface ResumeViewerProps {
  originalResume: string;
  updatedResumeText: string;
  updatedScore: number;
  originalScore: number;
  accessToken: string | null;
  driveFolderId: string | null;
  onRefreshDrive?: () => void;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  originalResume,
  updatedResumeText,
  updatedScore,
  originalScore,
  accessToken,
  driveFolderId,
  onRefreshDrive,
}) => {
  const [activeTab, setActiveTab] = useState<'updated' | 'master' | 'diff'>('updated');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleCopy = async () => {
    const textToCopy = activeTab === 'master' ? originalResume : updatedResumeText;
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeTab === 'master') {
      downloadAsFile('master_resume.txt', originalResume, 'text/plain');
    } else {
      downloadAsFile(`updated_ats_resume_score_${updatedScore}.md`, updatedResumeText, 'text/markdown');
    }
  };

  const handleDownloadDocx = async () => {
    const textToDownload = activeTab === 'master' ? originalResume : updatedResumeText;
    const filename = activeTab === 'master' ? 'Master_Resume.docx' : `Tailored_ATS_Resume_Score${updatedScore}.docx`;
    await downloadAsDocx(textToDownload, filename, activeTab === 'master' ? 'Master Resume' : 'Tailored ATS Resume');
  };

  const handleSaveToDrive = async () => {
    if (!accessToken || !driveFolderId) {
      setUploadStatus('Please connect Google Drive first.');
      return;
    }
    setUploading(true);
    setUploadStatus(null);
    try {
      const filename = `ATS_Updated_Resume_Score${updatedScore}_${new Date().toISOString().slice(0, 10)}.md`;
      const uploaded = await uploadTextFileToDrive(
        accessToken,
        driveFolderId,
        filename,
        updatedResumeText,
        'text/markdown'
      );
      setUploadStatus(`Saved to Drive: "${uploaded.name}"`);
      if (onRefreshDrive) onRefreshDrive();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      {/* Header & Tabs */}
      <div className="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('updated')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'updated'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Updated ATS Resume ({updatedScore}%)
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'master'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            Master Resume ({originalScore}%)
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
            title="Copy text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Resume
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
            title="Download resume markdown/text file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" /> Download {activeTab === 'updated' ? '.md' : '.txt'}
          </button>

          <button
            onClick={handleDownloadDocx}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 transition-colors flex items-center gap-1.5 border border-blue-500/40 shadow-sm"
            title="Download native Word (.docx) document"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" /> Download .docx
          </button>

          {accessToken && driveFolderId && (
            <button
              onClick={handleSaveToDrive}
              disabled={uploading}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 transition-colors flex items-center gap-1.5 border border-indigo-500/40 disabled:opacity-50"
              title="Save updated resume directly to your Drive master folder"
            >
              <CloudUpload className="w-3.5 h-3.5 text-indigo-300" />
              {uploading ? 'Saving to Drive...' : 'Save to Drive Folder'}
            </button>
          )}
        </div>
      </div>

      {uploadStatus && (
        <div className="px-6 py-2 bg-indigo-950/40 border-b border-indigo-900/50 text-xs text-indigo-300 flex items-center gap-2">
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Code / Markdown Content display */}
      <div className="p-6">
        <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[550px] overflow-y-auto whitespace-pre-wrap select-text">
          {activeTab === 'updated' ? updatedResumeText : originalResume}
        </div>
      </div>
    </div>
  );
};
