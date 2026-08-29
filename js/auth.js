import { supabase } from './database.js';

const page = location.pathname.split('/').pop();

const byId = (id) => document.getElementById(id);

function show(msg, type = '') {
  const el = byId('msg');
  if (el) {
    el.textContent = msg;
    el.className = `message ${type}`.trim();
  }
}

if (page === 'login.html') {
  const form = byId('loginForm');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = byId('email')?.value.trim() || '';
    const password = byId('password')?.value || '';

    show('در حال ورود...');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        show('خطا: ' + error.message, 'error');
        return;
      }

      location.href = 'app.html';
    } catch (err) {
      show('خطا در اتصال: ' + (err?.message || err), 'error');
    }
  });

  byId('forgot')?.addEventListener('click', async () => {
    const email = byId('email')?.value.trim() || '';

    if (!email) {
      show('ابتدا ایمیل را وارد کنید.');
      return;
    }

    show('در حال ارسال لینک بازیابی...');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/login.html`
      });

      show(error ? 'خطا: ' + error.message : 'لینک بازیابی رمز ارسال شد.', error ? 'error' : 'success');
    } catch (err) {
      show('خطا: ' + (err?.message || err), 'error');
    }
  });
}

if (page === 'register.html') {
  const form = byId('registerForm');

  form?.addEventListener('submit', async (e) => {
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
      form.reset();
    } catch (err) {
      show('خطا در اتصال به Supabase: ' + (err?.message || err), 'error');
    }
  });
}
