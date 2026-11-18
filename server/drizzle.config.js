// Configuration drizzle-kit : génération des migrations et Drizzle Studio.
//   npm run db:generate -w @unlockers/server   → crée une migration après un changement de schema.js
//   npm run db:studio -w @unlockers/server     → interface web pour voir les données
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.js',
  out: './drizzle',
  dbCredentials: { url: process.env.DB_FILE ?? './data/unlockers.db' },
});
