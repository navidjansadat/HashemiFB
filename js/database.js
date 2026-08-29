import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
if(SUPABASE_URL.includes('YOUR_')) console.warn('HASHEMI FB: Supabase config is not set.');
export const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
export async function user(){const {data}=await supabase.auth.getUser();return data.user}
export async function profile(){const u=await user();if(!u)return null;const {data}=await supabase.from('profiles').select('*').eq('id',u.id).maybeSingle();return data}
export function toast(msg,type='info'){const x=document.createElement('div');x.className='toast '+type;x.textContent=msg;document.body.append(x);setTimeout(()=>x.remove(),2800)}
export function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
export function timeAgo(v){const d=(Date.now()-new Date(v).getTime())/1000;if(d<60)return 'همین حالا';if(d<3600)return Math.floor(d/60)+' دقیقه پیش';if(d<86400)return Math.floor(d/3600)+' ساعت پیش';return new Date(v).toLocaleDateString('fa-AF')}
export async function uploadImage(file,folder){if(!file)return null;if(file.size>5*1024*1024)throw new Error('حجم عکس باید کمتر از ۵ مگابایت باشد.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${folder}/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('family-media').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return supabase.storage.from('family-media').getPublicUrl(path).data.publicUrl}
export async function requireAuth(){const u=await user();if(!u){location.href='login.html';return null}return u}
