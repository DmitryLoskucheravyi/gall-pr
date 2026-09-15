// One-off DDL: adds the nullable *_en columns the bilingual (UA/EN) feature
// needs. Run once against the live TiDB database — there's no migration
// tooling in this project (synchronize: false, no migrations folder), so
// schema changes are applied by hand, and this is that hand-applied change
// written down rather than run ad hoc from a shell.
//
// Idempotent: every statement uses `IF NOT EXISTS`, so re-running this after
// it's already applied is a no-op rather than an error.
//
// Usage: npx ts-node scripts/add-bilingual-columns.ts

import 'dotenv/config';
import mysql from 'mysql2/promise';

const STATEMENTS = [
  `ALTER TABLE paintings ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title`,
  `ALTER TABLE paintings ADD COLUMN IF NOT EXISTS subtitle_en VARCHAR(255) NULL AFTER subtitle`,
  `ALTER TABLE paintings ADD COLUMN IF NOT EXISTS description_en TEXT NULL`,

  `ALTER TABLE materials ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) NULL AFTER name`,
  `ALTER TABLE techniques ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) NULL AFTER name`,

  `ALTER TABLE news ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title`,
  `ALTER TABLE news ADD COLUMN IF NOT EXISTS text_en TEXT NULL`,

  `ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title`,
  `ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS description_en TEXT NULL`,
  `ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS conditions_en TEXT NULL`,

  `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS author_name_en VARCHAR(255) NULL AFTER author_name`,
  // FAQ items (title/text/titleEn/textEn) live inside app_settings.faq, a
  // simple-json blob — no DDL needed for those, the entity's TS type is the
  // only place that shape is declared.
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: true },
  });

  try {
    for (const sql of STATEMENTS) {
      console.log(`→ ${sql}`);
      await connection.query(sql);
    }
    console.log('Done.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
