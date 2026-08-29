import { supabase } from './database.js';

const byId = (id) => document.getElementById(id);

function show(msg, type = '') {
  const el = byId('msg');
  if (!el) return;
  el.textContent = msg;
  el.className = `message ${type}`.trim();
  el.style.display = 'block';
}

window.addEventListener('error', (e) => {
  if (byId('msg')) show('خطای برنامه: ' + (e.message || 'خطای JavaScript'), 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  if (byId('msg')) show('خطای برنامه: ' + (e.reason?.message || e.reason || 'خطای ناشناخته'), 'error');
});

function initAuth() {
  const loginForm = byId('loginForm');
  const registerForm = byId('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = byId('email')?.value.trim() || '';
      const password = byId('password')?.value || '';

      if (!email || !password) {
        show('ایمیل و رمز عبور را وارد کنید.', 'error');
        return;
      }

      show('در حال ورود...');

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          show('خطا: ' + error.message, 'error');
          return;
        }

        if (!data?.user) {
          show('ورود انجام نشد. لطفاً دوباره تلاش کنید.', 'error');
          return;
        }

        show('ورود موفق بود؛ در حال ورود به برنامه...', 'success');
        location.href = './app.html';
      } catch (err) {
        show('خطا در اتصال به Supabase: ' + (err?.message || err), 'error');
      }
    });

    byId('forgot')?.addEventListener('click', async () => {
      const email = byId('email')?.value.trim() || '';

      if (!email) {
        show('ابتدا ایمیل را وارد کنید.', 'error');
        return;
      }

      show('در حال ارسال لینک بازیابی...');

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/login.html`
        });

        if (error) {
          show('خطا: ' + error.message, 'error');
        } else {
          show('لینک بازیابی رمز ارسال شد.', 'success');
        }
      } catch (err) {
        show('خطا: ' + (err?.message || err), 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = byId('name')?.value.trim() || '';
      const email = byId('email')?.value.trim() || '';
      const phone = byId('phone')?.value.trim() || '';
      const password = byId('password')?.value || '';
      const familyCode = byId('familyCode')?.value.trim() || '';

      show('در حال ساخت حساب...');

      if (!name || !email || !familyCode) {
        show('لطفاً نام، ایمیل و کد خانواده را کامل کنید.', 'error');
        return;
      }

      if (password.length < 6) {
        show('رمز عبور باید حداقل ۶ کاراکتر باشد.', 'error');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone,
              family_code: familyCode
            }
          }
        });

        if (error) {
          show('خطا: ' + error.message, 'error');
          return;
        }

        if (!data?.user) {
          show('ثبت‌نام انجام شد. اگر تأیید ایمیل فعال باشد، ایمیل خود را بررسی کنید.', 'success');
          return;
        }

        show('حساب ساخته شد. درخواست عضویت شما برای مدیر خانواده ارسال شد.', 'success');
        registerForm.reset();
      } catch (err) {
        show('خطا در اتصال به Supabase: ' + (err?.message || err), 'error');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
