// ============================================
// Auth Logic - Karate TMA DN5SAO
// Handles: Register, Login, Profile, Logout
// ============================================

(function () {
    'use strict';

    // ---- DOM References ----
    const overlay = document.getElementById('auth-overlay');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const profileModal = document.getElementById('profile-modal');

    // ---- Utility: Open / Close modals ----
    function openModal(modal) {
        overlay.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeAllModals() {
        [loginModal, registerModal, profileModal].forEach(m => m && m.classList.remove('active'));
        overlay && overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ---- Close on overlay click ----
    overlay && overlay.addEventListener('click', closeAllModals);

    // ---- Close buttons ----
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // ---- Escape key ----
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });

    // ---- Trigger buttons ----
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnOpenRegister = document.getElementById('btn-open-register');
    const btnOpenProfile = document.getElementById('btn-open-profile');

    btnOpenLogin && btnOpenLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); openModal(loginModal); });
    btnOpenRegister && btnOpenRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); openModal(registerModal); });
    btnOpenProfile && btnOpenProfile.addEventListener('click', (e) => { e.preventDefault(); openModal(profileModal); });

    // ---- Switch between login / register ----
    document.getElementById('switch-to-register') && document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault(); closeAllModals(); openModal(registerModal);
    });
    document.getElementById('switch-to-login') && document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault(); closeAllModals(); openModal(loginModal);
    });

    // ---- Password Toggle Visibility ----
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.closest('.input-wrapper').querySelector('input');
            const isText = input.type === 'text';
            input.type = isText ? 'password' : 'text';
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = isText ? 'ri-eye-line' : 'ri-eye-off-line';
            }
        });
    });

    // ---- Role label map ----
    const ROLE_LABELS = {
        pending: 'Chờ phê duyệt',
        vo_sinh: 'Võ Sinh',
        huan_luyen_vien: 'Huấn Luyện Viên',
        phu_huynh: 'Phụ Huynh',
        admin: 'Quản Trị Viên',
    };

    // ---- Update navbar state ----
    function updateNavbar(user, profile) {
        const guestGroup = document.getElementById('nav-auth-guest');
        const userGroup = document.getElementById('nav-auth-user');
        const userDisplayName = document.getElementById('user-display-name');
        const userAvatar = document.getElementById('nav-avatar-letter');

        if (user) {
            guestGroup && guestGroup.classList.add('hidden');
            userGroup && userGroup.classList.add('visible');
            const name = profile?.full_name || user.email.split('@')[0];
            if (userDisplayName) userDisplayName.textContent = name.split(' ').slice(-1)[0];
            if (userAvatar) userAvatar.textContent = (profile?.full_name || user.email)[0].toUpperCase();
        } else {
            guestGroup && guestGroup.classList.remove('hidden');
            userGroup && userGroup.classList.remove('visible');
        }
    }

    // ---- Populate Profile Modal ----
    function populateProfileModal(user, profile) {
        if (!user || !profile) return;

        const avatarEl = document.getElementById('profile-avatar-letter');
        const nameEl = document.getElementById('profile-name-display');
        const roleEl = document.getElementById('profile-role-display');
        const emailEl = document.getElementById('profile-email-display');
        const phoneEl = document.getElementById('profile-phone-display');
        const addressEl = document.getElementById('profile-address-display');
        const cccdEl = document.getElementById('profile-cccd-display');

        const name = profile.full_name || user.email.split('@')[0];
        const role = profile.role || 'pending';

        if (avatarEl) avatarEl.textContent = name[0].toUpperCase();
        if (nameEl) nameEl.textContent = name;
        if (roleEl) {
            roleEl.textContent = ROLE_LABELS[role] || role;
            roleEl.className = `profile-role-badge badge-${role}`;
        }
        if (emailEl) {
            emailEl.textContent = user.email;
            emailEl.className = 'info-value';
        }
        setProfileField(phoneEl, profile.phone);
        setProfileField(addressEl, profile.address);
        setProfileField(cccdEl, profile.cccd);

        // Admin link visibility
        const adminLink = document.getElementById('profile-admin-link');
        if (adminLink) {
            adminLink.style.display = role === 'admin' ? 'flex' : 'none';
        }
    }

    function setProfileField(el, value) {
        if (!el) return;
        if (value) {
            el.textContent = value;
            el.className = 'info-value';
        } else {
            el.textContent = 'Chưa cập nhật';
            el.className = 'info-value empty';
        }
    }

    // ---- Show message helper ----
    function showMessage(containerId, type, text) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.className = `auth-message ${type}`;
        el.innerHTML = `<i class="ri-${type === 'error' ? 'error-warning' : 'checkbox-circle'}-line"></i> ${text}`;
        el.style.display = 'flex';
    }

    function clearMessage(containerId) {
        const el = document.getElementById(containerId);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    }

    function setLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
        } else {
            btn.textContent = btn.dataset.originalText || btn.textContent;
        }
    }

    // ---- REGISTER ----
    const registerForm = document.getElementById('register-form');
    registerForm && registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('register-message');

        const fullName = document.getElementById('reg-fullname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const phone = document.getElementById('reg-phone').value.trim();
        const address = document.getElementById('reg-address').value.trim();
        const cccd = document.getElementById('reg-cccd').value.trim();

        // Validation
        if (!fullName || !email || !password || !phone) {
            showMessage('register-message', 'error', 'Vui lòng điền đầy đủ các trường bắt buộc (*).');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('register-message', 'error', 'Mật khẩu xác nhận không khớp!');
            return;
        }
        if (password.length < 6) {
            showMessage('register-message', 'error', 'Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (cccd && !/^\d{9,12}$/.test(cccd)) {
            showMessage('register-message', 'error', 'Số CCCD không hợp lệ (9-12 chữ số).');
            return;
        }

        setLoading('btn-register-submit', true);

        try {
            const { data, error } = await window.sb.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                        address: address,
                        cccd: cccd,
                    }
                }
            });

            if (error) throw error;

            showMessage('register-message', 'success', '🎉 Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
            registerForm.reset();
            setTimeout(() => { closeAllModals(); openModal(loginModal); }, 3000);
        } catch (error) {
            let msg = 'Đăng ký thất bại. Vui lòng thử lại.';
            if (error.message === 'User already registered') msg = 'Email này đã được đăng ký.';
            else if (error.message.includes('invalid email')) msg = 'Email không hợp lệ.';
            showMessage('register-message', 'error', msg);
        } finally {
            setLoading('btn-register-submit', false);
        }
    });

    // ---- LOGIN ----
    const loginForm = document.getElementById('login-form');
    loginForm && loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('login-message');

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showMessage('login-message', 'error', 'Vui lòng nhập email và mật khẩu.');
            return;
        }

        setLoading('btn-login-submit', true);

        try {
            const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
            if (error) throw error;

            closeAllModals();
            // Profile will be loaded by onAuthStateChange
        } catch (error) {
            let msg = 'Đăng nhập thất bại.';
            if (error.message === 'Invalid login credentials') msg = 'Email hoặc mật khẩu không đúng.';
            else if (error.message.includes('Email not confirmed')) msg = 'Vui lòng xác nhận email trước khi đăng nhập.';
            showMessage('login-message', 'error', msg);
        } finally {
            setLoading('btn-login-submit', false);
        }
    });

    // ---- LOGOUT ----
    async function handleLogout() {
        await window.sb.auth.signOut();
        closeAllModals();
    }
    document.getElementById('btn-logout') && document.getElementById('btn-logout').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    document.getElementById('btn-logout-profile') && document.getElementById('btn-logout-profile').addEventListener('click', handleLogout);

    // ---- AUTH STATE LISTENER ----
    let currentProfile = null;

    window.sb.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            const user = session.user;
            // Fetch profile
            try {
                const { data: profile } = await window.sb.from('profiles').select('*').eq('id', user.id).single();
                currentProfile = profile;
                updateNavbar(user, profile);
            } catch {
                updateNavbar(user, null);
            }
        } else {
            currentProfile = null;
            updateNavbar(null, null);
        }
    });

    // Update profile modal when opened
    btnOpenProfile && btnOpenProfile.addEventListener('click', async (e) => {
        e.preventDefault();
        const { data: { session } } = await window.sb.auth.getSession();
        if (session) {
            const { data: profile } = await window.sb.from('profiles').select('*').eq('id', session.user.id).single();
            populateProfileModal(session.user, profile);
        }
        openModal(profileModal);
    });

})();
