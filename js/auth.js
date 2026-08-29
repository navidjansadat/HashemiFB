import { supabase } from './database.js';

const path = location.pathname;

if (path.endsWith('login.html')) {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('msg');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        msg.textContent = 'در حال ورود...';

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                msg.textContent = error.message;
                return;
            }

            location.href = 'app.html';

        } catch (error) {
            msg.textContent = 'خطا: ' + error.message;
        }
    });

    document.getElementById('forgot')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();

        if (!email) {
            msg.textContent = 'ابتدا ایمیل را وارد کنید.';
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: location.origin + '/login.html'
            }
        );

        msg.textContent = error
            ? error.message
            : 'لینک بازیابی رمز ارسال شد.';
    });
}


if (path.endsWith('register.html')) {
    const form = document.getElementById('registerForm');
    const msg = document.getElementById('msg');

    form?.addEventListener('submit', async (e) => {
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
                email: email,
                password: password,
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

            if (!data.user) {
                msg.textContent = 'ثبت‌نام انجام شد.';
                return;
            }

            msg.textContent =
                'حساب با موفقیت ساخته شد. درخواست عضویت شما برای مدیر خانواده ارسال شد.';

            form.reset();

        } catch (error) {
            msg.textContent = 'خطا در اتصال به Supabase: ' + error.message;
        }
    });
}
