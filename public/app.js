// Khởi tạo Socket.IO client
const socket = io();

// State quản lý
let currentPeriod = 'global'; // 'global' hoặc 'daily'
let currentLeaderboard = { global: [], daily: [] };
let isBotRunning = false;

// State Đăng Nhập & Session Token (Redis Session Store)
let currentUser = null;
let authToken = localStorage.getItem('redis_auth_token') || null;

// DOM Elements Authentication
const authContainer = document.getElementById('authContainer');
const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
const userLoggedInWidget = document.getElementById('userLoggedInWidget');
const navUserName = document.getElementById('navUserName');
const navUserAvatar = document.getElementById('navUserAvatar');
const navUserRank = document.getElementById('navUserRank');
const btnLogout = document.getElementById('btnLogout');
const loggedInUserActionBox = document.getElementById('loggedInUserActionBox');
const activeUserName = document.getElementById('activeUserName');
const activeUserAvatar = document.getElementById('activeUserAvatar');
const activeUserRankPill = document.getElementById('activeUserRankPill');
const selectPlayerRow = document.getElementById('selectPlayerRow');

// Auth Modal Elements
const authModal = document.getElementById('authModal');
const btnCloseAuth = document.getElementById('btnCloseAuth');
const tabAuthLogin = document.getElementById('tabAuthLogin');
const tabAuthRegister = document.getElementById('tabAuthRegister');
const formLogin = document.getElementById('formLogin');
const formRegister = document.getElementById('formRegister');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regName = document.getElementById('regName');
const regAvatar = document.getElementById('regAvatar');

// DOM Elements
const podiumContainer = document.getElementById('podiumContainer');
const leaderboardBody = document.getElementById('leaderboardBody');
const tabGlobal = document.getElementById('tabGlobal');
const tabDaily = document.getElementById('tabDaily');
const statRam = document.getElementById('statRam');
const statPlayers = document.getElementById('statPlayers');
const redisTerminal = document.getElementById('redisTerminal');
const btnSeed = document.getElementById('btnSeed');
const btnReset = document.getElementById('btnReset');
const btnSimulate = document.getElementById('btnSimulate');
const botBtnText = document.getElementById('botBtnText');
const botIcon = document.getElementById('botIcon');
const scoreForm = document.getElementById('scoreForm');
const selectPlayer = document.getElementById('selectPlayer');
const customPlayerGroup = document.getElementById('customPlayerGroup');
const customPlayerName = document.getElementById('customPlayerName');
const inputPoints = document.getElementById('inputPoints');
const searchUserId = document.getElementById('searchUserId');
const btnSearchRank = document.getElementById('btnSearchRank');
const searchResult = document.getElementById('searchResult');
const toastEl = document.getElementById('toast');

// Toast thông báo
function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.borderColor = isError ? 'var(--accent-red)' : 'var(--accent-emerald)';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3500);
}

// Format điểm có dấu phẩy (vd: 9,800)
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

// Render bục vinh quang (Top 3)
function renderPodium(list) {
    if (!list || list.length < 3) {
        podiumContainer.innerHTML = '';
        return;
    }

    const top1 = list[0];
    const top2 = list[1];
    const top3 = list[2];

    podiumContainer.innerHTML = `
        <!-- TOP 2 -->
        <div class="podium-slot podium-2">
            <div class="podium-avatar">${top2.avatar}</div>
            <div class="podium-name" title="${top2.name}">${top2.name}</div>
            <div class="podium-score">${formatNumber(top2.score)} pts</div>
            <div class="podium-bar">2</div>
        </div>

        <!-- TOP 1 -->
        <div class="podium-slot podium-1">
            <div class="podium-avatar">👑 ${top1.avatar}</div>
            <div class="podium-name" title="${top1.name}">${top1.name}</div>
            <div class="podium-score">${formatNumber(top1.score)} pts</div>
            <div class="podium-bar">1</div>
        </div>

        <!-- TOP 3 -->
        <div class="podium-slot podium-3">
            <div class="podium-avatar">${top3.avatar}</div>
            <div class="podium-name" title="${top3.name}">${top3.name}</div>
            <div class="podium-score">${formatNumber(top3.score)} pts</div>
            <div class="podium-bar">3</div>
        </div>
    `;
}

// Render danh sách bảng xếp hạng (Table)
function renderTable(list, changedUserId = null) {
    if (!list || list.length === 0) {
        leaderboardBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    Bảng xếp hạng đang trống! Hãy bấm nút <strong>"Nạp 15 Game Thủ Mẫu"</strong> để bắt đầu demo.
                </td>
            </tr>
        `;
        return;
    }

    leaderboardBody.innerHTML = list.map((item) => {
        const isChanged = changedUserId && String(item.userId) === String(changedUserId);
        const rankClass = item.rank <= 3 ? `rank-${item.rank}` : '';
        const flashClass = isChanged ? 'highlight-update' : '';

        return `
            <tr class="${rankClass} ${flashClass}" data-userid="${item.userId}">
                <td>
                    <span class="rank-badge">${item.rank}</span>
                </td>
                <td>
                    <div class="player-cell">
                        <div class="player-avatar">${item.avatar}</div>
                        <div class="player-meta">
                            <span class="player-name">${item.name}</span>
                            <span class="player-sub">ID: ${item.userId} • Quốc gia: ${item.country}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="title-tag">${item.title || 'Người chơi'}</span>
                </td>
                <td class="score-cell">
                    ${formatNumber(item.score)}
                </td>
            </tr>
        `;
    }).join('');
}

// Cập nhật cả Podium và Bảng
function updateUI(changedUserId = null) {
    const list = currentPeriod === 'global' ? currentLeaderboard.global : currentLeaderboard.daily;
    renderPodium(list);
    renderTable(list, changedUserId);
}

// Cập nhật thống kê Redis
function updateStats(stats) {
    if (!stats) return;
    statRam.textContent = stats.memoryUsed || '--';
    statPlayers.textContent = stats.totalPlayers || 0;
}

// Thêm dòng log vào Terminal
function appendTerminalCommand(log) {
    const line = document.createElement('div');
    line.className = 'cmd-line';
    line.innerHTML = `<span class="cmd-time">[${log.time}]</span> > ${log.command}`;
    redisTerminal.prepend(line);

    // Giữ tối đa 25 dòng
    if (redisTerminal.children.length > 25) {
        redisTerminal.removeChild(redisTerminal.lastChild);
    }
}

// ====================== SOCKET.IO LISTENERS ====================== //

// Khi client vừa kết nối và nhận dữ liệu ban đầu
socket.on('leaderboard:initial', (data) => {
    currentLeaderboard.global = data.global || [];
    currentLeaderboard.daily = data.daily || [];
    updateStats(data.stats);
    updateUI();

    if (data.recentCommands) {
        data.recentCommands.forEach(cmd => appendTerminalCommand(cmd));
    }
});

// Khi có bất kỳ ai ghi điểm, Server phát tín hiệu real-time
socket.on('leaderboard:update', (data) => {
    currentLeaderboard.global = data.global || [];
    currentLeaderboard.daily = data.daily || [];
    updateStats(data.stats);
    updateUI(data.changedUserId);
});

// Khi có lệnh Redis mới được thực thi
socket.on('redis:command', (log) => {
    appendTerminalCommand(log);
});

// ====================== SỰ KIỆN GIAO DIỆN ====================== //

// Đổi Tab Global / Daily
tabGlobal.addEventListener('click', () => {
    tabGlobal.classList.add('active');
    tabDaily.classList.remove('active');
    currentPeriod = 'global';
    updateUI();
});

tabDaily.addEventListener('click', () => {
    tabDaily.classList.add('active');
    tabGlobal.classList.remove('active');
    currentPeriod = 'daily';
    updateUI();
});

// Nút Seed 15 game thủ
btnSeed.addEventListener('click', async () => {
    try {
        btnSeed.disabled = true;
        btnSeed.textContent = 'Đang nạp dữ liệu...';
        const res = await fetch('/api/seed', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            showToast('🌱 Đã nạp 15 người chơi mẫu vào Redis!');
        }
    } catch {
        showToast('Lỗi khi nạp dữ liệu!', true);
    } finally {
        btnSeed.disabled = false;
        btnSeed.innerHTML = '<span>🌱</span> Nạp 15 Game Thủ Mẫu';
    }
});

// Nút Reset sạch Redis
btnReset.addEventListener('click', async () => {
    if (!confirm('Bạn có chắc muốn xóa trắng bảng xếp hạng trên Redis?')) return;
    try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            showToast('🗑️ Đã làm sạch bảng xếp hạng!');
        }
    } catch {
        showToast('Lỗi khi xóa bảng xếp hạng!', true);
    }
});

// Nút Bật/Tắt Bot tự động nộp điểm (Simulate traffic)
btnSimulate.addEventListener('click', async () => {
    try {
        isBotRunning = !isBotRunning;
        const res = await fetch('/api/simulate/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enable: isBotRunning })
        });
        const result = await res.json();

        if (result.running) {
            btnSimulate.classList.remove('btn-warning');
            btnSimulate.classList.add('btn-danger');
            botIcon.textContent = '⏸️';
            botBtnText.textContent = 'Dừng Bot Tự Động Nộp Điểm';
            showToast('🤖 Bot đang liên tục nộp điểm ngẫu nhiên mỗi 1.5s!');
        } else {
            btnSimulate.classList.remove('btn-danger');
            btnSimulate.classList.add('btn-warning');
            botIcon.textContent = '🤖';
            botBtnText.textContent = 'Bật Bot Tự Động Nộp Điểm';
            showToast('⏹️ Đã dừng Bot.');
        }
    } catch {
        showToast('Không thể bật/tắt bot!', true);
    }
});

// Nút chọn nhanh điểm (+100, +300, +500, +1000)
document.querySelectorAll('.btn-point').forEach(btn => {
    btn.addEventListener('click', () => {
        inputPoints.value = btn.dataset.pts;
    });
});

// Chọn người chơi mới hoặc có sẵn
selectPlayer.addEventListener('change', () => {
    if (selectPlayer.value === 'custom') {
        customPlayerGroup.style.display = 'block';
        customPlayerName.focus();
    } else {
        customPlayerGroup.style.display = 'none';
    }
});

// Nộp điểm form
scoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const points = parseInt(inputPoints.value);

    let payload = { points };

    // Nếu người dùng đang đăng nhập, tự động xác thực bằng Redis Session Token
    if (currentUser && authToken) {
        payload.token = authToken;
    } else {
        let userId = selectPlayer.value;
        let name = '';

        if (userId === 'custom') {
            name = customPlayerName.value.trim();
            if (!name) {
                showToast('Vui lòng nhập tên người chơi mới!', true);
                return;
            }
            userId = 'user_' + Date.now().toString().slice(-4);
        }

        payload.userId = userId;
        payload.name = name || undefined;
        payload.avatar = userId === 'custom' ? '🦸' : undefined;
    }

    try {
        const res = await fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success) {
            showToast(`⚡ Đã cộng +${points} pts (Hạng mới: #${result.rank})`);

            // Nếu đang đăng nhập, cập nhật lại rank và score của chính mình trên giao diện
            if (currentUser) {
                currentUser.rank = result.rank;
                currentUser.score = result.newScore;
                updateAuthUI();
            } else if (payload.userId && payload.userId.startsWith('user_')) {
                // Thêm vào dropdown nếu là user mới
                const opt = document.createElement('option');
                opt.value = payload.userId;
                opt.textContent = `${payload.name} (ID: ${payload.userId})`;
                selectPlayer.insertBefore(opt, selectPlayer.lastElementChild);
                selectPlayer.value = payload.userId;
                customPlayerGroup.style.display = 'none';
            }
        } else {
            showToast(result.message || 'Lỗi khi nộp điểm!', true);
        }
    } catch {
        showToast('Lỗi khi nộp điểm!', true);
    }
});

// Tra cứu thứ hạng & Neighbors
btnSearchRank.addEventListener('click', async () => {
    const id = searchUserId.value.trim();
    if (!id) {
        showToast('Vui lòng nhập User ID!', true);
        return;
    }

    try {
        const res = await fetch(`/api/user/${id}/neighbors?range=2&period=${currentPeriod}`);
        const result = await res.json();

        if (!result.success) {
            searchResult.style.display = 'block';
            searchResult.innerHTML = `<p style="color: var(--accent-red); font-size: 0.85rem;">${result.message}</p>`;
            return;
        }

        searchResult.style.display = 'block';
        searchResult.innerHTML = `
            <div style="margin-bottom: 0.6rem; font-size: 0.85rem; color: var(--accent-emerald);">
                🎯 Vị trí hiện tại của <strong>ID: ${id}</strong> là hạng: <strong>#${result.userRank}</strong>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.4rem;">
                Các người chơi lân cận (2 người trên, 2 người dưới):
            </div>
            ${result.neighbors.map(n => `
                <div class="neighbor-item ${n.isCurrent ? 'current-user' : ''}">
                    <span>#${n.rank} ${n.avatar} ${n.name} ${n.isCurrent ? '(Bạn)' : ''}</span>
                    <strong style="color: #67e8f9;">${formatNumber(n.score)} pts</strong>
                </div>
            `).join('')}
        `;
    } catch {
        showToast('Lỗi khi tra cứu thứ hạng!', true);
    }
});

// ====================== REDIS DATABASE EXPLORER LOGIC ====================== //
const btnOpenExplorer = document.getElementById('btnOpenExplorer');
const btnCloseExplorer = document.getElementById('btnCloseExplorer');
const explorerModal = document.getElementById('explorerModal');
const explorerKeysList = document.getElementById('explorerKeysList');
const filterKeysInput = document.getElementById('filterKeysInput');
const btnRefreshKeys = document.getElementById('btnRefreshKeys');
const keyHeader = document.getElementById('keyHeader');
const keyTypeBadge = document.getElementById('keyTypeBadge');
const keyNameTitle = document.getElementById('keyNameTitle');
const keyMeta = document.getElementById('keyMeta');
const keyViewerBody = document.getElementById('keyViewerBody');

let allExplorerKeys = [];
let selectedKeyName = null;

// Mở Modal Explorer
if (btnOpenExplorer) {
    btnOpenExplorer.addEventListener('click', () => {
        explorerModal.style.display = 'flex';
        loadExplorerKeys();
    });
}

// Đóng Modal Explorer
if (btnCloseExplorer) {
    btnCloseExplorer.addEventListener('click', () => {
        explorerModal.style.display = 'none';
    });
}

// Đóng modal khi bấm ra ngoài vùng dialog
window.addEventListener('click', (e) => {
    if (e.target === explorerModal) {
        explorerModal.style.display = 'none';
    }
});

// Lấy danh sách keys từ Server
async function loadExplorerKeys() {
    try {
        explorerKeysList.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); font-size: 0.8rem;">Đang tải danh sách key từ Redis...</div>`;
        const res = await fetch('/api/explorer/keys');
        const result = await res.json();

        if (result.success) {
            allExplorerKeys = result.keys || [];
            renderKeysList();
            if (allExplorerKeys.length > 0 && !selectedKeyName) {
                inspectKey(allExplorerKeys[0].key);
            }
        }
    } catch (err) {
        explorerKeysList.innerHTML = `<div style="padding: 1rem; color: var(--accent-red); font-size: 0.8rem;">Lỗi kết nối tới Redis!</div>`;
    }
}

// Render danh sách keys có hỗ trợ lọc
function renderKeysList() {
    const filter = (filterKeysInput.value || '').trim().toLowerCase();
    const filtered = allExplorerKeys.filter(k => k.key.toLowerCase().includes(filter));

    if (filtered.length === 0) {
        explorerKeysList.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); font-size: 0.8rem;">Không tìm thấy key nào khớp.</div>`;
        return;
    }

    explorerKeysList.innerHTML = filtered.map(item => `
        <div class="key-item ${item.key === selectedKeyName ? 'active' : ''}" onclick="inspectKey('${item.key}')">
            <span>${item.key}</span>
            <span class="type-pill type-${item.type}">${item.type}</span>
        </div>
    `).join('');
}

// Khi người dùng gõ tìm kiếm key
if (filterKeysInput) {
    filterKeysInput.addEventListener('input', renderKeysList);
}

// Nút Refresh
if (btnRefreshKeys) {
    btnRefreshKeys.addEventListener('click', () => {
        loadExplorerKeys();
        if (selectedKeyName) inspectKey(selectedKeyName);
    });
}

// Xem chi tiết dữ liệu bên trong một Key
async function inspectKey(key) {
    selectedKeyName = key;
    renderKeysList();

    try {
        keyHeader.style.display = 'flex';
        keyViewerBody.innerHTML = `<div class="empty-explorer">Đang đọc dữ liệu từ RAM Redis...</div>`;

        const res = await fetch(`/api/explorer/key/${encodeURIComponent(key)}`);
        const result = await res.json();

        if (!result.success) {
            keyViewerBody.innerHTML = `<div class="empty-explorer" style="color: var(--accent-red);">${result.message}</div>`;
            return;
        }

        keyTypeBadge.textContent = result.type.toUpperCase();
        keyTypeBadge.className = `key-badge type-${result.type}`;
        keyNameTitle.textContent = result.key;
        keyMeta.textContent = result.ttl === -1 ? 'TTL: Vĩnh viễn (-1)' : `TTL: Còn ${result.ttl} giây`;

        // Render bảng dữ liệu tương ứng với từng kiểu NoSQL
        if (result.type === 'zset') {
            const list = result.data || [];
            keyViewerBody.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.8rem;">
                    Tổng số phần tử (Members): <strong>${list.length}</strong> (Được sắp xếp tự động bằng Skip List)
                </div>
                <table class="db-table">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Thứ Hạng</th>
                            <th>Member (User ID)</th>
                            <th style="text-align: right;">Score (Điểm số)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((item, idx) => `
                            <tr>
                                <td style="color: var(--accent-gold); font-weight: 700;">#${idx + 1}</td>
                                <td style="color: #60a5fa; font-weight: 600;">"${item.member}"</td>
                                <td style="text-align: right; color: #34d399; font-weight: 700;">${item.score}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (result.type === 'hash') {
            const entries = Object.entries(result.data || {});
            keyViewerBody.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.8rem;">
                    Tổng số Fields: <strong>${entries.length}</strong>
                </div>
                <table class="db-table">
                    <thead>
                        <tr>
                            <th style="width: 160px;">Field (Thuộc tính)</th>
                            <th>Value (Giá trị)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.map(([f, v]) => `
                            <tr>
                                <td style="color: #cbd5e1; font-weight: 600;">${f}</td>
                                <td style="color: #fde047;">${v}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            keyViewerBody.innerHTML = `<pre style="color: #38bdf8; font-family: var(--font-mono);">${JSON.stringify(result.data, null, 2)}</pre>`;
        }
    } catch {
        keyViewerBody.innerHTML = `<div class="empty-explorer" style="color: var(--accent-red);">Không thể đọc dữ liệu từ Redis!</div>`;
    }
}

// ====================== BENCHMARK & SCALE TESTING LOGIC ====================== //
const btnMassPopulate = document.getElementById('btnMassPopulate');
const btnRunBenchmark = document.getElementById('btnRunBenchmark');
const benchmarkResultBox = document.getElementById('benchmarkResultBox');
let selectedScale = 20000;

// Nút chọn quy mô test (10k, 20k, 50k, 100k)
document.querySelectorAll('.btn-scale-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-scale-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedScale = parseInt(btn.dataset.scale);
    });
});

// Nút bơm 1.000 người chơi thật vào Global Leaderboard
if (btnMassPopulate) {
    btnMassPopulate.addEventListener('click', async () => {
        try {
            btnMassPopulate.disabled = true;
            btnMassPopulate.innerHTML = `<span>⏳</span> Đang nạp 1.000 game thủ...`;

            const res = await fetch('/api/benchmark/populate-global', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: 1000 })
            });

            const result = await res.json();
            if (result.success) {
                showToast(`🚀 Đã nạp thành công ${result.count.toLocaleString()} game thủ vào Redis chỉ trong ${result.durationMs}ms!`);
            }
        } catch {
            showToast('Lỗi khi nạp game thủ quy mô lớn!', true);
        } finally {
            btnMassPopulate.disabled = false;
            btnMassPopulate.innerHTML = `<span>🚀</span> Bơm 1.000 Game Thủ Vào BXH Thật`;
        }
    });
}

// Nút Chạy Khảo Nghiệm Sức Mạnh Tối Thượng (Stress Test)
if (btnRunBenchmark) {
    btnRunBenchmark.addEventListener('click', async () => {
        try {
            btnRunBenchmark.disabled = true;
            btnRunBenchmark.innerHTML = `<span>⏳</span> Đang stress-test ${selectedScale.toLocaleString()} records...`;
            benchmarkResultBox.style.display = 'block';
            benchmarkResultBox.innerHTML = `
                <div style="text-align: center; padding: 1.2rem; color: var(--text-muted); font-size: 0.85rem;">
                    ⚙️ Đang thực thi bài test trên <strong>${selectedScale.toLocaleString()} người chơi</strong> trong RAM của Redis...
                </div>
            `;

            const res = await fetch('/api/benchmark/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: selectedScale })
            });

            const r = await res.json();
            if (!r.success) {
                benchmarkResultBox.innerHTML = `<div style="color: var(--accent-red); font-size: 0.85rem;">${r.message}</div>`;
                return;
            }

            // Render kết quả so sánh
            benchmarkResultBox.innerHTML = `
                <!-- TEST 1: GHI & SẮP XẾP -->
                <div class="bench-metric-card">
                    <div class="bench-metric-title">
                        <span>1. Ghi & Sắp xếp ${r.scale.toLocaleString()} người:</span>
                        <strong style="color: var(--accent-emerald);">Redis nhanh hơn ~${r.speedupWrite}x</strong>
                    </div>
                    <div class="bench-bars">
                        <div class="bench-bar-row">
                            <span class="bench-label" style="color: #34d399;">⚡ Redis:</span>
                            <div class="bench-bar-fill bench-redis-bar" style="width: 25%;"></div>
                            <span>${r.redis.writeTimeMs} ms</span>
                        </div>
                        <div class="bench-bar-row">
                            <span class="bench-label" style="color: #f87171;">🐌 Array/SQL:</span>
                            <div class="bench-bar-fill bench-trad-bar" style="width: 90%;"></div>
                            <span>${r.traditional.sortTimeMs} ms</span>
                        </div>
                    </div>
                </div>

                <!-- TEST 2: TÌM HẠNG NGẪU NHIÊN -->
                <div class="bench-metric-card">
                    <div class="bench-metric-title">
                        <span>2. Tìm Hạng 1 Người (Vị trí #${r.foundRank}/${r.scale.toLocaleString()}):</span>
                        <strong style="color: #60a5fa;">O(log N) Skip List</strong>
                    </div>
                    <div class="bench-bars">
                        <div class="bench-bar-row">
                            <span class="bench-label" style="color: #34d399;">⚡ Redis:</span>
                            <div class="bench-bar-fill bench-redis-bar" style="width: 15%;"></div>
                            <span>${r.redis.rankTimeMs} ms</span>
                        </div>
                        <div class="bench-bar-row">
                            <span class="bench-label" style="color: #f87171;">🐌 Array/SQL:</span>
                            <div class="bench-bar-fill bench-trad-bar" style="width: 80%;"></div>
                            <span>${r.traditional.rankTimeMs} ms</span>
                        </div>
                    </div>
                </div>

                <!-- TEST 3: BÃO GHI ĐIỂM -->
                <div class="bench-metric-card">
                    <div class="bench-metric-title">
                        <span>3. Bão Tải 1.000 Lượt Ghi Liên Tiếp:</span>
                        <strong style="color: var(--accent-gold);">${r.redis.stormOpsPerSec.toLocaleString()} Ops/s</strong>
                    </div>
                    <div style="font-size: 0.8rem; color: #cbd5e1; font-family: var(--font-mono); margin-top: 2px;">
                        Hoàn thành trong <strong>${r.redis.stormTimeMs} ms</strong> • Lấy Top 10 trong <strong>${r.redis.top10TimeMs} ms</strong>
                    </div>
                </div>

                <!-- TỔNG KẾT -->
                <div class="bench-summary-banner">
                    🏆 Kết luận: Redis xử lý sub-millisecond (${r.redis.rankTimeMs}ms), đáp ứng hàng trăm ngàn lượt truy cập đồng thời!
                </div>
            `;
            showToast(`🔥 Hoàn tất bài kiểm tra sức mạnh trên ${r.scale.toLocaleString()} người chơi!`);
        } catch {
            showToast('Lỗi khi chạy benchmark!', true);
        } finally {
            btnRunBenchmark.disabled = false;
            btnRunBenchmark.innerHTML = `<span>⚡</span> BẮT ĐẦU TEST SỨC MẠNH REDIS`;
        }
    });
}

// ====================== ADVANCED FEATURES POPUP LOGIC ====================== //

// 1. QR CODE MOBILE GAME
const btnOpenQrModal = document.getElementById('btnOpenQrModal');
const btnCloseQr = document.getElementById('btnCloseQr');
const qrModal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');

if (btnOpenQrModal) {
    btnOpenQrModal.addEventListener('click', async () => {
        qrModal.style.display = 'flex';
        try {
            const res = await fetch('/api/system/ip');
            const data = await res.json();
            if (data.mobileUrl) {
                qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.mobileUrl)}`;
            }
        } catch { }
    });
}
if (btnCloseQr) btnCloseQr.addEventListener('click', () => qrModal.style.display = 'none');

// 2. GUILD LEADERBOARD (ZUNIONSTORE)
const btnOpenGuildModal = document.getElementById('btnOpenGuildModal');
const btnCloseGuild = document.getElementById('btnCloseGuild');
const guildModal = document.getElementById('guildModal');
const guildContent = document.getElementById('guildContent');

if (btnOpenGuildModal) {
    btnOpenGuildModal.addEventListener('click', async () => {
        guildModal.style.display = 'flex';
        try {
            guildContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Đang tính toán tổng điểm bằng lệnh ZUNIONSTORE...</div>`;
            const res = await fetch('/api/guilds');
            const data = await res.json();

            if (data.success && data.guilds) {
                guildContent.innerHTML = `
                    <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
                        ⚡ Lệnh NoSQL: <code>ZUNIONSTORE</code> gộp điểm tất cả thành viên trong RAM trong &lt; 1ms!
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                        ${data.guilds.map(g => `
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid ${g.color}55; border-radius: 12px; padding: 1.2rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                                    <span style="font-size: 1.1rem; font-weight: 800; color: ${g.color};">${g.name}</span>
                                    <span style="background: ${g.color}22; color: ${g.color}; font-weight: 800; font-size: 0.85rem; padding: 0.2rem 0.6rem; border-radius: 6px;">#${g.rank}</span>
                                </div>
                                <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #34d399; margin-bottom: 0.8rem;">
                                    ${g.totalScore.toLocaleString()} <span style="font-size: 0.8rem; color: var(--text-muted);">pts tổng</span>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.4rem;">Thành viên cốt cán:</div>
                                ${g.members.map(m => `
                                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                                        <span>${m.name}</span>
                                        <strong style="color: #60a5fa;">${m.score.toLocaleString()}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch {
            guildContent.innerHTML = `<div style="color: var(--accent-red);">Không thể tải dữ liệu Bang Hội!</div>`;
        }
    });
}
if (btnCloseGuild) btnCloseGuild.addEventListener('click', () => guildModal.style.display = 'none');

// 3. TIE-BREAKING DEMO
const btnOpenTieBreakModal = document.getElementById('btnOpenTieBreakModal');
const btnCloseTieBreak = document.getElementById('btnCloseTieBreak');
const tieBreakModal = document.getElementById('tieBreakModal');
const btnRunTieBreakDemo = document.getElementById('btnRunTieBreakDemo');
const tieBreakResultBox = document.getElementById('tieBreakResultBox');

if (btnOpenTieBreakModal) btnOpenTieBreakModal.addEventListener('click', () => tieBreakModal.style.display = 'flex');
if (btnCloseTieBreak) btnCloseTieBreak.addEventListener('click', () => tieBreakModal.style.display = 'none');

if (btnRunTieBreakDemo) {
    btnRunTieBreakDemo.addEventListener('click', async () => {
        try {
            btnRunTieBreakDemo.disabled = true;
            btnRunTieBreakDemo.textContent = 'Đang tạo 2 người chơi bằng điểm...';

            const res = await fetch('/api/demo/tie-break', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                tieBreakResultBox.style.display = 'block';
                tieBreakResultBox.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 10px; padding: 1rem;">
                        <div style="font-weight: 700; color: #34d399; margin-bottom: 0.6rem;">🏆 Kết Quả Xếp Hạng Thực Tế Trong Redis:</div>
                        <div style="margin-bottom: 0.5rem; font-size: 0.85rem; padding: 0.4rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
                            🥇 <strong>${data.player1.name}</strong> &rarr; Hạng: <strong style="color: var(--accent-gold);">#${data.player1.rank}</strong><br>
                            <span style="font-family: var(--font-mono); font-size: 0.78rem; color: #38bdf8;">Score Lưu trong Redis ZSET: ${data.player1.scoreExact.toFixed(7)}</span>
                        </div>
                        <div style="font-size: 0.85rem; padding: 0.4rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
                            🥈 <strong>${data.player2.name}</strong> &rarr; Hạng: <strong style="color: var(--accent-silver);">#${data.player2.rank}</strong><br>
                            <span style="font-family: var(--font-mono); font-size: 0.78rem; color: #94a3b8;">Score Lưu trong Redis ZSET: ${data.player2.scoreExact.toFixed(7)}</span>
                        </div>
                        <p style="font-size: 0.78rem; color: #34d399; margin-top: 0.7rem; line-height: 1.4;">
                            ✅ ${data.explanation}
                        </p>
                    </div>
                `;
                showToast('⚖️ Đã thực nghiệm xong thuật toán Tie-Breaking!');
            }
        } catch {
            showToast('Lỗi khi chạy Tie-Break demo!', true);
        } finally {
            btnRunTieBreakDemo.disabled = false;
            btnRunTieBreakDemo.innerHTML = `<span>⚡</span> Tạo Thử Nghiệm 2 Người Cùng 5,000 Điểm`;
        }
    });
}

// 4. SKIP LIST VISUALIZER
const btnOpenSkipListModal = document.getElementById('btnOpenSkipListModal');
const btnCloseSkipList = document.getElementById('btnCloseSkipList');
const skipListModal = document.getElementById('skipListModal');

if (btnOpenSkipListModal) btnOpenSkipListModal.addEventListener('click', () => skipListModal.style.display = 'flex');
if (btnCloseSkipList) btnCloseSkipList.addEventListener('click', () => skipListModal.style.display = 'none');

// 5. PERSISTENCE MODAL
const btnOpenPersistenceModal = document.getElementById('btnOpenPersistenceModal');
const btnClosePersistence = document.getElementById('btnClosePersistence');
const persistenceModal = document.getElementById('persistenceModal');
const dispLastSaveTime = document.getElementById('dispLastSaveTime');
const dispChangesCount = document.getElementById('dispChangesCount');
const btnTriggerBgSave = document.getElementById('btnTriggerBgSave');

if (btnOpenPersistenceModal) {
    btnOpenPersistenceModal.addEventListener('click', async () => {
        persistenceModal.style.display = 'flex';
        try {
            const res = await fetch('/api/system/persistence');
            const data = await res.json();
            if (data.success) {
                dispLastSaveTime.textContent = data.lastSaveTime;
                dispChangesCount.textContent = data.changesSinceLastSave;
            }
        } catch { }
    });
}
if (btnClosePersistence) btnClosePersistence.addEventListener('click', () => persistenceModal.style.display = 'none');

if (btnTriggerBgSave) {
    btnTriggerBgSave.addEventListener('click', async () => {
        try {
            btnTriggerBgSave.disabled = true;
            btnTriggerBgSave.textContent = 'Đang ghi Snapshot RDB...';
            const res = await fetch('/api/system/bgsave', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('💾 ' + data.message);
                dispChangesCount.textContent = '0 (Đã đồng bộ)';
            }
        } catch {
            showToast('Lỗi khi gọi BGSAVE!', true);
        } finally {
            btnTriggerBgSave.disabled = false;
            btnTriggerBgSave.innerHTML = `<span>📸</span> THỰC HIỆN BGSAVE (LƯU SNAPSHOT XUỐNG Ổ ĐĨA NGAY)`;
        }
    });
}

// Đóng modal khi bấm ra ngoài nền tối
window.addEventListener('click', (e) => {
    [qrModal, guildModal, tieBreakModal, skipListModal, persistenceModal, authModal].forEach(m => {
        if (m && e.target === m) m.style.display = 'none';
    });
});

// ====================== AUTHENTICATION & REDIS SESSION STORE LOGIC ====================== //

function updateAuthUI() {
    if (currentUser) {
        if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'none';
        if (userLoggedInWidget) userLoggedInWidget.style.display = 'flex';
        if (navUserName) navUserName.textContent = currentUser.name || currentUser.username;
        if (navUserAvatar) navUserAvatar.textContent = currentUser.avatar || '🚀';
        if (navUserRank) navUserRank.textContent = `Hạng: #${currentUser.rank || '--'}`;

        if (loggedInUserActionBox) loggedInUserActionBox.style.display = 'block';
        if (activeUserName) activeUserName.textContent = currentUser.name || currentUser.username;
        if (activeUserAvatar) activeUserAvatar.textContent = currentUser.avatar || '🚀';
        if (activeUserRankPill) activeUserRankPill.textContent = `Hạng #${currentUser.rank || '--'}`;
        if (selectPlayerRow) selectPlayerRow.style.display = 'none';
    } else {
        if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'flex';
        if (userLoggedInWidget) userLoggedInWidget.style.display = 'none';
        if (loggedInUserActionBox) loggedInUserActionBox.style.display = 'none';
        if (selectPlayerRow) selectPlayerRow.style.display = 'flex';
    }
}

// Kiểm tra Session Token khi mở Web
async function checkAuthSession() {
    if (!authToken) {
        updateAuthUI();
        return;
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = data.user;
            updateAuthUI();
        } else {
            localStorage.removeItem('redis_auth_token');
            authToken = null;
            currentUser = null;
            updateAuthUI();
        }
    } catch {
        updateAuthUI();
    }
}
checkAuthSession();

// Mở Modal Auth
if (btnOpenAuthModal) {
    btnOpenAuthModal.addEventListener('click', () => {
        authModal.style.display = 'flex';
    });
}
if (btnCloseAuth) {
    btnCloseAuth.addEventListener('click', () => {
        authModal.style.display = 'none';
    });
}

// Chuyển Tab Đăng Nhập / Đăng Ký
if (tabAuthLogin && tabAuthRegister) {
    tabAuthLogin.addEventListener('click', () => {
        tabAuthLogin.classList.add('active');
        tabAuthRegister.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
    });

    tabAuthRegister.addEventListener('click', () => {
        tabAuthRegister.classList.add('active');
        tabAuthLogin.classList.remove('active');
        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
    });
}

// Xử lý Đăng Nhập
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('redis_auth_token', authToken);
                authModal.style.display = 'none';
                updateAuthUI();
                showToast(`🎉 Đăng nhập thành công! Chào mừng ${currentUser.name}`);
            } else {
                showToast(data.message || 'Đăng nhập thất bại!', true);
            }
        } catch {
            showToast('Lỗi kết nối máy chủ!', true);
        }
    });
}

// Xử lý Đăng Ký
if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = regUsername.value.trim();
        const password = regPassword.value.trim();
        const name = regName.value.trim();
        const avatar = regAvatar.value;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name, avatar })
            });
            const data = await res.json();

            if (data.success) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('redis_auth_token', authToken);
                authModal.style.display = 'none';
                updateAuthUI();
                showToast(`✨ Đăng ký thành công! Cấp phát User ID: ${currentUser.userId}`);
            } else {
                showToast(data.message || 'Đăng ký thất bại!', true);
            }
        } catch {
            showToast('Lỗi kết nối máy chủ!', true);
        }
    });
}

// Xử lý Đăng Xuất
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn đăng xuất khỏi Session Redis?')) return;
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch { }

        localStorage.removeItem('redis_auth_token');
        authToken = null;
        currentUser = null;
        updateAuthUI();
        showToast('🚪 Đã đăng xuất và hủy Session Redis thành công!');
    });
}

// Nút Hiện / Ẩn Mật Khẩu (Show / Hide Password)
const toggleLoginPwd = document.getElementById('toggleLoginPwd');
if (toggleLoginPwd && loginPassword) {
    toggleLoginPwd.addEventListener('click', () => {
        const isPwd = loginPassword.type === 'password';
        loginPassword.type = isPwd ? 'text' : 'password';
        toggleLoginPwd.textContent = isPwd ? '🙈' : '👁️';
    });
}

const toggleRegPwd = document.getElementById('toggleRegPwd');
if (toggleRegPwd && regPassword) {
    toggleRegPwd.addEventListener('click', () => {
        const isPwd = regPassword.type === 'password';
        regPassword.type = isPwd ? 'text' : 'password';
        toggleRegPwd.textContent = isPwd ? '🙈' : '👁️';
    });
}

// Bấm chip tài khoản Demo để điền nhanh
document.querySelectorAll('.btn-chip-acc').forEach(btn => {
    btn.addEventListener('click', () => {
        if (loginUsername) loginUsername.value = btn.dataset.u || '';
        if (loginPassword) loginPassword.value = btn.dataset.p || '';
        showToast(`⚡ Đã điền tài khoản: ${btn.dataset.u}`);
    });
});

// Chọn biểu tượng Avatar trong Grid Đăng Ký
document.querySelectorAll('.avatar-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.avatar-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (regAvatar) {
            regAvatar.value = chip.dataset.avatar || '🚀';
        }
    });
});
