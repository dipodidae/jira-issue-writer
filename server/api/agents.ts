import type { AgentsResponse } from '#shared/types/api'

// Define available agents by tier
const AGENTS_BY_TIER = {
  free: [
    {
      label: 'GPT-4o Mini',
      value: 'gpt-4o-mini',
      icon: 'i-lucide-zap',
    },
    {
      label: 'GPT-5 Mini',
      value: 'gpt-5-mini',
      icon: 'i-lucide-zap',
    },
  ],
  pro: [
    {
      label: 'GPT-4o Mini',
      value: 'gpt-4o-mini',
      icon: 'i-lucide-zap',
    },
    {
      label: 'GPT-4o',
      value: 'gpt-4o',
      icon: 'i-lucide-sparkles',
    },
  ],
  enterprise: [
    {
      label: 'GPT-4o Mini',
      value: 'gpt-4o-mini',
      icon: 'i-lucide-zap',
    },
    {
      label: 'GPT-4o',
      value: 'gpt-4o',
      icon: 'i-lucide-sparkles',
    },
    {
      label: 'o1-mini',
      value: 'o1-mini',
      icon: 'i-lucide-brain',
    },
  ],
}

export default defineEventHandler(async (event): Promise<AgentsResponse> => {
  // TODO: Get the user's tier from authentication/session
  // For now, we'll use a query parameter or default to 'free'
  const query = getQuery(event)
  const tier = (query.tier as string) || 'free'

  // Validate tier
  if (!['free', 'pro', 'enterprise'].includes(tier)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tier. Must be one of: free, pro, enterprise',
    })
  }

  const agents = AGENTS_BY_TIER[tier as keyof typeof AGENTS_BY_TIER]

  return {
    tier,
    agents,
  }
})
