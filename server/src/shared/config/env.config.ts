import { z } from 'zod';
import dotenv from 'dotenv';

// Carrega o arquivo correspondente ao NODE_ENV, se não fornecido usa .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().url('A MONGO_URI deve ser uma URL de conexão válida'),
  REDIS_URI: z.string().url('A REDIS_URI deve ser uma URL de conexão válida').optional(),
  FIRECRAWL_API_KEY: z.string().min(10, 'FIRECRAWL_API_KEY é obrigatória para web scraping'),
  JWT_SECRET: z.string().min(32, 'O JWT_SECRET de produção exige pelo menos 32 caracteres para entropia segura.'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
  FRONTEND_ORIGIN: z.string().url('A ORIGIN do Frontend deve ser informada para os headers de CORS')
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  const formatted = JSON.stringify(envResult.error.format(), null, 2);
  throw new Error(`Invalid ENV — missing or invalid variables:\n${formatted}`);
}

export const env = envResult.data;
