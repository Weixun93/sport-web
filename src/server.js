'use strict';

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const axios = require('axios');

require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { env } = require('process');

const app = express();
const PORT = process.env.PORT || 3000;

// *** NEW: 根據環境決定 SSL 設定 ***
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction 
    ? false // Render 內部連線不需要 SSL
    : { rejectUnauthorized: false } // 本地外部連線需要 SSL
});

// *** NEW HELPER FUNCTION ***
// 將 JS Date 物件或時間戳字串，格式化為 YYYY-MM-DD
// 我們使用 UTC 日期以避免時區問題
function toISODateString(date) {
  if (!date) return '';
  try {
    // 如果是字符串，直接返回 YYYY-MM-DD 部分
    const dateStr = String(date);
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    // 如果是 Date 物件，使用 UTC 方法
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    // 如果出錯，嘗試回傳字串的第一部分
    return String(date).split('T')[0];
  }
}

// *** NEW: 資料庫初始化函式 ***
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

    // 建立 likes 資料表 (用於儲存按讚信息)
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(activity_id, user_id)
      );
    `);

    // 建立 comments 資料表 (用於儲存留言)
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 建立 goals 資料表 (用於儲存運動目標)
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weekly_goal INTEGER DEFAULT 3,
        monthly_goal INTEGER DEFAULT 12,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);

    console.log('Database tables checked/created successfully.');

    // *** NEW: 插入範例使用者 (如果他不存在)，並使用 bcrypt 加密密碼 ***
    const seedUsername = 'athlete';
    const seedPassword = '123456'; 
    const saltRounds = 10;
    
    const userCheck = await client.query('SELECT id FROM users WHERE username = $1', [seedUsername]);
    
    if (userCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash(seedPassword, saltRounds);
      const seedUserId = 'user-seed-1';
      await client.query(
        'INSERT INTO users (id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)',
        [seedUserId, seedUsername, passwordHash, 'Athlete Demo']
      );
      
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
    process.exit(1);
  } finally {
    client.release();
  }
}

// (Multer 相關設定 - 儲存為 Base64 在資料庫中)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  }
});


// --- 中介軟體 ---
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 工具函數
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

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  displayName: user.display_name
});

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

// 台灣主要氣象站座標資料（經緯度）
const weatherStations = [
  { name: '基隆', lat: 25.133314, lon: 121.740475 },
  { name: '臺北', lat: 25.037658, lon: 121.514853 },
  { name: '新北', lat: 24.959207, lon: 121.525196 },
  { name: '桃園', lat: 24.992425, lon: 121.323172 },
  { name: '新竹', lat: 24.827853, lon: 121.014219 },
  { name: '臺中', lat: 24.145736, lon: 120.684075 },
  // TODO
];

// 計算兩點之間的距離（使用 Haversine 公式，單位：公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半徑（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 根據使用者座標找到最近的氣象站
function findNearestStation(userLat, userLon) {
  let nearestStation = weatherStations[0];
  let minDistance = calculateDistance(userLat, userLon, nearestStation.lat, nearestStation.lon);
  
  for (let i = 1; i < weatherStations.length; i++) {
    const station = weatherStations[i];
    const distance = calculateDistance(userLat, userLon, station.lat, station.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }
  
  console.log(`🎯 Nearest station: ${nearestStation.name} (${minDistance.toFixed(2)} km away)`);
  return nearestStation.name;
}

async function fetchWeatherForUser(_context) {
  // 如果有提供使用者座標，則使用最近的觀測站；否則使用預設值
  let location = "台北";  // 預設測站名稱
  
  if (_context && _context.userLat && _context.userLon) {
    location = findNearestStation(_context.userLat, _context.userLon);
    console.log(`📍 Using nearest station based on user location: ${location}`);
  } else {
    console.log(`📍 Using default station: ${location}`);
  }
  const token = env.WEATHER_API_TOKEN || '';
  
  // 如果沒有 token，返回預設資料
  if (!token) {
    console.log('⚠️ No WEATHER_API_TOKEN found, returning mock data');
    return {
      location: '基隆',
      condition: '晴天',
      temperatureC: 25,
      humidity: 0.65,
      windKph: 10,
      summary: '晴天 25°C',
      lastUpdated: new Date().toISOString()
    };
  }
  
  // 使用自動氣象站觀測資料 API
  const url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001';
  const config = {
    headers: {
      'Authorization': token,
    },
    params: {
      StationName: location,  // 使用測站名稱作為參數
    }
  };

  try {
    const response = await axios.get(url, config);
    const records = response.data?.records;
    
    if (!records || !records.Station || !records.Station.length) {
      console.log('⚠️ No weather data found in API response');
      return null;
    }

    // 取得第一個測站的資料
    const station = records.Station[0];
    const stationName = station.StationName || location;
    const weatherElement = station.WeatherElement;
    
    if (!weatherElement) {
      console.log('⚠️ No WeatherElement found');
      return null;
    }

    // 解析各項氣象資料
    const temperature = weatherElement.AirTemperature 
      ? parseFloat(weatherElement.AirTemperature) 
      : null;
    
    const humidity = weatherElement.RelativeHumidity 
      ? parseFloat(weatherElement.RelativeHumidity) / 100  // 轉換為 0-1 的小數
      : null;
    
    const windSpeed = weatherElement.WindSpeed 
      ? parseFloat(weatherElement.WindSpeed) 
      : null;
    
    const weather = weatherElement.Weather || '無資料';
    console.log('Raw weather condition:', weather);
    console.log(typeof weather);
    // if (weather === '-99') {
    //   weather = '儀器故障';
    // }
    
    const weatherData = {
      location: stationName,
      condition: weather,
      temperatureC: temperature,
      humidity: humidity,
      windKph: windSpeed,
      summary: `${weather} ${temperature !== null ? temperature + '°C' : ''}`,
      lastUpdated: station.ObsTime?.DateTime || new Date().toISOString(),
      raw: records  // 保留完整原始資料供 debug
    };
    
    console.log('✅ Weather data fetched successfully:', weatherData);
    return weatherData;
    
  } catch (error) {
    console.error(`❌ Error fetching weather data: ${error.message}`);
    console.error('Error details:', error.response?.data || error);
    
    // 返回預設資料而非 null
    return {
      location: location,
      condition: '無法取得天氣資料',
      temperatureC: null,
      humidity: null,
      windKph: null,
      summary: '無法取得天氣資料',
      lastUpdated: new Date().toISOString()
    };
  }
}

// *** 認證端點 ***
app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required fields.' });
  }
  const normalizedUsername = String(username).trim();
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const newUser = {
      id: `user-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      username: normalizedUsername,
      password_hash: passwordHash,
      display_name: displayName?.trim() || normalizedUsername
    };
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

// *** 檢查用戶名是否可用 ***
app.get('/api/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  const normalizedUsername = String(username).trim();
  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    const isAvailable = existingUser.rows.length === 0;
    res.json({
      data: {
        username: normalizedUsername,
        available: isAvailable
      }
    });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Server error during username check.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required fields.' });
  }
  const normalizedUsername = String(username).trim();
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [normalizedUsername]);
    const match = result.rows[0];
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const isValidPassword = await bcrypt.compare(String(password), match.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
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

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
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

// *** 活動查詢端點 ***
app.get('/api/activities', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.sport, a.duration_minutes, a.intensity, a.notes, a.photo_url, a.is_public, a.owner_id, a.created_at, a.updated_at, u.display_name as owner_name, to_char(a.date, 'YYYY-MM-DD') AS date_str
       FROM activities a
       JOIN users u ON a.owner_id = u.id
       WHERE a.owner_id = $1 
       ORDER BY a.created_at DESC`,
      [req.userId]
    );
    
    const normalized = result.rows.map((activity) => ({
      ...activity,
      date: activity.date_str,
      durationMinutes: activity.duration_minutes,
      photoUrl: activity.photo_url,
      isPublic: Boolean(activity.is_public),
      ownerName: activity.owner_name 
    }));

    res.json({ data: normalized });
  } catch (err) {
    next(err);
  }
});

app.get('/api/activities/public', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.sport, a.duration_minutes, a.intensity, a.notes, a.photo_url, a.is_public, a.owner_id, a.created_at, a.updated_at, u.display_name as owner_name, to_char(a.date, 'YYYY-MM-DD') AS date_str
       FROM activities a
       JOIN users u ON a.owner_id = u.id
       WHERE a.is_public = true 
       ORDER BY a.created_at DESC`
    );
    
    // 獲取所有活動擁有者的目標達成狀態
    const ownerIds = [...new Set(result.rows.map(row => row.owner_id))];
    const goalsAchievements = {};
    
    for (const ownerId of ownerIds) {
      // 獲取用戶目標
      const goalsResult = await pool.query(
        'SELECT weekly_goal, monthly_goal FROM goals WHERE user_id = $1',
        [ownerId]
      );
      
      const weeklyGoal = goalsResult.rows[0]?.weekly_goal || 3;
      const monthlyGoal = goalsResult.rows[0]?.monthly_goal || 12;
      
      // 計算本週和本月的運動次數
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + diffToMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const weekResult = await pool.query(
        'SELECT COUNT(*) as count FROM activities WHERE owner_id = $1 AND date >= $2',
        [ownerId, weekStart.toISOString().split('T')[0]]
      );
      
      const monthResult = await pool.query(
        'SELECT COUNT(*) as count FROM activities WHERE owner_id = $1 AND date >= $2',
        [ownerId, monthStart.toISOString().split('T')[0]]
      );
      
      const weeklyCount = parseInt(weekResult.rows[0].count);
      const monthlyCount = parseInt(monthResult.rows[0].count);
      
      goalsAchievements[ownerId] = {
        weeklyGoal,
        monthlyGoal,
        weeklyCount,
        monthlyCount,
        hasWeeklyGoal: weeklyCount >= weeklyGoal,
        hasMonthlyGoal: monthlyCount >= monthlyGoal
      };
    }
    
    const feed = result.rows.map((activity) => ({
      ...activity,
      date: activity.date_str,
      durationMinutes: activity.duration_minutes,
      photoUrl: activity.photo_url,
      isPublic: true,
      ownerId: activity.owner_id,
      ownerName: activity.owner_name,
      isOwner: activity.owner_id === req.userId,
      ownerGoals: goalsAchievements[activity.owner_id] || null
    }));

    res.json({ data: feed });
  } catch (err) {
    next(err);
  }
});

app.get('/api/weather', requireAuth, async (req, res, next) => {
  try {
    // 從查詢參數取得使用者座標
    const { lat, lon } = req.query;
    const context = { userId: req.userId };
    
    // 如果提供了座標，加入 context
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      if (!isNaN(userLat) && !isNaN(userLon)) {
        context.userLat = userLat;
        context.userLon = userLon;
        console.log(`📍 Received user location: ${userLat}, ${userLon}`);
      }
    }
    
    const weather = await fetchWeatherForUser(context);
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

// *** 活動建立 (with 照片上傳) ***
const createActivity = async (req, res, next) => {
  const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;
  console.log('📝 [createActivity] Received date from client:', date);
  
  if (!date || !sport || !durationMinutes) {
    return res.status(400).json({ error: 'date, sport, and durationMinutes are required fields.' });
  }
  const parsedDuration = Number(durationMinutes);
  if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
    return res.status(400).json({ error: 'durationMinutes must be a positive number.' });
  }
  const isPublicValue = parseBooleanFlag(isPublic, false);
  const newActivityId = `activity-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  
  let photoUrl = '';
  if (req.file) {
    const base64Data = req.file.buffer.toString('base64');
    photoUrl = `data:${req.file.mimetype};base64,${base64Data}`;
  }
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
    
    console.log('📝 [createActivity] About to insert into DB with date:', date);
    
    const insertResult = await pool.query(
      `INSERT INTO activities 
        (id, date, sport, duration_minutes, intensity, notes, photo_url, is_public, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
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
    
    const insertedRow = insertResult.rows[0];
    console.log('📝 [createActivity] Retrieved from DB - raw date:', insertedRow.date, 'Type:', typeof insertedRow.date);
    
    res.status(201).json({ data: {
      ...newActivity,
      date: toISODateString(newActivity.date),
      durationMinutes: newActivity.duration_minutes,
      photoUrl: newActivity.photo_url,
      isPublic: newActivity.is_public,
      ownerId: newActivity.owner_id,
      createdAt: newActivity.created_at,
      updatedAt: newActivity.updated_at
    }});
  } catch (err) {
    next(err);
  }
};

app.post('/api/activities', requireAuth, (req, res, next) => {
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
  if (!isMultipart) {
    createActivity(req, res, next).catch(next); 
    return;
  }
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo must be smaller than 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    createActivity(req, res, next).catch(next); 
  });
});

// *** 活動更新 ***
const updateActivity = async (req, res, next) => {
  const { activityId } = req.params;
  const { date, sport, durationMinutes, intensity, notes, isPublic } = req.body;
  if (!date || !sport || !durationMinutes) {
    return res.status(400).json({ error: 'date, sport, and durationMinutes are required fields.' });
  }
  const parsedDuration = Number(durationMinutes);
  if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
    return res.status(400).json({ error: 'durationMinutes must be a positive number.' });
  }
  try {
    const oldResult = await pool.query(
      'SELECT photo_url FROM activities WHERE id = $1 AND owner_id = $2',
      [activityId, req.userId]
    );
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    const prevPhotoUrl = oldResult.rows[0].photo_url;
    const newPhotoUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : prevPhotoUrl;
    const isPublicValue = parseBooleanFlag(isPublic, false);
    const updateResult = await pool.query(
      `UPDATE activities SET 
         date = $1, sport = $2, duration_minutes = $3, intensity = $4, 
         notes = $5, is_public = $6, photo_url = $7, updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [
        date, sport, parsedDuration, intensity || 'moderate',
        notes || '', isPublicValue, newPhotoUrl,
        activityId, req.userId
      ]
    );
    const updatedActivity = updateResult.rows[0];
    res.json({ data: {
      ...updatedActivity,
      date: toISODateString(updatedActivity.date),
      durationMinutes: updatedActivity.duration_minutes,
      photoUrl: updatedActivity.photo_url,
      isPublic: updatedActivity.is_public
    }});
  } catch (err) {
    next(err);
  }
};

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

// *** 活動刪除 ***
app.delete('/api/activities/:activityId', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM activities WHERE id = $1 AND owner_id = $2',
      [activityId, req.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    res.json({ data: { id: activityId } });
  } catch(err) {
    next(err);
  }
});

// *** 修改密碼 ***
app.put('/api/user/password', requireAuth, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required fields.' });
  }
  
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }
  
  try {
    // 驗證當前密碼
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const isValidPassword = await bcrypt.compare(String(currentPassword), userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    
    // 更新密碼
    const newPasswordHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.userId]);
    
    // 刪除所有現有會話，強制重新登入
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.userId]);
    
    res.json({ data: { message: 'Password updated successfully. Please log in again.' } });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Server error during password update.' });
  }
});

// *** 刪除帳號 ***
app.delete('/api/user', requireAuth, async (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required to delete account.' });
  }
  
  try {
    // 驗證密碼
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const isValidPassword = await bcrypt.compare(String(password), userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Password is incorrect.' });
    }
    
    // 刪除用戶的所有活動（由於外鍵約束，會自動刪除）
    await pool.query('DELETE FROM activities WHERE owner_id = $1', [req.userId]);
    
    // 刪除用戶的所有會話
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.userId]);
    
    // 刪除用戶
    await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);
    
    res.json({ data: { message: 'Account deleted successfully.' } });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Server error during account deletion.' });
  }
});

// ========== 按讚功能 ==========
// 按讚
app.post('/api/activities/:activityId/like', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  
  try {
    // 檢查活動是否存在
    const activityCheck = await pool.query('SELECT id FROM activities WHERE id = $1', [activityId]);
    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    // 檢查是否已經按讚
    const likeCheck = await pool.query(
      'SELECT id FROM likes WHERE activity_id = $1 AND user_id = $2',
      [activityId, req.userId]
    );
    
    if (likeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked this activity.' });
    }
    
    // 添加按讚
    const likeId = `like-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    await pool.query(
      'INSERT INTO likes (id, activity_id, user_id) VALUES ($1, $2, $3)',
      [likeId, activityId, req.userId]
    );
    
    // 獲取更新後的按讚數
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE activity_id = $1',
      [activityId]
    );
    
    res.json({
      data: {
        likeId,
        likeCount: parseInt(likeCountResult.rows[0].count)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 取消按讚
app.delete('/api/activities/:activityId/like', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  
  try {
    // 刪除按讚
    const result = await pool.query(
      'DELETE FROM likes WHERE activity_id = $1 AND user_id = $2',
      [activityId, req.userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Like not found.' });
    }
    
    // 獲取更新後的按讚數
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE activity_id = $1',
      [activityId]
    );
    
    res.json({
      data: {
        likeCount: parseInt(likeCountResult.rows[0].count)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 獲取按讚數和用戶是否已按讚
app.get('/api/activities/:activityId/likes', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  
  try {
    // 獲取按讚數
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE activity_id = $1',
      [activityId]
    );
    
    // 檢查當前用戶是否已按讚
    const userLikeResult = await pool.query(
      'SELECT id FROM likes WHERE activity_id = $1 AND user_id = $2',
      [activityId, req.userId]
    );
    
    res.json({
      data: {
        likeCount: parseInt(likeCountResult.rows[0].count),
        userLiked: userLikeResult.rows.length > 0
      }
    });
  } catch (err) {
    next(err);
  }
});

// ========== 留言功能 ==========
// 添加留言
app.post('/api/activities/:activityId/comments', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  const { content } = req.body;
  
  if (!content || String(content).trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }
  
  try {
    // 檢查活動是否存在
    const activityCheck = await pool.query('SELECT id FROM activities WHERE id = $1', [activityId]);
    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    // 添加留言
    const commentId = `comment-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const trimmedContent = String(content).trim();
    
    const result = await pool.query(
      `INSERT INTO comments (id, activity_id, user_id, content) VALUES ($1, $2, $3, $4)
       RETURNING id, content, created_at`,
      [commentId, activityId, req.userId, trimmedContent]
    );
    
    const comment = result.rows[0];
    
    // 獲取留言者信息
    const userResult = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [req.userId]
    );
    
    res.status(201).json({
      data: {
        id: comment.id,
        content: comment.content,
        userId: req.userId,
        userName: userResult.rows[0].username,
        userDisplayName: userResult.rows[0].display_name,
        createdAt: comment.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// 獲取留言列表
app.get('/api/activities/:activityId/comments', requireAuth, async (req, res, next) => {
  const { activityId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.user_id, u.username, u.display_name, c.created_at
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.activity_id = $1
       ORDER BY c.created_at ASC`,
      [activityId]
    );
    
    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      userId: row.user_id,
      userName: row.username,
      userDisplayName: row.display_name,
      createdAt: row.created_at
    }));
    
    res.json({ data: comments });
  } catch (err) {
    next(err);
  }
});

// 刪除留言
app.delete('/api/comments/:commentId', requireAuth, async (req, res, next) => {
  const { commentId } = req.params;
  
  try {
    // 檢查留言是否屬於當前用戶
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    
    if (commentCheck.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }
    
    // 刪除留言
    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    
    res.json({ data: { id: commentId } });
  } catch (err) {
    next(err);
  }
});

// *** 運動目標 API ***
// 獲取使用者的運動目標
app.get('/api/goals', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT weekly_goal, monthly_goal FROM goals WHERE user_id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      // 如果用戶還沒有設定目標，返回預設值
      return res.json({
        data: {
          weeklyGoal: 3,
          monthlyGoal: 12,
          isSet: false
        }
      });
    }
    
    res.json({
      data: {
        weeklyGoal: result.rows[0].weekly_goal,
        monthlyGoal: result.rows[0].monthly_goal,
        isSet: true
      }
    });
  } catch (err) {
    next(err);
  }
});

// 設定或更新使用者的運動目標
app.post('/api/goals', requireAuth, async (req, res, next) => {
  const { weeklyGoal, monthlyGoal } = req.body;
  
  if (!weeklyGoal || !monthlyGoal) {
    return res.status(400).json({ error: 'Weekly and monthly goals are required.' });
  }
  
  // 週目標最少 3 次，最多 50 次
  // 月目標最少 12 次，最多 200 次
  if (weeklyGoal < 3 || weeklyGoal > 50) {
    return res.status(400).json({ error: '週目標需在 3-50 次之間' });
  }
  
  if (monthlyGoal < 12 || monthlyGoal > 200) {
    return res.status(400).json({ error: '月目標需在 12-200 次之間' });
  }
  
  try {
    // 使用 UPSERT (ON CONFLICT) 來插入或更新
    await pool.query(
      `INSERT INTO goals (id, user_id, weekly_goal, monthly_goal, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET weekly_goal = $3, monthly_goal = $4, updated_at = NOW()`,
      [`goal-${req.userId}`, req.userId, weeklyGoal, monthlyGoal]
    );
    
    res.json({
      data: {
        weeklyGoal,
        monthlyGoal,
        message: 'Goals updated successfully.'
      }
    });
  } catch (err) {
    next(err);
  }
});

// 獲取本週和本月的運動次數
app.get('/api/goals/progress', requireAuth, async (req, res, next) => {
  try {
    // 獲取本週的開始日期（週一）
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // 獲取本月的開始日期
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 查詢本週的運動次數
    const weekResult = await pool.query(
      'SELECT COUNT(*) as count FROM activities WHERE owner_id = $1 AND date >= $2',
      [req.userId, weekStart.toISOString().split('T')[0]]
    );
    
    // 查詢本月的運動次數
    const monthResult = await pool.query(
      'SELECT COUNT(*) as count FROM activities WHERE owner_id = $1 AND date >= $2',
      [req.userId, monthStart.toISOString().split('T')[0]]
    );
    
    res.json({
      data: {
        weeklyCount: parseInt(weekResult.rows[0].count),
        monthlyCount: parseInt(monthResult.rows[0].count)
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- 錯誤處理中介軟體 ---
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

// *** 啟動伺服器 ***
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Sports tracker listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
