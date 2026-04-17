/**
 * Import structured data from Supabase export.
 * Expects a JSON file with named keys: { clubs: [...], athletes: [...], ... }
 * Usage: node scripts/import-structured.js [path-to-json]
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const USERS_PATH = path.join(__dirname, '..', '..', 'export-supabase', 'data', 'users.json');
const DATA_PATH = process.argv[2] || path.join(__dirname, '..', '..', 'export-supabase', 'data', 'full_export.json');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Import users
    if (fs.existsSync(USERS_PATH)) {
      const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
      for (const u of users) {
        await client.query(
          `INSERT INTO users (id, email, encrypted_password, name, phone, bio, profile_photo, avatar_url, email_confirmed_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [u.id, u.email, u.encrypted_password, u.name, u.phone, u.bio, u.profile_photo, u.avatar_url, u.email_confirmed_at, u.created_at, u.updated_at]
        );
      }
      console.log(`Users: ${users.length}`);
    }

    // 2. Import structured data
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    // Clubs
    if (data.clubs) {
      for (const r of data.clubs) {
        await client.query(
          `INSERT INTO clubs (id, tenant_id, name, description, logo_path, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id, r.name, r.description, r.logo_path, r.created_at, r.updated_at]
        );
      }
      console.log(`Clubs: ${data.clubs.length}`);
    }

    // Athletes
    if (data.athletes) {
      for (const r of data.athletes) {
        await client.query(
          `INSERT INTO athletes (id, tenant_id, club_id, name, position, jersey_number, status, observation, "group", photo_url, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id, r.club_id, r.name, r.position, r.jersey_number, r.status || 'active', r.observation, r.group, r.photo_url, r.created_at, r.updated_at]
        );
      }
      console.log(`Athletes: ${data.athletes.length}`);
    }

    // Contents
    if (data.contents) {
      // First delete seed contents to avoid conflicts
      await client.query('DELETE FROM contents WHERE tenant_id IS NULL');
      for (const r of data.contents) {
        await client.query(
          `INSERT INTO contents (id, tenant_id, name, abbreviation, description, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id || null, r.name, r.abbreviation, r.description, r.created_at, r.updated_at]
        );
      }
      console.log(`Contents: ${data.contents.length}`);
    }

    // Stages
    if (data.stages) {
      await client.query('DELETE FROM stages WHERE tenant_id IS NULL');
      for (const r of data.stages) {
        await client.query(
          `INSERT INTO stages (id, tenant_id, name, content_name, description, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id || null, r.name, r.content_name, r.description, r.created_at, r.updated_at]
        );
      }
      console.log(`Stages: ${data.stages.length}`);
    }

    // Activity titles
    if (data.activity_titles) {
      for (const r of data.activity_titles) {
        await client.query(
          `INSERT INTO activity_titles (id, tenant_id, content_id, title, description, is_archived, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id, r.content_id, r.title, r.description, r.is_archived || false, r.created_at, r.updated_at]
        );
      }
      console.log(`Activity titles: ${data.activity_titles.length}`);
    }

    // Microcycles
    if (data.microcycles) {
      for (const r of data.microcycles) {
        await client.query(
          `INSERT INTO training_microcycles (id, tenant_id, club_id, week_identifier, name, start_date, end_date, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id, r.club_id, r.week_identifier, r.name, r.start_date, r.end_date, r.created_at, r.updated_at]
        );
      }
      console.log(`Microcycles: ${data.microcycles.length}`);
    }

    // Sessions
    if (data.sessions) {
      for (const r of data.sessions) {
        await client.query(
          `INSERT INTO training_sessions (id, microcycle_id, tenant_id, club_id, date, day_name, day_of_week, session_type, opponent_name, match_duration, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.microcycle_id, r.tenant_id, r.club_id, r.date, r.day_name, r.day_of_week, r.session_type || 'training', r.opponent_name, r.match_duration, r.created_at, r.updated_at]
        );
      }
      console.log(`Sessions: ${data.sessions.length}`);
    }

    // Blocks
    if (data.blocks) {
      for (const r of data.blocks) {
        await client.query(
          `INSERT INTO training_activity_blocks (id, session_id, name, "order", created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.session_id, r.name, r.order || 0, r.created_at, r.updated_at]
        );
      }
      console.log(`Blocks: ${data.blocks.length}`);
    }

    // Activities
    if (data.activities) {
      for (const r of data.activities) {
        await client.query(
          `INSERT INTO training_activities (id, block_id, title_id, tenant_id, description, groups, is_rest, duration_minutes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.block_id, r.title_id, r.tenant_id, r.description, JSON.stringify(r.groups || []), r.is_rest || false, r.duration_minutes, r.created_at, r.updated_at]
        );
      }
      console.log(`Activities: ${data.activities.length}`);
    }

    // Activity contents
    if (data.activity_contents) {
      for (const r of data.activity_contents) {
        await client.query(
          `INSERT INTO training_activity_contents (activity_id, content_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [r.activity_id, r.content_id]
        );
      }
      console.log(`Activity contents: ${data.activity_contents.length}`);
    }

    // Activity stages
    if (data.activity_stages) {
      for (const r of data.activity_stages) {
        await client.query(
          `INSERT INTO training_activity_stages (id, activity_id, stage_name, "order", created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.activity_id, r.stage_name, r.order || 0, r.created_at, r.updated_at]
        );
      }
      console.log(`Activity stages: ${data.activity_stages.length}`);
    }

    // Files (skip orphans with missing session_id)
    if (data.files) {
      let fileCount = 0, fileSkipped = 0;
      for (const r of data.files) {
        try {
          await client.query('SAVEPOINT file_sp');
          await client.query(
            `INSERT INTO training_activity_files (id, session_id, activity_id, tenant_id, title, file_name, file_path, mime_type, file_size, url, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
            [r.id, r.session_id, r.activity_id, r.tenant_id, r.title, r.file_name, r.file_path, r.mime_type, r.file_size, r.url, r.created_at, r.updated_at]
          );
          await client.query('RELEASE SAVEPOINT file_sp');
          fileCount++;
        } catch (e) {
          await client.query('ROLLBACK TO SAVEPOINT file_sp');
          if (e.code === '23503') { fileSkipped++; } else { throw e; }
        }
      }
      console.log(`Files: ${fileCount} imported, ${fileSkipped} skipped (orphan FK)`);
    }

    // Match players
    if (data.match_players) {
      for (const r of data.match_players) {
        await client.query(
          `INSERT INTO match_players (id, session_id, athlete_id, tenant_id, status, minutes_played, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.session_id, r.athlete_id, r.tenant_id, r.status || 'starter', r.minutes_played, r.created_at, r.updated_at]
        );
      }
      console.log(`Match players: ${data.match_players.length}`);
    }

    // Match events
    if (data.match_events) {
      for (const r of data.match_events) {
        await client.query(
          `INSERT INTO match_events (id, session_id, tenant_id, event_type, team, goal_type, minute, player_id, notes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.session_id, r.tenant_id, r.event_type, r.team, r.goal_type, r.minute, r.player_id, r.notes, r.created_at, r.updated_at]
        );
      }
      console.log(`Match events: ${data.match_events.length}`);
    }

    // Tactical plays
    if (data.tactical_plays) {
      for (const r of data.tactical_plays) {
        await client.query(
          `INSERT INTO tactical_plays (id, tenant_id, club_id, name, description, field_type, field_view, team_a_color, team_b_color, keyframes, animation_speed, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.tenant_id, r.club_id, r.name, r.description, r.field_type, r.field_view || 'full', r.team_a_color, r.team_b_color, JSON.stringify(r.keyframes || []), r.animation_speed || 1, r.created_at, r.updated_at]
        );
      }
      console.log(`Tactical plays: ${data.tactical_plays.length}`);
    }

    await client.query('COMMIT');
    console.log('\nImport completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nImport failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
