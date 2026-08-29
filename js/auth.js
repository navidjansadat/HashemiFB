import {supabase,toast} from './database.js';
const path=location.pathname;
if(path.endsWith('login.html')){
const form=document.querySelector('#loginForm'),msg=document.querySelector('#msg');
form?.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='در حال ورود...';const {error}=await supabase.auth.signInWithPassword({email:email.value,password:password.value});if(error){msg.textContent=error.message;return}location.href='app.html'});
document.querySelector('#forgot')?.addEventListener('click',async()=>{const em=email.value;if(!em)return msg.textContent='ابتدا ایمیل را وارد کنید.';const {error}=await supabase.auth.resetPasswordForEmail(em,{redirectTo:location.origin+'/login.html'});msg.textContent=error?error.message:'لینک بازیابی ارسال شد.'});
}else if(path.endsWith('register.html')){
document.querySelector('#registerForm')?.addEventListener('submit',async e=>{e.preventDefault();const msg=document.querySelector('#msg');msg.textContent='در حال ساخت حساب...';
const {data,error}=await supabase.auth.signUp({email:email.value,password:password.value,options:{data:{full_name:name.value,phone:phone.value,family_code:familyCode.value}}});
if(error){msg.textContent=error.message;return}
if(!data.user){msg.textContent='ثبت‌نام انجام شد. ایمیل خود را تأیید کنید.';return}
msg.textContent='حساب ساخته شد. اگر ایمیل تأیید خواست، آن را تأیید کنید؛ سپس منتظر تأیید مدیر خانواده باشید.';
});
}
