// Prints the SQL that registers the collect and retention jobs (SRS v3 D-06, D-11).
// Usage: `pnpm db:cron` pipes this into `prisma db execute --stdin`. Safe to re-run: jobs and the secret are upserted.
// Not a migration: URL and secret differ per environment, and the shadow DB may lack pg_cron.

try {
  process.loadEnvFile(".env.local");
} catch {}

const secret = process.env.CRON_SECRET;
// The local default only fits the local Supabase; a remote DB must be given its own URL.
const direct = process.env.DIRECT_URL;
const remote = direct && !/@(127\.0\.0\.1|localhost)[:/]/.test(direct);
if (!process.env.COLLECT_URL && remote) {
  console.error("COLLECT_URL is required when DIRECT_URL is not local");
  process.exit(1);
}
// Port 4100: another local project binds 3000-3104, and its proxy on :3000 swallowed cron calls.
const url =
  process.env.COLLECT_URL || "http://host.docker.internal:4100/api/collect";
if (!secret) {
  console.error("CRON_SECRET is not set (.env.local or environment)");
  process.exit(1);
}
if (!/^https?:\/\//.test(url)) {
  console.error(`COLLECT_URL must be an http(s) URL: ${url}`);
  process.exit(1);
}
// The bearer secret travels in the clear over http, so a remote DB must call https.
if (remote && !url.startsWith("https://")) {
  console.error(`COLLECT_URL must be https when DIRECT_URL is remote: ${url}`);
  process.exit(1);
}
// Both are pasted inside $$ / $job$ dollar quotes below, where a `$` could close the quote.
if (secret.includes("$") || url.includes("$")) {
  console.error("CRON_SECRET and COLLECT_URL must not contain `$`");
  process.exit(1);
}

const literal = (s) => `'${s.replaceAll("'", "''")}'`;

// Tables with 30-day retention and the column that ages them (SRS v3 §4).
const retention = [
  ["planet_snapshot", "slot"],
  ["assignment_snapshot", "slot"],
  ["global_snapshot", "slot"],
  ["war_stats_snapshot", "slot"],
  ["collection_run", "started_at"],
  ["campaign", "last_seen_at"],
  ["planet_event", "expires_at"],
]
  .map(([t, c]) => `delete from ${t} where ${c} < now() - interval '30 days';`)
  .join("\n  ");

process.stdout.write(`
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'cron_secret'), ${literal(secret)});
  else
    perform vault.create_secret(${literal(secret)}, 'cron_secret');
  end if;
end $$;

select cron.schedule('collect', '*/15 * * * *', $job$
  select net.http_post(
    url := ${literal(url)},
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('retention', '30 3 * * *', $job$
  ${retention}
$job$);
`);
