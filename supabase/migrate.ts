// ============================================================================
// File: supabase/migrate.ts
// Supabase Cloud PostgreSQL Migration Runner
// ============================================================================
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pg from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("====================================================");
  console.log("🚀 VisualMind AI - Supabase Migration Runner");
  console.log("====================================================");

  const migrationFile = path.resolve(__dirname, "migrations", "001_initial_schema.sql");
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found at: ${migrationFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, "utf-8");
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;

  if (connectionString) {
    console.log("📡 Connecting directly to Supabase PostgreSQL database...");
    const client = new pg.Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await client.connect();
      console.log("✅ Successfully connected to PostgreSQL instance.");
      console.log("📄 Executing 001_initial_schema.sql...");

      await client.query(sqlContent);
      console.log("✅ All tables, RLS policies, and seed data applied successfully!");

      // Verification check
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'documents', 'knowledge_maps', 'quizzes');
      `);
      console.log("📊 Verified tables in public schema:");
      res.rows.forEach((row) => console.log(`   - public.${row.table_name}`));

      await client.end();
      console.log("✨ Migration completed successfully!");
      return;
    } catch (err: any) {
      console.error("❌ Migration execution failed:", err.message);
      await client.end().catch(() => {});
      process.exit(1);
    }
  }

  // If no direct DB connection string is set, check Supabase HTTP credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    console.log("ℹ️ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY detected.");
    console.log("ℹ️ For running complete DDL scripts (CREATE TABLE, EXTENSION, RLS),");
    console.log("   please provide DATABASE_URL in your .env (found under Supabase Project Settings -> Database -> Connection String URI):");
    console.log("   Example: DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres");
    console.log("");
    console.log("Alternatively, you can copy the contents of:");
    console.log(`   ${migrationFile}`);
    console.log("and paste directly into the Supabase Web Dashboard -> SQL Editor and click 'Run'.");
    return;
  }

  console.log("⚠️ No DATABASE_URL or SUPABASE credentials configured in .env.");
  console.log("💡 The migration file is ready at:");
  console.log(`   ${migrationFile}`);
  console.log("👉 Add DATABASE_URL to your .env to run this automated script anytime.");
}

runMigration().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
