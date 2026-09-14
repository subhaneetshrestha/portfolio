// Fields the user has yet to fill. Task 4 renders TODO as a visible
// placeholder; the type makes omission a compile error, not an empty string.
export const TODO = 'TODO' as const;
export type Todo = typeof TODO;

export type Profile = {
  name: string;
  handle: string;
  title: string;
  company: string;
  location: string;
  bio: string;
  summary: string;
  links: { label: string; url: string }[];
};

export type Role = {
  company: string;
  title: string;
  start: string | Todo;
  end: string;
  location?: string;
  bullets: (string | Todo)[];
};

export type Education = {
  school: string | Todo;
  degree: string | Todo;
  start: string | Todo;
  end: string | Todo;
};

export type SkillGroup = { name: string; items: string[] };

export type Resume = {
  profile: Profile;
  skills: SkillGroup[];
  experience: Role[];
  education: Education[];
};

export type ReleaseAsset = { name: string; url: string; size: number };

export type Release = {
  tag: string;
  name: string;
  prerelease: boolean;
  publishedAt: string;
  url: string;
  assets: ReleaseAsset[];
};

/** One row of github.generated.json. `null` on a sub-field means that fetch failed or found nothing. */
export type Repo = {
  name: string;
  description: string | null;
  homepage: string | null;
  url: string;
  createdAt: string;
  pushedAt: string;
  stars: number;
  topics: string[];
  archived: boolean;
  languages: Record<string, number> | null;
  releases: Release[] | null;
};

export type GithubData = {
  fetchedAt: string;
  checkedAt: string;
  /** Final HTTP status per URL after redirects; 0 means the request never completed. */
  liveness: Record<string, number>;
  repos: Repo[];
};

/** A curated README from src/content/projects/<id>.md joined with the public facts about its repo, when the repo is public. */
export type Project = {
  id: string;
  markdown: string;
  repoUrl: string | null;
  pushedAt: string | null;
  releases: Release[];
};

export type Deployment = {
  id: string;
  kind: 'live' | 'release' | 'retired';
  label: string;
  url?: string;
  repo?: string;
  note?: string;
};
