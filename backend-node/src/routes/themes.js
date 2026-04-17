const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/themes - Get theme for a month
router.get('/', async (req, res) => {
  try {
    const { month, club_id } = req.query;
    if (!month || !club_id) {
      return res.status(400).json({ error: 'month and club_id are required' });
    }

    const result = await query(
      `SELECT mt.*,
        pc.name as primary_content_name, pc.abbreviation as primary_content_abbreviation,
        sc.name as secondary_content_name, sc.abbreviation as secondary_content_abbreviation
      FROM monthly_themes mt
      LEFT JOIN contents pc ON mt.primary_content_id = pc.id
      LEFT JOIN contents sc ON mt.secondary_content_id = sc.id
      WHERE mt.tenant_id = $1 AND mt.club_id = $2 AND mt.month = $3`,
      [req.user.id, club_id, month]
    );

    res.json(result.rows.length > 0 ? result.rows[0] : null);
  } catch (err) {
    console.error('Get theme error:', err);
    res.status(500).json({ error: 'Failed to get theme' });
  }
});

// GET /api/themes/adherence - Calculate adherence percentage
router.get('/adherence', async (req, res) => {
  try {
    const { month, club_id } = req.query;
    if (!month || !club_id) {
      return res.status(400).json({ error: 'month and club_id are required' });
    }

    // 1. Get the theme for the month
    const themeResult = await query(
      `SELECT mt.*,
        pc.name as primary_content_name, pc.abbreviation as primary_content_abbreviation,
        sc.name as secondary_content_name, sc.abbreviation as secondary_content_abbreviation
      FROM monthly_themes mt
      LEFT JOIN contents pc ON mt.primary_content_id = pc.id
      LEFT JOIN contents sc ON mt.secondary_content_id = sc.id
      WHERE mt.tenant_id = $1 AND mt.club_id = $2 AND mt.month = $3`,
      [req.user.id, club_id, month]
    );

    if (themeResult.rows.length === 0) {
      return res.json({ hasTheme: false });
    }

    const theme = themeResult.rows[0];

    // 2. Calculate date range for the month
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

    // 3. Get all activity IDs for sessions in this month/club
    // Exclude activities that have ONLY transversal contents ("Fisico" or "Tecnico")
    // These are complementary trainings that don't reflect tactical focus
    const activitiesResult = await query(
      `SELECT DISTINCT ta.id as activity_id
      FROM training_activities ta
      JOIN training_activity_blocks tab ON ta.block_id = tab.id
      JOIN training_sessions ts ON tab.session_id = ts.id
      JOIN training_microcycles tm ON ts.microcycle_id = tm.id
      WHERE ts.tenant_id = $1
        AND tm.club_id = $2
        AND ts.date >= $3
        AND ts.date <= $4
        AND ta.id NOT IN (
          SELECT tac_inner.activity_id
          FROM training_activity_contents tac_inner
          JOIN contents c_inner ON tac_inner.content_id = c_inner.id
          GROUP BY tac_inner.activity_id
          HAVING bool_and(c_inner.abbreviation IN ('FIS', 'TEC'))
        )`,
      [req.user.id, club_id, startDate.toISOString(), endDate.toISOString()]
    );

    const totalActivities = activitiesResult.rows.length;

    if (totalActivities === 0) {
      return res.json({
        hasTheme: true,
        theme: { name: theme.primary_content_name, abbreviation: theme.primary_content_abbreviation },
        secondaryTheme: theme.secondary_content_id
          ? { name: theme.secondary_content_name, abbreviation: theme.secondary_content_abbreviation }
          : null,
        totalActivities: 0,
        themedActivities: 0,
        adherencePercent: 0,
        description: theme.description,
        month: theme.month
      });
    }

    const activityIds = activitiesResult.rows.map(r => r.activity_id);

    // 4. Count activities matching primary content
    let themedActivityIds = new Set();

    const primaryResult = await query(
      `SELECT DISTINCT activity_id
      FROM training_activity_contents
      WHERE activity_id = ANY($1)
        AND content_id = $2`,
      [activityIds, theme.primary_content_id]
    );
    primaryResult.rows.forEach(r => themedActivityIds.add(r.activity_id));

    // 5. Also count secondary content matches if it exists
    if (theme.secondary_content_id) {
      const secondaryResult = await query(
        `SELECT DISTINCT activity_id
        FROM training_activity_contents
        WHERE activity_id = ANY($1)
          AND content_id = $2`,
        [activityIds, theme.secondary_content_id]
      );
      secondaryResult.rows.forEach(r => themedActivityIds.add(r.activity_id));
    }

    const themedActivities = themedActivityIds.size;
    const adherencePercent = Math.round((themedActivities / totalActivities) * 100);

    res.json({
      hasTheme: true,
      theme: { name: theme.primary_content_name, abbreviation: theme.primary_content_abbreviation },
      secondaryTheme: theme.secondary_content_id
        ? { name: theme.secondary_content_name, abbreviation: theme.secondary_content_abbreviation }
        : null,
      totalActivities,
      themedActivities,
      adherencePercent,
      description: theme.description,
      month: theme.month
    });
  } catch (err) {
    console.error('Get adherence error:', err);
    res.status(500).json({ error: 'Failed to calculate adherence' });
  }
});

// PUT /api/themes - Upsert theme
router.put('/', async (req, res) => {
  try {
    const { month, club_id, primary_content_id, secondary_content_id, description } = req.body;
    if (!month || !club_id || !primary_content_id) {
      return res.status(400).json({ error: 'month, club_id, and primary_content_id are required' });
    }

    const result = await query(
      `INSERT INTO monthly_themes (tenant_id, club_id, month, primary_content_id, secondary_content_id, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, club_id, month)
      DO UPDATE SET primary_content_id = $4, secondary_content_id = $5, description = $6, updated_at = now()
      RETURNING *`,
      [req.user.id, club_id, month, primary_content_id, secondary_content_id || null, description || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Upsert theme error:', err);
    res.status(500).json({ error: 'Failed to save theme' });
  }
});

// DELETE /api/themes/:id - Delete theme
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM monthly_themes WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    res.json({ message: 'Theme deleted successfully' });
  } catch (err) {
    console.error('Delete theme error:', err);
    res.status(500).json({ error: 'Failed to delete theme' });
  }
});

module.exports = router;
