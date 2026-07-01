import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().catch('https://placeholder-url.supabase.co'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).catch('placeholder-anon-key'),
  EXPO_PUBLIC_API_BASE_URL: z.string().url().catch('http://localhost:54321'),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  console.warn('⚠️ Environment validation failed. Using fallback placeholder values.', parsed.error.format());
}

export const env = parsed.success
  ? parsed.data
  : {
      EXPO_PUBLIC_SUPABASE_URL: 'https://placeholder-url.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      EXPO_PUBLIC_API_BASE_URL: 'http://localhost:54321',
    };
