import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  Filter,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  SlidersHorizontal,
  RefreshCw,
  BadgeCheck,
} from 'lucide-react';
import { LinkedInJob, JobSearchFilters } from '../types';
import { extractKeywords } from '../utils/fileHelpers';

interface LinkedInJobFinderProps {
  masterResume: string;
  onApplyJob: (job: LinkedInJob) => void;
}

const SAMPLE_LINKEDIN_JOBS: LinkedInJob[] = [
  {
    id: 'linkedin_job_1',
    title: 'Senior Full Stack Engineer (React / Node / AI)',
    company: 'NexaCloud Technologies',
    companyLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    location: 'San Francisco, CA (Remote)',
    jobType: 'Remote',
    payRange: '$165,000 - $215,000 / yr',
    minPay: 165000,
    maxPay: 215000,
    postedDate: '1 day ago',
    experienceLevel: 'Senior',
    hiringManager: 'Jordan Vance',
    linkedInUrl: 'https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Engineer',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'Express', 'TailwindCSS', 'REST APIs', 'Docker', 'Cloud'],
    description: `NexaCloud Technologies is seeking a Senior Full Stack Engineer to lead our next-generation web application team.

Key Responsibilities:
- Architect, build, and maintain high-performance web applications using React 19, TypeScript, and Node.js.
- Integrate AI language models (Google Gemini) and cloud workspace APIs (Google Drive, Gmail).
- Collaborate with product management and design teams to deliver slick, responsive user interfaces with Tailwind CSS and Framer Motion.
- Write clean, unit-tested code and optimize frontend Largest Contentful Paint (LCP) and web vitals.

Requirements:
- 5+ years of experience with React, Modern JavaScript/TypeScript, and Node.js backend architecture.
- Demonstrated experience building web applications with REST / GraphQL APIs.
- Familiarity with cloud platforms (AWS, GCP) and containerization (Docker).
- Strong communication and problem-solving skills.`
  },
  {
    id: 'linkedin_job_2',
    title: 'Staff Frontend Architect - Design Systems & Web AI',
    company: 'Apex Labs AI',
    companyLogoUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7cfc?w=100&auto=format&fit=crop&q=80',
    location: 'New York, NY (Hybrid)',
    jobType: 'Hybrid',
    payRange: '$185,000 - $240,000 / yr',
    minPay: 185000,
    maxPay: 240000,
    postedDate: '2 days ago',
    experienceLevel: 'Senior',
    hiringManager: 'Elena Rostova',
    linkedInUrl: 'https://www.linkedin.com/jobs/search/?keywords=Frontend+Architect',
    requiredSkills: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Recharts', 'Web Vitals', 'Architecture'],
    description: `Apex Labs AI is building state-of-the-art developer tools powered by generative AI. We are looking for a Staff Frontend Architect.

Key Responsibilities:
- Drive the architecture and developer experience of our flagship web application suite.
- Implement robust state management, component libraries, and visual analytics using Recharts.
- Optimize client-side rendering speed and integrate AI endpoints with resilience and retry logic.

Requirements:
- Deep expertise in React ecosystem, TypeScript, Vite, and modern CSS systems.
- Proven track record of scaling high-traffic web applications with rich interactive UI controls.`
  },
  {
    id: 'linkedin_job_3',
    title: 'Lead AI Application Engineer',
    company: 'ScaleMetric Systems',
    companyLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    location: 'Austin, TX (Remote)',
    jobType: 'Remote',
    payRange: '$175,000 - $225,000 / yr',
    minPay: 175000,
    maxPay: 225000,
    postedDate: '3 days ago',
    experienceLevel: 'Lead',
    hiringManager: 'Marcus Brody',
    linkedInUrl: 'https://www.linkedin.com/jobs/search/?keywords=AI+Application+Engineer',
    requiredSkills: ['Python', 'TypeScript', 'Gemini AI API', 'LangChain', 'FastAPI', 'PostgreSQL', 'Docker'],
    description: `ScaleMetric Systems is looking for a Lead AI Application Engineer to lead AI agent development and LLM workflow integrations.

Key Responsibilities:
- Build autonomous agents, prompt engineering pipelines, and real-time streaming interfaces.
- Work closely with backend teams to integrate vector databases, SQL data connect, and document parsers.

Requirements:
- Strong background in AI/ML integration, Python, TypeScript, and modern API standards.
- Experience with LLM frameworks, RAG pipelines, and candidate assessment tools.`
  },
  {
    id: 'linkedin_job_4',
    title: 'Full Stack Software Engineer (Product Suite)',
    company: 'Vanguard HealthTech',
    companyLogoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80',
    location: 'Boston, MA (Onsite)',
    jobType: 'Onsite',
    payRange: '$140,000 - $180,000 / yr',
    minPay: 140000,
    maxPay: 180000,
    postedDate: 'Just now',
    experienceLevel: 'Mid',
    hiringManager: 'Claire Bennet',
    linkedInUrl: 'https://www.linkedin.com/jobs/search/?keywords=Software+Engineer',
    requiredSkills: ['React', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'REST APIs', 'HTML5'],
    description: `Vanguard HealthTech is hiring a Full Stack Software Engineer to develop secure patient portals and clinical workspace platforms.

Key Responsibilities:
- Develop scalable full-stack features using React and Express.
- Maintain strict data security, user authentication workflows, and OAuth integrations.

Requirements:
- 3+ years experience with React, Node.js, and web application security.`
  },
  {
    id: 'linkedin_job_5',
    title: 'Senior Frontend Engineer - Developer Platform',
    company: 'CloudScale Infrastructure',
    companyLogoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
    location: 'Seattle, WA (Remote)',
    jobType: 'Remote',
    payRange: '$160,000 - $205,000 / yr',
    minPay: 160000,
    maxPay: 205000,
    postedDate: '4 days ago',
    experienceLevel: 'Senior',
    hiringManager: 'David Sterling',
    linkedInUrl: 'https://www.linkedin.com/jobs/search/?keywords=Frontend+Engineer',
    requiredSkills: ['React', 'TypeScript', 'TailwindCSS', 'State Management', 'GraphQL', 'CI/CD'],
    description: `CloudScale Infrastructure is seeking a Senior Frontend Engineer to build cloud dashboard controls and real-time monitoring suites.

Key Responsibilities:
- Design intuitive dashboard components and interactive performance graphs.
- Optimize frontend bundle size and component re-render performance.

Requirements:
- Strong proficiency in React, TypeScript, and modern CSS utility frameworks.`
  }
];

export function LinkedInJobFinder({ masterResume, onApplyJob }: LinkedInJobFinderProps) {
  const [filters, setFilters] = useState<JobSearchFilters>({
    role: '',
    title: '',
    location: '',
    minPay: 0,
    jobType: 'All',
    experienceLevel: 'All',
    sortBy: 'relevance',
  });

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);

  // Extract candidate resume keywords for matching
  const candidateKeywords = useMemo(() => {
    return new Set(extractKeywords(masterResume).map((k) => k.toLowerCase()));
  }, [masterResume]);

  // Compute match score and skill breakdown for each job listing relative to candidate's resume
  const processedJobs = useMemo(() => {
    return SAMPLE_LINKEDIN_JOBS.map((job) => {
      const reqSkills = job.requiredSkills || [];
      const matched = reqSkills.filter((s) => candidateKeywords.has(s.toLowerCase()));
      const missing = reqSkills.filter((s) => !candidateKeywords.has(s.toLowerCase()));

      // Calculate candidate relevance percentage
      let score = 50;
      if (reqSkills.length > 0) {
        score = Math.round((matched.length / reqSkills.length) * 100);
        // Boost if candidate resume is detailed
        if (candidateKeywords.size > 20) score = Math.min(98, score + 12);
      } else {
        score = 80;
      }

      return {
        ...job,
        matchedSkills: matched,
        missingSkills: missing,
        relevanceScore: Math.max(45, Math.min(98, score)),
      };
    });
  }, [candidateKeywords]);

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = processedJobs.filter((job) => {
      if (filters.role && !job.title.toLowerCase().includes(filters.role.toLowerCase()) && !job.description.toLowerCase().includes(filters.role.toLowerCase())) {
        return false;
      }
      if (filters.title && !job.title.toLowerCase().includes(filters.title.toLowerCase())) {
        return false;
      }
      if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      if (filters.minPay > 0 && (job.maxPay || 0) < filters.minPay) {
        return false;
      }
      if (filters.jobType !== 'All' && job.jobType.toLowerCase() !== filters.jobType.toLowerCase()) {
        return false;
      }
      if (filters.experienceLevel !== 'All' && job.experienceLevel.toLowerCase() !== filters.experienceLevel.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Sort jobs
    if (filters.sortBy === 'relevance') {
      result.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } else if (filters.sortBy === 'pay') {
      result.sort((a, b) => (b.maxPay || 0) - (a.maxPay || 0));
    }

    return result;
  }, [processedJobs, filters]);

  const handleRefresh = () => {
    setLoadingSearch(true);
    setTimeout(() => {
      setLoadingSearch(false);
    }, 600);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-400" />
              LinkedIn Smart Job Matcher
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sorted by Resume Relevance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search jobs on LinkedIn filtered by role, title, location & salary. Click <strong>"Analyze & Auto-Apply"</strong> on any job to automatically populate the Job Description and run instant ATS matching & cover letter generation!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loadingSearch}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loadingSearch ? 'animate-spin' : ''}`} />
            <span>Refresh Listings</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Job Search & Filter Controls
          </span>
          <span className="text-xs text-slate-400">
            Found <strong className="text-white">{filteredJobs.length}</strong> matching positions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword / Role */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Role / Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                placeholder="e.g. Full Stack, AI, Frontend"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Job Title</label>
            <input
              type="text"
              value={filters.title}
              onChange={(e) => setFilters({ ...filters, title: e.target.value })}
              placeholder="e.g. Senior Engineer, Architect"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Location</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="e.g. Remote, San Francisco, NY"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Minimum Pay */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Minimum Salary ({filters.minPay > 0 ? `$${(filters.minPay / 1000).toFixed(0)}k/yr+` : 'Any Pay'})
            </label>
            <select
              value={filters.minPay}
              onChange={(e) => setFilters({ ...filters, minPay: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value={0}>Any Salary</option>
              <option value={120000}>$120,000+ / yr</option>
              <option value={150000}>$150,000+ / yr</option>
              <option value={175000}>$175,000+ / yr</option>
              <option value={200000}>$200,000+ / yr</option>
            </select>
          </div>
        </div>

        {/* Second Row Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-900">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Workplace Type</label>
            <select
              value={filters.jobType}
              onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Types (Remote / Hybrid / Onsite)</option>
              <option value="Remote">Remote Only</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Onsite">Onsite</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Experience Level</label>
            <select
              value={filters.experienceLevel}
              onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Experience Levels</option>
              <option value="Entry">Entry Level</option>
              <option value="Mid">Mid Level</option>
              <option value="Senior">Senior Level</option>
              <option value="Lead">Lead / Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sort Results By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium text-emerald-400"
            >
              <option value="relevance">🎯 Related to Me (Best Resume Match)</option>
              <option value="pay">💰 Highest Pay / Salary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No jobs match your filter criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your salary or location filters to see more results.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const relScore = job.relevanceScore || 75;

            // Score badge color logic
            let badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            if (relScore < 70) badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            if (relScore < 55) badgeBg = 'bg-slate-500/20 text-slate-300 border-slate-500/40';

            return (
              <div
                key={job.id}
                className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md hover:shadow-indigo-500/5 group"
              >
                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                      {job.companyLogoUrl ? (
                        <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Building2 className="w-6 h-6 text-blue-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {job.title}
                        </h3>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeBg} flex items-center gap-1`}>
                          <TrendingUp className="w-3 h-3" />
                          {relScore}% Resume Match
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">{job.company}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {job.location}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <DollarSign className="w-3 h-3" />
                          {job.payRange}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500 text-[11px]">{job.postedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button: Apply & Auto-Fill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={job.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View job posting on LinkedIn"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">LinkedIn</span>
                    </a>

                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                      title="Auto-fill JD into main workstation and run instant ATS evaluation"
                    >
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      <span>Analyze & Auto-Apply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Skill Match Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Skills Match:</span>
                  {(job.matchedSkills || []).map((skill, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {skill}
                    </span>
                  ))}
                  {(job.missingSkills || []).map((skill, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      {skill} (Missing)
                    </span>
                  ))}
                </div>

                {/* Expandable Description */}
                <div>
                  <button
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Full Job Description'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {job.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
