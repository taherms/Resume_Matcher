// LinkedIn Profile Data Extraction & Integration Service

export interface LinkedInExperienceItem {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface LinkedInProfileData {
  profileUrl: string;
  fullName?: string;
  headline?: string;
  summary?: string;
  location?: string;
  experiences: LinkedInExperienceItem[];
  skills: string[];
}

/**
 * Extracts username/vanity ID from LinkedIn URL
 */
export function extractLinkedInVanityId(urlOrText: string): string {
  const match = urlOrText.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : urlOrText.trim().replace(/^@/, '');
}

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
// "Jan 2021 - Present · 4 yrs", "2018 – 2020", "January 2021 - Present (4 years 9 months)"
const DATE_RANGE_RE = new RegExp(`^(?:${MONTH}\\s+)?\\d{4}\\s*[-–—]\\s*(?:present|current|now|(?:${MONTH}\\s+)?\\d{4})`, 'i');
// LinkedIn PDF export puts the total duration in parentheses and lists company before title
const PDF_DURATION_RE = /\(\s*(?:less than a year|\d+\s+(?:years?|months?))/i;
const EMPLOYMENT_TYPES = 'full-time|part-time|contract|internship|freelance|self-employed|apprenticeship|seasonal|temporary';
const EMPLOYMENT_SUFFIX_RE = new RegExp(`\\s*·\\s*(?:${EMPLOYMENT_TYPES})\\s*$`, 'i');
// Header of grouped roles at one company, e.g. "Full-time · 5 yrs 3 mos" or "5 yrs 3 mos"
const GROUP_DURATION_RE = new RegExp(`^(?:(?:${EMPLOYMENT_TYPES})\\s*·\\s*)?\\d+\\s+(?:yrs?|mos?|years?|months?)(?:\\s+\\d+\\s+(?:mos?|months?))?$`, 'i');
const LOCATION_RE = /\b(remote|on-site|onsite|hybrid)\b|^[^.!?]{2,60},\s*[^.!?]{2,40}$/i;

const SECTION_ABOUT_RE = /^(about|summary|about me)$/i;
const SECTION_EXPERIENCE_RE = /^(experience|work experience|employment history)$/i;
const SECTION_SKILLS_RE = /^(skills|skills & endorsements|featured skills|top skills)$/i;
const SECTION_OTHER_RE =
  /^(education|licenses? & certifications|certifications|projects|volunteering|volunteer experience|honors & awards|honors-awards|languages|recommendations|interests|activity|featured|courses|publications|patents|organizations|test scores|causes|contact|contact info|people also viewed|people you may know|analytics|resources)$/i;

// UI chrome LinkedIn includes when a profile page is copied
const NOISE_RE =
  /^(…?\s*see more|see less|show all.*|show more.*|contact info|message|follow|following|connect|more|open to|add profile section|enhance profile|resources|\d+\+?\s+(connections|followers)|·\s*(1st|2nd|3rd\+?)|(1st|2nd|3rd\+?)|endorsed by .*|\d+\s+endorsements?|passed linkedin skill assessment|.* has a skill assessment.*|profile language|public profile & url)$/i;

/**
 * Parses raw text copied from a LinkedIn profile page or its PDF export into structured sections
 */
export function parseLinkedInProfileText(rawText: string, profileUrl?: string): LinkedInProfileData {
  const lines: string[] = [];
  for (const raw of rawText.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || NOISE_RE.test(line)) continue;
    // LinkedIn duplicates most headings/titles as hidden screen-reader text
    if (lines.length && lines[lines.length - 1] === line) continue;
    lines.push(line);
  }

  const headerLines: string[] = [];
  let summary = '';
  const experiences: LinkedInExperienceItem[] = [];
  const skills: string[] = [];

  let currentSection: 'header' | 'about' | 'experience' | 'skills' | 'other' = 'header';
  // Lines seen since the last date line, not yet assigned to a role
  let pending: string[] = [];
  let groupCompany = '';
  let lastLineWasDate = false;

  const flushPendingIntoLastExperience = () => {
    const last = experiences[experiences.length - 1];
    if (last && pending.length) {
      last.description = [last.description, ...pending].filter(Boolean).join('\n');
    }
    pending = [];
  };

  for (const line of lines) {
    const nextSection = SECTION_ABOUT_RE.test(line)
      ? 'about'
      : SECTION_EXPERIENCE_RE.test(line)
        ? 'experience'
        : SECTION_SKILLS_RE.test(line)
          ? 'skills'
          : SECTION_OTHER_RE.test(line)
            ? 'other'
            : null;
    if (nextSection) {
      if (currentSection === 'experience') flushPendingIntoLastExperience();
      currentSection = nextSection;
      groupCompany = '';
      lastLineWasDate = false;
      continue;
    }

    if (currentSection === 'header') {
      headerLines.push(line);
    } else if (currentSection === 'about') {
      summary += (summary ? ' ' : '') + line;
    } else if (currentSection === 'experience') {
      if (DATE_RANGE_RE.test(line)) {
        const isPdfFormat = PDF_DURATION_RE.test(line);
        let title = '';
        let company = '';
        if (groupCompany && pending.length) {
          title = pending.pop()!;
          company = groupCompany;
        } else if (pending.length >= 2) {
          const second = pending.pop()!;
          const first = pending.pop()!;
          [title, company] = isPdfFormat ? [second, first] : [first, second];
        } else if (pending.length === 1) {
          title = pending.pop()!;
        }
        flushPendingIntoLastExperience();
        if (title) {
          experiences.push({
            title,
            company: company.replace(EMPLOYMENT_SUFFIX_RE, '').trim(),
            duration: line,
            description: '',
          });
        }
        lastLineWasDate = true;
        continue;
      }

      if (GROUP_DURATION_RE.test(line) && pending.length) {
        // Previous line was the company heading several roles
        const company = pending.pop()!;
        flushPendingIntoLastExperience();
        groupCompany = company;
        lastLineWasDate = false;
        continue;
      }

      if (EMPLOYMENT_SUFFIX_RE.test(line)) {
        // "Acme Corp · Full-time" starts a standalone role, ending any grouped roles
        groupCompany = '';
      }

      if (lastLineWasDate && LOCATION_RE.test(line) && line.length < 80) {
        // Location line right after the dates; not useful in the description
        lastLineWasDate = false;
        continue;
      }
      lastLineWasDate = false;
      pending.push(line);
    } else if (currentSection === 'skills') {
      const splitSkills = line
        .split(/[•,·|]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40 && !/\b(at|endorse|experiences? across|compan(y|ies))\b/i.test(s));
      skills.push(...splitSkills);
    }
  }
  if (currentSection === 'experience') flushPendingIntoLastExperience();

  const headerCandidates = headerLines.filter((l) => !l.includes('http') && !l.includes('@'));
  const fullName = headerCandidates[0] && headerCandidates[0].length < 60 ? headerCandidates[0] : '';
  const headline = headerCandidates[1] && headerCandidates[1].length < 220 ? headerCandidates[1] : '';
  const location =
    headerCandidates.slice(2).find((l) => LOCATION_RE.test(l) && l.length < 80) ||
    (headerCandidates[2] && headerCandidates[2].length < 60 && !/\d/.test(headerCandidates[2]) ? headerCandidates[2] : '');

  const vanity = extractLinkedInVanityId(profileUrl || '');
  const cleanUrl = vanity ? `https://www.linkedin.com/in/${vanity}` : profileUrl || '';

  return {
    profileUrl: cleanUrl,
    fullName: fullName || undefined,
    headline: headline || undefined,
    summary: summary || undefined,
    location: location || undefined,
    experiences: experiences.map((exp) => ({ ...exp, description: exp.description || undefined })),
    skills: Array.from(new Set(skills)),
  };
}

/**
 * Formats LinkedIn profile data into clean Markdown text to append into Master Resume
 */
export function formatLinkedInDataToMarkdown(data: LinkedInProfileData): string {
  let md = `\n\n# LINKEDIN PROFESSIONAL PROFILE & EXPERIENCE\n`;
  if (data.profileUrl) md += `**LinkedIn Profile:** [${data.profileUrl}](${data.profileUrl})\n`;
  if (data.headline) md += `**Professional Headline:** ${data.headline}\n`;
  if (data.location) md += `**Location:** ${data.location}\n`;
  if (data.summary) md += `**Executive Summary:** ${data.summary}\n`;

  if (data.experiences.length > 0) {
    md += `\n## LinkedIn Work History\n`;
    data.experiences.forEach((exp) => {
      const companyStr = exp.company ? ` at ${exp.company}` : '';
      const durStr = exp.duration ? ` (${exp.duration})` : '';
      md += `- **${exp.title}**${companyStr}${durStr}\n`;
      if (exp.description) {
        const descLines = exp.description.split('\n').map((l) => `  ${l}`).join('\n');
        md += `${descLines}\n`;
      }
    });
  }

  if (data.skills.length > 0) {
    md += `\n## Endorsed LinkedIn Skills\n- ${data.skills.join(', ')}\n`;
  }

  return md;
}
