// @ts-check
import antfu from '@antfu/eslint-config'
import tailwindcss from 'eslint-plugin-tailwindcss'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    formatters: true,
    pnpm: true,
    ignores: [
      '**/DROPDOWN_AGENTS_COMPLETE.md',
      '**/DROPDOWN_AGENTS_VISUAL.md',
      '**/ERROR_HANDLING.md',
      '**/IMPLEMENTATION.md',
      '**/MIGRATION.md',
      '**/OPENAI_FIX_SUMMARY.md',
      '**/OPENAI_FIXES.md',
      '**/RATE_LIMITER_EXPLAINED.md',
      '**/SETUP.md',
      '**/DropdownAgents.md',
    ],
  },
)
  .append(nuxt())
  .append({
    plugins: {
      tailwindcss,
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/enforces-negative-arbitrary-values': 'warn',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-contradicting-classname': 'off', // Disabled for Tailwind v4 compatibility
      'tailwindcss/no-custom-classname': 'off', // Allow custom classes for Nuxt UI
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
    },
    settings: {
      tailwindcss: {
        config: false, // Disable config path requirement for Nuxt UI
        callees: ['cn', 'cva'],
        classRegex: '^class(Name)?$',
      },
    },
  })
