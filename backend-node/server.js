require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const clubsRoutes = require('./src/routes/clubs');
const athletesRoutes = require('./src/routes/athletes');
const microcyclesRoutes = require('./src/routes/microcycles');
const sessionsRoutes = require('./src/routes/sessions');
const activitiesRoutes = require('./src/routes/activities');
const contentsRoutes = require('./src/routes/contents');
const titlesRoutes = require('./src/routes/titles');
const gamesRoutes = require('./src/routes/games');
const statsRoutes = require('./src/routes/stats');
const playsRoutes = require('./src/routes/plays');
const themesRoutes = require('./src/routes/themes');
const filesRoutes = require('./src/routes/files');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.resolve(process.env.UPLOAD_DIR || '../uploads');
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/athletes', athletesRoutes);
app.use('/api/microcycles', microcyclesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api', contentsRoutes);
app.use('/api/titles', titlesRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/plays', playsRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/files', filesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Sports Platform API running on port ${PORT}`);
});

module.exports = app;
