// Typical co-requisites when a framework/runtime is on the allowed list.
// One-way only: allowing React implies Node.js, not the reverse.

import { canonicalize, type Canonical } from "./aliases";

/**
 * If an allowed entry matches the key, detected companions may be treated as allowed
 * without listing each name explicitly.
 */
export const ECOSYSTEM_COMPANIONS: Record<Canonical, Canonical[]> = {
  // JavaScript / TypeScript front-end & Node backends
  React: ["Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun"],
  "Next.js": [
    "React",
    "Node.js",
    "JavaScript",
    "TypeScript",
    "npm",
    "pnpm",
    "Yarn",
    "Bun",
  ],
  Vue: ["Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun", "Vite"],
  Nuxt: ["Vue", "Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun", "Vite"],
  Angular: ["Node.js", "JavaScript", "TypeScript", "npm", "pnpm", "Yarn", "Bun"],
  Svelte: ["Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun", "Vite"],
  SvelteKit: [
    "Svelte",
    "Node.js",
    "JavaScript",
    "npm",
    "pnpm",
    "Yarn",
    "Bun",
    "Vite",
  ],
  Remix: ["React", "Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun"],
  Astro: ["Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun"],
  Solid: ["Node.js", "JavaScript", "npm", "pnpm", "Yarn", "Bun", "Vite"],
  Express: ["Node.js", "JavaScript"],
  Fastify: ["Node.js", "JavaScript"],
  Koa: ["Node.js", "JavaScript"],
  Hono: ["Node.js", "JavaScript"],
  NestJS: ["Node.js", "JavaScript", "TypeScript"],

  // Python
  FastAPI: ["Python", "pip", "Poetry", "uv"],
  Django: ["Python", "pip", "Poetry"],
  Flask: ["Python", "pip"],

  // JVM — Spring Boot on the allowed list implies typical build stack + core Spring
  "Spring Boot": [
    "Spring",
    "Java",
    "Kotlin",
    "Maven",
    "Gradle",
    "JUnit",
  ],
  Spring: ["Java", "Kotlin", "Maven", "Gradle"],
  Micronaut: ["Java", "Kotlin", "Gradle", "Maven"],
  Quarkus: ["Java", "Kotlin", "Gradle", "Maven"],
  Ktor: ["Kotlin", "Gradle"],

  // Ruby / PHP
  "Ruby on Rails": ["Ruby"],
  Laravel: ["PHP"],
  Symfony: ["PHP"],
};

/**
 * Maps canonical detected name → allowed-list entry that implied it.
 * Direct allowed names win over implied; first allowed parent wins ties.
 */
export function buildImpliedAllowMap(
  allowedExact: Map<Canonical, string>,
): Map<Canonical, string> {
  const implied = new Map<Canonical, string>();

  for (const [parentCanonical, originalLabel] of allowedExact) {
    const companions = ECOSYSTEM_COMPANIONS[parentCanonical];
    if (!companions) continue;

    for (const companion of companions) {
      const c = canonicalize(companion);
      if (allowedExact.has(c) || implied.has(c)) continue;
      implied.set(c, originalLabel);
    }
  }

  return implied;
}
