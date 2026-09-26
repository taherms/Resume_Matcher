import React, { useEffect, useState } from 'react';
import {
  Github,
  Linkedin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Star,
  GitBranch,
  Layers,
  FileText,
  User,
  Briefcase,
  X,
} from 'lucide-react';
import { fetchGitHubProfile, formatGitHubDataToMarkdown, GitHubProfileData } from '../services/githubService';
import { parseLinkedInProfileText, formatLinkedInDataToMarkdown, LinkedInProfileData } from '../services/linkedinService';

interface SocialProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onAppendToMasterResume: (markdownText: string, sourceName: string) => void;
  githubProfile: GitHubProfileData | null;
  setGithubProfile: (data: GitHubProfileData | null) => void;
  linkedinProfile: LinkedInProfileData | null;
  setLinkedinProfile: (data: LinkedInProfileData | null) => void;
}

export const SocialProfileManager: React.FC<SocialProfileManagerProps> = ({
  isOpen,
  onClose,
  onAppendToMasterResume,
  githubProfile,
  setGithubProfile,
  linkedinProfile,
  setLinkedinProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'github' | 'linkedin'>('github');

  // GitHub inputs & status
  const [githubInput, setGithubInput] = useState<string>(githubProfile?.username || '');
  const [githubToken, setGithubToken] = useState<string>('');
  const [loadingGithub, setLoadingGithub] = useState<boolean>(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // LinkedIn inputs & status
  const [linkedinUrlInput, setLinkedinUrlInput] = useState<string>(linkedinProfile?.profileUrl || '');
  const [linkedinRawText, setLinkedinRawText] = useState<string>('');
  const [loadingLinkedin, setLoadingLinkedin] = useState<boolean>(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedGithubInput = localStorage.getItem('ats_social_github_username');
      const savedGithubToken = localStorage.getItem('ats_social_github_token');
      const savedLinkedinUrl = localStorage.getItem('ats_social_linkedin_url');

      if (savedGithubInput && !githubProfile?.username) {
        setGithubInput(savedGithubInput);
      }
      if (savedGithubToken) {
        setGithubToken(savedGithubToken);
      }
      if (savedLinkedinUrl && !linkedinProfile?.profileUrl) {
        setLinkedinUrlInput(savedLinkedinUrl);
      }
    } catch (err) {
      console.warn('Unable to restore saved social profile details:', err);
    }
  }, []);

  useEffect(() => {
    if (githubInput.trim()) {
      localStorage.setItem('ats_social_github_username', githubInput.trim());
    } else {
      localStorage.removeItem('ats_social_github_username');
    }
  }, [githubInput]);

  useEffect(() => {
    if (githubToken.trim()) {
      localStorage.setItem('ats_social_github_token', githubToken.trim());
    } else {
      localStorage.removeItem('ats_social_github_token');
    }
  }, [githubToken]);

  useEffect(() => {
    if (linkedinUrlInput.trim()) {
      localStorage.setItem('ats_social_linkedin_url', linkedinUrlInput.trim());
    } else {
      localStorage.removeItem('ats_social_linkedin_url');
    }
  }, [linkedinUrlInput]);

  if (!isOpen) return null;

  // Handle GitHub Fetch
  const handleFetchGitHub = async () => {
    if (!githubInput.trim()) {
      setGithubError('Please enter a valid GitHub username or URL.');
      return;
    }
    setLoadingGithub(true);
    setGithubError(null);

    try {
      const profile = await fetchGitHubProfile(githubInput, githubToken || undefined);
      setGithubProfile(profile);
      setGithubInput(profile.username || githubInput);
      localStorage.setItem('ats_social_github_username', profile.username || githubInput.trim());
    } catch (err: any) {
      setGithubError(err.message || 'Failed to fetch GitHub profile.');
    } finally {
      setLoadingGithub(false);
    }
  };

  // Handle LinkedIn Extract
  const handleExtractLinkedIn = () => {
    if (!linkedinRawText.trim()) {
      setLinkedinError(
        linkedinUrlInput.trim()
          ? 'LinkedIn does not allow profiles to be fetched from a URL. Open your profile, press Ctrl/Cmd+A then Ctrl/Cmd+C, and paste the text below (or paste text from your LinkedIn "Save to PDF" export).'
          : 'Please paste your LinkedIn profile text below.',
      );
      return;
    }
    setLoadingLinkedin(true);
    setLinkedinError(null);

    try {
      const parsed = parseLinkedInProfileText(linkedinRawText, linkedinUrlInput);
      const foundAnything =
        parsed.fullName || parsed.headline || parsed.summary || parsed.experiences.length > 0 || parsed.skills.length > 0;
      if (!foundAnything) {
        setLinkedinError(
          'No LinkedIn details were recognised. Make sure the pasted text includes section headings such as "About", "Experience" and "Skills".',
        );
        return;
      }
      setLinkedinProfile(parsed);
      if (linkedinUrlInput.trim()) {
        localStorage.setItem('ats_social_linkedin_url', linkedinUrlInput.trim());
      }
    } catch (err: any) {
      setLinkedinError(err.message || 'Could not parse LinkedIn details.');
    } finally {
      setLoadingLinkedin(false);
    }
  };

  const handleAppendGitHub = () => {
    if (!githubProfile) return;
    const md = formatGitHubDataToMarkdown(githubProfile);
    onAppendToMasterResume(md, `GitHub (${githubProfile.username})`);
    onClose();
  };

  const handleAppendLinkedIn = () => {
    if (!linkedinProfile) return;
    const md = formatLinkedInDataToMarkdown(linkedinProfile);
    onAppendToMasterResume(md, 'LinkedIn Profile');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Connect GitHub & LinkedIn Accounts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fetch open-source repos, verified skills, and professional experience to build high-impact resumes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'github'
                ? 'bg-indigo-600/30 border-indigo-500/50 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4 text-white" />
            <span>GitHub Repos & Contributions</span>
            {githubProfile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
          </button>

          <button
            onClick={() => setActiveTab('linkedin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'linkedin'
                ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Linkedin className="w-4 h-4 text-blue-400" />
            <span>LinkedIn Experience & Skills</span>
            {linkedinProfile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
          </button>
        </div>

        {/* TAB 1: GITHUB */}
        {activeTab === 'github' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                GitHub Username or Profile URL
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="e.g. TaherShabbir or https://github.com/torvalds"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleFetchGitHub}
                  disabled={loadingGithub}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingGithub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching Repos...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-3.5 h-3.5" />
                      <span>Fetch GitHub Data</span>
                    </>
                  )}
                </button>
              </div>

              {/* Optional PAT token */}
              <div className="pt-1">
                <details className="text-[11px] text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-400">Optional: Add Personal Access Token (for higher API limits)</summary>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxx"
                    className="mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  />
                </details>
              </div>
            </div>

            {githubError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{githubError}</span>
              </div>
            )}

            {/* GitHub Profile Preview */}
            {githubProfile && (
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/80 space-y-4">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={githubProfile.avatarUrl}
                      alt={githubProfile.username}
                      className="w-10 h-10 rounded-full border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{githubProfile.name || githubProfile.username}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          @{githubProfile.username}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{githubProfile.bio || 'GitHub Developer'}</p>
                    </div>
                  </div>

                  <a
                    href={githubProfile.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Top Repos list */}
                <div>
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Top Repositories ({githubProfile.topRepos.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {githubProfile.topRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate">{repo.name}</span>
                          {repo.stargazersCount > 0 && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-mono">
                              <Star className="w-3 h-3 fill-amber-400" /> {repo.stargazersCount}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{repo.description}</p>
                        )}
                        {repo.language && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleAppendGitHub}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Merge GitHub Projects into Master Resume</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LINKEDIN */}
        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LinkedIn Profile URL or Vanity Name
                </label>
                <input
                  type="text"
                  value={linkedinUrlInput}
                  onChange={(e) => setLinkedinUrlInput(e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourname"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste LinkedIn Profile Text or Exported Experience Summary
                </label>
                <textarea
                  rows={8}
                  value={linkedinRawText}
                  onChange={(e) => setLinkedinRawText(e.target.value)}
                  placeholder="Paste text from your LinkedIn About section, Experience, and Skills here..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleExtractLinkedIn}
                  disabled={loadingLinkedin}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>Parse & Extract LinkedIn Details</span>
                </button>
              </div>
            </div>

            {linkedinError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{linkedinError}</span>
              </div>
            )}

            {/* LinkedIn Preview */}
            {linkedinProfile && (
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                      <Linkedin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{linkedinProfile.fullName || 'LinkedIn Profile'}</h4>
                      {linkedinProfile.headline && (
                        <p className="text-xs text-slate-400">{linkedinProfile.headline}</p>
                      )}
                    </div>
                  </div>
                  {linkedinProfile.profileUrl && (
                    <a
                      href={linkedinProfile.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View Profile <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {linkedinProfile.location && (
                  <p className="text-[11px] text-slate-400">{linkedinProfile.location}</p>
                )}

                {linkedinProfile.summary && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">About</h5>
                    <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                      {linkedinProfile.summary}
                    </p>
                  </div>
                )}

                {/* Extracted Experiences */}
                {linkedinProfile.experiences.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Extracted Experience ({linkedinProfile.experiences.length})
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {linkedinProfile.experiences.map((exp, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
                          <div className="text-xs font-bold text-white">{exp.title}</div>
                          {exp.company && <div className="text-[11px] text-blue-300">{exp.company}</div>}
                          {exp.duration && <div className="text-[10px] text-slate-500">{exp.duration}</div>}
                          {exp.description && (
                            <p className="text-[11px] text-slate-400 mt-1 whitespace-pre-line">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {linkedinProfile.skills.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Skills ({linkedinProfile.skills.length})
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedinProfile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleAppendLinkedIn}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Merge LinkedIn Details into Master Resume</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
