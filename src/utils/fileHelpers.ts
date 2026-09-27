export function downloadAsFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
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

