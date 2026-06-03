// Canonical names + alias table.
// Used to normalise both detected names and the user-supplied allowed list
// so direct set comparison handles 95% of real cases without an LLM.

export type Canonical = string;

const ALIAS_TO_CANONICAL: Record<string, Canonical> = {
  // Languages
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
  ecmascript: "JavaScript",
  py: "Python",
  python: "Python",
  python3: "Python",
  kt: "Kotlin",
  kotlin: "Kotlin",
  java: "Java",
  scala: "Scala",
  groovy: "Groovy",
  go: "Go",
  golang: "Go",
  rust: "Rust",
  rs: "Rust",
  ruby: "Ruby",
  rb: "Ruby",
  php: "PHP",
  "c#": "C#",
  csharp: "C#",
  cs: "C#",
  "f#": "F#",
  fsharp: "F#",
  swift: "Swift",
  "objective-c": "Objective-C",
  objectivec: "Objective-C",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  cxx: "C++",
  elixir: "Elixir",
  erlang: "Erlang",
  haskell: "Haskell",
  clojure: "Clojure",
  shell: "Shell",
  bash: "Shell",
  sh: "Shell",
  dart: "Dart",
  lua: "Lua",
  r: "R",
  perl: "Perl",

  // JS/TS frameworks & libs
  react: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  next: "Next.js",
  vue: "Vue",
  "vue.js": "Vue",
  nuxt: "Nuxt",
  "nuxt.js": "Nuxt",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  angular: "Angular",
  solid: "Solid",
  solidjs: "Solid",
  remix: "Remix",
  astro: "Astro",
  express: "Express",
  fastify: "Fastify",
  koa: "Koa",
  hono: "Hono",
  nestjs: "NestJS",
  "nest.js": "NestJS",

  // JS/TS tooling
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  jasmine: "Jasmine",
  playwright: "Playwright",
  cypress: "Cypress",
  eslint: "ESLint",
  prettier: "Prettier",
  webpack: "Webpack",
  vite: "Vite",
  rollup: "Rollup",
  esbuild: "esbuild",
  turbopack: "Turbopack",
  tsx: "tsx",
  ts_node: "ts-node",
  "ts-node": "ts-node",

  // Package managers / runtimes
  npm: "npm",
  pnpm: "pnpm",
  yarn: "Yarn",
  bun: "Bun",
  "node.js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  deno: "Deno",

  // Python ecosystem
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  pytest: "pytest",
  unittest: "unittest",
  ruff: "Ruff",
  black: "Black",
  mypy: "mypy",
  poetry: "Poetry",
  pipenv: "Pipenv",
  pip: "pip",
  uv: "uv",

  // JVM ecosystem
  spring: "Spring",
  "spring boot": "Spring Boot",
  "spring-boot": "Spring Boot",
  springboot: "Spring Boot",
  junit: "JUnit",
  testng: "TestNG",
  testcontainers: "Testcontainers",
  mockito: "Mockito",
  gradle: "Gradle",
  maven: "Maven",
  ktor: "Ktor",
  micronaut: "Micronaut",
  quarkus: "Quarkus",

  // Other web frameworks
  rails: "Ruby on Rails",
  "ruby on rails": "Ruby on Rails",
  laravel: "Laravel",
  symfony: "Symfony",

  // Containers / infra
  docker: "Docker",
  "docker-compose": "Docker Compose",
  "docker compose": "Docker Compose",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  helm: "Helm",
  terraform: "Terraform",
  pulumi: "Pulumi",
  ansible: "Ansible",
  serverless: "Serverless Framework",

  // CI
  "github actions": "GitHub Actions",
  "github-actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  "gitlab-ci": "GitLab CI",
  jenkins: "Jenkins",
  "circleci": "CircleCI",
  "travis ci": "Travis CI",
  travis: "Travis CI",

  // Databases (light coverage; usually inferred from libs)
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  sqlite: "SQLite",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  redis: "Redis",
};

export function canonicalize(name: string): Canonical {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  return ALIAS_TO_CANONICAL[key] ?? trimmed;
}

/**
 * Heuristic: does this allowed-list entry look like a broad/fuzzy category
 * (e.g. "JavaScript testing tools", "anything in the Spring ecosystem")
 * rather than a single named technology? Used to decide whether to ask
 * the optional AI tie-breaker for help.
 */
export function isBroadCategory(entry: string): boolean {
  const lower = entry.toLowerCase();
  const broadMarkers = [
    "ecosystem",
    "tools",
    "tooling",
    "libraries",
    "libs",
    "frameworks",
    "anything",
    "any ",
    "stack",
    "family",
    "based",
  ];
  if (broadMarkers.some((m) => lower.includes(m))) return true;
  // Multi-word entries with no exact alias hit are probably descriptive.
  return entry.split(/\s+/).length > 2 && canonicalize(entry) === entry.trim();
}
