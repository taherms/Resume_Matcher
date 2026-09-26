import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackEvaluation, calculateKeywordMatchScore } from '../server';
import { parseLinkedInProfileText } from '../src/services/linkedinService';

test('calculateKeywordMatchScore returns a realistic ATS score', () => {
  const score = calculateKeywordMatchScore(
    'Senior React engineer with TypeScript, AWS, Node.js, CI/CD, leadership',
    'Senior React developer with TypeScript, Node.js, and leadership experience across frontend systems'
  );

  assert.ok(score >= 40 && score <= 100, 'score should be in a valid range');
});

test('buildFallbackEvaluation returns a complete ATS result payload', () => {
  const result = buildFallbackEvaluation(
    'Senior React engineer with TypeScript, Node.js, AWS, leadership',
    'React engineer with TypeScript, Node.js, frontend leadership experience'
  );

  assert.equal(typeof result.masterScore, 'number');
  assert.equal(typeof result.evaluationSummary, 'string');
  assert.ok(Array.isArray(result.differences.missingKeywords));
  assert.ok(Array.isArray(result.updatedResume.keyImprovements));
  assert.ok(typeof result.coverLetter.letterText, 'string');
  assert.ok(typeof result.emailDraft.body, 'string');
});

test('parseLinkedInProfileText extracts meaningful profile data from pasted text and URL input', () => {
  const profile = parseLinkedInProfileText(
    `Jane Doe
Senior Software Engineer\n\nAbout\nProduct engineer building platform tools and AI workflows.\n\nExperience\nSenior Software Engineer\nAcme Inc\n2022 - Present\nBuilt internal tooling and deployment automation.\n\nSkills\nTypeScript • React • Node.js • Python`,
    'https://www.linkedin.com/in/janedoe'
  );

  assert.match(profile.profileUrl, /linkedin\.com\/in\/janedoe/i);
  assert.ok(profile.experiences.length >= 1);
  assert.ok(profile.skills.length >= 3);
  assert.ok(profile.summary?.length ?? 0 > 0);
});
