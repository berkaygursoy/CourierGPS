const { z } = require('zod');

const pgUrl = z.string().url().refine(
  (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
  { message: 'must start with postgres:// or postgresql://' },
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: pgUrl,
  MIGRATION_DATABASE_URL: pgUrl.optional(),
  REDIS_URL: z.string().url().refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
    message: 'REDIS_URL must start with redis:// or rediss://',
  }),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

module.exports = parsed.data;
