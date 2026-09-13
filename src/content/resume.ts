import { TODO } from './types';
import type { Resume } from './types';

// Hand-authored. Everything here is either his own words or visible in the
// repos; TODO marks what only he can fill in.
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
    {
      name: 'stack',
      items: [
        'React/Next.js',
        'React Native/Expo',
        'Postgres',
        'NATS JetStream',
        'Docker',
        'sqlc/pgx',
        'Jetpack Compose',
        'LÖVE',
      ],
    },
    { name: 'tools', items: ['Arch Linux', 'neovim', 'GitHub Actions'] },
  ],
  experience: [
    {
      company: 'Maitri Services',
      title: 'Software Engineer',
      start: TODO, // fill in
      end: 'present',
      bullets: [TODO], // fill in
    },
  ],
  education: [
    {
      school: TODO, // fill in
      degree: TODO, // fill in
      start: TODO, // fill in
      end: TODO, // fill in
    },
  ],
};

// The brand mark is the prompt. Every place that shows it imports this.
export const HOST = 'arch';
export const PROMPT = `${resume.profile.handle}@${HOST}:~$`;
