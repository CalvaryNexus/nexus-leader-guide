// Postgres access. Production: Neon (Vercel Marketplace) via DATABASE_URL over HTTP, which suits
// serverless. Local development without DATABASE_URL: an embedded Postgres (PGlite) in .data/.
// The schema is created and seeded on first use, so a fresh database needs no migration step.
import fs from "node:fs";
import path from "node:path";
import { SEED_FOOTER, SEED_SERIES, SEED_WEEK } from "./seed";

export type Db = { query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> };

const g = globalThis as unknown as { __nexusDb?: Promise<Db>; __nexusPglite?: unknown };

export function db(): Promise<Db> {
  if (!g.__nexusDb) {
    g.__nexusDb = connect().catch((err) => {
      g.__nexusDb = undefined;
      throw err;
    });
  }
  return g.__nexusDb;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let conn: Db;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    conn = { query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
  } else {
    if (process.env.VERCEL) {
      throw new Error("DATABASE_URL is not set. Add a Neon Postgres database to this Vercel project (Storage tab), then redeploy.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    if (!g.__nexusPglite) {
      const dir = path.join(process.cwd(), ".data", "pglite");
      fs.mkdirSync(path.dirname(dir), { recursive: true });
      g.__nexusPglite = await PGlite.create(dir);
    }
    const pg = g.__nexusPglite as InstanceType<typeof PGlite>;
    conn = { query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
  }
  await migrate(conn);
  await seed(conn);
  return conn;
}

const SCHEMA = [
  `create table if not exists settings (
     key text primary key,
     value jsonb not null
   )`,
  `create table if not exists series (
     id serial primary key,
     name text not null,
     reference text not null default '',
     active boolean not null default false,
     schedule_template jsonb not null default '[]'::jsonb,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists weeks (
     id serial primary key,
     series_id integer not null references series(id),
     week_number integer not null,
     service_date date not null,
     hero_tagline text not null default '',
     theme_verse_text text not null default '',
     theme_verse_reference text not null default '',
     main_idea text not null default '',
     question_of_the_day text not null default '',
     meal text not null default '',
     welcome_blocks jsonb not null default '[]'::jsonb,
     glance_rows jsonb not null default '[]'::jsonb,
     schedule_overrides jsonb not null default '{"rows":{},"added":[]}'::jsonb,
     schedule_snapshot jsonb,
     extra_sections jsonb not null default '[]'::jsonb,
     small_group_note text not null default '',
     small_group_questions jsonb not null default '[]'::jsonb,
     published boolean not null default false,
     published_at timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists weeks_by_date on weeks (service_date desc, id desc)`,
];

async function migrate(conn: Db) {
  for (const stmt of SCHEMA) {
    try {
      await conn.query(stmt);
    } catch (err) {
      // Two cold starts racing to create the same table: the other one won, which is fine.
      if (!/already exists|duplicate key/i.test(String(err))) throw err;
    }
  }
}

async function seed(conn: Db) {
  const existing = await conn.query(`select 1 from series limit 1`);
  if (existing.length) return;

  // Only the instance that claims the marker row seeds, so concurrent cold starts can't double-seed.
  // A claim older than a minute is treated as abandoned.
  const now = Date.now();
  const claimed = await conn.query(
    `insert into settings (key, value) values ('seeding', $1::jsonb)
     on conflict (key) do update set value = excluded.value where (settings.value->>'at')::bigint < $2
     returning key`,
    [JSON.stringify({ at: now }), now - 60_000],
  );
  if (!claimed.length) return;

  const code = (process.env.LEADER_CODE || `nexus${Math.floor(1000 + Math.random() * 9000)}`).trim();
  await conn.query(`insert into settings (key, value) values ('leader_code', $1::jsonb), ('footer', $2::jsonb) on conflict (key) do nothing`, [
    JSON.stringify(code),
    JSON.stringify(SEED_FOOTER),
  ]);

  const [series] = await conn.query<{ id: number }>(
    `insert into series (name, reference, active, schedule_template) values ($1, $2, true, $3::jsonb) returning id`,
    [SEED_SERIES.name, SEED_SERIES.reference, JSON.stringify(SEED_SERIES.schedule_template)],
  );
  const w = SEED_WEEK;
  await conn.query(
    `insert into weeks (series_id, week_number, service_date, hero_tagline, theme_verse_text, theme_verse_reference, main_idea,
       question_of_the_day, meal, welcome_blocks, glance_rows, schedule_overrides, extra_sections, small_group_note,
       small_group_questions, published, published_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15::jsonb,true,now())`,
    [
      series.id,
      w.week_number,
      w.service_date,
      w.hero_tagline,
      w.theme_verse_text,
      w.theme_verse_reference,
      w.main_idea,
      w.question_of_the_day,
      w.meal,
      JSON.stringify(w.welcome_blocks),
      JSON.stringify(w.glance_rows),
      JSON.stringify(w.schedule_overrides),
      JSON.stringify(w.extra_sections),
      w.small_group_note,
      JSON.stringify(w.small_group_questions),
    ],
  );
}
