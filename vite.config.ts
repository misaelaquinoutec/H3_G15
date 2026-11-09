import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

function getBuildSha(mode: string): string {
  if (mode !== 'production') return 'dev'
  const envSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.COMMIT_REF
  if (envSha) return envSha.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const buildSha = getBuildSha(mode)
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __LUMON_BUILD__: JSON.stringify(buildSha),
    },
  }
})
