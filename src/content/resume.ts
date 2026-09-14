import type { Resume } from './types';

// Hand-authored: his own words, visible in the repos, or from his CV.
export const resume: Resume = {
  profile: {
    name: 'Subhaneet Shrestha',
    handle: 'hyzii',
    title: 'Software Engineer',
    company: 'Maitri Services',
    location: 'Lalitpur, Nepal',
    bio: 'Javscript user and a hater. Go supremacy. Arch and neovim enjoyer.',
    summary:
      'Started in JavaScript, moved through TypeScript, now writes mostly Go; the repos show the arc. ' +
      'Ships Go backends, an Android launcher in Kotlin and a LÖVE/Lua game.',
    links: [
      { label: 'github', url: 'https://github.com/subhaneetshrestha' },
      { label: 'twitter', url: 'https://twitter.com/subhaneet' },
      { label: 'linkedin', url: 'https://linkedin.com/in/subhaneet-shrestha-0ab201122' },
      { label: 'medium', url: 'https://medium.com/@shresthasubhaneet' },
      { label: 'email', url: 'mailto:shresthasubhaneet@gmail.com' },
    ],
  },
  skills: [
    { name: 'languages', items: ['Go', 'TypeScript', 'JavaScript', 'Kotlin', 'Lua'] },
    { name: 'frontend', items: ['Angular', 'React/Next.js'] },
    { name: 'backend', items: ['Express', 'NestJS', 'Go net/http', 'sqlc/pgx'] },
    { name: 'data', items: ['Postgres', 'MySQL', 'SQLite', 'SQL Server', 'MongoDB', 'Redis'] },
    { name: 'infra', items: ['Docker', 'NATS JetStream', 'Kafka', 'RabbitMQ', 'GitHub Actions'] },
    { name: 'mobile & games', items: ['React Native/Expo', 'Jetpack Compose', 'LÖVE'] },
    { name: 'tools', items: ['Arch Linux', 'neovim'] },
  ],
  experience: [
    {
      company: 'Maitri Services',
      title: 'Software Engineer',
      start: 'Mar 2024',
      end: 'present',
      location: 'Dhobighat, Kathmandu',
      bullets: [
        'A US healthcare coding platform — the tool medical coders use to code patient records.',
        'Performance: cut re-rendering of very large forms; broke monolithic components into reusable ones.',
        'Coder-facing features: term highlighting in PDFs for faster search, shorter data load times, fast turnaround on live issues.',
      ],
    },
    {
      company: 'Asterdio Inc',
      title: 'Senior Angular Developer',
      start: 'Jun 2023',
      end: 'Dec 2023',
      location: 'Sankhamul, Kathmandu',
      bullets: [
        "Real-estate management CRM — a Cyprus company's in-house product.",
        'UI made dynamic to per-country requirements across the stages of development.',
        'Moved the work toward TDD with Karma and Jasmine; fewer bugs reached QA.',
      ],
    },
    {
      company: 'Novelty Technology LLC',
      title: 'Software Developer',
      start: 'Jan 2020',
      end: 'Jun 2023',
      location: 'New Baneshwor, Kathmandu',
      bullets: [
        "CollegeRecon (Express, Angular) — education guidance for US veterans. Backend security: hybrid encryption in transit and first-party cookie auth; SSO from partner platforms; Express and SQL optimisation for the CRM portals; frontend rewritten onto Angular's reactive model.",
        'Pace Equity (Express, Angular) — finance reporting for a US capital provider: editable dashboard tables with per-user profiles, PDF/Word/Excel export, dynamic reactive forms.',
        'AHN (Express, Angular) — a PaaS hub for US healthcare systems on microservices. Backend: SQL Server stored procedures for complex queries, Redis caching of bundles, financial price calculations that had to be exact, PowerBI charts.',
        'Vivent Health (Express, Angular) — backend. Database and API design for the store, an encrypted checkout hand-off from a partner platform, Postgres and API-layer encryption of sensitive data, admin SSO, Shippo courier integration, requirements work with the client.',
      ],
    },
    {
      company: 'IT Glance Pvt Ltd',
      title: 'Software Developer (intern)',
      start: 'Jul 2019',
      end: 'Dec 2019',
      location: 'Tripureshwor, Kathmandu',
      bullets: [
        'Final-year internship. JavaScript frontends in Angular and React on live client projects.',
        'Part of the team, including decisions on which features to build.',
      ],
    },
  ],
  education: [
    {
      school: 'National College of Computer Studies (Tribhuvan University), Chhetrapati',
      degree: "Bachelor's in Information Management (BIM), first division",
      start: '2015',
      end: '2019',
    },
    {
      school: 'United Academy, Kumaripati',
      degree: 'Management with Computer Science (+2), first division',
      start: '2013',
      end: '2015',
    },
  ],
};

// The brand mark is the prompt. Every place that shows it imports this.
export const HOST = 'arch';
export const PROMPT = `${resume.profile.handle}@${HOST}:~$`;
