// Dumps every row of admin-authored, translatable content to a JSON file,
// so the actual translating (done by hand, not by this script) has
// something to read. See backfill-translations.ts for the write-back half.
//
// Usage: npx ts-node scripts/dump-content.ts

import 'dotenv/config';
import { writeFileSync } from 'fs';
import mysql from 'mysql2/promise';

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
    const [paintings] = await connection.query(
      `SELECT id, title, title_en, subtitle, subtitle_en, description, description_en
       FROM paintings ORDER BY id`,
    );
    const [materials] = await connection.query(
      `SELECT id, name, name_en FROM materials ORDER BY id`,
    );
    const [techniques] = await connection.query(
      `SELECT id, name, name_en FROM techniques ORDER BY id`,
    );
    const [news] = await connection.query(
      `SELECT id, title, title_en, text, text_en FROM news ORDER BY id`,
    );
    const [giveaways] = await connection.query(
      `SELECT id, title, title_en, description, description_en, conditions, conditions_en
       FROM giveaways ORDER BY id`,
    );
    const [settings] = await connection.query(
      `SELECT id, author_name, author_name_en, faq FROM app_settings ORDER BY id`,
    );

    const dump = { paintings, materials, techniques, news, giveaways, settings };
    writeFileSync('scripts/content-dump.json', JSON.stringify(dump, null, 2));
    console.log('Wrote scripts/content-dump.json');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
