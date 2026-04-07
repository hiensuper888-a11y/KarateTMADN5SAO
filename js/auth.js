// ============================================
// Auth Logic v2 - Karate TMA DN5SAO
// Fix: Login timeout + error handling
// Features: Profile Edit, Avatar Upload,
//           Password Change, Occupation
// ============================================

(function () {
    'use strict';

    // ---- Safety check ----
    function getSB() {
        if (!window.sb) { console.error('[Auth] Supabase client not init'); return null; }
        return window.sb;
    }

    // ---- DOM ----
    const overlay      = document.getElementById('auth-overlay');
    const loginModal   = document.getElementById('login-modal');
    const regModal     = document.getElementById('register-modal');
    const profileModal = document.getElementById('profile-modal');

    // ---- Modal helpers ----
    function openModal(modal) {
        if (!modal) return;
        overlay?.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeAllModals() {
        [loginModal, regModal, profileModal].forEach(m => m?.classList.remove('active'));
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    overlay?.addEventListener('click', closeAllModals);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
    document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeAllModals));

    // ---- Nav triggers ----
    document.getElementById('btn-open-login')?.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal(loginModal); });
    document.getElementById('btn-open-register')?.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal(regModal); });
    document.getElementById('btn-open-profile')?.addEventListener('click', async e => {
        e.preventDefault();
        const sb = getSB(); if (!sb) return;
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
            populateProfileModal(session.user, profile);
            openModal(profileModal);
        }
    });

    // ---- Switch Login <-> Register ----
    document.getElementById('switch-to-register')?.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal(regModal); });
    document.getElementById('switch-to-login')?.addEventListener('click', e => { e.preventDefault(); closeAllModals(); openModal(loginModal); });

    // ---- Profile Tabs ----
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('tab-' + this.dataset.tab)?.classList.add('active');
            clearMessage('edit-message');
            clearMessage('password-message');
        });
    });

    // ---- Password Toggle ----
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const inp = this.closest('.input-wrapper')?.querySelector('input');
            if (!inp) return;
            inp.type = inp.type === 'text' ? 'password' : 'text';
            const ic = this.querySelector('i');
            if (ic) ic.className = inp.type === 'text' ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    });

    // ---- Role labels ----
    const ROLE_LABELS = {
        pending: 'Chờ phê duyệt', vo_sinh: 'Võ Sinh',
        huan_luyen_vien: 'Huấn Luyện Viên', phu_huynh: 'Phụ Huynh', admin: 'Quản Trị Viên'
    };

    // ---- Message helpers ----
    function showMessage(id, type, text) {
        const el = document.getElementById(id);
        if (!el) { console.log(`[${type}]`, text); return; }
        el.className = `auth-message ${type}`;
        el.innerHTML = `<i class="ri-${type === 'error' ? 'error-warning' : 'checkbox-circle'}-line"></i> ${text}`;
        el.style.display = 'flex';
    }
    function clearMessage(id) {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    }
    function setLoading(btnId, loading) {
        const btn = document.getElementById(btnId); if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.origHtml = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
        } else {
            if (btn.dataset.origHtml) { btn.innerHTML = btn.dataset.origHtml; delete btn.dataset.origHtml; }
        }
    }

    // ---- Current state ----
    let currentUser = null;
    let currentProfile = null;

    // ---- Navbar updater ----
    function updateNavbar(user, profile) {
        const guestG = document.getElementById('nav-auth-guest');
        const userG  = document.getElementById('nav-auth-user');
        const dispName = document.getElementById('user-display-name');
        const navAvatar = document.getElementById('nav-avatar-letter');

        if (user) {
            guestG?.classList.add('hidden');
            userG?.classList.add('visible');
            const name = profile?.full_name || user.email.split('@')[0];
            if (dispName) dispName.textContent = name.split(' ').pop();
            if (navAvatar) {
                if (profile?.avatar_url) {
                    navAvatar.style.backgroundImage = `url(${profile.avatar_url})`;
                    navAvatar.style.backgroundSize = 'cover';
                    navAvatar.style.backgroundPosition = 'center';
                    navAvatar.textContent = '';
                } else {
                    navAvatar.style.backgroundImage = '';
                    navAvatar.textContent = name[0].toUpperCase();
                }
            }
        } else {
            guestG?.classList.remove('hidden');
            userG?.classList.remove('visible');
        }
    }

    // ---- Avatar display ----
    function updateAvatarDisplay(avatarUrl, name) {
        const img  = document.getElementById('profile-avatar-img');
        const letter = document.getElementById('profile-avatar-letter');
        if (!img || !letter) return;
        if (avatarUrl) {
            img.src = avatarUrl + (avatarUrl.includes('?') ? '' : '?t=' + Date.now());
            img.style.display = 'block';
            letter.style.display = 'none';
        } else {
            img.style.display = 'none';
            letter.style.display = 'flex';
            letter.textContent = (name || 'U')[0].toUpperCase();
        }
    }

    // ---- Profile field helpers ----
    function setField(id, val) {
        const el = document.getElementById(id); if (!el) return;
        el.textContent = val || 'Chưa cập nhật';
        el.className = val ? 'info-value' : 'info-value empty';
    }
    function setInput(id, val) {
        const el = document.getElementById(id); if (el) el.value = val || '';
    }

    // ---- Populate Profile Modal ----
    function populateProfileModal(user, profile) {
        if (!user) return;
        currentUser = user; currentProfile = profile;
        const name = profile?.full_name || user.email.split('@')[0];
        const role = profile?.role || 'pending';

        // Header
        updateAvatarDisplay(profile?.avatar_url, name);
        const nameEl = document.getElementById('profile-name-display');
        if (nameEl) nameEl.textContent = name;
        const roleEl = document.getElementById('profile-role-display');
        if (roleEl) { roleEl.textContent = ROLE_LABELS[role] || role; roleEl.className = `profile-role-badge badge-${role}`; }

        // View tab
        const emailEl = document.getElementById('profile-email-display');
        if (emailEl) { emailEl.textContent = user.email; emailEl.className = 'info-value'; }
        setField('profile-phone-display', profile?.phone);
        setField('profile-address-display', profile?.address);
        setField('profile-cccd-display', profile?.cccd);
        setField('profile-occupation-display', profile?.occupation);

        // Edit tab
        setInput('edit-fullname', profile?.full_name);
        setInput('edit-phone', profile?.phone);
        setInput('edit-address', profile?.address);
        setInput('edit-cccd', profile?.cccd);
        setInput('edit-occupation', profile?.occupation);

        // Admin link
        const adminLink = document.getElementById('profile-admin-link');
        if (adminLink) adminLink.style.display = role === 'admin' ? 'flex' : 'none';

        // Reset tabs to View
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="view"]')?.classList.add('active');
        document.getElementById('tab-view')?.classList.add('active');
    }

    // ============ REGISTER ============
    document.getElementById('register-form')?.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage('register-message');
        const sb = getSB(); if (!sb) { showMessage('register-message', 'error', 'Lỗi kết nối. Vui lòng tải lại trang.'); return; }

        const fullName = document.getElementById('reg-fullname')?.value.trim();
        const email    = document.getElementById('reg-email')?.value.trim();
        const pass     = document.getElementById('reg-password')?.value;
        const confirm  = document.getElementById('reg-confirm-password')?.value;
        const phone    = document.getElementById('reg-phone')?.value.trim();
        const address  = document.getElementById('reg-address')?.value.trim();
        const cccd     = document.getElementById('reg-cccd')?.value.trim();

        if (!fullName || !email || !pass || !phone) { showMessage('register-message', 'error', 'Vui lòng điền đầy đủ các trường bắt buộc (*).'); return; }
        if (pass !== confirm) { showMessage('register-message', 'error', 'Mật khẩu xác nhận không khớp!'); return; }
        if (pass.length < 6) { showMessage('register-message', 'error', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }
        if (cccd && !/^\d{9,12}$/.test(cccd)) { showMessage('register-message', 'error', 'Số CCCD không hợp lệ (9-12 chữ số).'); return; }

        setLoading('btn-register-submit', true);
        const timer = setTimeout(() => { setLoading('btn-register-submit', false); showMessage('register-message', 'error', 'Hết thời gian. Vui lòng thử lại.'); }, 15000);
        try {
            const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: fullName, phone, address, cccd } } });
            if (error) throw error;
            showMessage('register-message', 'success', '🎉 Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.');
            document.getElementById('register-form')?.reset();
        } catch (err) {
            console.error('[Register]', err);
            let msg = err.message || 'Đăng ký thất bại.';
            if (msg.includes('already registered') || msg.includes('already been registered')) msg = 'Email này đã được đăng ký rồi.';
            showMessage('register-message', 'error', msg);
        } finally { clearTimeout(timer); setLoading('btn-register-submit', false); }
    });

    // ============ LOGIN ============
    document.getElementById('login-form')?.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage('login-message');
        const sb = getSB(); if (!sb) { showMessage('login-message', 'error', 'Lỗi kết nối máy chủ. Vui lòng tải lại trang.'); return; }

        const email = document.getElementById('login-email')?.value.trim();
        const pass  = document.getElementById('login-password')?.value;
        if (!email || !pass) { showMessage('login-message', 'error', 'Vui lòng nhập email và mật khẩu.'); return; }

        setLoading('btn-login-submit', true);
        const timer = setTimeout(() => { setLoading('btn-login-submit', false); showMessage('login-message', 'error', 'Hết thời gian chờ. Kiểm tra mạng và thử lại.'); }, 15000);
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
            clearTimeout(timer);
            closeAllModals();
        } catch (err) {
            console.error('[Login]', err);
            clearTimeout(timer);
            let msg = 'Đăng nhập thất bại.';
            if (err.message === 'Invalid login credentials') msg = 'Email hoặc mật khẩu không đúng.';
            else if (err.message?.includes('Email not confirmed')) msg = 'Email chưa xác nhận. Kiểm tra hộp thư của bạn.';
            else if (err.message?.includes('fetch') || err.message?.includes('network')) msg = 'Lỗi mạng. Vui lòng thử lại.';
            else if (err.message) msg = err.message;
            showMessage('login-message', 'error', msg);
        } finally { setLoading('btn-login-submit', false); }
    });

    // ============ EDIT PROFILE ============
    document.getElementById('edit-profile-form')?.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage('edit-message');
        const sb = getSB(); if (!sb || !currentUser) return;

        const full_name  = document.getElementById('edit-fullname')?.value.trim();
        const phone      = document.getElementById('edit-phone')?.value.trim();
        const address    = document.getElementById('edit-address')?.value.trim();
        const cccd       = document.getElementById('edit-cccd')?.value.trim();
        const occupation = document.getElementById('edit-occupation')?.value.trim();

        if (!full_name) { showMessage('edit-message', 'error', 'Vui lòng nhập họ và tên.'); return; }

        setLoading('btn-save-profile', true);
        try {
            const { error } = await sb.from('profiles').update({ full_name, phone, address, cccd, occupation }).eq('id', currentUser.id);
            if (error) throw error;
            currentProfile = { ...currentProfile, full_name, phone, address, cccd, occupation };
            populateProfileModal(currentUser, currentProfile);
            updateNavbar(currentUser, currentProfile);
            showMessage('edit-message', 'success', '✅ Cập nhật hồ sơ thành công!');
        } catch (err) {
            console.error('[EditProfile]', err);
            showMessage('edit-message', 'error', 'Cập nhật thất bại: ' + (err.message || 'Lỗi không xác định'));
        } finally { setLoading('btn-save-profile', false); }
    });

    // ============ AVATAR UPLOAD ============
    document.getElementById('profile-avatar-click')?.addEventListener('click', () => {
        document.getElementById('avatar-upload-input')?.click();
    });

    document.getElementById('avatar-upload-input')?.addEventListener('change', async function () {
        const file = this.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showMessage('edit-message', 'error', 'Ảnh quá lớn! Chọn ảnh dưới 5MB.'); return; }

        const sb = getSB(); if (!sb || !currentUser) return;
        const wrap = document.getElementById('profile-avatar-click');
        if (wrap) wrap.style.opacity = '0.6';
        setLoading('btn-save-profile', true);
        try {
            const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
            const path = `${currentUser.id}/avatar.${ext}`;
            const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
            const avatar_url = urlData.publicUrl;
            const { error: upProfile } = await sb.from('profiles').update({ avatar_url }).eq('id', currentUser.id);
            if (upProfile) throw upProfile;
            currentProfile = { ...currentProfile, avatar_url };
            updateAvatarDisplay(avatar_url, currentProfile?.full_name || currentUser.email);
            updateNavbar(currentUser, currentProfile);
            showMessage('edit-message', 'success', '✅ Cập nhật ảnh đại diện thành công!');
        } catch (err) {
            console.error('[AvatarUpload]', err);
            let msg = err.message || 'Tải ảnh thất bại.';
            if (msg.includes('Bucket not found') || msg.includes('bucket')) msg = 'Storage chưa được cài đặt. Liên hệ Admin.';
            showMessage('edit-message', 'error', msg);
        } finally {
            if (wrap) wrap.style.opacity = '1';
            setLoading('btn-save-profile', false);
            this.value = '';
        }
    });

    // ============ CHANGE PASSWORD ============
    document.getElementById('change-password-form')?.addEventListener('submit', async e => {
        e.preventDefault(); clearMessage('password-message');
        const sb = getSB(); if (!sb) return;

        const newPass     = document.getElementById('new-password')?.value;
        const confirmPass = document.getElementById('confirm-new-password')?.value;
        if (!newPass) { showMessage('password-message', 'error', 'Vui lòng nhập mật khẩu mới.'); return; }
        if (newPass.length < 6) { showMessage('password-message', 'error', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }
        if (newPass !== confirmPass) { showMessage('password-message', 'error', 'Mật khẩu xác nhận không khớp!'); return; }

        setLoading('btn-change-password', true);
        try {
            const { error } = await sb.auth.updateUser({ password: newPass });
            if (error) throw error;
            showMessage('password-message', 'success', '✅ Đổi mật khẩu thành công!');
            document.getElementById('change-password-form')?.reset();
        } catch (err) {
            console.error('[ChangePass]', err);
            showMessage('password-message', 'error', 'Đổi mật khẩu thất bại: ' + (err.message || 'Lỗi không xác định'));
        } finally { setLoading('btn-change-password', false); }
    });

    // ============ LOGOUT ============
    async function handleLogout() {
        const sb = getSB(); if (!sb) return;
        await sb.auth.signOut();
        closeAllModals();
        currentUser = null; currentProfile = null;
        updateNavbar(null, null);
    }
    document.getElementById('btn-logout')?.addEventListener('click', e => { e.preventDefault(); handleLogout(); });
    document.getElementById('btn-logout-profile')?.addEventListener('click', handleLogout);

    // ============ AUTH STATE ============
    const _sb = getSB();
    if (_sb) {
        _sb.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                try {
                    const { data: profile } = await _sb.from('profiles').select('*').eq('id', session.user.id).single();
                    currentUser = session.user; currentProfile = profile;
                    updateNavbar(session.user, profile);
                } catch { updateNavbar(session.user, null); }
            } else {
                currentUser = null; currentProfile = null;
                updateNavbar(null, null);
            }
        });
    }

})();
