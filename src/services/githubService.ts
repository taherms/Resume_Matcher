// GitHub REST API Integration Service

export interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  topics: string[];
  updatedAt: string;
}

export interface GitHubProfileData {
  username: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  avatarUrl: string;
  htmlUrl: string;
  company: string | null;
  location: string | null;
  blog: string | null;
  topRepos: GitHubRepoItem[];
}

/**
 * Fetches public GitHub profile and top repositories for a given username
 */
export async function fetchGitHubProfile(username: string, token?: string): Promise<GitHubProfileData> {
  const cleanUsername = username.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  // 1. Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${cleanUsername}`, { headers });
  if (!userRes.ok) {
    if (userRes.status === 404) {
      throw new Error(`GitHub user "${cleanUsername}" was not found.`);
    }
    throw new Error(`Failed to fetch GitHub profile (HTTP ${userRes.status}).`);
  }

  const userData = await userRes.json();

  // 2. Fetch top repositories
  const reposRes = await fetch(
    `https://api.github.com/users/${cleanUsername}/repos?sort=updated&per_page=15&type=owner`,
    { headers }
  );

  let topRepos: GitHubRepoItem[] = [];
  if (reposRes.ok) {
    const reposData = await reposRes.json();
    topRepos = (reposData || [])
      .filter((r: any) => !r.fork) // Filter out forks if preferred
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        htmlUrl: r.html_url,
        language: r.language,
        stargazersCount: r.stargazers_count,
        forksCount: r.forks_count,
        topics: r.topics || [],
        updatedAt: r.updated_at,
      }));
  }

  return {
    username: userData.login,
    name: userData.name,
    bio: userData.bio,
    publicRepos: userData.public_repos,
    followers: userData.followers,
    avatarUrl: userData.avatar_url,
    htmlUrl: userData.html_url,
    company: userData.company,
    location: userData.location,
    blog: userData.blog,
    topRepos,
  };
}

/**
 * Formats GitHub profile & repositories into clean Markdown text to append into Master Resume
 */
export function formatGitHubDataToMarkdown(data: GitHubProfileData): string {
  let md = `\n\n# GITHUB PROJECTS & TECHNICAL CONTRIBUTIONS\n`;
  md += `**GitHub Profile:** [github.com/${data.username}](${data.htmlUrl})`;
  if (data.bio) md += ` — *${data.bio}*\n`;
  else md += `\n`;

  if (data.topRepos.length > 0) {
    data.topRepos.forEach((repo) => {
      const langStr = repo.language ? ` (${repo.language})` : '';
      const starsStr = repo.stargazersCount > 0 ? ` [${repo.stargazersCount} ⭐]` : '';
      const descStr = repo.description ? `: ${repo.description}` : '';
      const topicsStr = repo.topics.length > 0 ? ` (Keywords: ${repo.topics.slice(0, 5).join(', ')})` : '';

      md += `- **${repo.name}**${langStr}${starsStr}${descStr}${topicsStr} - [Link](${repo.htmlUrl})\n`;
    });
  }

  return md;
}
