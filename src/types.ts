export interface ATSDifferences {
  missingKeywords: string[];
  missingQualifications: string[];
  matchedStrengths: string[];
  recommendations: string[];
}

export interface UpdatedResumeData {
  score: number;
  resumeText: string;
  keyImprovements: string[];
}

export interface CoverLetterData {
  subject: string;
  letterText: string;
}

export interface EmailDraftData {
  subject: string;
  recipient: string;
  body: string;
}

export interface ResumeIterationRecord {
  id: string;
  version: number;
  fileName: string;
  masterResumeId?: string;
  masterResumeName: string;
  targetRoleOrCompany: string;
  score: number;
  date: string;
  driveFileId?: string;
  webViewLink?: string;
  improvementsSummary?: string;
}

export interface MasterResumeProfile {
  id: string;
  title: string;
  fileName: string;
  driveFileId?: string;
  modifiedTime?: string;
  latestScore?: number;
  iterationsCount: number;
  iterations: ResumeIterationRecord[];
}

export interface EvaluationRunRecord {
  id: string;
  runIndex: number;
  timestamp: string;
  roleOrCompany: string;
  masterScore: number;
  tailoredScore: number;
  improvement: number;
}

export interface ATSEvaluationResult {
  masterScore: number;
  isBelowThreshold: boolean;
  evaluationSummary: string;
  differences: ATSDifferences;
  updatedResume: UpdatedResumeData;
  coverLetter: CoverLetterData;
  emailDraft: EmailDraftData;
}
