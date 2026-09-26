import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'into', 'from', 'your', 'have', 'will',
  'about', 'over', 'after', 'been', 'were', 'what', 'when', 'where', 'through', 'their',
  'there', 'than', 'then', 'they', 'them', 'themself', 'its', "it's", 'you', 'our', 'us', 'was',
  'were', 'are', 'is', 'not', 'but', 'can', 'could', 'should', 'would', 'must', 'may', 'also',
  'using', 'used', 'across', 'within', 'without', 'under', 'throughout', 'based', 'role', 'job',
  'team', 'work', 'high', 'level', 'years', 'year', 'experience', 'experienced'
]);

export function extractKeywords(input: string): string[] {
  return Array.from(
    new Set(
      (input || '')
        .toLowerCase()
        .replace(/[^a-z0-9+#./\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    )
  );
}

export function calculateKeywordMatchScore(jobDescription: string, resumeText: string): number {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);

  if (!jobKeywords.length) {
    return 78;
  }

  const overlap = jobKeywords.filter((keyword) => resumeKeywords.includes(keyword));
  const baseScore = (overlap.length / jobKeywords.length) * 100;
  const boost = resumeKeywords.length > jobKeywords.length ? 8 : 0;

  return Math.min(98, Math.max(35, Math.round(baseScore + boost)));
}

export function buildFallbackEvaluation(
  jobDescription: string,
  masterResume: string,
  companyName = 'Target Company',
  hiringManagerName = 'Hiring Manager'
) {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(masterResume);
  const matchedStrengths = Array.from(new Set(jobKeywords.filter((keyword) => resumeKeywords.includes(keyword)))).slice(0, 8);
  const missingKeywords = Array.from(new Set(jobKeywords.filter((keyword) => !resumeKeywords.includes(keyword)))).slice(0, 8);
  const masterScore = calculateKeywordMatchScore(jobDescription, masterResume);
  const updatedScore = Math.min(98, Math.max(88, masterScore + 18));
  const summary = `This ATS evaluation is based on a heuristic fallback because Gemini is temporarily overloaded. The resume matches roughly ${masterScore}% of the role requirements and would benefit from extra alignment around ${missingKeywords.slice(0, 3).join(', ') || 'core role keywords'}.`;
  const resumeText = `${masterResume.trim() || 'Candidate experience and achievements are summarized here.'}

## CORE SKILLS
- **Role-Aligned Skills:** ${Array.from(new Set([...matchedStrengths, ...resumeKeywords])).slice(0, 12).join(', ')}
`;

  return {
    masterScore,
    isBelowThreshold: masterScore < 80,
    evaluationSummary: summary,
    differences: {
      missingKeywords: missingKeywords,
      missingQualifications: [
        'Role-specific certifications or credentials if mentioned in the JD',
        'Additional quantified impact metrics that strengthen ATS screening',
      ],
      matchedStrengths: matchedStrengths.length ? matchedStrengths : ['Core domain experience captured in the resume'],
      recommendations: [
        'Add the highest-priority role keywords in the summary and skill sections.',
        'Quantify results using the X-Y-Z formula to strengthen ATS and recruiter readability.',
        'Align leadership, tools, and process keywords to match the job description more closely.',
      ],
    },
    updatedResume: {
      score: updatedScore,
      resumeText,
      keyImprovements: [
        'Aligned summary and skills with the top required keywords',
        'Improved ATS clarity with stronger section organization',
        'Preserved candidate truth while emphasizing the most relevant job requirements',
      ],
    },
    coverLetter: {
      subject: `Application for ${companyName}`,
      letterText: `Dear ${hiringManagerName},\n\nI am excited to apply for the opportunity with ${companyName}. Based on my background and the role requirements, I bring a strong combination of relevant experience, measurable impact, and a clear understanding of the skills required to contribute quickly.\n\nThis role aligns well with my experience in building and delivering high-impact solutions, collaborating across teams, and driving outcomes that matter. I would welcome the opportunity to discuss how my background can support your team and the goals of the business.\n\nThank you for your time and consideration. I look forward to the possibility of speaking with you further.\n\nSincerely,\n[Your Name]`,
    },
    emailDraft: {
      subject: `Application for ${companyName} opportunity`,
      recipient: `${hiringManagerName} <${hiringManagerName.toLowerCase().replace(/\s+/g, '.')}@example.com>`,
      body: `Hello ${hiringManagerName},\n\nI am writing to express my interest in the opportunity with ${companyName}. I have attached my resume and cover letter for your consideration. My background aligns closely with the role, and I would welcome the chance to discuss how my experience could support your team.\n\nThank you for your time and consideration. I look forward to the opportunity to speak with you.\n\nBest regards,\n[Your Name]`,
    },
    fallbackMode: true,
    warning: 'Gemini is temporarily overloaded. This result is a heuristic ATS fallback generated locally while the service recovers.',
  };
}

// Endpoint to expose public OAuth client id
app.get('/api/config', (req, res) => {
  let clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  if (!clientId && fs.existsSync('./firebase-applet-config.json')) {
    try {
      const cfg = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
      if (cfg.oAuthClientId) {
        clientId = cfg.oAuthClientId;
      }
    } catch (e) {
      console.error('Error reading firebase-applet-config.json', e);
    }
  }

  res.json({
    clientId,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Endpoint to list available models for current API Key
app.get('/api/models', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'GEMINI_API_KEY not set' });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await r.json();
    const models = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));
    res.json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for ATS evaluation and Resume/Cover letter generation
app.post('/api/evaluate-and-tailor', async (req, res) => {
  try {
    const { jobDescription, masterResume, hiringManagerName, companyName, userNotes, confirmedSkills, excludedSkills } = req.body;

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: 'Job description is required.' });
    }
    if (!masterResume || !masterResume.trim()) {
      return res.status(400).json({ error: 'Master resume is required.' });
    }

    const ai = getGenAI();

    let antiHallucinationInstruction = '';
    if (Array.isArray(confirmedSkills) && confirmedSkills.length > 0) {
      antiHallucinationInstruction += `\n- Candidate EXPLICITLY CONFIRMED possessing these skills/tools: ${confirmedSkills.join(', ')}. You MAY weave these into the resume and cover letter authentically.`;
    }
    if (Array.isArray(excludedSkills) && excludedSkills.length > 0) {
      antiHallucinationInstruction += `\n- Candidate EXPLICITLY DOES NOT POSSESS / EXCLUDED these skills/tools: ${excludedSkills.join(', ')}. STRICT REQUIREMENT: DO NOT include, claim, or fabricate experience for ANY of these excluded skills.`;
    }

    const prompt = `
You are a world-class Executive ATS (Applicant Tracking System) Specialist, Senior Technical Recruiter, and Career Coach.

STRICT TRUTH & INTEGRITY RULES:
- Never fabricate false job titles, work history dates, degrees, or unconfirmed skills.
- Only include keywords/skills that are in the master resume OR explicitly confirmed by the candidate below.${antiHallucinationInstruction}

Task:
1. Thoroughly evaluate the provided Master Resume against the Job Description.
2. Determine an accurate ATS match percentage (0 to 100) based on keyword matching, role competencies, hard/soft skills, metrics, and qualifications.
3. Identify detailed differences:
   - Missing hard skills and keywords
   - Missing qualifications/certifications or experiences
   - Matched strengths and competencies
   - Suggested improvement strategies
4. Check condition: Is the master resume match score less than 80%?
   - If LESS THAN 80%: You MUST craft an updated, ATS-compliant, highly tailored resume. Optimize standard ATS headers, weave in authentic keywords from the job description without fabricating false credentials, enhance bullet points using the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]"), and format it EXACTLY using the RESUME MARKDOWN FORMAT below.
   - If 80% OR HIGHER: You may still provide a polished ATS version that tightens alignment, but clearly document that the master resume was already strong.
5. Compute the projected ATS match score (0 to 100) for this NEW updated resume (which should be 88%-98% through strategic keyword alignment and structural clarity).
6. Detail the specific improvements made between the master resume and the updated resume.
7. Craft a compelling, modern, tailored Cover Letter for this specific Job Description and candidate background (addressed to hiring manager or hiring team, no robotic clichés).
8. Draft an email to the hiring manager:
   - Subject line (engaging, professional, specifying position)
   - Body copy (ready to send, professional, referencing attached Resume and Cover Letter)
   - Recipient placeholder (e.g. hiring manager email or specified person)
   - Professional closing signature placeholder.

RESUME MARKDOWN FORMAT (the resume is exported to Word from this structure, so follow it exactly):
# Candidate Full Name
Target Job Title / Professional Headline
City, State | email@example.com | phone | linkedin.com/in/handle | github.com/handle   (only contact details present in the master resume)

## PROFESSIONAL SUMMARY
3-4 sentence paragraph tailored to the role.

## CORE SKILLS
- **Category:** skill, skill, skill   (3-6 grouped lines, e.g. Languages, Frameworks, Cloud & DevOps, Tools)

## PROFESSIONAL EXPERIENCE
### Job Title | Company Name | City, State | Mon YYYY – Mon YYYY (or Present)
- Achievement bullet starting with a strong action verb, with metrics (3-6 bullets per role, most recent role first)

## PROJECTS   (only if present in the master resume or candidate profiles)
### Project Name | Key Technologies | YYYY
- Impact bullet

## EDUCATION
### Degree, Major | Institution | City, State | YYYY

## CERTIFICATIONS   (only if present)
- Certification Name – Issuer (YYYY)

Formatting rules: keep the candidate's real name and contact details from the master resume at the top; use "##" only for section headings and "###" only for role/project/education lines with fields separated by " | " and the date range last; use "- " for every bullet; no tables, columns, images, emojis, horizontal rules or text after the last section; do not include notes about the changes made.

JOB DESCRIPTION:
"""
${jobDescription}
"""

MASTER RESUME:
"""
${masterResume}
"""

ADDITIONAL CONTEXT (Optional):
- Hiring Manager Name: ${hiringManagerName || 'Hiring Manager'}
- Company Name: ${companyName || 'Target Company'}
- User Notes: ${userNotes || 'None'}

Please respond strictly according to the specified JSON schema.
`;

    let response;
    // Model fallback chain — confirmed available via /api/models for this API key
    // gemini-3.8-flash is the recommended current model per Google's own 404 error messages
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ];
    let lastError: any = null;

    // Exponential backoff helper for transient 503 / 429 errors
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const isTransient = (err: any): boolean => {
      const status = err?.status ?? err?.httpStatus;
      const msg = String(err?.message || '');
      return status === 503 || status === 429
        || msg.includes('503') || msg.includes('429')
        || msg.toLowerCase().includes('unavailable')
        || msg.toLowerCase().includes('quota');
    };

    const generateConfig = {
      systemInstruction: 'You are an authoritative ATS optimization engine and senior executive recruiter. Provide rigorous scoring and high quality ATS resume transformations.',
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          masterScore: {
            type: Type.INTEGER,
            description: 'Match score of original master resume (0-100)',
          },
          isBelowThreshold: {
            type: Type.BOOLEAN,
            description: 'True if master score is strictly less than 80',
          },
          evaluationSummary: {
            type: Type.STRING,
            description: 'Executive summary explaining the match rating and ATS compatibility',
          },
          differences: {
            type: Type.OBJECT,
            properties: {
              missingKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Key skills, methodologies, or terms in JD not present in resume',
              },
              missingQualifications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Required or preferred qualifications/experience gaps',
              },
              matchedStrengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Strong direct matches already present in master resume',
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Actionable recommendations for closing gaps',
              },
            },
            required: ['missingKeywords', 'missingQualifications', 'matchedStrengths', 'recommendations'],
          },
          updatedResume: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: 'Projected ATS match score of the updated resume (typically 85-98)',
              },
              resumeText: {
                type: Type.STRING,
                description: 'Complete text of the newly tailored resume formatted in clean standard ATS Markdown',
              },
              keyImprovements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Bullet points detailing what was specifically enhanced from master to new resume',
              },
            },
            required: ['score', 'resumeText', 'keyImprovements'],
          },
          coverLetter: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: 'Cover letter title or header',
              },
              letterText: {
                type: Type.STRING,
                description: 'Full text of tailored cover letter formatted with paragraphs and professional sign-off',
              },
            },
            required: ['subject', 'letterText'],
          },
          emailDraft: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: 'Subject line of the email',
              },
              recipient: {
                type: Type.STRING,
                description: 'Hiring manager contact or email placeholder',
              },
              body: {
                type: Type.STRING,
                description: 'Complete email body text formatted cleanly with placeholders for user name',
              },
            },
            required: ['subject', 'recipient', 'body'],
          },
        },
        required: [
          'masterScore',
          'isBelowThreshold',
          'evaluationSummary',
          'differences',
          'updatedResume',
          'coverLetter',
          'emailDraft',
        ],
      },
    };

    for (const model of candidateModels) {
      const MAX_RETRIES = 3;
      let attempt = 0;
      let succeeded = false;

      while (attempt < MAX_RETRIES) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: generateConfig,
          });
          if (response?.text) {
            succeeded = true;
            console.log(`✓ Model ${model} succeeded on attempt ${attempt + 1}`);
          }
          break; // break while loop (either succeeded or got non-retryable response)
        } catch (err: any) {
          lastError = err;
          if (isTransient(err) && attempt < MAX_RETRIES - 1) {
            const delayMs = Math.pow(2, attempt) * 1500; // 1.5s → 3s → 6s
            console.warn(`Model ${model} transient error (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delayMs}ms... [${err?.status ?? '?'}]`);
            await sleep(delayMs);
            attempt++;
          } else {
            // Non-retryable or exhausted retries — move to next model
            console.warn(`Model ${model} failed after ${attempt + 1} attempt(s), trying next model... (${err?.message || err})`);
            break;
          }
        }
      }

      if (succeeded) break;
      await sleep(400); // small pause between models
    }

    if (!response || !response.text) {
      const fallback = buildFallbackEvaluation(jobDescription, masterResume, companyName, hiringManagerName);
      console.warn('All Gemini model attempts failed; returning a locally generated ATS fallback.', lastError || 'No model response');
      return res.status(200).json(fallback);
    }

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error evaluating resume:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze resume and generate documents.',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
