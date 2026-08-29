import { supabase } from './database.js';

const path = location.pathname;

if (path.endsWith('register.html')) {
    const form = document.getElementById('registerForm');
    const msg = document.getElementById('msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const familyCode = document.getElementById('familyCode').value.trim();

        msg.textContent = 'در حال ساخت حساب...';

        if (password.length < 6) {
            msg.textContent = 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        phone: phone,
                        family_code: familyCode
                    }
                }
            });

            if (error) {
                msg.textContent = error.message;
                return;
            }

            if (data.user) {
                msg.style.color = '#075e54';
                msg.textContent =
                    'ثبت‌نام موفق شد! ایمیل خود را بررسی کنید.';

                form.reset();
            }
        } catch (error) {
            msg.textContent = 'خطا در اتصال به سرور: ' + error.message;
        }
    });
}

if (path.endsWith('login.html')) {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        msg.textContent = 'در حال ورود...';

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            msg.textContent = error.message;
            return;
        }

        location.href = 'app.html';
    });
}
