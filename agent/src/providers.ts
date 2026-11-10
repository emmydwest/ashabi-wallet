import type { Provider } from './router.ts';

// Fallback order. Free tiers only; see docs/providers.md.
export const PROVIDERS: Provider[] = [
  {
    name: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    keyFile: 'GROQ_API_KEY',
    model: 'openai/gpt-oss-20b',
    extra: { reasoning_effort: 'low' },
  },
  {
    name: 'gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyFile: 'GEMINI_API_KEY',
    model: 'gemini-3.1-flash-lite',
    extra: { reasoning_effort: 'none' },
  },
  {
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    keyFile: 'OPENROUTER_API_KEY',
    model: 'nvidia/nemotron-3.5-lightning:free',
  },
  {
    name: 'nvidia',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    keyFile: 'NVIDIA_API_KEY',
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  },
  {
    name: 'huggingface',
    baseURL: 'https://router.huggingface.co/v1',
    keyFile: 'HF_TOKEN',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
  },
  {
    name: 'github-models',
    baseURL: 'https://models.github.ai/inference',
    keyFile: 'GITHUB_MODELS_TOKEN',
    model: 'openai/gpt-4o-mini',
  },
];
