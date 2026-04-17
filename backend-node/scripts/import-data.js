const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DATA_DIR = path.join(__dirname, '..', '..', 'export-supabase', 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  File not found: ${filePath}`);
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Detect the record type based on its fields.
 * Returns a string identifier for the table.
 */
function detectRecordType(record) {
  if (record.field_type && record.keyframes !== undefined) return 'tactical_plays';
  if (record.encrypted_password) return 'users';
  if (record.jersey_number !== undefined || record.position !== undefined) return 'athletes';
  if (record.abbreviation !== undefined) return 'contents';
  if (record.week_identifier) return 'training_microcycles';
  if (record.microcycle_id) return 'training_sessions';
  if (record.session_id && record.athlete_id) return 'match_players';
  if (record.event_type !== undefined && record.session_id) return 'match_events';
  if (record.session_id && record.name && record.order !== undefined) return 'training_activity_blocks';
  if (record.block_id) return 'training_activities';
  if (record.activity_id && record.content_id && !record.stage_name) return 'training_activity_contents';
  if (record.activity_id && record.stage_name !== undefined) return 'training_activity_stages';
  if (record.file_path !== undefined || record.mime_type !== undefined) return 'training_activity_files';
  if (record.content_id && record.title) return 'activity_titles';
  if (record.content_name !== undefined || (!record.abbreviation && record.name && !record.logo_path && !record.tenant_id)) return 'stages';
  if (record.logo_path !== undefined) return 'clubs';
  if (record.tenant_id && record.name && record.description !== undefined) return 'clubs';
  if (record.is_archived !== undefined) return 'activity_titles';
  return 'unknown';
}

async function importUsers(client) {
  const users = readJSON('users.json');
  if (!users) return 0;

  let count = 0;
  for (const u of users) {
    await client.query(
      `INSERT INTO users (id, email, encrypted_password, name, phone, bio, profile_photo, avatar_url, email_confirmed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.encrypted_password, u.name || null, u.phone || null,
       u.bio || null, u.profile_photo || null, u.avatar_url || null,
       u.email_confirmed_at || null, u.created_at, u.updated_at]
    );
    count++;
  }
  return count;
}

async function importTacticalPlays(client, records) {
  let count = 0;
  for (const r of records) {
    // Check if club_id exists, set to null if not
    let clubId = r.club_id || null;
    if (clubId) {
      const clubCheck = await client.query('SELECT id FROM clubs WHERE id = $1', [clubId]);
      if (clubCheck.rows.length === 0) {
        console.warn(`    Warning: club_id ${clubId} not found, setting to NULL for play "${r.name}"`);
        clubId = null;
      }
    }
    await client.query(
      `INSERT INTO tactical_plays (id, tenant_id, club_id, name, description, field_type, field_view, team_a_color, team_b_color, keyframes, animation_speed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id, clubId, r.name, r.description || null,
       r.field_type, r.field_view || 'full', r.team_a_color || '#3b82f6',
       r.team_b_color || '#ef4444', JSON.stringify(r.keyframes || []),
       r.animation_speed || 1, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importClubs(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO clubs (id, tenant_id, name, description, logo_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id, r.name, r.description || null, r.logo_path || null,
       r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importAthletes(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO athletes (id, tenant_id, club_id, name, position, jersey_number, status, observation, "group", photo_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id, r.club_id || null, r.name, r.position || null,
       r.jersey_number || null, r.status || 'active', r.observation || null,
       r.group || null, r.photo_url || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importContents(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO contents (id, tenant_id, name, abbreviation, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id || null, r.name, r.abbreviation || null,
       r.description || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importStages(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO stages (id, tenant_id, name, content_name, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id || null, r.name, r.content_name || null,
       r.description || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importActivityTitles(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO activity_titles (id, tenant_id, content_id, title, description, is_archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id || null, r.content_id || null, r.title,
       r.description || null, r.is_archived || false, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importMicrocycles(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_microcycles (id, tenant_id, club_id, week_identifier, name, start_date, end_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.tenant_id, r.club_id || null, r.week_identifier,
       r.name || null, r.start_date || null, r.end_date || null,
       r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importSessions(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_sessions (id, microcycle_id, tenant_id, club_id, date, day_name, day_of_week, session_type, opponent_name, match_duration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.microcycle_id, r.tenant_id, r.club_id || null, r.date,
       r.day_name || null, r.day_of_week || null, r.session_type || 'training',
       r.opponent_name || null, r.match_duration || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importBlocks(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_activity_blocks (id, session_id, name, "order", created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.session_id, r.name || null, r.order || 0, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importActivities(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_activities (id, block_id, title_id, tenant_id, description, groups, is_rest, duration_minutes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.block_id, r.title_id || null, r.tenant_id, r.description || null,
       JSON.stringify(r.groups || []), r.is_rest || false,
       r.duration_minutes || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importActivityContents(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_activity_contents (activity_id, content_id)
       VALUES ($1, $2)
       ON CONFLICT (activity_id, content_id) DO NOTHING`,
      [r.activity_id, r.content_id]
    );
    count++;
  }
  return count;
}

async function importActivityStages(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_activity_stages (id, activity_id, stage_name, "order", created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.activity_id, r.stage_name || null, r.order || 0,
       r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importFiles(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO training_activity_files (id, session_id, activity_id, tenant_id, title, file_name, file_path, mime_type, file_size, url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.session_id || null, r.activity_id || null, r.tenant_id,
       r.title || null, r.file_name || null, r.file_path || null,
       r.mime_type || null, r.file_size || null, r.url || null,
       r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importMatchPlayers(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO match_players (id, session_id, athlete_id, tenant_id, status, minutes_played, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.session_id, r.athlete_id, r.tenant_id,
       r.status || 'starter', r.minutes_played || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

async function importMatchEvents(client, records) {
  let count = 0;
  for (const r of records) {
    await client.query(
      `INSERT INTO match_events (id, session_id, tenant_id, event_type, team, goal_type, minute, player_id, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.session_id, r.tenant_id, r.event_type || null,
       r.team || null, r.goal_type || null, r.minute || null,
       r.player_id || null, r.notes || null, r.created_at, r.updated_at]
    );
    count++;
  }
  return count;
}

// Map of type -> import function
const IMPORTERS = {
  clubs: importClubs,
  athletes: importAthletes,
  contents: importContents,
  stages: importStages,
  activity_titles: importActivityTitles,
  training_microcycles: importMicrocycles,
  training_sessions: importSessions,
  training_activity_blocks: importBlocks,
  training_activities: importActivities,
  training_activity_contents: importActivityContents,
  training_activity_stages: importActivityStages,
  training_activity_files: importFiles,
  match_players: importMatchPlayers,
  match_events: importMatchEvents,
  tactical_plays: importTacticalPlays,
};

// Import order respects foreign key dependencies
const IMPORT_ORDER = [
  'clubs',
  'athletes',
  'contents',
  'stages',
  'activity_titles',
  'training_microcycles',
  'training_sessions',
  'training_activity_blocks',
  'training_activities',
  'training_activity_contents',
  'training_activity_stages',
  'training_activity_files',
  'match_players',
  'match_events',
  'tactical_plays',
];

async function importData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Import users
    console.log('Importing users...');
    const userCount = await importUsers(client);
    console.log(`  Imported ${userCount} users`);

    // 2. Import all_data.json
    const allData = readJSON('all_data.json');
    if (allData && Array.isArray(allData)) {
      // Classify all records by type
      const buckets = {};
      let unknownCount = 0;

      for (const record of allData) {
        const type = detectRecordType(record);
        if (type === 'unknown') {
          unknownCount++;
          continue;
        }
        if (!buckets[type]) buckets[type] = [];
        buckets[type].push(record);
      }

      if (unknownCount > 0) {
        console.warn(`  Warning: ${unknownCount} records with unrecognized structure`);
      }

      // Import in dependency order
      for (const type of IMPORT_ORDER) {
        if (buckets[type] && buckets[type].length > 0) {
          console.log(`Importing ${type}...`);
          const importer = IMPORTERS[type];
          const count = await importer(client, buckets[type]);
          console.log(`  Imported ${count} ${type}`);
        }
      }
    } else {
      console.log('No all_data.json found or file is empty');
    }

    await client.query('COMMIT');
    console.log('\nData import completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nImport failed, transaction rolled back');
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(err => {
  console.error(err);
  process.exit(1);
});
