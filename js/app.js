import {
  supabase,
  profile,
  requireAuth,
  toast,
  esc,
  timeAgo,
  uploadImage
} from './database.js';

let me = null;
let prof = null;
const liked = new Set();

const $ = (selector) => document.querySelector(selector);

async function init() {
  try {
    me = await requireAuth();
    if (!me) return;

    prof = await profile();

    if (!prof) {
      await supabase.auth.signOut();
      location.href = 'login.html';
      return;
    }

    // نمایش وضعیت حساب
    const pendingBox = $('#pendingBox');

    if (prof.status !== 'approved') {
      if (pendingBox) {
        pendingBox.classList.remove('hidden');
        pendingBox.textContent =
          'حساب شما هنوز توسط مدیر خانواده تأیید نشده است. بعد از تأیید، امکانات خانواده فعال می‌شود.';
      }
    } else {
      if (pendingBox) {
        pendingBox.classList.add('hidden');
      }
    }

    // نمایش دکمه Admin فقط برای مدیر
    setupAdminButton();

    await loadFeed();
    setup();
    subscribe();

  } catch (error) {
    console.error('HASHEMI FB init error:', error);
    toast('خطا در اجرای برنامه: ' + (error?.message || error), 'error');
  }
}


/* =========================
   ADMIN
========================= */

function setupAdminButton() {
  let adminBtn = $('#adminBtn');

  // اگر دکمه داخل HTML وجود ندارد، آن را ایجاد می‌کنیم
  if (!adminBtn && prof?.role === 'admin') {
    const nav = document.querySelector('.bottom-nav') ||
                document.querySelector('nav') ||
                document.body;

    adminBtn = document.createElement('button');
    adminBtn.id = 'adminBtn';
    adminBtn.className = 'btn primary admin-button';
    adminBtn.innerHTML = '👑 مدیریت خانواده';

    nav.appendChild(adminBtn);
  }

  if (!adminBtn) return;

  if (prof?.role === 'admin') {
    adminBtn.style.display = 'flex';

    adminBtn.onclick = () => {
      location.href = 'admin.html';
    };
  } else {
    adminBtn.style.display = 'none';
  }
}


/* =========================
   FEED
========================= */

async function loadFeed() {
  const feed = $('#feed');

  if (!feed) return;

  const { data, error } = await supabase
    .from('posts')
    .select(
      '*,profiles!posts_author_id_fkey(full_name,avatar_url)'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    toast(error.message, 'error');
    return;
  }

  feed.innerHTML = '';

  $('#empty')?.classList.toggle(
    'hidden',
    !data?.length
  );

  liked.clear();

  for (const p of data || []) {

    const { data: likeData } = await supabase
      .from('likes')
      .select('user_id')
      .eq('post_id', p.id)
      .eq('user_id', me.id)
      .maybeSingle();

    if (likeData) {
      liked.add(p.id);
    }

    feed.insertAdjacentHTML(
      'beforeend',
      postHTML(p)
    );
  }
}


/* =========================
   POST HTML
========================= */

function postHTML(p) {

  const avatar = p.profiles?.avatar_url
    ? `<img src="${esc(p.profiles.avatar_url)}" alt="">`
    : '👤';

  const deleteButton =
    p.author_id === me.id || prof?.role === 'admin'
      ? `<button class="more" data-delete="${p.id}">⋮</button>`
      : '';

  return `
    <article class="post card" data-id="${p.id}">

      <div class="post-head">

        <div class="avatar">
          ${avatar}
        </div>

        <div>
          <b>
            ${esc(
              p.profiles?.full_name ||
              'عضو خانواده'
            )}
          </b>

          <div class="muted small">
            ${timeAgo(p.created_at)}
          </div>
        </div>

        ${deleteButton}

      </div>

      ${
        p.content
          ? `
            <p class="post-text">
              ${esc(p.content).replace(/\n/g, '<br>')}
            </p>
          `
          : ''
      }

      ${
        p.image_url
          ? `
            <img
              class="post-image"
              src="${esc(p.image_url)}"
              loading="lazy"
              alt="تصویر پست"
            >
          `
          : ''
      }

      <div class="post-actions">

        <button
          class="${liked.has(p.id) ? 'liked' : ''}"
          data-like="${p.id}"
        >
          ❤️
          <span>${p.like_count || 0}</span>
        </button>

        <button data-comments="${p.id}">
          💬
          <span>${p.comment_count || 0}</span>
        </button>

        <button data-save="${p.id}">
          🔖 ذخیره
        </button>

      </div>

      <div
        class="comments hidden"
        id="c-${p.id}"
      ></div>

      <form
        class="comment-form"
        data-comment="${p.id}"
      >

        <input
          maxlength="500"
          placeholder="نظر شما..."
          required
        >

        <button type="submit">
          ارسال
        </button>

      </form>

    </article>
  `;
}


/* =========================
   SETUP
========================= */

function setup() {

  const postImage = $('#postImage');

  if (postImage) {
    postImage.onchange = (e) => {
      $('#imageName').textContent =
        e.target.files[0]?.name || '';
    };
  }

  const publishButton = $('#publish');

  if (publishButton) {
    publishButton.onclick = publish;
  }


  /* کلیک‌ها */

  document.addEventListener('click', async (e) => {

    const like = e.target.closest('[data-like]');

    if (like) {
      await toggleLike(like.dataset.like);
      return;
    }


    const comments =
      e.target.closest('[data-comments]');

    if (comments) {
      await toggleComments(
        comments.dataset.comments
      );
      return;
    }


    const del =
      e.target.closest('[data-delete]');

    if (del) {

      if (
        !confirm(
          'آیا مطمئن هستید که این پست حذف شود؟'
        )
      ) {
        return;
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', del.dataset.delete);

      if (error) {
        toast(error.message, 'error');
      } else {
        toast('پست حذف شد.', 'success');
        await loadFeed();
      }

      return;
    }


    const save =
      e.target.closest('[data-save]');

    if (save) {
      toast(
        'ذخیره‌سازی در نسخه بعدی تکمیل می‌شود.'
      );
    }

  });


  /* ارسال کامنت */

  document.addEventListener(
    'submit',
    async (e) => {

      if (
        !e.target.matches('.comment-form')
      ) {
        return;
      }

      e.preventDefault();

      const id =
        e.target.dataset.comment;

      const input =
        e.target.querySelector('input');

      const content =
        input?.value.trim() || '';

      if (!content) return;

      try {

        const { error } =
          await supabase
            .from('comments')
            .insert({
              post_id: id,
              author_id: me.id,
              content
            });

        if (error) {
          toast(error.message, 'error');
          return;
        }

        input.value = '';

        await toggleComments(id, true);

      } catch (error) {
        toast(
          error?.message || 'خطا در ارسال نظر',
          'error'
        );
      }
    }
  );


  /* جستجو */

  $('#searchBtn')?.addEventListener(
    'click',
    () => {
      $('#searchBox')?.classList.toggle('hidden');
    }
  );


  $('#closeSearch')?.addEventListener(
    'click',
    () => {
      $('#searchBox')?.classList.add('hidden');
    }
  );


  $('#profileBtn')?.addEventListener(
    'click',
    () => {
      location.href = 'profile.html';
    }
  );


  $('#notifBtn')?.addEventListener(
    'click',
    () => {
      location.href = 'notifications.html';
    }
  );


  $('#searchInput')?.addEventListener(
    'input',
    search
  );
}


/* =========================
   PUBLISH
========================= */

async function publish() {

  if (!prof || prof.status !== 'approved') {
    toast(
      'ابتدا باید توسط مدیر تأیید شوید.',
      'error'
    );
    return;
  }

  const text =
    $('#postText')?.value.trim() || '';

  const file =
    $('#postImage')?.files[0];

  if (!text && !file) {
    toast(
      'متن یا عکس اضافه کنید.',
      'error'
    );
    return;
  }

  const button = $('#publish');

  if (button) {
    button.disabled = true;
  }

  try {

    let image_url = null;

    if (file) {
      image_url =
        await uploadImage(
          file,
          `posts/${me.id}`
        );
    }

    const { error } =
      await supabase
        .from('posts')
        .insert({
          author_id: me.id,
          content: text || null,
          image_url
        });

    if (error) {
      throw error;
    }

    $('#postText').value = '';

    if ($('#postImage')) {
      $('#postImage').value = '';
    }

    if ($('#imageName')) {
      $('#imageName').textContent = '';
    }

    await loadFeed();

    toast(
      'پست با موفقیت منتشر شد.',
      'success'
    );

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      'خطا در انتشار پست',
      'error'
    );

  } finally {

    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================
   LIKE
========================= */

async function toggleLike(id) {

  if (!prof || prof.status !== 'approved') {
    toast(
      'ابتدا باید توسط مدیر تأیید شوید.',
      'error'
    );
    return;
  }

  const isLiked =
    liked.has(id);

  try {

    if (isLiked) {

      const { error } =
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', me.id);

      if (error) throw error;

      liked.delete(id);

    } else {

      const { error } =
        await supabase
          .from('likes')
          .insert({
            post_id: id,
            user_id: me.id
          });

      if (error) throw error;

      liked.add(id);
    }

    const button =
      document.querySelector(
        `[data-like="${id}"]`
      );

    if (button) {

      button.classList.toggle(
        'liked',
        !isLiked
      );

      const count =
        button.querySelector('span');

      if (count) {

        const current =
          Number(count.textContent) || 0;

        count.textContent =
          Math.max(
            0,
            current + (isLiked ? -1 : 1)
          );
      }
    }

  } catch (error) {

    toast(
      error?.message ||
      'خطا در تغییر لایک',
      'error'
    );
  }
}


/* =========================
   COMMENTS
========================= */

async function toggleComments(
  id,
  force = false
) {

  const box =
    $(`#c-${id}`);

  if (!box) return;

  if (!force) {
    box.classList.toggle('hidden');
  }

  if (box.classList.contains('hidden')) {
    return;
  }

  box.innerHTML =
    '<span class="muted">در حال بارگذاری...</span>';

  const { data, error } =
    await supabase
      .from('comments')
      .select(
        '*,profiles!comments_author_id_fkey(full_name)'
      )
      .eq('post_id', id)
      .order('created_at', {
        ascending: true
      });

  if (error) {
    box.innerHTML =
      `<span class="muted">${esc(error.message)}</span>`;
    return;
  }

  box.innerHTML =
    (data || [])
      .map(
        (comment) => `
          <div class="comment">

            <b>
              ${esc(
                comment.profiles?.full_name ||
                'عضو'
              )}
            </b>

            <span>
              ${esc(comment.content)}
            </span>

            <small>
              ${timeAgo(comment.created_at)}
            </small>

          </div>
        `
      )
      .join('')
    ||
    '<span class="muted">هنوز نظری نیست.</span>';
}


/* =========================
   SEARCH
========================= */

async function search() {

  const input =
    $('#searchInput');

  if (!input) return;

  const q =
    input.value.trim();

  if (q.length < 2) {
    await loadFeed();
    return;
  }

  const { data, error } =
    await supabase
      .from('posts')
      .select(
        '*,profiles!posts_author_id_fkey(full_name,avatar_url)'
      )
      .ilike(
        'content',
        `%${q}%`
      )
      .order('created_at', {
        ascending: false
      });

  if (error) {
    toast(
      error.message,
      'error'
    );
    return;
  }

  $('#feed').innerHTML =
    (data || [])
      .map(postHTML)
      .join('');

  $('#empty')?.classList.toggle(
    'hidden',
    !data?.length
  );
}


/* =========================
   REALTIME
========================= */

function subscribe() {

  supabase
    .channel('posts-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'posts'
      },
      async () => {
        await loadFeed();
      }
    )
    .subscribe();
}


/* =========================
   START
========================= */

init();
