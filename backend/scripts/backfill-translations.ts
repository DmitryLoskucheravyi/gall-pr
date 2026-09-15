// Writes the English translations (done by hand, reading
// scripts/content-dump.json) back into the *_en columns/keys added by
// add-bilingual-columns.ts. Run once; not idempotent in the sense of being
// safe to re-run blindly forever, but harmless to re-run since it only ever
// sets these columns to the same fixed values.
//
// A handful of rows are obvious placeholder/test content (keyboard-mash
// titles and descriptions, e.g. "фцвфцвфцв") — those are left untranslated
// on purpose rather than inventing an English translation of gibberish.
//
// Usage: npx ts-node scripts/backfill-translations.ts

import 'dotenv/config';
import mysql from 'mysql2/promise';

const paintingTranslations: Record<
  number,
  { titleEn?: string; subtitleEn?: string; descriptionEn?: string }
> = {
  60022: { titleEn: 'Graces' },
  60023: { titleEn: "I Don't Remember", descriptionEn: 'None' },
  // Already had an English description in the Ukrainian field.
  90022: {
    titleEn: 'Autumn Presence',
    descriptionEn:
      'Autumn Presence is a reflection on a memory that has no distinct shape, yet remains deeply felt. Autumn envelops the landscape in golden light, dissolving the boundary between the human figure and its surroundings. The figure does not seek to be noticed—it exists as naturally as the trees, the wind, and the falling leaves.\n\nThe painting speaks of a presence that needs no proof. Sometimes, simply being is enough to leave a lasting trace.\n',
  },
  120023: {
    titleEn: 'Within the Walls',
    descriptionEn:
      'We often believe that walls protect us. Yet sometimes they only amplify what we are trying to hide from. Within the Walls explores the moment when the space around us becomes a reflection of our inner world. The painting speaks of human vulnerability, of the silence that gathers between walls, and of the hope that even within the most confined space, there is always a path toward the light.',
  },
  120024: { titleEn: 'Body in the Current' },
  120025: { titleEn: 'Rose of Suffering' },
  // 150022 / 150023 / 150024: keyboard-mash titles, nothing to translate.

  180022: {
    subtitleEn: 'Landscape',
    descriptionEn:
      "The work is painted in several layers — the lower ones left to show through, which is why the colour reads deeper than it first appears.\n\nCanvas on a stretcher bar, the sides painted, so the piece needs no frame.",
    titleEn: 'Silence over the Water',
  },
  180023: {
    titleEn: 'Midday in the Field',
    subtitleEn: 'Study from life',
    descriptionEn:
      "A study made in one sitting, for as long as the light held. That's why the brushwork here is looser than in studio pieces.\n\nSigned on the back, ready to hang.",
  },
  180024: {
    titleEn: 'Autumn Draught',
    subtitleEn: 'From the “Air” series',
    descriptionEn:
      'A work about a state of mind rather than a place. The forms are recognisable but deliberately left unfinished — the viewer completes the rest.\n\nCanvas on a stretcher bar, the sides painted.',
  },
  180025: {
    titleEn: 'The Road Home',
    subtitleEn: 'An intimate piece',
    descriptionEn:
      'There are almost no pure colours here: every shade was mixed on the spot, and none of them could be matched exactly again.\n\nReady to hang, with fittings already attached.',
  },
  180026: {
    titleEn: 'Garden After the Rain',
    subtitleEn: 'Plein air',
    descriptionEn:
      "The work is painted in several layers — the lower ones left to show through, which is why the colour reads deeper than it first appears.\n\nCanvas on a stretcher bar, the sides painted, so the piece needs no frame.",
  },
  180027: {
    titleEn: 'Wind from the East',
    subtitleEn: 'From a private series',
    descriptionEn:
      "A study made in one sitting, for as long as the light held. That's why the brushwork here is looser than in studio pieces.\n\nSigned on the back, ready to hang.",
  },
  180028: {
    titleEn: 'A Clear Morning',
    subtitleEn: 'Landscape',
    descriptionEn:
      'A work about a state of mind rather than a place. The forms are recognisable but deliberately left unfinished — the viewer completes the rest.\n\nCanvas on a stretcher bar, the sides painted.',
  },
  180029: {
    titleEn: 'Shores of Memory',
    subtitleEn: 'Study from life',
    descriptionEn:
      'There are almost no pure colours here: every shade was mixed on the spot, and none of them could be matched exactly again.\n\nReady to hang, with fittings already attached.',
  },
  180030: {
    titleEn: 'The Last Light',
    subtitleEn: 'From the “Air” series',
    descriptionEn:
      "The work is painted in several layers — the lower ones left to show through, which is why the colour reads deeper than it first appears.\n\nCanvas on a stretcher bar, the sides painted, so the piece needs no frame.",
  },
  180031: {
    titleEn: 'Clouds over the City',
    subtitleEn: 'Plein air',
    descriptionEn:
      'A work about a state of mind rather than a place. The forms are recognisable but deliberately left unfinished — the viewer completes the rest.\n\nCanvas on a stretcher bar, the sides painted.',
  },
  180032: {
    titleEn: 'By the Open Window',
    subtitleEn: 'Landscape',
    descriptionEn:
      "The work is painted in several layers — the lower ones left to show through, which is why the colour reads deeper than it first appears.\n\nCanvas on a stretcher bar, the sides painted, so the piece needs no frame.",
  },
  180033: {
    titleEn: 'Late Grass',
    subtitleEn: 'Study from life',
    descriptionEn:
      "A study made in one sitting, for as long as the light held. That's why the brushwork here is looser than in studio pieces.\n\nSigned on the back, ready to hang.",
  },
  180034: {
    titleEn: 'Blue Hour',
    subtitleEn: 'From the “Air” series',
    descriptionEn:
      'A work about a state of mind rather than a place. The forms are recognisable but deliberately left unfinished — the viewer completes the rest.\n\nCanvas on a stretcher bar, the sides painted.',
  },
  180035: {
    titleEn: 'Room with a View',
    subtitleEn: 'An intimate piece',
    descriptionEn:
      'There are almost no pure colours here: every shade was mixed on the spot, and none of them could be matched exactly again.\n\nReady to hang, with fittings already attached.',
  },
  180036: {
    titleEn: 'A Silent Landscape',
    subtitleEn: 'Plein air',
    descriptionEn:
      "The work is painted in several layers — the lower ones left to show through, which is why the colour reads deeper than it first appears.\n\nCanvas on a stretcher bar, the sides painted, so the piece needs no frame.",
  },
};

const materialTranslations: Record<number, string> = {
  30001: 'Acrylic',
  60001: 'Paint',
  60002: 'Plasticine',
};

const techniqueTranslations: Record<number, string> = {
  30001: 'Original technique',
  60001: 'Classic',
};

const newsTranslations: Record<number, { titleEn: string; textEn: string }> = {
  60002: {
    titleEn: 'Autumn Selection: Seven New Works in the Gallery',
    textEn:
      "We've updated the gallery — the biggest addition in months. Seven new canvases, each painted this year, each existing in a single copy.\n\nThis selection turned out quieter than the previous ones. Fewer sharp contrasts, more air and muted light — the kind October brings into a room toward evening. A few works were painted en plein air, the rest in the studio, but all of them are about the same thing: how a familiar landscape changes when you look at it for a long, attentive while.",
  },
};

const authorNameEn: Record<number, string> = {
  1: 'Viktoria',
};

const faqTranslations: Record<string, { titleEn: string; textEn: string }> = {
  'Як часто здійснюється відправка?': {
    titleEn: 'How often do you ship?',
    textEn: 'Every Friday, when there are orders.',
  },
  'Як часто проводяться розіграші?': {
    titleEn: 'How often do you run giveaways?',
    textEn: 'Consistently, once every two months.',
  },
  'Скільки часу на замволення?': {
    titleEn: 'How long does an order take?',
    textEn: "That's discussed in private messages.",
  },
};

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
    for (const [id, fields] of Object.entries(paintingTranslations)) {
      const sets: string[] = [];
      const values: unknown[] = [];
      if (fields.titleEn !== undefined) {
        sets.push('title_en = ?');
        values.push(fields.titleEn);
      }
      if (fields.subtitleEn !== undefined) {
        sets.push('subtitle_en = ?');
        values.push(fields.subtitleEn);
      }
      if (fields.descriptionEn !== undefined) {
        sets.push('description_en = ?');
        values.push(fields.descriptionEn);
      }
      if (sets.length === 0) continue;
      values.push(Number(id));
      await connection.query(
        `UPDATE paintings SET ${sets.join(', ')} WHERE id = ?`,
        values,
      );
    }
    console.log(`Paintings: ${Object.keys(paintingTranslations).length} rows updated.`);

    for (const [id, name] of Object.entries(materialTranslations)) {
      await connection.query('UPDATE materials SET name_en = ? WHERE id = ?', [
        name,
        Number(id),
      ]);
    }
    console.log(`Materials: ${Object.keys(materialTranslations).length} rows updated.`);

    for (const [id, name] of Object.entries(techniqueTranslations)) {
      await connection.query('UPDATE techniques SET name_en = ? WHERE id = ?', [
        name,
        Number(id),
      ]);
    }
    console.log(`Techniques: ${Object.keys(techniqueTranslations).length} rows updated.`);

    for (const [id, fields] of Object.entries(newsTranslations)) {
      await connection.query(
        'UPDATE news SET title_en = ?, text_en = ? WHERE id = ?',
        [fields.titleEn, fields.textEn, Number(id)],
      );
    }
    console.log(`News: ${Object.keys(newsTranslations).length} rows updated.`);

    for (const [id, name] of Object.entries(authorNameEn)) {
      await connection.query(
        'UPDATE app_settings SET author_name_en = ? WHERE id = ?',
        [name, Number(id)],
      );
    }

    // FAQ lives inside app_settings.faq, a JSON blob keyed by a generated
    // id — rewritten whole rather than patched field by field.
    const [rows] = await connection.query<any[]>(
      'SELECT id, faq FROM app_settings',
    );
    for (const row of rows) {
      const faq = typeof row.faq === 'string' ? JSON.parse(row.faq) : row.faq;
      let changed = false;
      for (const item of Object.values<any>(faq)) {
        const translation = faqTranslations[item.title];
        if (translation) {
          item.titleEn = translation.titleEn;
          item.textEn = translation.textEn;
          changed = true;
        }
      }
      if (changed) {
        await connection.query('UPDATE app_settings SET faq = ? WHERE id = ?', [
          JSON.stringify(faq),
          row.id,
        ]);
      }
    }
    console.log('Settings (author name + FAQ) updated.');

    console.log('Done.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
