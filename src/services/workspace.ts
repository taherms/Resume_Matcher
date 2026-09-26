// Google Workspace APIs Service: Google Drive and Gmail via access tokens

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  appProperties?: Record<string, string>;
}

const FOLDER_NAME = 'ATS Master & Tailored Resumes';

/**
 * Searches for or creates a dedicated application folder in user's Google Drive.
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Failed to query Google Drive: ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Drive folder: ${errText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * List files saved in the dedicated folder
 */
export async function listFolderFiles(accessToken: string, folderId: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink,appProperties)&orderBy=modifiedTime desc`;

  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Drive files: ${await res.text()}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a text file (Resume markdown/txt, cover letter, etc.) into Google Drive folder
 * Supports custom appProperties for rich metadata and version grouping
 */
export async function uploadTextFileToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  content: string,
  mimeType: string = 'text/plain',
  appProperties?: Record<string, string>
): Promise<DriveFileItem> {
  const metadata: any = {
    name: filename,
    parents: [folderId],
    mimeType: mimeType,
  };

  if (appProperties) {
    metadata.appProperties = appProperties;
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,modifiedTime,appProperties';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${errorBody}`);
  }

  return await res.json();
}

/**
 * Fetch text content of a Drive file
 */
export async function downloadFileContent(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file content: ${await res.text()}`);
  }

  return await res.text();
}

/**
 * Create a MIME multipart email draft in Gmail with attachments (Resume & Cover Letter)
 */
export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  attachments: Array<{ filename: string; content?: string; base64Content?: string; contentType?: string }>
): Promise<{ draftId: string; messageId: string }> {
  const boundary = 'boundary_email_ats_suite_' + Date.now();

  let mimeMessage = '';
  if (to && to.trim()) {
    mimeMessage += `To: ${to.trim()}\r\n`;
  }
  mimeMessage += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\n`;
  mimeMessage += 'MIME-Version: 1.0\r\n';
  mimeMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // Main text body
  mimeMessage += `--${boundary}\r\n`;
  mimeMessage += 'Content-Type: text/plain; charset="UTF-8"\r\n';
  mimeMessage += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
  mimeMessage += bodyText + '\r\n\r\n';

  // Attachments
  for (const att of attachments) {
    const safeContentType = att.contentType || 'text/plain';
    const base64Data = att.base64Content || (att.content ? btoa(unescape(encodeURIComponent(att.content))) : '');
    mimeMessage += `--${boundary}\r\n`;
    mimeMessage += `Content-Type: ${safeContentType}; name="${att.filename}"\r\n`;
    mimeMessage += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
    mimeMessage += 'Content-Transfer-Encoding: base64\r\n\r\n';
    mimeMessage += base64Data + '\r\n\r\n';
  }

  mimeMessage += `--${boundary}--`;

  // Encode the entire MIME message in web-safe base64
  const rawBase64 = btoa(unescape(encodeURIComponent(mimeMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const draftRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: rawBase64,
      },
    }),
  });

  if (!draftRes.ok) {
    const errText = await draftRes.text();
    throw new Error(`Failed to create Gmail draft: ${errText}`);
  }

  const data = await draftRes.json();
  return {
    draftId: data.id,
    messageId: data.message?.id,
  };
}
