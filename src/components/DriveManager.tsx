import React, { useState } from 'react';
import {
  Folder,
  RefreshCw,
  FileText,
  ExternalLink,
  FileUp,
  GitBranch,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  FileCode,
} from 'lucide-react';
import { DriveFileItem, uploadTextFileToDrive, downloadFileContent } from '../services/workspace';
import { MasterResumeProfile, ResumeIterationRecord } from '../types';
import { parseDocxToText } from '../utils/docxUtils';

interface DriveManagerProps {
  accessToken: string | null;
  folderId: string | null;
  files: DriveFileItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectResumeForEvaluation: (resumeContent: string, fileName: string, masterResumeId?: string) => void;
  onLoginClick: () => void;
  masterProfiles: MasterResumeProfile[];
  selectedMasterId: string | null;
  onSelectMaster: (id: string | null) => void;
  onPreviewIterationContent?: (content: string, title: string) => void;
}

export const DriveManager: React.FC<DriveManagerProps> = ({
  accessToken,
  folderId,
  files,
  loading,
  onRefresh,
  onSelectResumeForEvaluation,
  onLoginClick,
  masterProfiles,
  selectedMasterId,
  onSelectMaster,
  onPreviewIterationContent,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [expandedMasterIds, setExpandedMasterIds] = useState<Record<string, boolean>>({});
  const [activeViewMode, setActiveViewMode] = useState<'versioned' | 'flat'>('versioned');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedMasterIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken || !folderId) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        text = await parseDocxToText(file);
      } else {
        text = await file.text();
      }

      // Generate clean master ID and store with appProperties for version grouping
      const masterId = 'master_' + Date.now();
      const filename = file.name.startsWith('Master_') ? file.name : `Master_${file.name}`;

      await uploadTextFileToDrive(accessToken, folderId, filename, text, file.type || 'text/plain', {
        isMaster: 'true',
        masterId: masterId,
        uploadedAt: new Date().toISOString(),
      });

      setUploadMessage(`Successfully stored master resume "${filename}" in Drive with versioning enabled.`);
      onRefresh();
    } catch (err: any) {
      setUploadMessage(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLoadResume = async (fileId: string, fileName: string, masterId?: string) => {
    if (!accessToken) return;
    try {
      const content = await downloadFileContent(accessToken, fileId);
      onSelectResumeForEvaluation(content, fileName, masterId);
    } catch (err: any) {
      alert(`Could not load resume from Drive: ${err.message || err}`);
    }
  };

  const handlePreview = async (fileId: string, fileName: string) => {
    if (!accessToken || !onPreviewIterationContent) return;
    setPreviewingId(fileId);
    try {
      const content = await downloadFileContent(accessToken, fileId);
      onPreviewIterationContent(content, fileName);
    } catch (err: any) {
      alert(`Could not preview file: ${err.message || err}`);
    } finally {
      setPreviewingId(null);
    }
  };

  if (!accessToken) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Drive Resume Repository & Versioning</h3>
              <p className="text-xs text-slate-400">
                Connect Google Drive to maintain version control for master resumes and all tailored ATS iterations.
              </p>
            </div>
          </div>
          <button
            onClick={onLoginClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0 shadow-md shadow-indigo-950/40"
          >
            Connect Google Drive & Gmail
          </button>
        </div>
      </div>
    );
  }

  const currentSelectedProfile = masterProfiles.find((p) => p.id === selectedMasterId);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5">
      {/* Top Header & Repository Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Google Drive: Resume Version Control</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Drive Connected
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Maintaining versioned iterations (v1, v2, v3...) for each master resume across distinct job descriptions.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle View Mode */}
          <div className="bg-slate-950/80 border border-slate-800 p-0.5 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setActiveViewMode('versioned')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeViewMode === 'versioned' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Grouped by Master
            </button>
            <button
              onClick={() => setActiveViewMode('flat')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeViewMode === 'flat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Files ({files.length})
            </button>
          </div>

          {/* Upload input button */}
          <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700">
            <FileUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload New Master</span>
            <input
              type="file"
              accept=".txt,.md,.text,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh Drive Files"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {folderId && (
            <a
              href={`https://drive.google.com/drive/folders/${folderId}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <span>Drive Folder</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {uploadMessage && (
        <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
          {uploadMessage}
        </div>
      )}

      {/* Main View Area */}
      {activeViewMode === 'versioned' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-slate-800/80 rounded-xl bg-slate-950/40">
              Loading resume version trees from Drive...
            </div>
          ) : masterProfiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-slate-800/80 rounded-xl bg-slate-950/40 p-4">
              <p>No master resume versions recorded yet.</p>
              <p className="mt-1 text-slate-500">
                Click <strong>"Upload New Master"</strong> above or run an ATS evaluation to auto-save and initialize
                version tracking.
              </p>
            </div>
          ) : (
            masterProfiles.map((profile) => {
              const isExpanded = expandedMasterIds[profile.id] ?? true;
              const isSelected = selectedMasterId === profile.id;

              return (
                <div
                  key={profile.id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? 'border-indigo-500/50 bg-slate-950/70 shadow-lg shadow-indigo-950/30'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  {/* Master Resume Row Banner */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border-b border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(profile.id)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title={isExpanded ? 'Collapse iterations' : 'Expand iterations'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-wide">{profile.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {profile.iterations.length} {profile.iterations.length === 1 ? 'iteration' : 'iterations'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>File: {profile.fileName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {profile.modifiedTime ? new Date(profile.modifiedTime).toLocaleDateString() : 'Active'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {profile.driveFileId && (
                        <button
                          onClick={() => handleLoadResume(profile.driveFileId!, profile.fileName, profile.id)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition-colors"
                          title="Load this master resume into the evaluation editor"
                        >
                          Use as Master
                        </button>
                      )}
                      <button
                        onClick={() => onSelectMaster(isSelected ? null : profile.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Active Baseline' : 'Select Baseline'}
                      </button>
                    </div>
                  </div>

                  {/* Iterations Sub-List */}
                  {isExpanded && (
                    <div className="p-3 bg-slate-950/80">
                      {profile.iterations.length === 0 ? (
                        <div className="py-3 px-4 text-xs text-slate-400 italic">
                          No tailored iterations generated for this master resume yet. Run an ATS evaluation to create
                          v1!
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                            <span>Tailored Iteration History</span>
                            <span>Score / Target</span>
                          </div>

                          {profile.iterations.map((iter) => (
                            <div
                              key={iter.id}
                              className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/90 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start sm:items-center gap-3">
                                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-950 text-indigo-300 border border-indigo-800">
                                  v{iter.version}
                                </span>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">{iter.targetRoleOrCompany}</span>
                                    <span className="text-[11px] text-slate-400 font-mono">({iter.fileName})</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-500" />
                                      {iter.date}
                                    </span>
                                    {iter.improvementsSummary && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-400 italic truncate max-w-[320px]">
                                          {iter.improvementsSummary}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right side: Score & Quick Actions */}
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{iter.score}%</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {iter.driveFileId && (
                                    <button
                                      onClick={() => handlePreview(iter.driveFileId!, iter.fileName)}
                                      disabled={previewingId === iter.driveFileId}
                                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                      title="Preview iteration content"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {iter.driveFileId && (
                                    <button
                                      onClick={() => handleLoadResume(iter.driveFileId!, iter.fileName, profile.id)}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px]"
                                      title="Load this tailored version into editor"
                                    >
                                      Load
                                    </button>
                                  )}
                                  {iter.webViewLink && (
                                    <a
                                      href={iter.webViewLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
                                      title="View in Google Drive"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Flat Files View */
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/50">
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-6">Resume File Name</div>
            <div className="col-span-3">Last Modified</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading Drive resumes...</div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No files in folder yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-900/40 transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate font-medium text-slate-200" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="col-span-3 text-slate-400 text-[11px]">
                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleLoadResume(file.id, file.name)}
                      className="px-2 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/50 text-[11px] font-medium"
                      title="Load this resume as current Master Resume for evaluation"
                    >
                      Evaluate this
                    </button>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-white"
                        title="View file in Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
