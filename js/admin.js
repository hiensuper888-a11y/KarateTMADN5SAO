// ============================================
// Admin Logic - Karate TMA DN5SAO
// Requires: admin role in profiles table
// ============================================

(function () {
    'use strict';

    const SUPABASE_URL = 'https://copkpxudxwetizqzhbsy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGtweHVkeHdldGl6cXpoYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjcyNzcsImV4cCI6MjA5MTEwMzI3N30.JFI7_Nlrwwei7v2tbADXDl2JMrsz0MOt6ArPGi6hbLw';
    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGtweHVkeHdldGl6cXpoYnN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUyNzI3NywiZXhwIjoyMDkxMTAzMjc3fQ.nmZaxHd3Q7RhY6OQkKH-Qohljmbl4RA3vRstkmHQrow';

    // Reuse the shared client (window.sb) from supabase-client.js for auth
    // This ensures the same session is shared between admin and index pages
    const anonClient = window.sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, detectSessionInUrl: true }
    });
    // Service role client for admin operations (bypasses RLS)
    const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    // ---- DOM ----
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard-section');
    const loginForm = document.getElementById('admin-login-form');
    const loginMessage = document.getElementById('admin-login-message');
    const usersTableBody = document.getElementById('users-table-body');
    const searchInput = document.getElementById('user-search');
    const roleFilterEl = document.getElementById('role-filter');
    const totalUsersEl = document.getElementById('stat-total');
    const pendingEl = document.getElementById('stat-pending');
    const voSinhEl = document.getElementById('stat-vo-sinh');
    const hlvEl = document.getElementById('stat-hlv');
    const phuHuynhEl = document.getElementById('stat-phu-huynh');
    const adminNameEl = document.getElementById('admin-name');
    const loadingSpinner = document.getElementById('loading-spinner');
    const tableContainer = document.getElementById('table-container');

    const ROLE_LABELS = {
        pending: 'Chờ duyệt',
        vo_sinh: 'Võ Sinh',
        huan_luyen_vien: 'Huấn Luyện Viên',
        phu_huynh: 'Phụ Huynh',
        admin: 'Quản Trị Viên',
    };

    const ROLE_BADGE_CLASS = {
        pending: 'badge-pending',
        vo_sinh: 'badge-vo-sinh',
        huan_luyen_vien: 'badge-hlv',
        phu_huynh: 'badge-phu-huynh',
        admin: 'badge-admin-role',
    };

    let allUsers = [];
    let currentAdminProfile = null;

    // ---- Show/Hide sections ----
    function showDashboard(profile) {
        currentAdminProfile = profile;
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        adminNameEl.textContent = profile.full_name || 'Admin';
        loadAllUsers();
    }

    function showLoginSection(message = '', type = 'error') {
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        if (message && loginMessage) {
            loginMessage.className = `admin-login-msg ${type}`;
            loginMessage.textContent = message;
            loginMessage.style.display = 'block';
        }
    }

    // ---- Admin Login ----
    loginForm && loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const btn = document.getElementById('admin-login-btn');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-sm"></span> Đang kiểm tra...';
        if (loginMessage) loginMessage.style.display = 'none';

        try {
            const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // Check role
            const { data: profile, error: profileError } = await anonClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw new Error('Không thể đọc hồ sơ người dùng.');
            if (profile.role !== 'admin') {
                await anonClient.auth.signOut();
                throw new Error('Tài khoản của bạn không có quyền truy cập trang quản trị.');
            }

            showDashboard(profile);
        } catch (err) {
            let msg = err.message || 'Đăng nhập thất bại.';
            if (msg === 'Invalid login credentials') msg = 'Email hoặc mật khẩu không đúng.';
            showLoginSection(msg, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-login-circle-line"></i> Đăng Nhập';
        }
    });

    // ---- Social Admin Login ----
    async function triggerSocialLogin(provider) {
        const client = window.sb || anonClient;
        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: provider === 'x' ? 'twitter' : provider,
                options: {
                    redirectTo: window.location.href // Redirect back to admin page
                }
            });
            if (error) throw error;
        } catch (err) {
            showLoginSection('Đăng nhập mạng xã hội thất bại: ' + err.message, 'error');
        }
    }

    document.getElementById('btn-admin-google')?.addEventListener('click', () => triggerSocialLogin('google'));
    document.getElementById('btn-admin-x')?.addEventListener('click', () => triggerSocialLogin('x'));


    // ---- Load all users ----
    async function loadAllUsers() {
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';

        try {
            const { data, error } = await adminClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allUsers = data || [];
            renderStats(allUsers);
            renderTable(allUsers);
        } catch (err) {
            console.error('Load users error:', err);
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
        }
    }

    // ---- Render stats ----
    function renderStats(users) {
        if (totalUsersEl) totalUsersEl.textContent = users.length;
        if (pendingEl) pendingEl.textContent = users.filter(u => u.role === 'pending').length;
        if (voSinhEl) voSinhEl.textContent = users.filter(u => u.role === 'vo_sinh').length;
        if (hlvEl) hlvEl.textContent = users.filter(u => u.role === 'huan_luyen_vien').length;
        if (phuHuynhEl) phuHuynhEl.textContent = users.filter(u => u.role === 'phu_huynh').length;
    }

    // ---- Render table ----
    function renderTable(users) {
        if (!usersTableBody) return;
        if (users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="7" class="no-data">Không tìm thấy người dùng nào.</td></tr>`;
            return;
        }
        usersTableBody.innerHTML = users.map((u, idx) => {
            const role = u.role || 'pending';
            const joinDate = new Date(u.created_at).toLocaleDateString('vi-VN');
            return `
            <tr>
                <td class="td-idx">${idx + 1}</td>
                <td class="td-user">
                    <div class="table-avatar">${(u.full_name || u.email || 'U')[0].toUpperCase()}</div>
                    <div class="table-user-info">
                        <div class="table-user-name">${u.full_name || '—'}</div>
                        <div class="table-user-email">${u.email || '—'}</div>
                    </div>
                </td>
                <td>${u.phone || '<span class="empty-cell">—</span>'}</td>
                <td>${u.cccd || '<span class="empty-cell">—</span>'}</td>
                <td>${u.address ? `<span title="${u.address}">${u.address.length > 25 ? u.address.substring(0,25)+'…' : u.address}</span>` : '<span class="empty-cell">—</span>'}</td>
                <td>
                    <span class="role-badge ${ROLE_BADGE_CLASS[role]}">${ROLE_LABELS[role]}</span>
                </td>
                <td>
                    <div class="role-actions">
                        <select class="role-select" data-user-id="${u.id}" data-current-role="${role}">
                            <option value="">-- Đổi vai trò --</option>
                            <option value="pending" ${role === 'pending' ? 'disabled' : ''}>Chờ duyệt</option>
                            <option value="vo_sinh" ${role === 'vo_sinh' ? 'disabled' : ''}>Võ Sinh</option>
                            <option value="huan_luyen_vien" ${role === 'huan_luyen_vien' ? 'disabled' : ''}>Huấn Luyện Viên</option>
                            <option value="phu_huynh" ${role === 'phu_huynh' ? 'disabled' : ''}>Phụ Huynh</option>
                            <option value="admin" ${role === 'admin' ? 'disabled' : ''}>Quản Trị Viên</option>
                        </select>
                        <button class="btn-apply-role" data-user-id="${u.id}" title="Áp dụng vai trò">
                            <i class="ri-check-line"></i>
                        </button>
                        <span class="join-date">${joinDate}</span>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Apply role buttons
        document.querySelectorAll('.btn-apply-role').forEach(btn => {
            btn.addEventListener('click', async function () {
                const userId = this.dataset.userId;
                const row = this.closest('tr');
                const select = row.querySelector('.role-select');
                const newRole = select.value;
                if (!newRole) {
                    alert('Vui lòng chọn vai trò mới trước khi áp dụng!');
                    return;
                }
                await updateUserRole(userId, newRole, this);
            });
        });
    }

    // ---- Update user role ----
    async function updateUserRole(userId, newRole, btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-sm"></span>';
        btn.disabled = true;

        try {
            const { error } = await adminClient
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            showToast(`✅ Đã cập nhật vai trò thành "${ROLE_LABELS[newRole]}"!`, 'success');
            loadAllUsers(); // Refresh table
        } catch (err) {
            showToast('❌ Cập nhật thất bại: ' + err.message, 'error');
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }

    // ---- Search & Filter ----
    function filterUsers() {
        const query = (searchInput ? searchInput.value : '').toLowerCase();
        const roleFilter = roleFilterEl ? roleFilterEl.value : '';
        const filtered = allUsers.filter(u => {
            const matchSearch = !query
                || (u.full_name || '').toLowerCase().includes(query)
                || (u.email || '').toLowerCase().includes(query)
                || (u.phone || '').includes(query)
                || (u.cccd || '').includes(query);
            const matchRole = !roleFilter || u.role === roleFilter;
            return matchSearch && matchRole;
        });
        renderTable(filtered);
        renderStats(filtered);
    }

    searchInput && searchInput.addEventListener('input', filterUsers);
    roleFilterEl && roleFilterEl.addEventListener('change', filterUsers);

    // ---- Refresh button ----
    document.getElementById('btn-refresh') && document.getElementById('btn-refresh').addEventListener('click', loadAllUsers);

    // ---- Logout ----
    document.getElementById('admin-logout-btn') && document.getElementById('admin-logout-btn').addEventListener('click', async () => {
        // Use window.sb if that's what we're using (ensures full session clear)
        const clientToUse = window.sb || anonClient;
        await clientToUse.auth.signOut();
        showLoginSection('Đã đăng xuất khỏi trang quản trị.', 'success');
    });

    // ---- Toast notification ----
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ---- Check if already logged in on page load ----
    (async () => {
        const { data: { session } } = await anonClient.auth.getSession();
        if (session) {
            const { data: profile } = await anonClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            if (profile && profile.role === 'admin') {
                showDashboard(profile);
                return;
            }
        }
        showLoginSection();
    })();

})();
