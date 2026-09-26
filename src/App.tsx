import React, { useState, useEffect } from 'react';
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FolderSync,
  Mail,
  Cloud,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
  GitBranch,
  FileUp,
  ShieldCheck,
  Github,
  Linkedin,
  Sun,
  Moon,
} from 'lucide-react';
import { ScoreOverview } from './components/ScoreOverview';
import { ResumeViewer } from './components/ResumeViewer';
import { CoverLetterEmail } from './components/CoverLetterEmail';
import { DriveManager } from './components/DriveManager';
import { ResumePreviewModal } from './components/ResumePreviewModal';
import { SkillVerificationModal } from './components/SkillVerificationModal';
import { SocialProfileManager } from './components/SocialProfileManager';
import { GitHubProfileData } from './services/githubService';
import { LinkedInProfileData } from './services/linkedinService';
import { ATSEvaluationResult, EvaluationRunRecord, MasterResumeProfile, ResumeIterationRecord } from './types';
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_MASTER_RESUME } from './sampleData';
import { getOrCreateAppFolder, listFolderFiles, DriveFileItem, uploadTextFileToDrive } from './services/workspace';
import { parseDocxToText } from './utils/docxUtils';

declare global {
  interface Window {
    google?: any;
  }
}

export default function App() {
  // Config & OAuth
  const [clientId, setClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accountHint, setAccountHint] = useState<string>('tahershabbiri@gmail.com');

  // Drive state & Versioning
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [loadingDrive, setLoadingDrive] = useState<boolean>(false);
  const [masterProfiles, setMasterProfiles] = useState<MasterResumeProfile[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>('master_default');

  // Skill Verification & Anti-Hallucination
  const [verificationModalOpen, setVerificationModalOpen] = useState<boolean>(false);
  const [confirmedSkillsList, setConfirmedSkillsList] = useState<string[]>([]);
  const [excludedSkillsList, setExcludedSkillsList] = useState<string[]>([]);

  // Social Profile Manager (GitHub / LinkedIn)
  const [socialProfileManagerOpen, setSocialProfileManagerOpen] = useState<boolean>(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfileData | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfileData | null>(null);

  useEffect(() => {
    try {
      const savedGithubProfile = localStorage.getItem('ats_social_github_profile');
      const savedLinkedinProfile = localStorage.getItem('ats_social_linkedin_profile');

      if (savedGithubProfile) {
        setGithubProfile(JSON.parse(savedGithubProfile));
      }
      if (savedLinkedinProfile) {
        setLinkedinProfile(JSON.parse(savedLinkedinProfile));
      }
    } catch (err) {
      console.warn('Unable to restore saved social profiles:', err);
    }
  }, []);

  useEffect(() => {
    if (githubProfile) {
      localStorage.setItem('ats_social_github_profile', JSON.stringify(githubProfile));
    } else {
      localStorage.removeItem('ats_social_github_profile');
    }
  }, [githubProfile]);

  useEffect(() => {
    if (linkedinProfile) {
      localStorage.setItem('ats_social_linkedin_profile', JSON.stringify(linkedinProfile));
    } else {
      localStorage.removeItem('ats_social_linkedin_profile');
    }
  }, [linkedinProfile]);

  // Theme (initial value is applied by the inline script in index.html before first paint)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ats_theme', theme);
    } catch {
      // Storage unavailable (private mode); theme still applies for this session
    }
  }, [theme]);

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>('');
  const [previewModalContent, setPreviewModalContent] = useState<string>('');

  // Inputs
  const [jobDescription, setJobDescription] = useState<string>(SAMPLE_JOB_DESCRIPTION);
  const [masterResume, setMasterResume] = useState<string>(SAMPLE_MASTER_RESUME);
  const [hiringManagerName, setHiringManagerName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [userNotes, setUserNotes] = useState<string>('');

  // Evaluation results & multi-run history
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [result, setResult] = useState<ATSEvaluationResult | null>(null);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationRunRecord[]>([]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'cover_email' | 'drive'>('overview');

  // Helper to build MasterResumeProfile trees from drive files
  const buildProfilesFromFiles = (files: DriveFileItem[]) => {
    // Collect masters
    const profilesMap = new Map<string, MasterResumeProfile>();

    // Seed default baseline profile for immediate session tracking
    profilesMap.set('master_default', {
      id: 'master_default',
      title: 'Current Active Master Resume',
      fileName: 'Master_Resume_Active.txt',
      modifiedTime: new Date().toISOString(),
      iterationsCount: 0,
      iterations: [],
    });

    // 1. Identify all master files (either metadata or filename convention)
    files.forEach((file) => {
      const isMaster =
        file.appProperties?.isMaster === 'true' ||
        file.name.toLowerCase().startsWith('master_') ||
        file.name.toLowerCase().includes('master');

      if (isMaster) {
        const masterId = file.appProperties?.masterId || 'master_' + file.id;
        profilesMap.set(masterId, {
          id: masterId,
          title: file.name.replace(/^master_/i, '').replace(/\.(txt|md)$/i, '') || file.name,
          fileName: file.name,
          driveFileId: file.id,
          modifiedTime: file.modifiedTime,
          iterationsCount: 0,
          iterations: [],
        });
      }
    });

    // 2. Identify all tailored iterations and link to master
    files.forEach((file) => {
      const isIteration =
        file.appProperties?.isIteration === 'true' ||
        file.name.toLowerCase().startsWith('tailored_') ||
        file.name.toLowerCase().startsWith('ats_updated_') ||
        file.name.toLowerCase().includes('score');

      if (isIteration) {
        // Find corresponding masterId
        let targetMasterId = file.appProperties?.masterId;
        if (!targetMasterId || !profilesMap.has(targetMasterId)) {
          // If not explicitly linked, attach to the first master or default
          targetMasterId = profilesMap.keys().next().value || 'master_default';
        }

        const profile = profilesMap.get(targetMasterId);
        if (profile) {
          const versionNum = file.appProperties?.version
            ? parseInt(file.appProperties.version, 10)
            : profile.iterations.length + 1;

          // Extract score from appProperties or filename (e.g., Score94)
          let extractedScore = 90;
          if (file.appProperties?.score) {
            extractedScore = parseInt(file.appProperties.score, 10);
          } else {
            const match = file.name.match(/score[_-]?(\d+)/i);
            if (match) extractedScore = parseInt(match[1], 10);
          }

          const targetCompany =
            file.appProperties?.targetRoleOrCompany ||
            file.name.replace(/tailored_ats_resume_score\d+_/i, '').replace(/\.md$/i, '') ||
            'Custom Role';

          profile.iterations.push({
            id: file.id,
            version: versionNum,
            fileName: file.name,
            masterResumeId: targetMasterId,
            masterResumeName: profile.title,
            targetRoleOrCompany: targetCompany,
            score: extractedScore,
            date: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Recent',
            driveFileId: file.id,
            webViewLink: file.webViewLink,
            improvementsSummary: file.appProperties?.improvementsSummary,
          });
          profile.iterationsCount = profile.iterations.length;
        }
      }
    });

    // Sort iterations by version desc
    profilesMap.forEach((prof) => {
      prof.iterations.sort((a, b) => b.version - a.version);
    });

    setMasterProfiles(Array.from(profilesMap.values()));
  };

  // Load saved OAuth token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ats_google_access_token');
    const expiry = localStorage.getItem('ats_google_token_expiry');
    const savedEmail = localStorage.getItem('ats_google_account_email');

    if (savedEmail) {
      setAccountHint(savedEmail);
    }

    if (savedToken && expiry && Date.now() < Number(expiry)) {
      setAccessToken(savedToken);
      loadDriveFolder(savedToken);
    } else {
      localStorage.removeItem('ats_google_access_token');
      localStorage.removeItem('ats_google_token_expiry');
    }
  }, []);

  // Load config & Google Identity Services
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.clientId) {
          setClientId(data.clientId);
          initGoogleClient(data.clientId);
        }
      })
      .catch((err) => console.error('Error fetching config:', err));
  }, []);

  const initGoogleClient = (gClientId: string) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: gClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.compose',
        hint: accountHint,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google token error:', tokenResponse);
            return;
          }
          const token = tokenResponse.access_token;
          const expiresIn = tokenResponse.expires_in || 3500;
          const expiryTime = Date.now() + expiresIn * 1000;

          localStorage.setItem('ats_google_access_token', token);
          localStorage.setItem('ats_google_token_expiry', String(expiryTime));
          localStorage.setItem('ats_google_account_email', accountHint);

          setAccessToken(token);
          loadDriveFolder(token);
        },
      });
      setTokenClient(client);
    } else {
      // Retry in 500ms if script is still loading
      setTimeout(() => initGoogleClient(gClientId), 500);
    }
  };

  const handleConnectGoogle = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ hint: accountHint, prompt: 'select_account consent' });
    } else if (clientId) {
      initGoogleClient(clientId);
    } else {
      alert('Google OAuth Client ID is initializing. Please verify in a moment.');
    }
  };

  const handleDisconnectGoogle = () => {
    localStorage.removeItem('ats_google_access_token');
    localStorage.removeItem('ats_google_token_expiry');
    setAccessToken(null);
    setDriveFolderId(null);
    setDriveFiles([]);
  };

  const loadDriveFolder = async (token: string) => {
    setLoadingDrive(true);
    try {
      const folderId = await getOrCreateAppFolder(token);
      setDriveFolderId(folderId);
      const files = await listFolderFiles(token, folderId);
      setDriveFiles(files);
      buildProfilesFromFiles(files);
    } catch (err: any) {
      console.error('Failed to load Google Drive folder:', err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleRefreshDrive = () => {
    if (accessToken) {
      loadDriveFolder(accessToken);
    }
  };

  // Run the evaluation and increment versioning
  const handleRunEvaluation = async (customConfirmed?: string[], customExcluded?: string[]) => {
    if (!jobDescription.trim() || !masterResume.trim()) {
      setEvaluationError('Please provide both the Job Description and your Master Resume.');
      return;
    }

    setEvaluating(true);
    setEvaluationError(null);

    const activeConfirmed = customConfirmed || confirmedSkillsList;
    const activeExcluded = customExcluded || excludedSkillsList;

    try {
      const response = await fetch('/api/evaluate-and-tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          masterResume,
          hiringManagerName,
          companyName,
          userNotes,
          confirmedSkills: activeConfirmed,
          excludedSkills: activeExcluded,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Evaluation failed.');
      }

      const evalData: ATSEvaluationResult = await response.json();
      setResult(evalData);

      // Append to evaluation runs history
      const newRun: EvaluationRunRecord = {
        id: 'run_' + Date.now(),
        runIndex: evaluationHistory.length + 1,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roleOrCompany: companyName.trim() || 'Run #' + (evaluationHistory.length + 1),
        masterScore: evalData.masterScore,
        tailoredScore: evalData.updatedResume.score,
        improvement: evalData.updatedResume.score - evalData.masterScore,
      };
      setEvaluationHistory((prev) => [...prev, newRun]);

      // Calculate next version for current master profile
      const activeMasterId = selectedMasterId || 'master_default';
      const targetProfile = masterProfiles.find((p) => p.id === activeMasterId);
      const nextVersion = (targetProfile?.iterations.length || 0) + 1;

      // Update in-memory profile iteration history immediately
      const newIterationRecord: ResumeIterationRecord = {
        id: 'iter_' + Date.now(),
        version: nextVersion,
        fileName: `Tailored_v${nextVersion}_${(companyName || 'Target').replace(/\s+/g, '_')}_Score${evalData.updatedResume.score}.md`,
        masterResumeId: activeMasterId,
        masterResumeName: targetProfile?.title || 'Current Master',
        targetRoleOrCompany: companyName || 'Target Role',
        score: evalData.updatedResume.score,
        date: 'Just now',
        improvementsSummary: evalData.updatedResume.keyImprovements.slice(0, 2).join('; '),
      };

      setMasterProfiles((prevProfiles) => {
        let found = false;
        const updated = prevProfiles.map((p) => {
          if (p.id === activeMasterId) {
            found = true;
            return {
              ...p,
              iterationsCount: p.iterations.length + 1,
              iterations: [newIterationRecord, ...p.iterations],
            };
          }
          return p;
        });
        if (!found) {
          updated.push({
            id: activeMasterId,
            title: 'Master Resume',
            fileName: 'Master_Resume.txt',
            iterationsCount: 1,
            iterations: [newIterationRecord],
          });
        }
        return updated;
      });

      setActiveTab('overview');

      // If user has connected Drive, save master resume (if not exists) and save tailored version iteration
      if (accessToken && driveFolderId) {
        try {
          const comp = companyName.trim() ? companyName.trim().replace(/\s+/g, '_') : 'General';
          const filename = `Tailored_v${nextVersion}_${comp}_Score${evalData.updatedResume.score}.md`;

          const uploadedIter = await uploadTextFileToDrive(
            accessToken,
            driveFolderId,
            filename,
            evalData.updatedResume.resumeText,
            'text/markdown',
            {
              isIteration: 'true',
              version: String(nextVersion),
              masterId: activeMasterId,
              score: String(evalData.updatedResume.score),
              targetRoleOrCompany: companyName || 'Target Role',
              improvementsSummary: evalData.updatedResume.keyImprovements.slice(0, 2).join('; '),
            }
          );

          // Update iteration record with Drive file IDs
          newIterationRecord.driveFileId = uploadedIter.id;
          newIterationRecord.webViewLink = uploadedIter.webViewLink;

          loadDriveFolder(accessToken);
        } catch (driveErr) {
          console.warn('Auto-save to drive noticed an error:', driveErr);
        }
      }
    } catch (err: any) {
      setEvaluationError(err.message || 'An unexpected error occurred during ATS analysis.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleMasterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.docx')) {
        text = await parseDocxToText(file);
      } else {
        text = await file.text();
      }

      setMasterResume(text);
      const cleanTitle = file.name.replace(/\.(docx|txt|md)$/i, '');
      const newMasterId = 'master_' + Date.now();

      // Create new profile for uploaded file
      const newProfile: MasterResumeProfile = {
        id: newMasterId,
        title: cleanTitle,
        fileName: file.name,
        modifiedTime: new Date().toISOString(),
        iterationsCount: 0,
        iterations: [],
      };

      setMasterProfiles((prev) => [newProfile, ...prev]);
      setSelectedMasterId(newMasterId);
    } catch (err: any) {
      alert(`Could not parse file: ${err.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleSelectResumeFromDrive = (content: string, fileName: string, masterResumeId?: string) => {
    setMasterResume(content);
    if (masterResumeId) {
      setSelectedMasterId(masterResumeId);
    }
    alert(`Loaded "${fileName}" into Master Resume editor! It is now set as the active baseline master resume.`);
  };

  const handlePreviewIteration = (content: string, title: string) => {
    setPreviewModalTitle(title);
    setPreviewModalContent(content);
    setPreviewModalOpen(true);
  };

  const loadSample = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setMasterResume(SAMPLE_MASTER_RESUME);
    setCompanyName('NexaCloud Technologies');
    setHiringManagerName('Jordan Vance');
  };

  const clearInputs = () => {
    setJobDescription('');
    setMasterResume('');
    setCompanyName('');
    setHiringManagerName('');
    setUserNotes('');
    setResult(null);
  };

  const handleConfirmAndGenerate = (confirmed: string[], excluded: string[]) => {
    setConfirmedSkillsList(confirmed);
    setExcludedSkillsList(excluded);
    setVerificationModalOpen(false);
    handleRunEvaluation(confirmed, excluded);
  };

  const handleAppendToMasterResume = (markdownText: string, sourceName: string) => {
    setMasterResume((prev) => {
      const divider = `\n\n---\n*Data imported from ${sourceName}*\n`;
      return (prev || '').trimEnd() + divider + markdownText.trimStart();
    });
    // Scroll the workstation into view
    setTimeout(() => {
      const workstation = document.getElementById('workstation-section');
      if (workstation) workstation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">ATS Resume Intelligence</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Drive Versioning & Gmail
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Evaluation &lt;80% triggers automated ATS rewrites, Drive versioning trees, and 1-click Gmail drafting
              </p>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* GitHub & LinkedIn Connect Button */}
            <button
              onClick={() => setSocialProfileManagerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 relative"
              title="Connect GitHub & LinkedIn to auto-populate your Master Resume"
            >
              <Github className="w-3.5 h-3.5 text-white" />
              <Linkedin className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Profiles</span>
              {(githubProfile || linkedinProfile) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
              )}
            </button>

            {accessToken ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Google Workspace Connected</span>
                  <span className="md:hidden">Connected</span>
                </div>
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                  title="Disconnect Google session"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={accountHint}
                  onChange={(e) => setAccountHint(e.target.value)}
                  placeholder="Google email..."
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44 hidden sm:block"
                  title="Target Google Account"
                />
                <button
                  onClick={handleConnectGoogle}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Connect Google Drive & Gmail</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Drive Storage & Versioning Repository Banner */}
        <DriveManager
          accessToken={accessToken}
          folderId={driveFolderId}
          files={driveFiles}
          loading={loadingDrive}
          onRefresh={handleRefreshDrive}
          onSelectResumeForEvaluation={handleSelectResumeFromDrive}
          onLoginClick={handleConnectGoogle}
          masterProfiles={masterProfiles}
          selectedMasterId={selectedMasterId}
          onSelectMaster={setSelectedMasterId}
          onPreviewIterationContent={handlePreviewIteration}
        />

        {/* Input Workstation Section */}
        <div id="workstation-section" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  Job Description & Master Resume Workstation
                </h2>
                {selectedMasterId && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Targeting Master:{' '}
                    {masterProfiles.find((p) => p.id === selectedMasterId)?.title || 'Active Master'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste the job description and your master resume. If the match score is below 80%, an ATS-compliant
                tailored version will be created as a new versioned iteration in Google Drive.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadSample}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Load Sample Data
              </button>
              <button
                onClick={clearInputs}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Context bar (Optional fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 pb-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company / Target Role</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. NexaCloud Technologies"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Hiring Manager / Recruiter Name</label>
              <input
                type="text"
                value={hiringManagerName}
                onChange={(e) => setHiringManagerName(e.target.value)}
                placeholder="e.g. Jordan Vance or Hiring Team"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Personal Notes / Focus Areas</label>
              <input
                type="text"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. Highlight cloud architecture & leadership"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Two-Column Editor: Job Description & Master Resume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Job Description Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  Target Job Description (JD)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {jobDescription.length > 0 ? `${jobDescription.split(/\s+/).filter(Boolean).length} words` : 'Empty'}
                </span>
              </div>
              <textarea
                rows={13}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description text here..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none shadow-inner"
              />
            </div>

            {/* Master Resume Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Your Master Resume (Baseline Version)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-700">
                    <FileUp className="w-3 h-3 text-cyan-400" />
                    <span>Import .docx / .txt</span>
                    <input
                      type="file"
                      accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleMasterFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {masterResume.length > 0 ? `${masterResume.split(/\s+/).filter(Boolean).length} words` : 'Empty'}
                  </span>
                </div>
              </div>
              <textarea
                rows={13}
                value={masterResume}
                onChange={(e) => setMasterResume(e.target.value)}
                placeholder="Paste your master resume text or markdown here..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none shadow-inner"
              />
            </div>
          </div>

          {evaluationError && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{evaluationError}</span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Versioning Engine:</span> Each evaluation against this
              master creates a numbered iteration (v1, v2, v3...) saved to Google Drive and tracked in your history.
            </div>

            <button
              onClick={() => handleRunEvaluation()}
              disabled={evaluating}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating ATS Match & Generating Iteration...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Evaluate Resume Against JD</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Workspace */}
        {result && (
          <div className="space-y-6 pt-2">
            {/* Navigation Tabs for Results */}
            <div className="flex border-b border-slate-800 pb-2 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Score Breakdown & Differences</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    result.masterScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {result.masterScore}%
                </span>
              </button>

              <button
                onClick={() => setActiveTab('resume')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'resume'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>ATS Resumes Comparison</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-300">
                  New: {result.updatedResume.score}%
                </span>
              </button>

              <button
                onClick={() => setActiveTab('cover_email')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'cover_email'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Cover Letter & Gmail Draft</span>
              </button>

              <button
                onClick={() => setVerificationModalOpen(true)}
                className="ml-auto px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                title="Review missing skills and exclude false assumptions before re-generating"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Skills ({result.differences.missingKeywords.length} Gaps)</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'overview' && <ScoreOverview result={result} history={evaluationHistory} />}

            {activeTab === 'resume' && (
              <ResumeViewer
                originalResume={masterResume}
                updatedResumeText={result.updatedResume.resumeText}
                updatedScore={result.updatedResume.score}
                originalScore={result.masterScore}
                accessToken={accessToken}
                driveFolderId={driveFolderId}
                onRefreshDrive={handleRefreshDrive}
              />
            )}

            {activeTab === 'cover_email' && (
              <CoverLetterEmail
                coverLetter={result.coverLetter}
                emailDraft={result.emailDraft}
                updatedResumeText={result.updatedResume.resumeText}
                accessToken={accessToken}
                driveFolderId={driveFolderId}
                onRefreshDrive={handleRefreshDrive}
                companyName={companyName}
              />
            )}
          </div>
        )}
      </main>

      {/* Skill Verification & Anti-Hallucination Modal */}
      {result && (
        <SkillVerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          detectedKeywords={result.differences.missingKeywords || []}
          detectedQualifications={result.differences.missingQualifications || []}
          onConfirmAndGenerate={handleConfirmAndGenerate}
          generating={evaluating}
        />
      )}

      {/* GitHub & LinkedIn Social Profile Manager */}
      <SocialProfileManager
        isOpen={socialProfileManagerOpen}
        onClose={() => setSocialProfileManagerOpen(false)}
        onAppendToMasterResume={handleAppendToMasterResume}
        githubProfile={githubProfile}
        setGithubProfile={setGithubProfile}
        linkedinProfile={linkedinProfile}
        setLinkedinProfile={setLinkedinProfile}
      />

      {/* Iteration Preview Modal */}
      <ResumePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={previewModalTitle}
        content={previewModalContent}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        ATS Resume Matcher & Google Drive / Gmail Application Suite • Powered by Gemini 3.8 Flash & Google Workspace
      </footer>
    </div>
  );
}

