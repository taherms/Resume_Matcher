import React, { useState } from 'react';
import { Mail, Download, Copy, Check, Send, Sparkles, Paperclip, ExternalLink } from 'lucide-react';
import { CoverLetterData, EmailDraftData } from '../types';
import { downloadAsFile, copyToClipboard } from '../utils/fileHelpers';
import { downloadAsDocx, generateDocxBase64 } from '../utils/docxUtils';
import { createGmailDraft, uploadTextFileToDrive } from '../services/workspace';

interface CoverLetterEmailProps {
  coverLetter: CoverLetterData;
  emailDraft: EmailDraftData;
  updatedResumeText: string;
  accessToken: string | null;
  driveFolderId: string | null;
  onRefreshDrive?: () => void;
  companyName?: string;
}

export const CoverLetterEmail: React.FC<CoverLetterEmailProps> = ({
  coverLetter,
  emailDraft,
  updatedResumeText,
  accessToken,
  driveFolderId,
  onRefreshDrive,
  companyName,
}) => {
  const [activeSection, setActiveSection] = useState<'cover' | 'email'>('cover');
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Editable email state
  const [emailTo, setEmailTo] = useState(emailDraft.recipient || '');
  const [emailSubject, setEmailSubject] = useState(emailDraft.subject || '');
  const [emailBody, setEmailBody] = useState(emailDraft.body || '');

  // Gmail drafting status
  const [draftingGmail, setDraftingGmail] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Saving cover letter to drive
  const [savingCoverToDrive, setSavingCoverToDrive] = useState(false);
  const [coverDriveMsg, setCoverDriveMsg] = useState<string | null>(null);

  const handleCopyCover = async () => {
    const ok = await copyToClipboard(coverLetter.letterText);
    if (ok) {
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2000);
    }
  };

  const handleCopyEmail = async () => {
    const fullEmail = `To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`;
    const ok = await copyToClipboard(fullEmail);
    if (ok) {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleDownloadCoverLetter = () => {
    downloadAsFile('Cover_Letter_Tailored.txt', coverLetter.letterText, 'text/plain');
  };

  const handleDownloadCoverLetterDocx = async () => {
    const safeCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Tailored';
    await downloadAsDocx(coverLetter.letterText, `Cover_Letter_${safeCompany}.docx`, coverLetter.subject || 'Cover Letter', 'letter');
  };

  const handleDownloadEmailDraft = () => {
    const fullDraft = `To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`;
    downloadAsFile('Hiring_Manager_Email_Draft.txt', fullDraft, 'text/plain');
  };

  const handleSaveCoverToDrive = async () => {
    if (!accessToken || !driveFolderId) {
      setCoverDriveMsg('Please connect Google Drive first.');
      return;
    }
    setSavingCoverToDrive(true);
    setCoverDriveMsg(null);
    try {
      const safeCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Tailored';
      const filename = `Cover_Letter_${safeCompany}.txt`;
      const uploaded = await uploadTextFileToDrive(
        accessToken,
        driveFolderId,
        filename,
        coverLetter.letterText,
        'text/plain'
      );
      setCoverDriveMsg(`Saved Cover Letter to Drive: "${uploaded.name}"`);
      if (onRefreshDrive) onRefreshDrive();
    } catch (e: any) {
      setCoverDriveMsg(`Failed to save: ${e.message || e}`);
    } finally {
      setSavingCoverToDrive(false);
    }
  };

  const handleCreateDraftInGmail = async () => {
    if (!accessToken) {
      setDraftError('Please sign in with Google Workspace to draft directly in Gmail.');
      return;
    }
    setDraftingGmail(true);
    setDraftError(null);
    setDraftSuccess(null);

    try {
      const safeCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Application';
      const resumeFilename = `Resume_${safeCompany}.docx`;
      const coverFilename = `Cover_Letter_${safeCompany}.docx`;

      const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const resumeBase64 = await generateDocxBase64(updatedResumeText, 'Tailored Resume');
      const coverBase64 = await generateDocxBase64(coverLetter.letterText, coverLetter.subject || 'Cover Letter', 'letter');

      const attachments = [
        {
          filename: resumeFilename,
          base64Content: resumeBase64,
          contentType: docxMime,
        },
        {
          filename: coverFilename,
          base64Content: coverBase64,
          contentType: docxMime,
        },
      ];

      const res = await createGmailDraft(
        accessToken,
        emailTo,
        emailSubject,
        emailBody,
        attachments
      );

      setDraftSuccess(
        `Gmail draft created successfully with "${resumeFilename}" and "${coverFilename}" (.docx) attachments! Open Gmail Drafts to review and send.`
      );
    } catch (err: any) {
      setDraftError(`Gmail draft error: ${err.message || err}`);
    } finally {
      setDraftingGmail(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      {/* Tab selection */}
      <div className="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('cover')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeSection === 'cover'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Tailored Cover Letter
          </button>
          <button
            onClick={() => setActiveSection('email')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeSection === 'email'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            Hiring Manager Email Draft
          </button>
        </div>

        {/* Global quick actions */}
        <div className="flex items-center gap-2">
          {activeSection === 'cover' ? (
            <>
              <button
                onClick={handleCopyCover}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
              >
                {copiedCover ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCover ? 'Copied' : 'Copy Letter'}
              </button>
              <button
                onClick={handleDownloadCoverLetter}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" /> Download .txt
              </button>
              <button
                onClick={handleDownloadCoverLetterDocx}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 transition-colors flex items-center gap-1.5 border border-blue-500/40"
              >
                <Download className="w-3.5 h-3.5 text-blue-300" /> Download .docx
              </button>
              {accessToken && driveFolderId && (
                <button
                  onClick={handleSaveCoverToDrive}
                  disabled={savingCoverToDrive}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 transition-colors flex items-center gap-1.5 border border-indigo-500/40 disabled:opacity-50"
                >
                  {savingCoverToDrive ? 'Saving...' : 'Save to Drive'}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEmail ? 'Copied' : 'Copy Email'}
              </button>
              <button
                onClick={handleDownloadEmailDraft}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 border border-slate-700/60"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" /> Download .txt
              </button>
            </>
          )}
        </div>
      </div>

      {coverDriveMsg && (
        <div className="px-6 py-2 bg-indigo-950/40 border-b border-indigo-900/50 text-xs text-indigo-300">
          {coverDriveMsg}
        </div>
      )}

      {/* Content Body */}
      <div className="p-6">
        {activeSection === 'cover' ? (
          <div>
            <div className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {coverLetter.subject}
            </div>
            <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-5 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[500px] overflow-y-auto">
              {coverLetter.letterText}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct Gmail Draft Action Card */}
            <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  Instant Gmail Draft with Attachments
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sends this email directly into your connected Gmail drafts, pre-attaching both your tailored ATS Resume
                  and Cover Letter.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateDraftInGmail}
                  disabled={draftingGmail || !accessToken}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2 shadow-md shadow-cyan-900/30 disabled:opacity-50 shrink-0"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {draftingGmail ? 'Creating Draft in Gmail...' : 'Draft in Gmail Ready to Send'}
                </button>
              </div>
            </div>

            {draftSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div className="flex-1">
                  <span>{draftSuccess}</span>
                  <a
                    href="https://mail.google.com/mail/u/0/#drafts"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 font-semibold underline text-emerald-200 hover:text-white inline-flex items-center gap-1"
                  >
                    Open Gmail Drafts <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {draftError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {draftError}
              </div>
            )}

            {/* Email form preview/editor */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">To (Hiring Manager / Recruiter)</label>
                <input
                  type="text"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="e.g. hiring.manager@company.com or Recruiting Team"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Body</label>
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                />
              </div>

              {/* Attachments preview badge */}
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/80">
                <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ready attachments:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  Resume_ATS_Tailored.txt
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  Cover_Letter.txt
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
