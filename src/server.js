// 'use strict';

// const fs = require('fs');
// const path = require('path');
// const express = require('express');
// const morgan = require('morgan');
// const multer = require('multer');

// const app = express();
// const PORT = process.env.PORT || 3000;
// const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
// const fsPromises = fs.promises;

// fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// const upload = multer({
//   storage: multer.diskStorage({
//     destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
//     filename: (req, file, cb) => {
//       cb(
//         null,
//         [
//           'activity',
//           req.userId || 'guest',
//           Date.now(),
//           Math.round(Math.random() * 1000)
//         ].join('-') + path.extname(file.originalname || '')
//       );
//     }
//   }),
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5 MB photo limit
//   },
//   fileFilter: (_req, file, cb) => {
//     if (!file.mimetype.startsWith('image/')) {
//       return cb(new Error('Only image uploads are allowed.'));
//     }
//     cb(null, true);
//   }
// });

// // In-memory stores for quick prototyping; replace with a database later.
// const usersByUsername = new Map();
// const usersById = new Map();
// const sessions = new Map();
// const activitiesByUser = new Map();

// const deletePhotoFile = async (photoUrl) => {
//   if (!photoUrl) {
//     return;
//   }
//   const filename = path.basename(photoUrl);
//   if (!filename) {
//     return;
//   }
//   const filePath = path.join(UPLOAD_DIR, filename);
//   try {
//     await fsPromises.unlink(filePath);
//   } catch (error) {
//     if (error.code !== 'ENOENT') {
//       console.error('Failed to remove photo', error);
//     }
//   }
// };

// const cleanupUploadedFile = (req) => {
//   if (req.file) {
//     deletePhotoFile(`/uploads/${req.file.filename}`);
//   }
// };

// const seedUser = {
//   id: 'user-1',
//   username: 'athlete',
//   password: '123456',
//   displayName: 'Athlete Demo'
// };
// usersByUsername.set(seedUser.username, seedUser);
// usersById.set(seedUser.id, seedUser);
// activitiesByUser.set(seedUser.id, [
//   {
//     id: 'seed-' + Date.now(),
//     date: '2024-01-01',
//     sport: 'Running',
//     durationMinutes: 30,
//     intensity: 'moderate',
//     notes: 'Sample record you can remove.',
//     photoUrl: '',
//     isPublic: true,
//     ownerId: seedUser.id,
//     ownerName: seedUser.displayName,
//     createdAt: new Date().toISOString()
//   }
// ]);

// app.use(morgan('dev'));
// app.use(express.json());
// app.use(express.static(path.join(__dirname, '..', 'public')));

// app.get('/api/health', (_req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// const createSession = (userId) => {
//   const token = `token-${userId}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
//   sessions.set(token, userId);
//   return token;
// };

// const sanitizeUser = (user) => ({
//   id: user.id,
//   username: user.username,
//   displayName: user.displayName
// });

// const parseBooleanFlag = (value, fallback = false) => {
//   if (value === undefined || value === null || value === '') {
//     return fallback;
//   }

//   const normalized = String(value).toLowerCase();

//   if (['true', '1', 'on', 'yes'].includes(normalized)) {
//     return true;
//   }

//   if (['false', '0', 'off', 'no'].includes(normalized)) {
//     return false;
//   }

//   return fallback;
// };

// // TODO: Integrate your preferred weather API inside this helper.
// // Provide any required context (e.g., coordinates stored per user) via the parameter.
// async function fetchWeatherForUser(_context) {
//   /*
//    * Example:
//    * const response = await fetch('https://your-weather-api', { ... });
//    * const data = await response.json();
//    * return {
//    *   location: data.location.name,
//    *   temperatureC: data.current.temp_c,
//    *   condition: data.current.condition.text,
//    *   humidity: data.current.humidity / 100,
//    *   windKph: data.current.wind_kph,
//    *   lastUpdated: data.current.last_updated
//    * };
//    */
//   return null;
// }

// app.post('/api/register', (req, res) => {
//   const { username, password, displayName } = req.body;

//   if (!username || !password) {
//     return res
//       .status(400)
//       .json({ error: 'username and password are required fields.' });
//   }

//   const normalizedUsername = String(username).trim();

//   if (usersByUsername.has(normalizedUsername)) {
//     return res.status(409).json({ error: 'Username already exists.' });
//   }

//   if (String(password).length < 6) {
//     return res
//       .status(400)
//       .json({ error: 'Password must be at least 6 characters long.' });
//   }

//   const newUser = {
//     id: `user-${Date.now()}-${Math.round(Math.random() * 1000)}`,
//     username: normalizedUsername,
//     password: String(password),
//     displayName: displayName?.trim() || normalizedUsername
//   };

//   usersByUsername.set(newUser.username, newUser);
//   usersById.set(newUser.id, newUser);
//   activitiesByUser.set(newUser.id, []);

//   res.status(201).json({
//     data: {
//       user: sanitizeUser(newUser),
//       message: 'Registration successful. Please log in.'
//     }
//   });
// });

// app.post('/api/login', (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res
//       .status(400)
//       .json({ error: 'username and password are required fields.' });
//   }

//   const normalizedUsername = String(username).trim();
//   const match = usersByUsername.get(normalizedUsername);

//   if (!match || match.password !== String(password)) {
//     return res.status(401).json({ error: 'Invalid username or password.' });
//   }

//   usersById.set(match.id, match);

//   const token = createSession(match.id);

//   res.json({
//     data: {
//       token,
//       user: sanitizeUser(match)
//     }
//   });
// });

// const requireAuth = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   const token = authHeader?.replace('Bearer ', '');

//   if (!token || !sessions.has(token)) {
//     return res.status(401).json({ error: 'Unauthorized.' });
//   }

//   req.userId = sessions.get(token);
//   next();
// };

// app.get('/api/activities', requireAuth, (req, res) => {
//   const userActivities = activitiesByUser.get(req.userId) ?? [];
//   const normalized = userActivities.map((activity) => ({
//     ...activity,
//     isPublic: Boolean(activity.isPublic),
//     ownerId: activity.ownerId || req.userId,
//     ownerName:
//       activity.ownerName ||
//       usersById.get(req.userId)?.displayName ||
//       usersById.get(req.userId)?.username ||
//       '使用者',
//     createdAt:
//       activity.createdAt ||
//       (activity.date ? new Date(activity.date).toISOString() : new Date().toISOString())
//   }));

//   res.json({ data: normalized });
// });

// app.get('/api/activities/public', requireAuth, (_req, res) => {
//   const feed = [];

//   for (const [, activityList] of activitiesByUser.entries()) {
//     for (const activity of activityList) {
//       if (activity.isPublic) {
//         feed.push({
//           ...activity,
//           isPublic: true,
//           createdAt:
//             activity.createdAt ||
//             (activity.date
//               ? new Date(activity.date).toISOString()
//               : new Date().toISOString())
//         });
//       }
//     }
//   }

//   feed.sort((a, b) => {
//     const aTime = new Date(a.createdAt || a.date).getTime();
//     const bTime = new Date(b.createdAt || b.date).getTime();
//     return bTime - aTime;
//   });

//   res.json({ data: feed });
// });

// app.get('/api/weather', requireAuth, async (req, res, next) => {
//   try {
//     const weather = await fetchWeatherForUser({ userId: req.userId });

//     if (weather) {
//       return res.json({ data: weather });
//     }

//     res.json({
//       data: {
//         summary: '天氣',
//         lastUpdated: new Date().toISOString()
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// const createActivity = (req, res) => {
//   const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;

//   if (!date || !sport || !durationMinutes) {
//     cleanupUploadedFile(req);
//     return res.status(400).json({
//       error: 'date, sport, and durationMinutes are required fields.'
//     });
//   }

//   const parsedDuration = Number(durationMinutes);
//   if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
//     cleanupUploadedFile(req);
//     return res
//       .status(400)
//       .json({ error: 'durationMinutes must be a positive number.' });
//   }

//   const isPublicValue = parseBooleanFlag(isPublic, false);

//   let photoUrl = '';
//   if (req.file) {
//     photoUrl = `/uploads/${req.file.filename}`;
//   }

//   const owner = usersById.get(req.userId);
//   const ownerName = owner?.displayName || owner?.username || '使用者';

//   const newActivity = {
//     id: `activity-${Date.now()}-${Math.round(Math.random() * 1000)}`,
//     date,
//     sport,
//     durationMinutes: parsedDuration,
//     intensity: intensity || 'moderate',
//     notes: notes || '',
//     photoUrl,
//     isPublic: isPublicValue,
//     ownerId: req.userId,
//     ownerName,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString()
//   };

//   const userActivities = activitiesByUser.get(req.userId);
//   if (!userActivities) {
//     activitiesByUser.set(req.userId, [newActivity]);
//   } else {
//     userActivities.unshift(newActivity);
//   }

//   res.status(201).json({ data: newActivity });
// };

// app.post('/api/activities', requireAuth, (req, res, next) => {
//   const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

//   if (!isMultipart) {
//     return createActivity(req, res);
//   }

//   upload.single('photo')(req, res, (err) => {
//     if (err) {
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ error: 'Photo must be smaller than 5 MB.' });
//       }
//       return res.status(400).json({ error: err.message || 'Upload failed.' });
//     }

//     try {
//       createActivity(req, res);
//     } catch (error) {
//       next(error);
//     }
//   });
// });

// const updateActivity = async (req, res) => {
//   const { activityId } = req.params;
//   const userActivities = activitiesByUser.get(req.userId);

//   if (!userActivities) {
//     cleanupUploadedFile(req);
//     return res.status(404).json({ error: 'Activity not found.' });
//   }

//   const activity = userActivities.find((item) => item.id === activityId);

//   if (!activity) {
//     cleanupUploadedFile(req);
//     return res.status(404).json({ error: 'Activity not found.' });
//   }

//   const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;

//   if (!date || !sport || !durationMinutes) {
//     cleanupUploadedFile(req);
//     return res.status(400).json({
//       error: 'date, sport, and durationMinutes are required fields.'
//     });
//   }

//   const parsedDuration = Number(durationMinutes);
//   if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
//     cleanupUploadedFile(req);
//     return res
//       .status(400)
//       .json({ error: 'durationMinutes must be a positive number.' });
//   }

//   const prevPhotoUrl = activity.photoUrl;
//   if (req.file) {
//     activity.photoUrl = `/uploads/${req.file.filename}`;
//   }

//   activity.date = date;
//   activity.sport = sport;
//   activity.durationMinutes = parsedDuration;
//   activity.intensity = intensity || activity.intensity || 'moderate';
//   activity.notes = notes !== undefined ? notes : activity.notes || '';
//   activity.isPublic = parseBooleanFlag(isPublic, activity.isPublic);
//   activity.updatedAt = new Date().toISOString();

//   if (req.file && prevPhotoUrl && prevPhotoUrl !== activity.photoUrl) {
//     await deletePhotoFile(prevPhotoUrl);
//   }

//   res.json({ data: activity });
// };

// app.put('/api/activities/:activityId', requireAuth, (req, res, next) => {
//   const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

//   if (!isMultipart) {
//     updateActivity(req, res).catch(next);
//     return;
//   }

//   upload.single('photo')(req, res, (err) => {
//     if (err) {
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ error: 'Photo must be smaller than 5 MB.' });
//       }
//       return res.status(400).json({ error: err.message || 'Upload failed.' });
//     }

//     updateActivity(req, res).catch(next);
//   });
// });

// app.delete('/api/activities/:activityId', requireAuth, async (req, res) => {
//   const { activityId } = req.params;
//   const userActivities = activitiesByUser.get(req.userId);

//   if (!userActivities) {
//     return res.status(404).json({ error: 'Activity not found.' });
//   }

//   const index = userActivities.findIndex((item) => item.id === activityId);

//   if (index === -1) {
//     return res.status(404).json({ error: 'Activity not found.' });
//   }

//   const [removed] = userActivities.splice(index, 1);

//   if (removed?.photoUrl) {
//     await deletePhotoFile(removed.photoUrl);
//   }

//   res.json({ data: { id: activityId } });
// });

// app.use((req, res) => {
//   res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
// });

// app.use((err, _req, res, _next) => {
//   // Log and return a generic error to keep response consistent.
//   console.error(err);
//   res.status(500).json({ error: 'Unexpected server error.' });
// });

// app.listen(PORT, () => {
//   console.log(`Sports tracker listening on http://localhost:${PORT}`);
// });

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const multer = require('multer');

// NEW: 載入 dotenv (讀取 .env 檔案)
require('dotenv').config();

// NEW: 載入 pg (PostgreSQL) 和 bcrypt (密碼加密)
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const fsPromises = fs.promises;

// NEW: 建立 PostgreSQL 連線池
// Render 會自動提供 DATABASE_URL 環境變數
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 如果在 Render 上使用內部連線，建議開啟 SSL
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// NEW: 資料庫初始化函式
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 建立 users 資料表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT
      );
    `);

    // 建立 activities 資料表
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        sport TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        intensity TEXT DEFAULT 'moderate',
        notes TEXT,
        photo_url TEXT,
        is_public BOOLEAN DEFAULT false,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 建立 sessions 資料表 (用於儲存登入 token)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Database tables checked/created successfully.');

    // NEW: 插入範例使用者 (如果他不存在)，並使用 bcrypt 加密密碼
    const seedUsername = 'athlete';
    const seedPassword = '123456'; // 這是 README 中的範例密碼
    const saltRounds = 10;
    
    // 檢查使用者是否已存在
    const userCheck = await client.query('SELECT id FROM users WHERE username = $1', [seedUsername]);
    
    if (userCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash(seedPassword, saltRounds);
      const seedUserId = 'user-seed-1';
      await client.query(
        'INSERT INTO users (id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)',
        [seedUserId, seedUsername, passwordHash, 'Athlete Demo']
      );
      
      // 插入一筆範例活動
      await client.query(
        `INSERT INTO activities 
          (id, date, sport, duration_minutes, intensity, notes, is_public, owner_id) 
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'seed-' + Date.now(),
          '2024-01-01',
          'Running',
          30,
          'moderate',
          'Sample record you can remove.',
          true,
          seedUserId
        ]
      );
      console.log('Seed user and activity created.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1); // 如果資料庫無法初始化，就停止服務
  } finally {
    client.release(); // 釋放連線
  }
}

// --- (檔案上傳相關的程式碼，保持不變) ---
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      cb(
        null,
        [
          'activity',
          req.userId || 'guest',
          Date.now(),
          Math.round(Math.random() * 1000)
        ].join('-') + path.extname(file.originalname || '')
      );
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB photo limit
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  }
});

// REMOVED: In-memory stores (usersByUsername, usersById, sessions, activitiesByUser)

const deletePhotoFile = async (photoUrl) => {
  if (!photoUrl) {
    return;
  }
  const filename = path.basename(photoUrl);
  if (!filename) {
    return;
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to remove photo', error);
    }
  }
};

const cleanupUploadedFile = (req) => {
  if (req.file) {
    deletePhotoFile(`/uploads/${req.file.filename}`);
  }
};

// REMOVED: seedUser object (已移至 initializeDatabase)

// --- (中介軟體，保持不變) ---
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REFACTORED: createSession 改為寫入資料庫
const createSession = async (userId) => {
  const token = `token-${userId}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  try {
    await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, userId]);
    return token;
  } catch (err) {
    console.error('Error creating session:', err);
    throw new Error('Could not create session');
  }
};

// (sanitizeUser 保持不變)
const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  displayName: user.display_name // 注意：資料庫欄位是 display_name
});

// (parseBooleanFlag 保持不變)
const parseBooleanFlag = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'on', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }
  return fallback;
};

// (fetchWeatherForUser 保持不變)
async function fetchWeatherForUser(_context) {
  /* ... (天氣 API 邏輯) ... */
  return null;
}

// REFACTORED: /api/register (使用資料庫和 bcrypt)
app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'username and password are required fields.' });
  }

  const normalizedUsername = String(username).trim();

  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // 檢查使用者名稱是否已存在
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    // NEW: 雜湊密碼
    const passwordHash = await bcrypt.hash(String(password), 10);

    const newUser = {
      id: `user-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      username: normalizedUsername,
      password_hash: passwordHash, // 儲存雜湊
      display_name: displayName?.trim() || normalizedUsername
    };

    // 插入新使用者
    await pool.query(
      'INSERT INTO users (id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [newUser.id, newUser.username, newUser.password_hash, newUser.display_name]
    );

    res.status(201).json({
      data: {
        user: sanitizeUser(newUser),
        message: 'Registration successful. Please log in.'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// REFACTORED: /api/login (使用資料庫和 bcrypt)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'username and password are required fields.' });
  }

  const normalizedUsername = String(username).trim();

  try {
    // 尋找使用者
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [normalizedUsername]);
    const match = result.rows[0];

    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // NEW: 驗證密碼
    const isValidPassword = await bcrypt.compare(String(password), match.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // 建立 session
    const token = await createSession(match.id);

    res.json({
      data: {
        token,
        user: sanitizeUser(match)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// REFACTORED: requireAuth (檢查資料庫中的 session)
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    // 檢查 token 是否在 sessions 資料表中
    const result = await pool.query('SELECT user_id FROM sessions WHERE token = $1', [token]);
    const session = result.rows[0];

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    req.userId = session.user_id;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Unauthorized.' });
  }
};

// REFACTORED: GET /api/activities (從資料庫讀取)
app.get('/api/activities', requireAuth, async (req, res, next) => {
  try {
    // 使用 JOIN 取得活動以及擁有者的 display_name
    const result = await pool.query(
      `SELECT a.*, u.display_name as owner_name 
       FROM activities a
       JOIN users u ON a.owner_id = u.id
       WHERE a.owner_id = $1 
       ORDER BY a.created_at DESC`,
      [req.userId]
    );
    
    // 將 is_public 轉為布林值 (雖然資料庫已是)
    const normalized = result.rows.map((activity) => ({
      ...activity,
      isPublic: Boolean(activity.is_public),
      ownerName: activity.owner_name // 已從 JOIN 取得
    }));

    res.json({ data: normalized });
  } catch (err) {
    next(err);
  }
});

// REFACTORED: GET /api/activities/public (從資料庫讀取)
app.get('/api/activities/public', requireAuth, async (_req, res, next) => {
  try {
    // 取得所有 is_public = true 的活動，並 JOIN 使用者名稱
    const result = await pool.query(
      `SELECT a.*, u.display_name as owner_name 
       FROM activities a
       JOIN users u ON a.owner_id = u.id
       WHERE a.is_public = true 
       ORDER BY a.created_at DESC`
    );
    
    const feed = result.rows.map((activity) => ({
      ...activity,
      isPublic: true,
      ownerName: activity.owner_name
    }));

    res.json({ data: feed });
  } catch (err) {
    next(err);
  }
});

// (GET /api/weather 保持不變)
app.get('/api/weather', requireAuth, async (req, res, next) => {
  try {
    const weather = await fetchWeatherForUser({ userId: req.userId });
    if (weather) {
      return res.json({ data: weather });
    }
    res.json({
      data: {
        summary: '天氣',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// REFACTORED: createActivity (寫入資料庫)
const createActivity = async (req, res, next) => {
  const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;

  if (!date || !sport || !durationMinutes) {
    cleanupUploadedFile(req);
    return res.status(400).json({
      error: 'date, sport, and durationMinutes are required fields.'
    });
  }

  const parsedDuration = Number(durationMinutes);
  if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
    cleanupUploadedFile(req);
    return res
      .status(400)
      .json({ error: 'durationMinutes must be a positive number.' });
  }

  const isPublicValue = parseBooleanFlag(isPublic, false);
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : '';
  const newActivityId = `activity-${Date.now()}-${Math.round(Math.random() * 1000)}`;

  try {
    const newActivity = {
      id: newActivityId,
      date,
      sport,
      duration_minutes: parsedDuration,
      intensity: intensity || 'moderate',
      notes: notes || '',
      photo_url: photoUrl,
      is_public: isPublicValue,
      owner_id: req.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await pool.query(
      `INSERT INTO activities 
        (id, date, sport, duration_minutes, intensity, notes, photo_url, is_public, owner_id) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newActivity.id,
        newActivity.date,
        newActivity.sport,
        newActivity.duration_minutes,
        newActivity.intensity,
        newActivity.notes,
        newActivity.photo_url,
        newActivity.is_public,
        newActivity.owner_id
      ]
    );

    // 回傳前端需要的值 (欄位名稱可能需要轉換)
    res.status(201).json({ data: {
      ...newActivity,
      durationMinutes: newActivity.duration_minutes,
      photoUrl: newActivity.photo_url,
      isPublic: newActivity.is_public,
      ownerId: newActivity.owner_id,
      createdAt: newActivity.created_at,
      updatedAt: newActivity.updated_at,
      // ownerName: ... (可以再查一次，但 create 通常只回傳新物件)
    }});
  } catch (err) {
    cleanupUploadedFile(req);
    next(err);
  }
};

// (POST /api/activities 的 multer 處理邏輯保持不變)
app.post('/api/activities', requireAuth, (req, res, next) => {
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
  if (!isMultipart) {
    createActivity(req, res, next).catch(next); // 確保捕捉 async 錯誤
    return;
  }
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo must be smaller than 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    createActivity(req, res, next).catch(next); // 確保捕捉 async 錯誤
  });
});

// REFACTORED: updateActivity (更新資料庫)
const updateActivity = async (req, res, next) => {
  const { activityId } = req.params;
  const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;

  if (!date || !sport || !durationMinutes) {
    cleanupUploadedFile(req);
    return res.status(400).json({
      error: 'date, sport, and durationMinutes are required fields.'
    });
  }

  const parsedDuration = Number(durationMinutes);
  if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
    cleanupUploadedFile(req);
    return res
      .status(400)
      .json({ error: 'durationMinutes must be a positive number.' });
  }
  
  try {
    // 1. 找出舊的 activity (為了取得舊照片 URL)
    const oldResult = await pool.query(
      'SELECT photo_url FROM activities WHERE id = $1 AND owner_id = $2',
      [activityId, req.userId]
    );
    
    if (oldResult.rows.length === 0) {
      cleanupUploadedFile(req);
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    const prevPhotoUrl = oldResult.rows[0].photo_url;
    const newPhotoUrl = req.file ? `/uploads/${req.file.filename}` : prevPhotoUrl;
    const isPublicValue = parseBooleanFlag(isPublic, false);
    
    // 2. 更新資料庫
    const updateResult = await pool.query(
      `UPDATE activities SET 
         date = $1, 
         sport = $2, 
         duration_minutes = $3, 
         intensity = $4, 
         notes = $5, 
         is_public = $6, 
         photo_url = $7, 
         updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [
        date,
        sport,
        parsedDuration,
        intensity || 'moderate',
        notes || '',
        isPublicValue,
        newPhotoUrl,
        activityId,
        req.userId
      ]
    );

    const updatedActivity = updateResult.rows[0];

    // 3. 如果上傳了新照片，且舊照片存在，就刪除舊照片檔案
    if (req.file && prevPhotoUrl && prevPhotoUrl !== newPhotoUrl) {
      await deletePhotoFile(prevPhotoUrl);
    }

    res.json({ data: {
      ...updatedActivity,
      durationMinutes: updatedActivity.duration_minutes,
      photoUrl: updatedActivity.photo_url,
      isPublic: updatedActivity.is_public
    }});

  } catch (err) {
    cleanupUploadedFile(req);
    next(err);
  }
};

// (PUT /api/activities/:activityId 的 multer 處理邏輯保持不變)
app.put('/api/activities/:activityId', requireAuth, (req, res, next) => {
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  if (!isMultipart) {
    updateActivity(req, res, next).catch(next);
    return;
  }

  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo must be smaller than 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }

    updateActivity(req, res, next).catch(next);
  });
});

// REFACTORED: DELETE /api/activities/:activityId (從資料庫刪除)
app.delete('/api/activities/:activityId', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  
  try {
    // 1. 刪除資料庫紀錄，並取回被刪除的 photo_url
    const result = await pool.query(
      'DELETE FROM activities WHERE id = $1 AND owner_id = $2 RETURNING photo_url',
      [activityId, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    const removedPhotoUrl = result.rows[0].photo_url;

    // 2. 如果有照片，刪除對應的檔案
    if (removedPhotoUrl) {
      await deletePhotoFile(removedPhotoUrl);
    }
    
    res.json({ data: { id: activityId } });
  } catch(err) {
    next(err);
  }
});

// --- (錯誤處理中介軟體，保持不變) ---
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

// NEW: 啟動伺服器函式
// 我們需要先初始化資料庫，再啟動 Express 伺服器
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Sports tracker listening on http://localhost:${PORT}`);
  });
}

// 執行啟動
startServer().catch(err => {
  console.error('Failed to start server:', err);
});