import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production the host injects variables; the file is optional there.
dotenv.config({ path: path.join(__dirname, '..', 'environment.env') });

// Fail fast on missing config. CLIENT_URL is required because the cors package
// falls back to allowing every origin when it is undefined.
const missing = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}
