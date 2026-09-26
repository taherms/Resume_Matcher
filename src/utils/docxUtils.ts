import mammoth from 'mammoth';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from 'docx';

/**
 * Reads a .docx file and extracts raw text
 */
export async function parseDocxToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

export type DocxKind = 'resume' | 'letter';

// US Letter, 0.7" margins (twips)
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const PAGE_MARGIN = 1008;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const FONT = 'Calibri';
const BODY_SIZE = 21; // 10.5pt
const TEXT_COLOR = '1F2937';
const MUTED_COLOR = '4B5563';
const ACCENT_COLOR = '1E3A8A';
const LINK_COLOR = '1D4ED8';
const BULLET_REF = 'resume-bullets';
const NUMBER_REF = 'resume-numbers';

const SECTION_NAMES = [
  'summary', 'professional summary', 'career summary', 'executive summary', 'profile', 'professional profile',
  'objective', 'career objective', 'about', 'about me', 'experience', 'work experience', 'professional experience',
  'employment history', 'work history', 'relevant experience', 'skills', 'technical skills', 'core skills',
  'key skills', 'core competencies', 'competencies', 'areas of expertise', 'education', 'education & training',
  'certifications', 'licenses & certifications', 'certifications & licenses', 'projects', 'key projects',
  'personal projects', 'selected projects', 'achievements', 'key achievements', 'awards', 'honors & awards',
  'publications', 'languages', 'volunteer experience', 'volunteering', 'interests', 'references', 'training',
  'professional development', 'affiliations', 'leadership',
];

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_SPAN = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}(?:\\s*(?:[-–—]|to)\\s*(?:present|current|now|(?:${MONTH}\\s+)?(?:19|20)\\d{2}))?`;
// "June 2022 – Present", "2018 - 2020", "(2020)", "*Jan 2021 – Dec 2022*"
const PURE_DATE_LINE_RE = new RegExp(`^[*_(\\s]*${DATE_SPAN}[*_)\\s]*$`, 'i');
const DATE_SEGMENT_RE = new RegExp(`^${DATE_SPAN}$`, 'i');
// "Degree, University (2020)" or "Role, Company, 2019 – 2021"
const TRAILING_DATE_RE = new RegExp(`^(.*?)[\\s,–—-]*\\(?\\s*(${DATE_SPAN})\\s*\\)?$`, 'i');

type InlineChild = TextRun | ExternalHyperlink;

interface InlineStyle {
  size?: number;
  color?: string;
  bold?: boolean;
  italics?: boolean;
}

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([*_#|\-.])/g, '$1');
}

function stripMarkdown(text: string): string {
  return unescapeMarkdown(
    text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(^|[^*\w])[*_](?!\s)(.+?)[*_](?=[^*\w]|$)/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1'),
  ).trim();
}

function isSectionHeading(text: string): boolean {
  const plain = stripMarkdown(text).replace(/:$/, '').trim();
  if (SECTION_NAMES.includes(plain.toLowerCase())) return true;
  // Plain-text resumes: short ALL CAPS line, optionally ending with a colon ("WORK EXPERIENCE:")
  return plain.length <= 40 && /^[A-Z][A-Z &/,-]+$/.test(plain) && plain.split(/\s+/).length <= 5;
}

function looksLikeContactLine(text: string): boolean {
  return /@|https?:\/\/|www\.|linkedin|github|\+?\d[\d\s().-]{7,}\d|\s[|•·]\s/i.test(text);
}

/**
 * Parses **bold**, *italic*, ***bold italic***, `code` and [links](url) into runs
 */
function parseInlineFormatting(text: string, base: InlineStyle = {}): InlineChild[] {
  const runs: InlineChild[] = [];
  const tokenRe =
    /(\[([^\]]+)\]\(([^)]+)\))|(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(__(.+?)__)|(`([^`]+)`)|((?<![\w*])\*(?!\s)(.+?)\*(?![\w*]))|((?<!\w)_(?!\s)(.+?)_(?!\w))/g;
  const size = base.size ?? BODY_SIZE;
  const makeRun = (value: string, extra: InlineStyle = {}) =>
    new TextRun({
      text: unescapeMarkdown(value),
      font: FONT,
      size,
      color: extra.color ?? base.color ?? TEXT_COLOR,
      bold: extra.bold ?? base.bold,
      italics: extra.italics ?? base.italics,
    });

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text))) {
    if (match.index > lastIndex) runs.push(makeRun(text.slice(lastIndex, match.index)));
    if (match[1]) {
      const url = /^(https?:|mailto:)/i.test(match[3]) ? match[3] : `https://${match[3]}`;
      runs.push(
        new ExternalHyperlink({
          link: url,
          children: [new TextRun({ text: match[2], font: FONT, size, color: LINK_COLOR, underline: {} })],
        }),
      );
    } else if (match[4]) runs.push(makeRun(match[5], { bold: true, italics: true }));
    else if (match[6]) runs.push(makeRun(match[7], { bold: true }));
    else if (match[8]) runs.push(makeRun(match[9], { bold: true }));
    else if (match[10]) runs.push(makeRun(match[11]));
    else if (match[12]) runs.push(makeRun(match[13], { italics: true }));
    else if (match[14]) runs.push(makeRun(match[15], { italics: true }));
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < text.length) runs.push(makeRun(text.slice(lastIndex)));
  return runs;
}

/**
 * Bolds a leading "Category:" label (e.g. "Frontend: React, TypeScript") when the line has no bold of its own
 */
function withLabel(text: string): InlineChild[] {
  const label = text.match(/^([A-Za-z][\w &/+.#-]{0,35}):\s+(.+)$/);
  if (label && !text.includes('**') && !/^https?$/i.test(label[1])) {
    return [...parseInlineFormatting(`${label[1]}:`, { bold: true }), ...parseInlineFormatting(` ${label[2]}`)];
  }
  return parseInlineFormatting(text);
}

/**
 * Splits "Title | Company | Location | Jan 2021 – Present" into segments and a right-aligned date
 */
function splitRoleLine(text: string): { parts: string[]; date?: string } | null {
  let parts = text.split(/\s+[|•·]\s+/).map((p) => p.trim()).filter(Boolean);
  let date: string | undefined;

  const lastPlain = parts.length > 1 ? stripMarkdown(parts[parts.length - 1]).replace(/^\(|\)$/g, '') : '';
  if (lastPlain && DATE_SEGMENT_RE.test(lastPlain)) {
    parts.pop();
    date = lastPlain;
  } else {
    const trailing = stripMarkdown(text).match(TRAILING_DATE_RE);
    if (trailing && trailing[1].trim()) {
      date = trailing[2];
      parts = trailing[1].split(/\s+[|•·]\s+/).map((p) => p.trim()).filter(Boolean);
    }
  }

  if (!date && parts.length < 2) return null;
  return { parts, date };
}

function roleParagraph(parts: string[], date?: string): Paragraph {
  const [first, ...rest] = parts;
  const children: (InlineChild | TextRun)[] = parseInlineFormatting(stripMarkdown(first), { bold: true, size: 22 });
  if (rest.length) {
    children.push(...parseInlineFormatting(`  |  ${rest.map(stripMarkdown).join('  |  ')}`, { color: MUTED_COLOR }));
  }
  if (date) {
    children.push(new TextRun({ children: [new Tab(), date], font: FONT, size: BODY_SIZE, color: MUTED_COLOR, italics: true }));
  }
  return new Paragraph({
    keepNext: true,
    spacing: { before: 140, after: 40 },
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    children,
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 240, after: 80 },
    border: { bottom: { color: ACCENT_COLOR, space: 2, style: BorderStyle.SINGLE, size: 8 } },
    children: [
      new TextRun({
        text: stripMarkdown(text).replace(/:$/, '').toUpperCase(),
        bold: true,
        font: FONT,
        size: 23,
        color: ACCENT_COLOR,
        characterSpacing: 20,
      }),
    ],
  });
}

const BULLET_LINE_RE = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;

function buildResumeParagraphs(lines: string[]): Paragraph[] {
  const children: Paragraph[] = [];
  let inHeader = true;
  let headerLineCount = 0;
  let nameWritten = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\t/g, '    ');
    const trimmed = raw.trim();
    if (!trimmed || /^([-*_]\s*){3,}$/.test(trimmed)) continue;

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    const level = headingMatch ? headingMatch[1].length : 0;
    const content = headingMatch ? headingMatch[2].trim() : trimmed;
    const bulletMatch = level === 0 ? raw.match(BULLET_LINE_RE) : null;

    // Candidate name: first line of the document unless it is a known section heading or bullet
    // (checked against section names only, since plain-text resumes often write the name in ALL CAPS)
    const knownSection = SECTION_NAMES.includes(stripMarkdown(content).replace(/:$/, '').trim().toLowerCase());
    if (!nameWritten && children.length === 0 && !bulletMatch && !knownSection && content.length <= 60) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: stripMarkdown(content), bold: true, font: FONT, size: 40, color: ACCENT_COLOR })],
        }),
      );
      nameWritten = true;
      continue;
    }

    if ((level >= 1 && level <= 2) || (!bulletMatch && isSectionHeading(content))) {
      inHeader = false;
      children.push(sectionHeading(content));
      continue;
    }

    // Headline and contact details between the name and the first section
    if (inHeader && nameWritten && level === 0 && !bulletMatch) {
      const contact = looksLikeContactLine(content);
      const text = contact ? content.replace(/\s*[|•·]\s*/g, '  |  ') : content;
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: parseInlineFormatting(text, {
            size: contact ? 19 : 22,
            color: contact ? MUTED_COLOR : TEXT_COLOR,
            bold: !contact && headerLineCount === 0,
          }),
        }),
      );
      headerLineCount++;
      continue;
    }
    inHeader = false;

    // Role / education line ("Title | Company | Dates"), optionally followed by a date-only line
    const nextLine = (lines[i + 1] || '').trim();
    const couldBeRole = level === 3 || (!bulletMatch && level === 0 && content.length <= 140 && !/[.!?]$/.test(stripMarkdown(content)));
    if (couldBeRole && !PURE_DATE_LINE_RE.test(content)) {
      const role = splitRoleLine(content);
      if (role && !role.date && PURE_DATE_LINE_RE.test(nextLine)) {
        role.date = stripMarkdown(nextLine).replace(/^\(|\)$/g, '');
        i++;
      }
      if (role && (level === 3 || role.date || content.includes('**'))) {
        children.push(roleParagraph(role.parts, role.date));
        continue;
      }
      if (!role && PURE_DATE_LINE_RE.test(nextLine) && content.length <= 80) {
        children.push(roleParagraph([content], stripMarkdown(nextLine).replace(/^\(|\)$/g, '')));
        i++;
        continue;
      }
      if (level === 3) {
        children.push(roleParagraph([content]));
        continue;
      }
    }

    if (level >= 4) {
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 80, after: 40 },
          children: parseInlineFormatting(stripMarkdown(content), { bold: true, italics: true }),
        }),
      );
      continue;
    }

    if (PURE_DATE_LINE_RE.test(trimmed)) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: parseInlineFormatting(stripMarkdown(trimmed), { italics: true, color: MUTED_COLOR }),
        }),
      );
      continue;
    }

    if (bulletMatch) {
      const numbered = /\d/.test(bulletMatch[2]);
      children.push(
        new Paragraph({
          numbering: { reference: numbered ? NUMBER_REF : BULLET_REF, level: bulletMatch[1].length >= 2 ? 1 : 0 },
          spacing: { after: 40 },
          children: withLabel(bulletMatch[3]),
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80 },
        children: withLabel(content),
      }),
    );
  }

  return children;
}

function buildLetterParagraphs(lines: string[]): Paragraph[] {
  const children: Paragraph[] = [];
  let blankBefore = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blankBefore = children.length > 0;
      continue;
    }
    const bulletMatch = trimmed.match(/^([-*+•]|\d+[.)])\s+(.*)$/);
    const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    const text = bulletMatch ? bulletMatch[2] : headingMatch ? headingMatch[1] : trimmed;
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: blankBefore ? 200 : 0, after: 0, line: 276 },
        numbering: bulletMatch ? { reference: /\d/.test(bulletMatch[1]) ? NUMBER_REF : BULLET_REF, level: 0 } : undefined,
        children: parseInlineFormatting(text, { size: 22, bold: headingMatch ? true : undefined }),
      }),
    );
    blankBefore = false;
  }
  return children;
}

function listLevel(level: number, format: (typeof LevelFormat)[keyof typeof LevelFormat], text: string) {
  return {
    level,
    format,
    text,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: { indent: { left: 360 + level * 360, hanging: 260 } },
      run: { font: FONT, color: TEXT_COLOR },
    },
  };
}

/**
 * Converts Markdown (or plain-text) resume/cover letter text into a formatted native Word (.docx) document Blob
 */
export async function generateDocxBlob(markdownText: string, title?: string, kind: DocxKind = 'resume'): Promise<Blob> {
  const lines = markdownText.replace(/\r\n/g, '\n').split('\n');
  const children = kind === 'letter' ? buildLetterParagraphs(lines) : buildResumeParagraphs(lines);

  const doc = new Document({
    title: title || (kind === 'letter' ? 'Cover Letter' : 'Resume'),
    creator: 'ATS Resume Intelligence',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE, color: TEXT_COLOR },
          paragraph: { spacing: { line: 259 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: [listLevel(0, LevelFormat.BULLET, '•'), listLevel(1, LevelFormat.BULLET, '◦')],
        },
        {
          reference: NUMBER_REF,
          levels: [listLevel(0, LevelFormat.DECIMAL, '%1.'), listLevel(1, LevelFormat.LOWER_LETTER, '%2.')],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers a browser download of a .docx file
 */
export async function downloadAsDocx(
  markdownText: string,
  filename: string,
  title?: string,
  kind: DocxKind = 'resume',
): Promise<void> {
  const blob = await generateDocxBlob(markdownText, title, kind);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts Markdown text into a base64 encoded .docx string (useful for Gmail attachment MIME creation)
 */
export async function generateDocxBase64(markdownText: string, title?: string, kind: DocxKind = 'resume'): Promise<string> {
  const blob = await generateDocxBlob(markdownText, title, kind);
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
