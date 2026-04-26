import {z} from 'zod'

const EnvSchema = z.object({
    PORT: z.string().default('5000'),
    ALLOWED_ORIGIN: z.url().default('http://localhost:5000'),
    MODEL_PROVIDER: z.enum(['openai', 'gemini', 'groq', 'ollama']).default('gemini'),
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OLLAMA_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
    GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
    OLLAMA_MODEL: z.string().default('gemma4:e4b'),
    SEARCH_PROVIDER: z.string().default('tavily'),
    TAVILY_API_KEY: z.string().optional()
})

export const env = EnvSchema.parse(process.env)