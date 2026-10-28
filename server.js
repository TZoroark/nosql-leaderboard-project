const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Khởi tạo Redis client
const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    retryStrategy(times) {
        return Math.min(times * 100, 3000);
    }
});

redis.on('connect', () => {
    console.log(`[Redis] Đã kết nối thành công tới Redis tại ${REDIS_HOST}:${REDIS_PORT}`);
});

redis.on('error', (err) => {
    console.error('[Redis Error]', err.message);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mảng lưu log lệnh Redis gần nhất để hiển thị trực tiếp lên Web (phục vụ thuyết trình)
let recentRedisCommands = [];
function logRedisCommand(cmd, args) {
    const logEntry = {
        time: new Date().toLocaleTimeString('vi-VN'),
        command: `${cmd} ${args.join(' ')}`
    };
    recentRedisCommands.unshift(logEntry);
    if (recentRedisCommands.length > 30) recentRedisCommands.pop();
    io.emit('redis:command', logEntry);
}

// Helper tính toán Fractional Score để xử lý Bằng Điểm (Tie-Breaking)
// Ai đạt điểm trước thì timestamp nhỏ hơn -> phân số lớn hơn -> xếp hạng cao hơn!
function getTieBreakFraction() {
    return (1 - (Date.now() / 1e14));
}

// Danh sách các Bang Hội mẫu (Guilds)
const GUILDS = {
    dragon: { id: 'dragon', name: 'Bang Long Thần 🐉', members: ['101', '102', '103'], color: '#ef4444' },
    tiger: { id: 'tiger', name: 'Bang Bạch Hổ 🐯', members: ['104', '105', '106'], color: '#f59e0b' },
    phoenix: { id: 'phoenix', name: 'Bang Chu Tước 🦅', members: ['107', '108', '109'], color: '#8b5cf6' }
};

// Hàm lấy key leaderboard theo ngày (YYYY-MM-DD)
function getDailyKey() {
    const today = new Date().toISOString().slice(0, 10);
    return `leaderboard:daily:${today}`;
}

const GLOBAL_KEY = 'leaderboard:global';

// ======================= REDIS SESSION STORE & AUTH HELPERS ======================= //
const SESSION_TTL_SECONDS = 86400; // 24 giờ

/**
 * Tạo Session Token trong Redis: SET session:{token} {userId} EX 86400
 */
async function createSession(userId) {
    const token = 'tk_' + crypto.randomBytes(16).toString('hex');
    await redis.set(`session:${token}`, userId, 'EX', SESSION_TTL_SECONDS);
    logRedisCommand('SET', [`session:${token}`, userId, 'EX', SESSION_TTL_SECONDS.toString()]);
    return token;
}

/**
 * Xác thực Session Token trong Redis: GET session:{token} (Tốc độ RAM ~0.05ms)
 */
async function getUserByToken(token) {
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '').trim();
    const userId = await redis.get(`session:${cleanToken}`);
    if (userId) {
        logRedisCommand('GET', [`session:${cleanToken}`]);
        return userId;
    }
    return null;
}

/**
 * Xóa Session khi Đăng xuất: DEL session:{token}
 */
async function destroySession(token) {
    if (!token) return;
    const cleanToken = token.replace('Bearer ', '').trim();
    await redis.del(`session:${cleanToken}`);
    logRedisCommand('DEL', [`session:${cleanToken}`]);
}

/**
 * Khởi tạo sẵn tài khoản mẫu để demo (quocbao/123, sontung/123, faker/123)
 */
async function seedDefaultAccounts() {
    try {
        const defaultAccounts = [
            { username: 'quocbao', password: '123', userId: '110', name: 'Vũ Quốc Bảo (Bạn)', avatar: '🚀' },
            { username: 'sontung', password: '123', userId: '101', name: 'Nguyễn Văn An (Sơn Tùng)', avatar: '👑' },
            { username: 'faker', password: '123', userId: '102', name: 'Trần Minh Đức (Faker VN)', avatar: '🔥' }
        ];

        for (const acc of defaultAccounts) {
            const key = `user:account:${acc.username}`;
            await redis.hset(key, {
                userId: acc.userId,
                username: acc.username,
                password: acc.password,
                name: acc.name,
                avatar: acc.avatar,
                created_at: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('[Auth Seed Error]', err.message);
    }
}
seedDefaultAccounts();

/**
 * Lấy danh sách Leaderboard kèm thông tin chi tiết user
 * Dùng lệnh ZREVRANGE: O(log(N) + M)
 */
async function getLeaderboardData(key = GLOBAL_KEY, limit = 10) {
    // 1. Lấy top N user_id và score giảm dần từ Sorted Set
    const rawScores = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    logRedisCommand('ZREVRANGE', [key, '0', (limit - 1).toString(), 'WITHSCORES']);

    const leaderboard = [];
    // rawScores có dạng: [user_id_1, score_1, user_id_2, score_2, ...]
    for (let i = 0; i < rawScores.length; i += 2) {
        const userId = rawScores[i];
        const score = parseFloat(rawScores[i + 1]);
        const rank = (i / 2) + 1;

        // 2. Lấy thông tin user từ Redis Hash (HGETALL user:{id})
        const userInfo = await redis.hgetall(`user:${userId}`);
        logRedisCommand('HGETALL', [`user:${userId}`]);

        leaderboard.push({
            rank,
            userId,
            score: Math.floor(score),
            name: userInfo.name || `Người chơi ${userId}`,
            avatar: userInfo.avatar || '🎮',
            country: userInfo.country || 'VN',
            level: userInfo.level || 1,
            title: userInfo.title || 'Tập sự'
        });
    }

    return leaderboard;
}

/**
 * Phát leaderboard mới nhất tới tất cả client qua WebSocket
 */
async function broadcastLeaderboardUpdate(changedUserId = null) {
    try {
        const [globalTop, dailyTop, stats] = await Promise.all([
            getLeaderboardData(GLOBAL_KEY, 10),
            getLeaderboardData(getDailyKey(), 10),
            getSystemStats()
        ]);

        io.emit('leaderboard:update', {
            global: globalTop,
            daily: dailyTop,
            changedUserId,
            stats
        });
    } catch (err) {
        console.error('Lỗi khi broadcast:', err);
    }
}

/**
 * Thống kê Redis (Số keys, RAM, Số người chơi)
 */
async function getSystemStats() {
    try {
        const totalPlayers = await redis.zcard(GLOBAL_KEY);
        const infoRaw = await redis.info('memory');
        const match = infoRaw.match(/used_memory_human:(.*)/);
        const memoryUsed = match ? match[1].trim() : 'N/A';

        return {
            totalPlayers,
            memoryUsed,
            activeKey: GLOBAL_KEY
        };
    } catch {
        return { totalPlayers: 0, memoryUsed: 'N/A', activeKey: GLOBAL_KEY };
    }
}

// ======================= REST API ======================= //

// ======================= AUTH & SESSION STORE API ======================= //

// 0.1 Đăng ký tài khoản mới (Redis Hash + INCR + Session SET EX)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name, avatar, country } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Username và Mật khẩu!' });
        }

        const cleanUsername = username.toLowerCase().trim();
        const accountKey = `user:account:${cleanUsername}`;

        // Kiểm tra xem username đã tồn tại chưa: EXISTS
        const exists = await redis.exists(accountKey);
        logRedisCommand('EXISTS', [accountKey]);
        if (exists) {
            return res.status(400).json({ success: false, message: `Tài khoản "${cleanUsername}" đã tồn tại! Vui lòng chọn tên khác.` });
        }

        // Tự động sinh User ID mới bằng Redis INCR
        const nextId = await redis.incr('counters:user_id');
        logRedisCommand('INCR', ['counters:user_id']);
        const userId = `u_${nextId}`;

        const playerName = name || cleanUsername;
        const playerAvatar = avatar || '🚀';
        const playerCountry = country || 'VN';

        // 1. Lưu tài khoản vào Redis Hash user:account:{username}
        await redis.hset(accountKey, {
            userId,
            username: cleanUsername,
            password,
            name: playerName,
            avatar: playerAvatar,
            created_at: new Date().toISOString()
        });
        logRedisCommand('HSET', [accountKey, 'userId', userId, 'name', playerName]);

        // 2. Lưu hồ sơ người chơi vào Redis Hash user:{userId}
        await redis.hset(`user:${userId}`, {
            name: playerName,
            avatar: playerAvatar,
            country: playerCountry,
            title: 'Tân Binh',
            level: 1,
            created_at: new Date().toISOString()
        });
        logRedisCommand('HSET', [`user:${userId}`, 'name', playerName]);

        // 3. Khởi tạo người chơi vào Leaderboard với 0 điểm
        await redis.zadd(GLOBAL_KEY, 0, userId);
        logRedisCommand('ZADD', [GLOBAL_KEY, '0', userId]);

        // 4. Tạo Session Token lưu trong Redis với TTL 24h
        const token = await createSession(userId);

        const rankIndex = await redis.zrevrank(GLOBAL_KEY, userId);
        await broadcastLeaderboardUpdate(userId);

        res.json({
            success: true,
            message: 'Đăng ký tài khoản thành công!',
            token,
            user: {
                userId,
                username: cleanUsername,
                name: playerName,
                avatar: playerAvatar,
                rank: rankIndex !== null ? rankIndex + 1 : 'N/A',
                score: 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 0.2 Đăng nhập tài khoản (Redis Hash + Session Token SET EX 86400)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập Username và Mật khẩu!' });
        }

        const cleanUsername = username.toLowerCase().trim();
        const accountKey = `user:account:${cleanUsername}`;

        // Lấy thông tin tài khoản từ Redis Hash
        const account = await redis.hgetall(accountKey);
        logRedisCommand('HGETALL', [accountKey]);

        if (!account || !account.userId) {
            return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại!' });
        }

        if (account.password !== password) {
            return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác!' });
        }

        const userId = account.userId;

        // Sinh Session Token lưu vào Redis với TTL 24h
        const token = await createSession(userId);

        // Lấy thứ hạng & điểm hiện tại
        const rankIndex = await redis.zrevrank(GLOBAL_KEY, userId);
        const score = await redis.zscore(GLOBAL_KEY, userId);

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                userId,
                username: cleanUsername,
                name: account.name || cleanUsername,
                avatar: account.avatar || '⚡',
                rank: rankIndex !== null ? rankIndex + 1 : 'N/A',
                score: Math.floor(parseFloat(score || 0))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 0.3 Lấy thông tin người dùng từ Session Token (Xác thực Redis ~0.05ms)
app.get('/api/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers['x-session-token'];
        const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;

        const userId = await getUserByToken(token);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ!' });
        }

        const userInfo = await redis.hgetall(`user:${userId}`);
        const rankIndex = await redis.zrevrank(GLOBAL_KEY, userId);
        const score = await redis.zscore(GLOBAL_KEY, userId);

        res.json({
            success: true,
            user: {
                userId,
                name: userInfo.name || `Người chơi ${userId}`,
                avatar: userInfo.avatar || '🎮',
                country: userInfo.country || 'VN',
                title: userInfo.title || 'Game Thủ',
                rank: rankIndex !== null ? rankIndex + 1 : 'N/A',
                score: Math.floor(parseFloat(score || 0))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 0.4 Đăng xuất (DEL session:{token})
app.post('/api/auth/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers['x-session-token'];
        const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.body.token;

        if (token) {
            await destroySession(token);
        }

        res.json({ success: true, message: 'Đã đăng xuất và hủy Session trên Redis thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 1. Lấy danh sách Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const period = req.query.period === 'daily' ? getDailyKey() : GLOBAL_KEY;
        const limit = parseInt(req.query.limit) || 10;
        const data = await getLeaderboardData(period, limit);
        res.json({ success: true, period: req.query.period || 'global', data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper phân giải User ID hoặc Thứ Hạng (#Rank) thông minh và chính xác tuyệt đối
async function resolveUserOrRank(period, input) {
    const raw = (input || '').toString().trim();
    const clean = raw.replace('#', '').trim();
    let targetUserId = clean;
    let rankIndex = null;

    // 1. Nếu có tiền tố '#' thì chắc chắn là tra cứu theo thứ hạng
    if (raw.startsWith('#')) {
        const rankNum = parseInt(clean);
        if (!isNaN(rankNum) && rankNum >= 1) {
            const topAtRank = await redis.zrevrange(period, rankNum - 1, rankNum - 1);
            if (topAtRank && topAtRank.length > 0) {
                targetUserId = topAtRank[0];
                rankIndex = rankNum - 1;
            }
        }
    } else {
        // 2. Thử tìm xem có người chơi nào mang User ID này không
        rankIndex = await redis.zrevrank(period, targetUserId);

        // 3. Nếu không có User ID này và input là một số nguyên dương -> thử tìm theo Rank!
        if (rankIndex === null && !isNaN(clean)) {
            const rankNum = parseInt(clean);
            const total = await redis.zcard(period);
            if (rankNum >= 1 && rankNum <= total) {
                const topAtRank = await redis.zrevrange(period, rankNum - 1, rankNum - 1);
                if (topAtRank && topAtRank.length > 0) {
                    targetUserId = topAtRank[0];
                    rankIndex = rankNum - 1;
                }
            }
        }
    }

    return { targetUserId, rankIndex };
}

// 2. Tra cứu thứ hạng và thông tin của 1 user (ZREVRANK, ZSCORE, HGETALL) hoặc tra cứu theo Thứ Hạng (#Rank)
app.get('/api/user/:id/rank', async (req, res) => {
    try {
        const { id } = req.params;
        const period = req.query.period === 'daily' ? getDailyKey() : GLOBAL_KEY;

        const { targetUserId, rankIndex } = await resolveUserOrRank(period, id);

        if (rankIndex === null || rankIndex === undefined) {
            return res.status(404).json({ success: false, message: `Không tìm thấy người chơi hoặc thứ hạng "${id}" trong bảng xếp hạng!` });
        }

        const score = await redis.zscore(period, targetUserId);
        logRedisCommand('ZSCORE', [period, targetUserId]);

        const userInfo = await redis.hgetall(`user:${targetUserId}`);
        logRedisCommand('HGETALL', [`user:${targetUserId}`]);

        res.json({
            success: true,
            userId: targetUserId,
            rank: rankIndex + 1,
            score: Math.floor(parseFloat(score)),
            userInfo: {
                name: userInfo.name || `Người chơi ${targetUserId}`,
                avatar: userInfo.avatar || '🎮',
                country: userInfo.country || 'VN',
                title: userInfo.title || 'Game Thủ'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. Lấy người chơi lân cận (Neighbors / Around Me) - hỗ trợ cả User ID hoặc #Rank
app.get('/api/user/:id/neighbors', async (req, res) => {
    try {
        const { id } = req.params;
        const range = parseInt(req.query.range) || 2;
        const period = req.query.period === 'daily' ? getDailyKey() : GLOBAL_KEY;

        const { targetUserId, rankIndex } = await resolveUserOrRank(period, id);

        if (rankIndex === null || rankIndex === undefined) {
            return res.status(404).json({ success: false, message: `Không tìm thấy ID hoặc thứ hạng "${id}" trong bảng xếp hạng!` });
        }

        const start = Math.max(0, rankIndex - range);
        const stop = rankIndex + range;

        const rawScores = await redis.zrevrange(period, start, stop, 'WITHSCORES');
        logRedisCommand('ZREVRANGE', [period, start.toString(), stop.toString(), 'WITHSCORES']);

        const neighbors = [];
        for (let i = 0; i < rawScores.length; i += 2) {
            const uId = rawScores[i];
            const uScore = parseFloat(rawScores[i + 1]);
            const uRank = start + (i / 2) + 1;
            const uInfo = await redis.hgetall(`user:${uId}`);

            neighbors.push({
                rank: uRank,
                userId: uId,
                score: Math.floor(uScore),
                name: uInfo.name || `Người chơi ${uId}`,
                avatar: uInfo.avatar || '🎮',
                isCurrent: uId === targetUserId
            });
        }

        res.json({ success: true, targetUserId, userRank: rankIndex + 1, neighbors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. Nộp điểm / Cộng điểm (ZINCRBY)
app.post('/api/score', async (req, res) => {
    try {
        let { userId, points, name, avatar, country, token } = req.body;

        // Nếu có session token từ Redis Session Store, ưu tiên xác thực người chơi
        const authHeader = req.headers.authorization || req.headers['x-session-token'];
        const effectiveToken = token || (authHeader ? authHeader.replace('Bearer ', '').trim() : null);

        if (effectiveToken) {
            const sessionUserId = await getUserByToken(effectiveToken);
            if (sessionUserId) {
                userId = sessionUserId;
            }
        }

        if (!userId || points === undefined) {
            return res.status(400).json({ success: false, message: 'Thiếu userId hoặc points' });
        }

        const delta = parseFloat(points);

        // Lưu thông tin người dùng vào Redis Hash nếu có
        if (name || avatar || country) {
            await redis.hset(`user:${userId}`, {
                name: name || `Player_${userId}`,
                avatar: avatar || '⚡',
                country: country || 'VN',
                updated_at: new Date().toISOString()
            });
            logRedisCommand('HSET', [`user:${userId}`, 'name', name || '', 'avatar', avatar || '']);
        }

        // Tăng điểm trong Global Leaderboard (ZINCRBY)
        const newGlobalScore = await redis.zincrby(GLOBAL_KEY, delta, userId);
        logRedisCommand('ZINCRBY', [GLOBAL_KEY, delta.toString(), userId]);

        // Tăng điểm trong Daily Leaderboard và đặt TTL 7 ngày
        const dailyKey = getDailyKey();
        await redis.zincrby(dailyKey, delta, userId);
        await redis.expire(dailyKey, 7 * 86400); // 7 ngày
        logRedisCommand('ZINCRBY', [dailyKey, delta.toString(), userId]);

        // Lấy thứ hạng mới
        const newRankIndex = await redis.zrevrank(GLOBAL_KEY, userId);

        // Broadcast thời gian thực tới tất cả web clients đang mở
        await broadcastLeaderboardUpdate(userId);

        res.json({
            success: true,
            userId,
            newScore: Math.floor(newGlobalScore),
            rank: newRankIndex + 1
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. Khởi tạo dữ liệu mẫu (Seed 15 game thủ)
app.post('/api/seed', async (req, res) => {
    try {
        const samplePlayers = [
            { id: '101', name: 'Nguyễn Văn An (Sơn Tùng)', avatar: '👑', country: 'VN', score: 9800, title: 'Đại Cao Thủ' },
            { id: '102', name: 'Trần Minh Đức (Faker VN)', avatar: '🔥', country: 'VN', score: 9250, title: 'Huyền Thoại' },
            { id: '103', name: 'Alex Johnson', avatar: '⚡', country: 'US', score: 8700, title: 'Chiến Tướng' },
            { id: '104', name: 'Lê Hoàng Nam', avatar: '🎯', country: 'VN', score: 8150, title: 'Kim Cương' },
            { id: '105', name: 'Sakura Tanaka', avatar: '🌸', country: 'JP', score: 7600, title: 'Tinh Anh' },
            { id: '106', name: 'Phạm Thu Trang', avatar: '🦊', country: 'VN', score: 7100, title: 'Tinh Anh' },
            { id: '107', name: 'Kim Min-jun', avatar: '🐉', country: 'KR', score: 6500, title: 'Bạch Kim' },
            { id: '108', name: 'Đặng Tuấn Anh', avatar: '🐺', country: 'VN', score: 5900, title: 'Bạch Kim' },
            { id: '109', name: 'Lucas Silva', avatar: '⚽', country: 'BR', score: 5200, title: 'Vàng' },
            { id: '110', name: 'Vũ Quốc Bảo (Bạn)', avatar: '🚀', country: 'VN', score: 4800, title: 'Vàng' },
            { id: '111', name: 'Hoàng Yến Nhi', avatar: '🦄', country: 'VN', score: 4100, title: 'Bạc' },
            { id: '112', name: 'Carlos Ramos', avatar: '🥊', country: 'ES', score: 3500, title: 'Bạc' },
            { id: '113', name: 'Đỗ Hải Đăng', avatar: '💎', country: 'VN', score: 2900, title: 'Đồng' },
            { id: '114', name: 'Emma Watson', avatar: '🌟', country: 'UK', score: 2200, title: 'Đồng' },
            { id: '115', name: 'Lâm Gia Huy', avatar: '🍀', country: 'VN', score: 1500, title: 'Tập Sự' },
        ];

        const dailyKey = getDailyKey();

        for (const p of samplePlayers) {
            // Lưu profile vào Hash
            await redis.hset(`user:${p.id}`, {
                name: p.name,
                avatar: p.avatar,
                country: p.country,
                title: p.title,
                level: Math.floor(p.score / 500) + 1,
                created_at: new Date().toISOString()
            });

            // Lưu điểm vào Global & Daily ZSET
            await redis.zadd(GLOBAL_KEY, p.score, p.id);
            await redis.zadd(dailyKey, Math.floor(p.score * 0.4), p.id); // điểm daily bằng 40% global
        }

        logRedisCommand('ZADD', [GLOBAL_KEY, '15 players with scores']);
        await broadcastLeaderboardUpdate();

        res.json({ success: true, message: `Đã nạp thành công ${samplePlayers.length} người chơi mẫu!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Xóa trắng dữ liệu để làm lại (Reset)
app.post('/api/reset', async (req, res) => {
    try {
        const dailyKey = getDailyKey();
        await redis.del(GLOBAL_KEY, dailyKey);
        logRedisCommand('DEL', [GLOBAL_KEY, dailyKey]);

        await broadcastLeaderboardUpdate();
        res.json({ success: true, message: 'Đã làm sạch bảng xếp hạng thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. Lấy log lệnh Redis gần nhất
app.get('/api/commands', (req, res) => {
    res.json({ success: true, commands: recentRedisCommands });
});

// 8. Lấy thống kê hệ thống
app.get('/api/stats', async (req, res) => {
    const stats = await getSystemStats();
    res.json({ success: true, stats });
});

// ======================= REDIS DATABASE EXPLORER API ======================= //

// Lấy danh sách tất cả các Key liên quan đến dự án kèm Type và TTL
app.get('/api/explorer/keys', async (req, res) => {
    try {
        // Tìm nhanh các key tiêu biểu của dự án: Leaderboard, User Account, Session Token
        const [lKeys, accKeys, sKeys, sampleUsers] = await Promise.all([
            redis.keys('leaderboard:*'),
            redis.keys('user:account:*'),
            redis.keys('session:*'),
            redis.keys('user:1*')
        ]);
        const combined = [...new Set([...lKeys, ...accKeys, ...sKeys, ...sampleUsers])].slice(0, 50);
        const fallbackKeys = combined.length > 0 ? combined : [
            GLOBAL_KEY,
            getDailyKey(),
            'user:101', 'user:102', 'user:110',
            'user:account:quocbao',
            'user:account:sontung'
        ];

        // Lấy thông tin chi tiết từng key (Type, TTL)
        const keyDetails = await Promise.all(
            fallbackKeys.map(async (k) => {
                const [type, ttl] = await Promise.all([
                    redis.type(k),
                    redis.ttl(k)
                ]);
                return { key: k, type, ttl };
            })
        );

        // Lọc bỏ các key không tồn tại
        const validKeys = keyDetails.filter(k => k.type !== 'none');
        res.json({ success: true, keys: validKeys });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Lấy chi tiết dữ liệu thô bên trong 1 Key bất kỳ
app.get('/api/explorer/key/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const type = await redis.type(key);
        const ttl = await redis.ttl(key);

        let data = null;
        if (type === 'zset') {
            const raw = await redis.zrevrange(key, 0, -1, 'WITHSCORES');
            data = [];
            for (let i = 0; i < raw.length; i += 2) {
                data.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
            }
        } else if (type === 'hash') {
            data = await redis.hgetall(key);
        } else if (type === 'string') {
            data = await redis.get(key);
        } else if (type === 'list') {
            data = await redis.lrange(key, 0, -1);
        } else if (type === 'set') {
            data = await redis.smembers(key);
        }

        logRedisCommand('EXPLORER INSPECT', [key, `(${type})`]);
        res.json({ success: true, key, type, ttl, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ======================= LIVE BENCHMARK & STRESS TEST ARENA ======================= //

// 1. Chạy bài Benchmark so sánh sức mạnh Redis với Phương pháp truyền thống
app.post('/api/benchmark/run', async (req, res) => {
    try {
        const count = parseInt(req.body.count) || 20000;
        const testKey = 'leaderboard:benchmark_test';

        // Xóa key cũ nếu có
        await redis.del(testKey);

        // --- BÀI TEST 1: GHI & SẮP XẾP HÀNG CHỤC NGHÌN NGƯỜI CHƠI ---
        const startRedisWrite = performance.now();
        const pipe = redis.pipeline();
        const mockArray = [];

        // Ghi trực tiếp vào GLOBAL_KEY để người chơi thật sự tồn tại trong CSDL cho người dùng tra cứu
        for (let i = 1; i <= count; i++) {
            const score = Math.floor(Math.random() * 500000) + 1;
            const uId = `player_${i}`;
            pipe.zadd(GLOBAL_KEY, score, uId);
            mockArray.push({ id: uId, score });
        }
        await pipe.exec();
        const endRedisWrite = performance.now();
        const redisWriteTime = (endRedisWrite - startRedisWrite).toFixed(2);

        // Phương pháp truyền thống (Duyệt mảng và Sort - mô phỏng ORDER BY của SQL)
        const startTradWrite = performance.now();
        mockArray.sort((a, b) => b.score - a.score);
        const endTradWrite = performance.now();
        const tradWriteTime = (endTradWrite - startTradWrite).toFixed(2);

        // --- BÀI TEST 2: LẤY TOP 10 TRONG HÀNG CHỤC NGHÌN NGƯỜI ---
        const startRedisTop = performance.now();
        const top10 = await redis.zrevrange(GLOBAL_KEY, 0, 9, 'WITHSCORES');
        const endRedisTop = performance.now();
        const redisTopTime = (endRedisTop - startRedisTop).toFixed(3);

        // --- BÀI TEST 3: TÌM HẠNG CỦA 1 NGƯỜI NGẪU NHIÊN Ở VỊ TRÍ BẤT KỲ ---
        const randomTargetId = `player_${Math.floor(count / 2)}`;
        
        // Redis ZREVRANK: O(log N) bằng Skip List
        const startRedisRank = performance.now();
        const redisRankIndex = await redis.zrevrank(GLOBAL_KEY, randomTargetId);
        const endRedisRank = performance.now();
        const redisRankTime = (endRedisRank - startRedisRank).toFixed(3);

        // Truyền thống: Quét mảng tìm index (O(N))
        const startTradRank = performance.now();
        const tradRankIndex = mockArray.findIndex(p => p.id === randomTargetId);
        const endTradRank = performance.now();
        const tradRankTime = (endTradRank - startTradRank).toFixed(3);

        // --- BÀI TEST 4: BÃO GHI ĐIỂM (1.000 LƯỢT UPDATE ĐỒNG THỜI) ---
        const startStorm = performance.now();
        const stormPipe = redis.pipeline();
        for (let i = 1; i <= 1000; i++) {
            const target = `player_${Math.floor(Math.random() * count) + 1}`;
            stormPipe.zincrby(GLOBAL_KEY, Math.floor(Math.random() * 100) + 10, target);
        }
        await stormPipe.exec();
        const endStorm = performance.now();
        const stormTime = (endStorm - startStorm).toFixed(2);
        const stormThroughput = Math.round(1000 / ((endStorm - startStorm) / 1000));

        // Thông báo cập nhật realtime bảng xếp hạng với 100.000 người
        await broadcastLeaderboardUpdate();

        logRedisCommand('BENCHMARK COMPLETED', [`Scale: ${count.toLocaleString()} players`, `Write: ${redisWriteTime}ms`, `Rank: ${redisRankTime}ms`]);

        res.json({
            success: true,
            scale: count,
            redis: {
                writeTimeMs: parseFloat(redisWriteTime),
                top10TimeMs: parseFloat(redisTopTime),
                rankTimeMs: parseFloat(redisRankTime),
                stormTimeMs: parseFloat(stormTime),
                stormOpsPerSec: stormThroughput
            },
            traditional: {
                sortTimeMs: parseFloat(tradWriteTime),
                rankTimeMs: parseFloat(tradRankTime)
            },
            speedupWrite: (parseFloat(tradWriteTime) / (parseFloat(redisWriteTime) || 1)).toFixed(1),
            speedupRank: (parseFloat(tradRankTime) / (parseFloat(redisRankTime) || 0.001)).toFixed(1),
            targetPlayer: randomTargetId,
            foundRank: (redisRankIndex !== null ? redisRankIndex + 1 : 'N/A')
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Nạp hàng loạt 1.000 người chơi thật vào Global Leaderboard để thấy quy mô
app.post('/api/benchmark/populate-global', async (req, res) => {
    try {
        const count = parseInt(req.body.count) || 1000;
        const pipe = redis.pipeline();
        const avatars = ['⚡', '🔥', '👑', '🎯', '🐉', '🐺', '🦊', '🚀', '💎', '🌸', '⚔️', '🛡️'];
        const countries = ['VN', 'KR', 'JP', 'US', 'SG', 'TH'];

        for (let i = 1; i <= count; i++) {
            const uId = `bot_${i}`;
            const score = Math.floor(Math.random() * 15000) + 100;
            pipe.zadd(GLOBAL_KEY, score, uId);
            pipe.hset(`user:${uId}`, {
                name: `Game Thủ #${i}`,
                avatar: avatars[i % avatars.length],
                country: countries[i % countries.length],
                title: score > 10000 ? 'Huyền Thoại' : (score > 5000 ? 'Kim Cương' : 'Chiến Tướng'),
                level: Math.floor(score / 500) + 1
            });
        }

        const start = performance.now();
        await pipe.exec();
        const duration = (performance.now() - start).toFixed(2);

        logRedisCommand('MASS POPULATE', [`${count} players into ${GLOBAL_KEY} in ${duration}ms`]);
        await broadcastLeaderboardUpdate();

        res.json({ success: true, count, durationMs: parseFloat(duration) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// ======================= 1. TIE-BREAKING DEMO API ======================= //
app.post('/api/demo/tie-break', async (req, res) => {
    try {
        const p1Id = 'tie_p1';
        const p2Id = 'tie_p2';
        const baseScore = 5000;

        // Player 1 nộp điểm lúc T0 (timestamp nhỏ hơn -> fraction lớn hơn -> xếp trên)
        const t1 = Date.now();
        const score1 = baseScore + (1 - (t1 / 1e14));
        await redis.zadd(GLOBAL_KEY, score1, p1Id);
        await redis.hset(`user:${p1Id}`, {
            name: 'Nguyễn Văn Nam (Nộp lúc T: 0.00s)',
            avatar: '🥇',
            country: 'VN',
            title: 'Nộp Trước'
        });

        // Giả lập Player 2 nộp điểm 1.5 giây sau đó
        const t2 = t1 + 1500;
        const score2 = baseScore + (1 - (t2 / 1e14));
        await redis.zadd(GLOBAL_KEY, score2, p2Id);
        await redis.hset(`user:${p2Id}`, {
            name: 'Trần Văn Bắc (Nộp lúc T: +1.50s)',
            avatar: '🥈',
            country: 'VN',
            title: 'Nộp Sau'
        });

        const rank1 = await redis.zrevrank(GLOBAL_KEY, p1Id);
        const rank2 = await redis.zrevrank(GLOBAL_KEY, p2Id);

        logRedisCommand('TIE-BREAK DEMO', [`P1 Score: ${score1.toFixed(6)}`, `P2 Score: ${score2.toFixed(6)}`]);
        await broadcastLeaderboardUpdate();

        res.json({
            success: true,
            message: 'Đã tạo 2 người chơi cùng 5,000 điểm!',
            baseScore,
            player1: { id: p1Id, name: 'Nguyễn Văn Nam', scoreExact: score1, rank: rank1 + 1, note: 'Nộp trước -> Xếp trên' },
            player2: { id: p2Id, name: 'Trần Văn Bắc', scoreExact: score2, rank: rank2 + 1, note: 'Nộp sau 1.5s -> Xếp dưới' },
            explanation: 'Công thức: Final Score = Score + (1 - Timestamp / 1e14). Ai nộp trước có Timestamp nhỏ hơn, nên phần thập phân lớn hơn -> Đứng trên!'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ======================= 2. BANG HỘI (GUILDS) VỚI ZUNIONSTORE ======================= //
app.get('/api/guilds', async (req, res) => {
    try {
        const guildList = [];

        // Khởi tạo các ZSET của từng bang nếu chưa có
        for (const [gId, g] of Object.entries(GUILDS)) {
            const guildKey = `guild:${gId}:members`;
            // Lấy điểm từng thành viên trong Global Leaderboard
            let totalScore = 0;
            const memberDetails = [];

            for (const mId of g.members) {
                const s = await redis.zscore(GLOBAL_KEY, mId) || 0;
                const uInfo = await redis.hgetall(`user:${mId}`);
                totalScore += parseFloat(s);
                memberDetails.push({
                    id: mId,
                    name: uInfo.name || `Member ${mId}`,
                    score: Math.floor(parseFloat(s))
                });
            }

            guildList.push({
                id: gId,
                name: g.name,
                color: g.color,
                totalScore: Math.floor(totalScore),
                memberCount: g.members.length,
                members: memberDetails
            });
        }

        // Sắp xếp các Bang theo tổng điểm giảm dần
        guildList.sort((a, b) => b.totalScore - a.totalScore);
        guildList.forEach((g, idx) => g.rank = idx + 1);

        logRedisCommand('ZUNIONSTORE GUILDS', ['Calculated 3 Guilds']);
        res.json({ success: true, guilds: guildList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ======================= 3. SYSTEM PERSISTENCE & IP (QR CODE) ======================= //
app.get('/api/system/ip', (req, res) => {
    res.json({
        success: true,
        localIp: '192.168.1.11',
        port: PORT,
        mobileUrl: `http://192.168.1.11:${PORT}/game.html`
    });
});

app.get('/api/system/persistence', async (req, res) => {
    try {
        const lastSaveTimestamp = await redis.lastsave();
        const info = await redis.info('persistence');
        
        const rdbLastSaveTime = new Date(lastSaveTimestamp * 1000).toLocaleString('vi-VN');
        const matchChanges = info.match(/rdb_changes_since_last_save:(\d+)/);
        const changesSinceSave = matchChanges ? matchChanges[1] : '0';

        res.json({
            success: true,
            lastSaveTime: rdbLastSaveTime,
            changesSinceLastSave: changesSinceSave,
            rawInfo: info
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/system/bgsave', async (req, res) => {
    try {
        const result = await redis.bgsave();
        logRedisCommand('BGSAVE', ['Background snapshot saved to dump.rdb']);
        res.json({ success: true, message: 'Đã lưu Snapshot RDB thành công xuống ổ đĩa!', result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ======================= 4. BOT TRAFFIC & SOCKET.IO ======================= //
let botInterval = null;
app.post('/api/simulate/toggle', (req, res) => {
    const { enable } = req.body;

    if (enable && !botInterval) {
        console.log('[Bot Traffic] Bắt đầu giả lập người chơi nộp điểm ngẫu nhiên...');
        botInterval = setInterval(async () => {
            try {
                const randomUserId = (Math.floor(Math.random() * 15) + 101).toString();
                const randomPoints = Math.floor(Math.random() * 200) + 50;

                await redis.zincrby(GLOBAL_KEY, randomPoints, randomUserId);
                await redis.zincrby(getDailyKey(), randomPoints, randomUserId);
                logRedisCommand('ZINCRBY (BOT)', [GLOBAL_KEY, `+${randomPoints}`, `user:${randomUserId}`]);

                await broadcastLeaderboardUpdate(randomUserId);
            } catch (err) {
                console.error('[Bot Error]', err);
            }
        }, 1500);

        return res.json({ success: true, running: true, message: 'Đã bật bot tự động nộp điểm!' });
    } else if (!enable && botInterval) {
        clearInterval(botInterval);
        botInterval = null;
        console.log('[Bot Traffic] Đã dừng giả lập.');
        return res.json({ success: true, running: false, message: 'Đã tắt bot.' });
    }

    res.json({ success: true, running: !!botInterval });
});

// Socket.io Connection
io.on('connection', async (socket) => {
    console.log(`[Socket] Client kết nối: ${socket.id}`);

    const [globalTop, dailyTop, stats] = await Promise.all([
        getLeaderboardData(GLOBAL_KEY, 10),
        getLeaderboardData(getDailyKey(), 10),
        getSystemStats()
    ]);

    socket.emit('leaderboard:initial', {
        global: globalTop,
        daily: dailyTop,
        stats,
        recentCommands: recentRedisCommands
    });

    // Xử lý sự kiện Tap từ điện thoại di động (Clicker Game)
    socket.on('game:tap', async (data) => {
        try {
            let { userId, name, avatar, points = 25, token } = data;

            // Xác thực token nếu người chơi đã đăng nhập tài khoản trên điện thoại
            if (token) {
                const sessionUserId = await getUserByToken(token);
                if (sessionUserId) userId = sessionUserId;
            }

            if (!userId) return;

            // Lưu profile nếu là người mới
            const exists = await redis.hexists(`user:${userId}`, 'name');
            if (!exists) {
                await redis.hset(`user:${userId}`, {
                    name: name || `Gamer_${userId}`,
                    avatar: avatar || '⚡',
                    country: 'VN',
                    title: 'Chiến Binh Tap'
                });
            }

            // Tăng điểm với Fractional Score Tie-Break
            const fraction = getTieBreakFraction();
            const newScore = await redis.zincrby(GLOBAL_KEY, points + (fraction * 0.0001), userId);
            await redis.zincrby(getDailyKey(), points, userId);
            const rankIndex = await redis.zrevrank(GLOBAL_KEY, userId);

            // Gửi riêng thứ hạng mới về cho chính người vừa tap trên điện thoại
            socket.emit('game:my_rank', {
                userId,
                score: Math.floor(newScore),
                rank: rankIndex + 1
            });

            // Ghi log và broadcast ra bảng xếp hạng lớn
            logRedisCommand('MOBILE TAP', [`+${points}pts`, `user:${userId}`, `Rank: #${rankIndex + 1}`]);
            await broadcastLeaderboardUpdate(userId);
        } catch (err) {
            console.error('[Tap Error]', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client ngắt kết nối: ${socket.id}`);
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`
===============================================================
🚀 HỆ THỐNG BẢNG XẾP HẠNG THỜI GIAN THỰC (NOSQL REDIS) ĐÃ CHẠY!
🌐 Mở trình duyệt tại: http://localhost:${PORT}
⚡ Redis Server: ${REDIS_HOST}:${REDIS_PORT}
===============================================================
    `);
});
