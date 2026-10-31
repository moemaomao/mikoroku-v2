// ==================== OPTIMIZED FIREBASE + CACHE ====================
    let userStatsCache = {};
    try {
      const cached = localStorage.getItem('userStatsCache_v1');
      if (cached) Object.assign(userStatsCache, JSON.parse(cached));
    } catch (e) {}
    window.userStatsCache = userStatsCache;

    const firebaseConfig = {
      apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
      authDomain: "widget-comment.firebaseapp.com",
      projectId: "widget-comment",
      storageBucket: "widget-comment.firebasestorage.app",
      messagingSenderId: "249700505242",
      appId: "1:249700505242:web:dab240af09caf30ad7f123"
    };

    const firebaseApp = firebase.apps.find(app => app.name === '[DEFAULT]')
      || firebase.initializeApp(firebaseConfig);
    if (firebaseApp.options.projectId !== firebaseConfig.projectId) {
      throw new Error('The default Firebase app must use the shared comment authentication project.');
    }
    const auth = firebaseApp.auth();
    const db = firebaseApp.firestore();

    // Enable IndexedDB offline persistence (biggest bandwidth saver)
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser does not support persistence');
        }
      });

    function saveUserStatsCache() {
      try {
        localStorage.setItem('userStatsCache_v1', JSON.stringify(userStatsCache));
      } catch (e) {}
    }
    setInterval(saveUserStatsCache, 15000);

    // ==================== BATCH FETCH USER STATS ====================
    async function batchGetUserStats(uids = []) {
      const missing = [...new Set(uids)].filter(uid => uid && !userStatsCache[uid]);
      if (missing.length === 0) return;

      const chunks = [];
      for (let i = 0; i < missing.length; i += 30) {
        chunks.push(missing.slice(i, i + 30));
      }

      await Promise.all(chunks.map(async (chunk) => {
        try {
          const snap = await db.collection('userStats')
            .where(firebase.firestore.FieldPath.documentId(), 'in', chunk)
            .get();

          snap.forEach(doc => {
            const data = doc.data();
            userStatsCache[doc.id] = {
              ...data,
              level: Math.floor((data.points || 0) / 100) + 1
            };
          });

          chunk.forEach(uid => {
            if (!userStatsCache[uid]) {
              userStatsCache[uid] = { _empty: true, level: 1 };
            }
          });
        } catch (err) {
          console.error('batchGetUserStats error:', err);
        }
      }));

      saveUserStatsCache();
    }

    let postId = new URLSearchParams(window.location.search).get('pageId')
      || document.documentElement.dataset.communityPageId
      || window.location.pathname + window.location.search;
    postId = postId
      .replace(/^[\/]+|[\/]+$/g, '')
      .replace(/[\/]/g, '__')
      .replace(/\.html$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (!postId || postId === '' || postId === 'index') postId = 'home';

    console.log('postId yang digunakan:', postId);

    function getNotificationPostUrl(notification) {
      if (notification && notification.postUrl) {
        try {
          return new URL(notification.postUrl, window.location.origin).href;
        } catch (error) {
          console.warn('Invalid notification postUrl:', error);
        }
      }

      const id = String((notification && notification.postId) || '');
      const origin = window.location.origin;
      let match = id.match(/^reader_(.+)_([^_]+)$/);
      if (match) {
        return origin + '/manga/' + encodeURIComponent(match[1]) + '/' + encodeURIComponent(match[2]);
      }

      match = id.match(/^novel_(.+)_([^_]+)$/);
      if (match) {
        return origin + '/novel/' + encodeURIComponent(match[1]) + '/' + encodeURIComponent(match[2]);
      }

      match = id.match(/^detail_(.+)$/);
      if (match) {
        return origin + '/series/' + encodeURIComponent(match[1]);
      }

      const legacySlug = id
        .replace(/_html_m_1$/, '')
        .replace(/\/html\/m\/\d+$/, '')
        .replace(/\?m=\d+$/, '')
        .replace(/\/m\/\d+$/, '')
        .replace(/\/html$/, '')
        .replace(/_/g, '/')
        .replace(/\/+$/, '');
      return legacySlug ? origin + '/' + legacySlug : window.location.href;
    }

    const adminEmails = ['mikorokuscan@gmail.com', 'emailmod1@gmail.com'];
    const vipEmails = ['moemaomao@gmail.com', 'emailvip2@gmail.com'];

    function isCurrentUserAdmin() {
    if (!currentUser || !currentUser.email) return false;
    return adminEmails.includes(currentUser.email.trim().toLowerCase());
}

window.isCurrentUserAdmin = isCurrentUserAdmin;
    
    let lastVisible = null;
    let isLoading = false;
    let noMoreData = false;
    let currentUser = null;
    let unsubscribeComments = null;
    let unreadReplies = 0;
    let replyNotifications = [];
    let sortingLocked = false;
    const LIMIT = 10;
    window.__showAllComments = window.__showAllComments || false;
    window.__commentsCache = window.__commentsCache || null;

    function getCommentsToRender(comments) {
      if (!comments || !comments.length) return [];
      if (window.__showAllComments) return comments;

      const topLevel = [];
      const byParent = {};
      comments.forEach(c => {
        if (c.parentId) {
          if (!byParent[c.parentId]) byParent[c.parentId] = [];
          byParent[c.parentId].push(c);
        } else {
          topLevel.push(c);
        }
      });

      const visibleIds = new Set();
      topLevel.slice(0, LIMIT).forEach(c => visibleIds.add(c.id));

      let grew = true;
      while (grew) {
        grew = false;
        for (const pid of Array.from(visibleIds)) {
          const kids = byParent[pid] || [];
          for (const k of kids) {
            if (!visibleIds.has(k.id)) {
              visibleIds.add(k.id);
              grew = true;
            }
          }
        }
      }

      return comments.filter(c => visibleIds.has(c.id));
    }
    const DEBUG_SELF_NOTIFICATION = true;
    const ANONYMOUS_AVATAR = 'https://mikoroku.com/assets/icons/favicon.ico';
    const LOCALSTORAGE_KEY = 'commentWidget_customUsername';
    const GITHUB_USERNAME_KEY = 'commentWidget_githubUsername';
    const DISPLAY_NAME_KEY = 'commentWidget_displayName';
    const presetBackgrounds = [
      "/assets/hakoroku/backgrounds/1.jpg",
      "/assets/hakoroku/backgrounds/2.jpg",
      "/assets/hakoroku/backgrounds/3.jpg",
      "/assets/hakoroku/backgrounds/4.jpg",
      "/assets/hakoroku/backgrounds/5.jpg",
      "/assets/hakoroku/backgrounds/6.jpg",
      "/assets/hakoroku/backgrounds/7.jpg",
      "/assets/hakoroku/backgrounds/8.jpg",
    ];

   async function listenCommentCount() {
  try {
    const snapshot = await db
      .collection('comments')
      .doc(postId)
      .collection('postComments')
      .get();

    const count = snapshot.size;
    safeUpdateCount(count);

  } catch (err) {
    console.error("COUNT ERROR:", err);
  }
}


const IMGBB_API_KEY = '751e8d146b32b8a00499aef04f568e30';

async function uploadToImgBB(base64) {
  try {
    const formData = new FormData();
    formData.append(
      'image',
      base64.replace(/^data:image\/\w+;base64,/, '')
    );
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: 'POST',
        body: formData
      }
    );
    const result = await response.json();
    if (
      result &&
      result.success &&
      result.data &&
      result.data.url
    ) {
      return result.data.url;
    }
    console.error('ImgBB upload gagal:', result);
    return null;
  } catch (err) {
    console.error('ImgBB error:', err);
    return null;
  }
}


    function getBase64(file, callback) {
      if (!file) return callback(null);
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large (max 5MB)');
        return callback(null);
      }
      const reader = new FileReader();
      reader.onload = () => callback(reader.result);
      reader.onerror = () => callback(null);
      reader.readAsDataURL(file);
    }

    function handlePaste(e, textarea, previewContainer, previewImg, removeBtn) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let item of items) {
        if (item.type.includes('image')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            getBase64(blob, base64 => {
              if (base64) {
                previewImg.src = base64;
                previewContainer.style.display = 'block';
                textarea.dataset.pastedImage = base64;
                removeBtn.onclick = () => {
                  previewContainer.style.display = 'none';
                  textarea.dataset.pastedImage = '';
                };
              }
            });
          }
          break;
        }
      }
    }


    // ==================== EMAIL AUTH FUNCTIONS ====================

let isLoginMode = true;

function openEmailAuthModal() {
  document.getElementById('email-auth-modal').style.display = 'flex';
  resetEmailModal();
}

window.openEmailLogin = openEmailAuthModal;

function closeEmailModal() {
  document.getElementById('email-auth-modal').style.display = 'none';
  resetEmailModal();
}

function resetEmailModal() {
  document.getElementById('email-input').value = '';
  document.getElementById('password-input').value = '';
  document.getElementById('email-error').textContent = '';
  document.getElementById('modal-title').textContent =
    isLoginMode
      ? 'Sign In'
      : 'Create Account';
}

document.getElementById('toggle-auth-mode').addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  document.getElementById('modal-title').textContent =
    isLoginMode
      ? 'Sign In'
      : 'Create Account';
  document.getElementById('toggle-auth-mode').textContent =
    isLoginMode
      ? "Don't have an account? Sign Up"
      : 'Already have an account? Sign In';

});

document.getElementById('email-auth-submit').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value.trim();
  const errorEl = document.getElementById('email-error');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password';
    return;
  }

  try {
    errorEl.textContent = 'Processing...';
    
    if (isLoginMode) {
      await auth.signInWithEmailAndPassword(email, password);
      alert('✅ Login berhasil!');
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
      alert('✅ Akun berhasil dibuat!');
    }
    
    closeEmailModal();
    
  } catch (error) {
    console.error(error);

    let message = 'An error occurred';

    if (error.code === 'auth/invalid-email')
        message = 'Invalid email address';
    else if (error.code === 'auth/user-not-found')
        message = 'No account found with this email';
    else if (error.code === 'auth/wrong-password')
        message = 'Incorrect password';
    else if (error.code === 'auth/email-already-in-use')
        message = 'This email is already registered';
    else if (error.code === 'auth/weak-password')
        message = 'Password must be at least 6 characters long';
    
    errorEl.textContent = message;
  }
});

const passwordInput =
  document.getElementById('password-input');

const togglePassword =
  document.getElementById('toggle-password');

const eyeOpen =
  document.getElementById('eye-open');

const eyeClosed =
  document.getElementById('eye-closed');

togglePassword.addEventListener('click', () => {

  const isHidden = passwordInput.type === 'password';

  if (isHidden) {

    passwordInput.type = 'text';

    eyeOpen.style.display = 'none';
    eyeClosed.style.display = 'block';

  } else {

    passwordInput.type = 'password';

    eyeOpen.style.display = 'block';
    eyeClosed.style.display = 'none';

  }
});

    function signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider);
    }

    function signInWithGitHub() {
      const provider = new firebase.auth.GithubAuthProvider();
      provider.addScope('user:email');
      auth.signInWithPopup(provider)
        .then(result => {
          let githubUsername = '';
          if (result.additionalUserInfo && result.additionalUserInfo.username) {
            githubUsername = result.additionalUserInfo.username;
          } else if (result.user.email && result.user.email.includes('@users.noreply.github.com')) {
            githubUsername = result.user.email.split('@')[0];
          }
          if (githubUsername) {
            localStorage.setItem(GITHUB_USERNAME_KEY, githubUsername);
            updateUI();
          }
        })
        .catch(error => {
          console.error('Gagal login GitHub:', error);
          alert('Gagal login GitHub: ' + error.message);
        });
    }

    function signInWithFacebook() {
      const provider = new firebase.auth.FacebookAuthProvider();
      auth.signInWithPopup(provider);
    }

    function signInWithX() {
      const provider = new firebase.auth.TwitterAuthProvider();
      auth.signInWithPopup(provider);
    }

    function signOut() {
  if (confirm('Yakin ingin keluar?')) {
    auth.signOut().then(() => {
      currentUser = null;
      
      const authorInput = document.getElementById('author');
      if (authorInput) {
        authorInput.value = 'Anonymous';
      }

      localStorage.removeItem(DISPLAY_NAME_KEY);
      localStorage.removeItem('commentWidget_displayName');

      updateUI();
      updateReplyBadge();

      alert('✅ Berhasil keluar.');
      
    }).catch(err => {
      console.error('Sign out error:', err);
      alert('Gagal keluar: ' + err.message);
    });
  }
}

    function updateUI() {
  
  const signinGoogle = document.getElementById('google-signin');
  const signinGithub = document.getElementById('github-signin');
  const signinFacebook = document.getElementById('facebook-signin');
  const signinX = document.getElementById('x-signin');
  const signout = document.getElementById('google-signout');
  const userInfo = document.getElementById('user-info');
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-name');
  const authorInput = document.getElementById('author');
  const emailSignin = document.getElementById('email-login-btn');

if (currentUser) {
  signinGoogle.style.display = 'none';
  signinGithub.style.display = 'none';
  signinFacebook.style.display = 'none';
  signinX.style.display = 'none';
  emailSignin.style.display = 'none';

  signout.style.display = 'flex';
  userInfo.style.display = 'flex';
    
    // =========================
    // DEFAULT
    // =========================
    
    let avatarSrc =
      currentUser.photoURL || ANONYMOUS_AVATAR;
    
    let displayName =
      currentUser.displayName || 'User';
    
    // =========================
    // USERSTATS CUSTOM
    // =========================
    
    const stats =
      userStatsCache[currentUser.uid];
    
    if (stats) {
      
      if (stats.avatar) {
        avatarSrc = stats.avatar;
      }
      
      if (stats.username) {
        displayName = stats.username;
      }
      
    }
    
    // =========================
    // GITHUB FALLBACK
    // =========================
    
    if (
      !stats?.username &&
      currentUser.providerData &&
      currentUser.providerData.some(
        p => p.providerId === 'github.com'
      )
    ) {
      
      const githubUsername =
        localStorage.getItem(
          GITHUB_USERNAME_KEY
        );
      
      if (githubUsername) {
        
        displayName = githubUsername;
        
      } else if (
        currentUser.email &&
        currentUser.email.includes(
          '@users.noreply.github.com'
        )
      ) {
        
        displayName =
          currentUser.email.split('@')[0];
        
        localStorage.setItem(
          GITHUB_USERNAME_KEY,
          displayName
        );
      }
    }

    avatar.src = avatarSrc;
    name.textContent = displayName;
    
    // === FIX DISPLAY NAME FORM AUTHOR ===
const authorInput = document.getElementById('author');

if (authorInput) {
  let finalName = '';

  if (currentUser) {
    const stats = userStatsCache[currentUser.uid];
    if (stats?.displayName) {
      finalName = stats.displayName;
    } else if (stats?.username) {
      finalName = stats.username;
    }
  }

  if (!finalName) {
    finalName = localStorage.getItem('commentWidget_displayName') || 
                localStorage.getItem(LOCALSTORAGE_KEY);
  }

  if (!finalName) {
    finalName = currentUser?.displayName || 'Anonymous';
  }

  authorInput.value = finalName;
}
  
setupUserAvatarClick();

  } else {
  signinGoogle.style.display = 'inline-block';
  signinGithub.style.display = 'inline-block';
  signinFacebook.style.display = 'inline-block';
  signinX.style.display = 'inline-block';
  emailSignin.style.display = 'inline-block';

  signout.style.display = 'none';
  userInfo.style.display = 'none';
}
}

function getCurrentDisplayName() {
  const savedName = localStorage.getItem('commentWidget_displayName');

  if (!currentUser) {
    return savedName || 'Anonymous';
  }

  const stats = userStatsCache[currentUser.uid];

  return stats?.displayName ||
         stats?.username ||
         savedName ||
         currentUser.displayName ||
         'Anonymous';
}

    function setupAuthorInputListener() {
  const authorInput = document.getElementById('author');
  if (!authorInput) return;

  if (authorInput._inputListener) {
    authorInput.removeEventListener('input', authorInput._inputListener);
  }

  authorInput._inputListener = function() {
    localStorage.setItem(
      'commentWidget_displayName',
      this.value.trim() || 'Anonymous'
    );
  };

  authorInput.addEventListener('input', authorInput._inputListener);

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-button');
    if (editBtn) {
      showEditForm(editBtn.dataset.commentId);
    }
  });
}

    function getCommentLevel(count) {
      const level = Math.floor(count / 5) + 1;
      return level;
    }

    async function updateUserCommentCount() {
  if (!currentUser) return;
  
  const uid = currentUser.uid;
  const ref = db.collection('userStats').doc(uid);
  
  try {
    await ref.set({
      posts: {
        [postId]: firebase.firestore.FieldValue.increment(1)
      }
    }, { merge: true });
    
  } catch (e) {
    console.error('Gagal update userStats:', e);
  }
}

function safeUpdateCount(count) {
  requestAnimationFrame(() => {
    const el = document.getElementById("comment-count");
    if (el) el.textContent = count;
    window.dispatchEvent(new CustomEvent("communityCommentCount", {
      detail: {
        postId: document.documentElement.dataset.communityPageId || "",
        count: Number(count) || 0
      }
    }));
  });
}

// ==================== QUOTE REPLY - VERSI FINAL BERSIH ====================
function getBestUsername(commentEl) {
  const usernameEl = commentEl.querySelector('.author-username');
  if (usernameEl) {
    let text = usernameEl.textContent.trim().replace('@', '').trim();
    if (text && text !== 'user') return text;
  }

  const uid = commentEl.dataset.uid || commentEl.dataset.commentId;
  if (uid && userStatsCache[uid]?.username) {
    return userStatsCache[uid].username;
  }

  const authorEl = commentEl.querySelector('.author-name');
  if (authorEl) {
    let name = authorEl.textContent.trim();
    if (name && name !== 'Anonymous') {
      return name.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
  }
  return 'user';
}

// ==================== QUOTE OVERLAY (READ-ONLY) ====================
let activeQuoteData = null;

function createQuoteData(commentEl, commentId) {
  const username = getBestUsername(commentEl);
  const textEl = commentEl.querySelector('.comment-text');
  let text = textEl ? textEl.textContent.trim() : '';
  if (text.length > 280) text = text.substring(0, 280) + '...';

  const avatarEl = commentEl.querySelector('.comment-author img');
  const avatar = avatarEl ? avatarEl.src : (typeof ANONYMOUS_AVATAR !== 'undefined' ? ANONYMOUS_AVATAR : '');

  return {
    commentId: commentId,
    username: username,
    text: text,
    avatar: avatar
  };
}

function renderQuoteOverlay(quoteData) {
  const old = document.getElementById('quote-overlay');
  if (old) old.remove();

  if (!quoteData) return;

  const overlay = document.createElement('div');
  overlay.id = 'quote-overlay';
  overlay.style.cssText = `
    margin: 0 0 12px 0;
    padding: 12px 14px 12px 16px;
    background: rgba(64,196,255,0.08);
    border-left: 4px solid #40c4ff;
    border-radius: 10px;
    position: relative;
    color: #ddd;
  `;

  overlay.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:10px;">
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.82em; color:#40c4ff; font-weight:600; margin-bottom:4px;">
          💬 Membalas @${quoteData.username}
        </div>
        <div style="font-size:0.9em; line-height:1.45; opacity:0.9; font-style:italic; white-space:pre-wrap; word-break:break-word;">
          ${quoteData.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
        </div>
      </div>
      <button type="button" id="cancel-quote-btn" title="Batalkan quote"
        style="
          flex-shrink:0;
          width:28px; height:28px;
          border:none; border-radius:50%;
          background:rgba(255,80,80,0.2);
          color:#ff8f8f;
          font-size:16px; font-weight:700;
          cursor:pointer; line-height:1;
        ">×</button>
    </div>
  `;

  const formContainer = document.getElementById('comment-form-container') ||
                        document.getElementById('comment-form') ||
                        document.querySelector('#comment-widget form');
  const textarea = document.getElementById('comment-text');

  if (textarea && textarea.parentNode) {
    const wrapper = textarea.closest('.comment-input-wrapper') || textarea.parentNode;
    wrapper.parentNode.insertBefore(overlay, wrapper);
  } else if (formContainer) {
    formContainer.insertBefore(overlay, formContainer.firstChild);
  } else {
    document.body.appendChild(overlay);
  }

  document.getElementById('cancel-quote-btn').onclick = () => {
    activeQuoteData = null;
    overlay.remove();
  };
}

function handleQuoteClick(commentId) {
  const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
  if (!commentEl) return;

  // Close any open reply forms
  document.querySelectorAll('.reply-form-container').forEach(el => {
    el.style.display = 'none';
  });

  activeQuoteData = createQuoteData(commentEl, commentId);
  renderQuoteOverlay(activeQuoteData);

  const mainTextarea = document.getElementById('main-comment-textarea') ||
                       document.querySelector('.main-comment-form textarea') ||
                       document.querySelector('#comment-text');

  if (mainTextarea) {
    mainTextarea.focus();
    mainTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function attachQuoteListeners() {
  const quoteButtons = document.querySelectorAll('.quote-button');
  
  quoteButtons.forEach(btn => {
    btn.removeEventListener('click', handleQuoteBtnClick);
    btn.addEventListener('click', handleQuoteBtnClick);
  });
}

function handleQuoteBtnClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const commentId = this.dataset.commentId;
  if (commentId) {
    handleQuoteClick(commentId);
  }
}

    function updateReplyBadge() {
  const badge = document.getElementById('reply-badge');
  if (!badge) return;
  if (unreadReplies > 0) {
    badge.textContent = unreadReplies > 99 ? '99+' : unreadReplies;
    badge.style.display = 'flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

    function showReplyNotifications() {
      const overlay = document.getElementById('reply-notif-overlay');
      const list = document.getElementById('reply-notif-list');

      if (!overlay || !list) return;

      list.innerHTML = '';

      if (replyNotifications.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#ccc;">No new replies</p>';
      } else {
        replyNotifications.forEach(function(notif, index) {
          const author = notif.author || 'Unknown';
          const text = notif.text || '[reply masih error]';
          const timeStr = notif.date ? new Date(notif.date).toLocaleString() : 'Baru saja';
          const snippet = text.substring(0, 100);
          const ellipsis = text.length > 100 ? '...' : '';
          const formattedSnippet = snippet.replace(
              /@([a-zA-Z0-9._-]+)/g,
             '<span class="notif-mention">@$1</span>'
              );

          const postLink = getNotificationPostUrl(notif);

          const postTitle = notif.postTitle || notif.title || "Postingan";
          const isMention = notif.notifType === 'mention';
          const html =
            '<div class="notif-item">' +
              '<div>' +
                (isMention 
                  ? `<span class="author">${author}</span> mention kamu:` 
                  : `<span class="author">${author}</span> membalas komentarmu:`) +
              '</div>' +

              '<div style="margin:8px 0 10px 0; font-size:0.95em; line-height:1.45;">' +
                 formattedSnippet + ellipsis +
              '</div>' +

              '<div class="time" style="font-size:0.82em; color:#ccc;">' +
                timeStr +
              '</div>' +

              `<a href="${postLink}" target="_blank" style="display:block; margin-top:12px; padding:13px 20px; background:linear-gradient(90deg,#7c5cf6,#a78bfa); color:white; border-radius:12px; text-decoration:none; font-weight:600; text-align:center;">` +
                postTitle +
              '</a>' +

            '</div>';

          const item = document.createElement('div');
          item.innerHTML = html;
          list.appendChild(item);
        });
      }

      overlay.style.display = 'flex';
    }

    function openUserSettings() {
  window.loadCommentFeatureStyles?.('settings');
  if (!currentUser) {
    alert("Harap login terlebih dahulu!");
    return;
  }

  const modal = document.getElementById('user-settings-modal');
  if (!modal) {
    console.error("user-settings-modal tidak ditemukan");
    return;
  }

  modal.style.display = 'flex';

  const toggle = document.getElementById('disable-animations-toggle');
  if (toggle) {
    const saved = localStorage.getItem('commentWidget_disableAnimations') === 'true';
    toggle.checked = saved;
    applyAnimationSetting(saved);
  }

  loadCurrentUserSettings();

  const stats = userStatsCache[currentUser.uid] || {};

  // Badge
  window.selectedBadge = stats.customBadge || "";
  allBadgesExpanded = false;

  renderBadges(false);
  renderFontPicker();
  renderBorderShapePicker();
  
  const expandBtn = document.getElementById('expand-badges-btn');
  if (expandBtn) {
    expandBtn.textContent = '↓ Expand All Badges';
  }

  document.querySelectorAll('.custom-badge-option').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.badge === window.selectedBadge
    );
  });

  // Border
  selectedBorderClass = stats.customBorder || "";
  renderBorderPicker();

  // Frame
  window.selectedFrame = stats.customAvatarFrame || "";
  updateSettingsAvatarPreview();

  // Display Name
  const displayNameInput = document.getElementById('custom-displayname-input');
  if (displayNameInput) {
    displayNameInput.value =
      stats.displayName ||
      currentUser.displayName ||
      "";
  }

  // Username
  const usernameInput = document.getElementById('custom-username-input');
  if (usernameInput) {
    usernameInput.value = stats.username || "";
  }

  // BIO USER
  const bioInput = document.getElementById('custom-bio-input');
  if (bioInput) {
    bioInput.value = stats.bio || "";
  }

  // Avatar Preview
  const avatarPreview = document.getElementById('settings-avatar-preview');
  if (avatarPreview) {
    avatarPreview.src =
      stats.avatar ||
      currentUser.photoURL ||
      ANONYMOUS_AVATAR;
  }

  // Background Preview
  selectedCustomBg = stats.customCommentBg || "";

  const bgPreview = document.getElementById('bg-preview');
  const bgImg = document.getElementById('bg-preview-img');

  if (bgPreview && bgImg) {
    if (selectedCustomBg) {
      bgImg.src = selectedCustomBg;
      bgPreview.style.display = 'block';
    } else {
      bgPreview.style.display = 'none';
    }
  }

  // Level
  const level = stats.commentCount
    ? getCommentLevel(stats.commentCount)
    : 1;

  const transcendentSection =
    document.getElementById('transcendent-bg-section');

  if (transcendentSection) {
    transcendentSection.style.display =
      level >= 110 ? 'block' : 'none';
  }
}

function initUserSettingsModal() {

  const modal = document.getElementById('user-settings-modal');
  const closeBtn = document.getElementById('close-user-settings');
  const saveBtn = document.getElementById('save-user-settings');

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }

  if (saveBtn) {
    saveBtn.onclick = saveUserSettings;
  }


  // Reset Background Button
  const resetBtn = document.getElementById('bg-reset-btn');
  if (resetBtn) {

    resetBtn.onclick = async () => {

      if (!currentUser) return alert('Harus login');
      if (!confirm('Reset background ke default?')) return;

      try {
        await db.collection('userStats')
          .doc(currentUser.uid)
          .update({
            customCommentBg:
              firebase.firestore.FieldValue.delete()
          });

        window.selectedCustomBg = null;

        alert('Background berhasil direset!');

        loadCurrentUserSettings();

      } catch (err) {

        alert('Gagal reset: ' + err.message);

      }
    };
  }

  // Avatar upload
  const avatarInput = document.getElementById('custom-avatar-input');
  if (avatarInput) {

    avatarInput.onchange = function () {
      const file = this.files[0];

      if (!file) return;
      getBase64(file, base64 => {

        document.getElementById(
          'settings-avatar-preview'
        ).src = base64;

      });
    };
  }
}

initUserSettingsModal();

document.getElementById('user-settings-modal')
  ?.addEventListener('click', function(e) {
    
    if (e.target === this) {
      this.style.display = 'none';
    }
  });

  let selectedFontClass = "";

// Render Font Picker
function renderFontPicker() {
  const container = document.getElementById('font-picker');
  if (!container) return;

  container.innerHTML = '';

  fontPresets.forEach(font => {
    const div = document.createElement('div');
    div.className = `custom-border-option ${font.class}`;
    div.style.cssText = `
      padding: 14px 10px;
      border-radius: 10px;
      text-align: center;
      cursor: pointer;
      border: 2px solid transparent;
      background: rgba(255,255,255,0.05);
      font-weight: 600;
      transition: all 0.2s;
    `;
    div.innerHTML = `
      <div style="font-size:1.1em;margin-bottom:6px;">${font.name}</div>
      <div style="font-size:0.85em;opacity:0.8;">${font.preview}</div>
    `;

    div.onclick = () => {
      document.querySelectorAll('#font-picker .custom-border-option').forEach(el => {
        el.style.borderColor = 'transparent';
      });
      div.style.borderColor = '#7c3aed';
      selectedFontClass = font.class;
    };

    // Restore selected
    if (selectedFontClass === font.class) {
      div.style.borderColor = '#7c3aed';
    }

    container.appendChild(div);
  });
}

function renderBackgroundPresets() {
  const container = document.getElementById('preset-bg-list');
  if (!container) return;

  container.innerHTML = '';
  container.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    padding: 10px;
    background: rgba(0,0,0,0.25);
    border-radius: 12px;
  `;

  // === OPTION NONE / DEFAULT ===
  const noneDiv = document.createElement('div');
  noneDiv.style.cssText = `
    position: relative;
    cursor: pointer;
    border: 2px solid ${!window.selectedCustomBg ? '#a78bfa' : '#444'};
    border-radius: 12px;
    height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e1e2e, #2a2a3a);
    color: #aaa;
    font-weight: 600;
    transition: all 0.25s ease;
    box-shadow: ${!window.selectedCustomBg ? '0 0 20px rgba(167,139,250,0.5)' : 'none'};
  `;
  noneDiv.innerHTML = `
    <div style="text-align:center;">
      <strong>None</strong><br>
      <small>Default Background</small>
    </div>
  `;

  noneDiv.onclick = () => {
    selectBackgroundOption(noneDiv, null);
  };
  container.appendChild(noneDiv);

  // === PRESET BACKGROUNDS ===
  presetBackgrounds.forEach(url => {
    const isSelected = window.selectedCustomBg === url;

    const div = document.createElement('div');
    div.style.cssText = `
      position: relative;
      cursor: pointer;
      border: 2px solid ${isSelected ? '#a78bfa' : 'rgba(255,255,255,0.08)'};
      border-radius: 12px;
      overflow: hidden;
      height: 130px;
      transition: all 0.25s ease;
      background: rgba(255,255,255,0.03);
      box-shadow: ${isSelected ? '0 0 20px rgba(167,139,250,0.5)' : 'none'};
    `;

    div.innerHTML = `
      <img src="${url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
    `;

    div.onmouseenter = () => {
      div.style.transform = 'scale(1.04)';
      div.style.borderColor = 'rgba(167,139,250,0.6)';
    };
    div.onmouseleave = () => {
      div.style.transform = 'scale(1)';
      if (window.selectedCustomBg !== url) {
        div.style.borderColor = 'rgba(255,255,255,0.08)';
      }
    };

    div.onclick = () => {
      selectBackgroundOption(div, url);
    };

    container.appendChild(div);
  });
  
  updateBackgroundPreview();
}


function selectBackgroundOption(selectedDiv, url) {
  document.querySelectorAll('#preset-bg-list > div').forEach(d => {
    d.style.borderColor = 'rgba(255,255,255,0.08)';
    d.style.boxShadow = 'none';
  });

  selectedDiv.style.borderColor = '#a78bfa';
  selectedDiv.style.boxShadow = '0 0 20px rgba(167,139,250,0.6)';

  window.selectedCustomBg = url || "";
  updateBackgroundPreview();
}


function updateBackgroundPreview() {
  const previewBox = document.getElementById('bg-preview');
  const previewImg = document.getElementById('bg-preview-img');

  if (!previewBox || !previewImg) return;

  if (window.selectedCustomBg) {
    previewImg.src = window.selectedCustomBg;
    previewBox.style.display = 'block';
  } else {
    previewBox.style.display = 'none';
  }
}

function loadCurrentUserSettings() {
  if (!currentUser) return;

  const uid = currentUser.uid;
  renderBackgroundPresets();

  const disableAnimQuick = document.getElementById('disable-animations-toggle');
  if (disableAnimQuick) {
    const fromLocal = localStorage.getItem('commentWidget_disableAnimations') === 'true';
    disableAnimQuick.checked = fromLocal;
    applyAnimationSetting(fromLocal);
  }

  db.collection('userStats').doc(uid).get().then(doc => {
    if (!doc.exists) {
      renderGameRolesPicker();
      return;
    }
    
    const data = doc.data();
    
    // Avatar
    const avatarPreview = document.getElementById('settings-avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = data.avatar || currentUser.photoURL || ANONYMOUS_AVATAR;
    }

    // Load Display Name
    const displayNameInput = document.getElementById('custom-displayname-input');
    if (displayNameInput) {
     displayNameInput.value = data.displayName || currentUser?.displayName || '';
     }
    
    // Username
    const usernameInput = document.getElementById('custom-username-input');
    if (usernameInput) usernameInput.value = data.username || '';

    // BIO
    const bioInput = document.getElementById('custom-bio-input');
    if (bioInput) bioInput.value = data.bio || '';

    const disableAnim = document.getElementById('disable-animations-toggle');
    if (disableAnim) {
      const fromFs = data.disableAnimations === true;
      const fromLocal = localStorage.getItem('commentWidget_disableAnimations') === 'true';
      const disabled = fromFs || fromLocal;
      disableAnim.checked = disabled;
      localStorage.setItem('commentWidget_disableAnimations', disabled ? 'true' : 'false');
      applyAnimationSetting(disabled);
    }

    // Badge
    document.querySelectorAll('.custom-badge-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.badge === (data.badge || ''));
    });

    // Frame
    window.selectedFrame = data.customAvatarFrame || '';
    updateSettingsAvatarPreview();

    // Background
    window.selectedCustomBg = data.customCommentBg || null;
    if (data.customCommentBg) {
      setTimeout(() => {
        const activeDiv = Array.from(document.querySelectorAll('#preset-bg-list > div'))
          .find(div => div.querySelector('img')?.src === data.customCommentBg);
        if (activeDiv) activeDiv.style.borderColor = '#a78bfa';
      }, 150);
    }
    
    renderGameRolesPicker();
    const savedRoles = data.gameRoles || [];
    console.log('✅ Loading saved roles:', savedRoles);

    const options = document.querySelectorAll('#game-roles-picker .game-role-option');
    options.forEach((el, i) => {
      if (i >= GAME_ROLES.length) return;
      const roleId = GAME_ROLES[i].id;
      if (savedRoles.includes(roleId)) {
        el.classList.add('selected');
        const role = GAME_ROLES[i];
        el.style.borderColor = role.color;
        el.style.background = `rgba(167,139,250,0.25)`;
        el.style.color = '#fff';
      }
    });

  }).catch(err => console.error('Load settings error:', err));
}


async function saveUserSettings() {
  if (!currentUser) {
    alert("Harap login terlebih dahulu!");
    return;
  }
  
  const userRef = db.collection('userStats').doc(currentUser.uid);
  const newDisplayName = document.getElementById('custom-displayname-input').value.trim() || currentUser.displayName || "Anonymous";
  const selectedElements = document.querySelectorAll('#game-roles-picker .game-role-option.selected');
  const selectedRoles = Array.from(selectedElements).map(el => {
    const index = Array.from(el.parentNode.children).indexOf(el);
    return GAME_ROLES[index] ? GAME_ROLES[index].id : null;
  }).filter(Boolean);
  
  const disableAnimEl = document.getElementById('disable-animations-toggle');
  const disableAnimations = disableAnimEl ? disableAnimEl.checked : false;
  localStorage.setItem('commentWidget_disableAnimations', disableAnimations ? 'true' : 'false');
  applyAnimationSetting(disableAnimations);

  const settings = {
    customBadge: window.selectedBadge || "",
    customBorder: selectedBorderClass || "",
    customAvatarFrame: window.selectedFrame || "",
    customCommentBg: window.selectedCustomBg || "",
    customFontStyle: selectedFontClass || "",
    displayName: newDisplayName,
    username: document.getElementById('custom-username-input').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''),
    bio: document.getElementById('custom-bio-input').value.trim(),
    avatar: document.getElementById('settings-avatar-preview').src || currentUser.photoURL || ANONYMOUS_AVATAR,
    gameRoles: selectedRoles,
    disableAnimations: disableAnimations
  };
  
  try {
    await userRef.set(settings, { merge: true });
    
    if (!userStatsCache[currentUser.uid]) userStatsCache[currentUser.uid] = {};
    Object.assign(userStatsCache[currentUser.uid], settings);

if (typeof window.syncHeaderDisplayName === "function") {
  window.syncHeaderDisplayName(newDisplayName);
}

if (typeof window.updateHeaderAuth === "function") {
  if (!window.userStatsCache) window.userStatsCache = {};
  if (!window.userStatsCache[currentUser.uid]) {
    window.userStatsCache[currentUser.uid] = {};
  }
  window.userStatsCache[currentUser.uid].avatar = settings.avatar;
  window.userStatsCache[currentUser.uid].displayName = newDisplayName;

  window.updateHeaderAuth();
}
    
    const authorInput = document.getElementById('author');
    if (authorInput) {
      authorInput.value = newDisplayName;
      localStorage.setItem('commentWidget_displayName', newDisplayName);
    }
    
    alert("✅ Pengaturan berhasil disimpan!");
    
    document.getElementById('user-settings-modal').style.display = 'none';
    
    startRealtimeListener();
    
    setTimeout(() => {
      refreshAllUserComments(currentUser.uid);
    }, 800);
    
  } catch (e) {
    console.error("Save error:", e);
    alert("Gagal menyimpan: " + e.message);
  }
}



    function closeReplyNotifications() {
      document.getElementById('reply-notif-overlay').style.display = 'none';
      unreadReplies = 0;
      replyNotifications = [];
      updateReplyBadge();

      if (currentUser) {
        db.collection('notifications').doc(currentUser.uid).set({
  replies: [],
  mentions: []
    }, { merge: true });
      }
    }

    async function addReplyNotification(parentComment, replyText) {

  if (!parentComment.uid) return;

  const notifData = {
    parentId: parentComment.id,
    author: currentUser
      ? (currentUser.displayName || 'Someone')
      : 'Anonymous',
    text: replyText || '',
    date: Date.now(),
    read: false,
    postId: postId,
    postUrl: window.location.href,
    postTitle: document.title
  };

  try {

    await db.collection('notifications')
      .doc(parentComment.uid)
      .set({
        replies: firebase.firestore.FieldValue.arrayUnion(notifData)
      }, { merge: true });

    console.log("Reply notif terkirim");

  } catch (e) {

    console.error('Gagal update notif:', e);

  }
}

async function sendTestNotification() {

  if (!currentUser) {
    alert("Login dulu");
    return;
  }

  const notifData = {
    author: "SYSTEM TEST",
    text: "Ini adalah test notification",
    date: Date.now(),
    postId: postId,
    postTitle: document.title,
    notifType: "reply"
  };

  await db.collection('notifications')
    .doc(currentUser.uid)
    .set({
      replies: firebase.firestore.FieldValue.arrayUnion(notifData)
    }, { merge: true });

  console.log("TEST NOTIF SENT");
}

// ====================== FIXED MENTION NOTIFICATION ======================
async function addMentionNotifications(text) {
  if (!text) return;

  const mentionRegex = /@([a-zA-Z0-9._-\s]{2,30})/g;
  const usernames = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
   
    usernames.push(match[1].trim().toLowerCase());
  }

  const uniqueUsernames = [...new Set(usernames)];

  if (!uniqueUsernames.length) return;

  try {
    await loadAllUsers();
    const matchedUids = new Set();

    (allUsers || []).forEach(u => {
      if (!u || !u.uid) return;
      if (currentUser && u.uid === currentUser.uid) return;
      const uname = String(u.username || '').toLowerCase();
      const dname = String(u.displayName || '').toLowerCase().replace(/[^a-z0-9._-\s]/g, '').trim();
      const unameNoSpace = uname.replace(/\s+/g, '');
      const dnameNoSpace = dname.replace(/\s+/g, '');
      const hit = uniqueUsernames.some(q =>
        q === uname || q === unameNoSpace || q === dname || q === dnameNoSpace
      );
      if (hit) matchedUids.add(u.uid);
    });

    const missing = uniqueUsernames.filter(Boolean).slice(0, 10);
    if (missing.length && matchedUids.size < missing.length) {
      try {
        const qSnap = await db.collection('userStats')
          .where('username', 'in', missing)
          .get();
        qSnap.forEach(doc => {
          if (currentUser && doc.id === currentUser.uid) return;
          matchedUids.add(doc.id);
        });
      } catch (qe) {
        console.warn('mention username query skip:', qe.message);
      }
    }

    const notifData = {
      notifType: 'mention',
      author: currentUser
        ? (currentUser.displayName || 'Someone')
        : 'Anonymous',
      text: text.substring(0, 200),
      date: Date.now(),
      postId: postId,
      postUrl: window.location.href,
      postTitle: document.title
    };

    await Promise.all([...matchedUids].map(async uid => {
      try {
        await db.collection('notifications').doc(uid).set({
          mentions: firebase.firestore.FieldValue.arrayUnion(notifData)
        }, { merge: true });
      } catch (err) {
        console.error('Gagal kirim mention notif:', err);
      }
    }));

  } catch (err) {
    console.error('Mention notif error:', err);
  }
}

    function loadUserNotifications() {
  if (!currentUser) return;
  db.collection('notifications')
    .doc(currentUser.uid)
    .onSnapshot(doc => {

      if (!doc.exists) {

        unreadReplies = 0;
        replyNotifications = [];
        updateReplyBadge();

        return;
      }

      const data = doc.data();
      console.log("NOTIF DATA:", data);
      const replies = data.replies || [];
      const mentions = data.mentions || [];

      replyNotifications = [
        ...replies.map(r => ({
          ...r,
          notifType: 'reply'
        })),

        ...mentions.map(m => ({
          ...m,
          notifType: 'mention'
        }))
      ];

      replyNotifications.sort((a, b) => {
        return (b.date || 0) - (a.date || 0);
      });

      unreadReplies = replyNotifications.length;

      updateReplyBadge();

      console.log("TOTAL NOTIF:", unreadReplies);
    }, err => {
      console.error("Notif listener error:", err);
    });
}

    function isTranscendent(level) {
      return level >= 110;
    }

    function showCustomBgModal() {
      const modal = document.getElementById('custom-bg-modal');
      if (!modal) return;

      const list = document.getElementById('preset-bg-list');
      list.innerHTML = '';

      presetBackgrounds.forEach(url => {
        const div = document.createElement('div');
        div.style.cursor = 'pointer';
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        div.style.border = '2px solid #444';
        div.style.transition = 'all 0.2s';
        div.innerHTML = `<img src="${url}" alt="Preset BG" style="width:100%; height:140px; object-fit:cover;">`;

        div.onclick = async () => {
  if (!currentUser) return alert('Harus login terlebih dahulu');
  
  try {
    await db.collection('userStats').doc(currentUser.uid).set({
      customCommentBg: url
    }, { merge: true });
    
    alert('Background berhasil dipilih!');
    modal.style.display = 'none';
    
    startRealtimeListener();
    
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan: ' + err.message);
  }
};

        div.onmouseover = () => {
          div.style.borderColor = '#a78bfa';
          div.style.transform = 'scale(1.05)';
        };
        div.onmouseout = () => {
          div.style.borderColor = '#444';
          div.style.transform = 'scale(1)';
        };

        list.appendChild(div);
      });

      document.getElementById('custom-bg-reset').onclick = async () => {
        if (!currentUser) return alert('Harus login');
        if (!confirm('Yakin reset background ke default?')) return;

        try {
          await db.collection('userStats').doc(currentUser.uid).update({
            customCommentBg: firebase.firestore.FieldValue.delete()
          });
          alert('Background berhasil direset!');
          modal.style.display = 'none';
        } catch (err) {
          alert('Gagal reset: ' + err.message);
        }
      };

      modal.style.display = 'flex';
    }

    document.getElementById('custom-bg-cancel')?.addEventListener('click', () => {
      document.getElementById('custom-bg-modal').style.display = 'none';
    });
    
    let unsubscribeUserStats = null;

function listenUserStats(uid) {
  if (unsubscribeUserStats) unsubscribeUserStats();
  
  unsubscribeUserStats = db.collection('userStats')
    .doc(uid)
    .onSnapshot(doc => {
      if (doc.exists) {
        userStatsCache[uid] = doc.data();
        
        document.querySelectorAll(`[data-uid="${uid}"]`).forEach(badgeEl => {
          const commentDiv = badgeEl.closest('.comment');
          if (commentDiv) {
            applyUserStats(commentDiv, badgeEl.id, doc.data(), uid);
          }
        });

        updateTranscendentGear();

      } else {
        document.getElementById('transcendent-gear-auth').style.display = 'none';
      }
    });
}

function loadCurrentUserSettings() {
  if (!currentUser) return;

  const uid = currentUser.uid;
  renderBackgroundPresets();

  db.collection('userStats').doc(uid).get().then(doc => {
    if (!doc.exists) return;
    
    const data = doc.data();

  renderGameRolesPicker(); 

  const savedRoles = data.gameRoles || [];
  console.log('Loading saved roles:', savedRoles);

  const options = document.querySelectorAll('#game-roles-picker .game-role-option');
  options.forEach((el, i) => {
    if (i >= GAME_ROLES.length) return;
    const roleId = GAME_ROLES[i].id;
    if (savedRoles.includes(roleId)) {
      el.classList.add('selected');
      const role = GAME_ROLES[i];
      el.style.borderColor = role.color;
      el.style.background = `rgba(167,139,250,0.25)`;
      el.style.color = '#fff';
    }
  });
    
    // Avatar
    const avatarPreview = document.getElementById('settings-avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = data.avatar || currentUser.photoURL || ANONYMOUS_AVATAR;
    }
    // Load Display Name
    const displayNameInput = document.getElementById('custom-displayname-input');
    if (displayNameInput) {
    displayNameInput.value = data.displayName || currentUser?.displayName || '';
    }
    // Username
    const usernameInput = document.getElementById('custom-username-input');
    if (usernameInput) usernameInput.value = data.username || '';
    // Badge
    document.querySelectorAll('.custom-badge-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.badge === (data.badge || ''));
    });
    // Frame
    window.selectedFrame = data.customAvatarFrame || '';
    updateSettingsAvatarPreview();
    // Background
    window.selectedCustomBg = data.customCommentBg || null;
    if (data.customCommentBg) {
      setTimeout(() => {
        const activeDiv = Array.from(document.querySelectorAll('#preset-bg-list > div'))
          .find(div => div.querySelector('img')?.src === data.customCommentBg);
        if (activeDiv) activeDiv.style.borderColor = '#a78bfa';
      }, 150);
    }
  }).catch(err => console.error('Load settings error:', err));
}

function applyUserStats(commentDiv, badgeId, data, uid) {
  console.log("LEVEL:", level);
console.log("customBg:", customBg);
console.log("commentDiv:", commentDiv);
  const count = data.commentCount || 0;
  const level = getCommentLevel(count);
  const customBg = data.customCommentBg || '';

  const badgeEl = document.getElementById(badgeId);

  if (badgeEl) {

    let badgeClass = "";
    let badgeText = "Lv " + level;

    if (level >= 110) {
      badgeClass = "transcendent";
      badgeText = "Transcendent Lv " + level;
    }
    else if (level >= 100) {
      badgeClass = "legendary";
      badgeText = "Legendary Lv " + level;
    }
    else if (level >= 80) {
      badgeClass = "epic";
      badgeText = "Epic Lv " + level;
    }
    else if (level >= 50) {
      badgeClass = "elite";
      badgeText = "Elite Lv " + level;
    }

    badgeEl.className = "badge " + badgeClass;
    badgeEl.textContent = badgeText;
    badgeEl.setAttribute('data-level', level);
    badgeEl.style.setProperty('--level', level);
    badgeEl.style.setProperty('--hue', `calc(${level} * 137.508)`);
    badgeEl.style.display = "inline-block";
  }

  // TRANSCENDENT BACKGROUND
  if (level >= 110) {
  commentDiv.classList.add('transcendent');

  if (customBg) {
    commentDiv.style.setProperty(
      '--custom-bg',
      `url("${customBg}")`
    );

    console.log(
      "SET BG:",
      getComputedStyle(commentDiv).getPropertyValue('--custom-bg')
    );
  }
}
}

    function setFormDisabled(state) {
  commentsLoading = state;

  const form = document.getElementById('comment-form');

  if (!form) return;

  form.querySelectorAll('input, textarea, button').forEach(el => {
    el.disabled = state;
  });

  form.classList.toggle('loading-disabled', state);
}

function escapeHtml(str) {
  if (!str) return '';

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseMarkdown(text) {
  if (!text) return '';

  let html = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [
      'b', 'strong',
      'i', 'em',
      'u',
      's', 'strike',
      'br',
      'p',
      'span',
      'div',
      'img',
      'a',
      'blockquote',
      'code',
      'pre'
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'target',
      'rel',
      'data-username'
    ]
  });

  // =========================
  // MARKDOWN IMAGE
  // =========================
  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" class="comment-image" loading="lazy" decoding="async" loading="lazy" decoding="async" style="max-width:100%;height:auto;border-radius:8px;margin:10px 0;">'
  );

  // =========================
  // INLINE CODE
  // =========================
  html = html.replace(
    /`([^`]+)`/g,
    '<code>$1</code>'
  );

  // =========================
  // BOLD
  // =========================
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong>$1</strong>'
  );

  // =========================
  // ITALIC
  // =========================
  html = html.replace(
    /\*(.*?)\*/g,
    '<em>$1</em>'
  );

  // =========================
  // SPOILER
  // =========================
  html = html.replace(
    /\|\|([\s\S]*?)\|\|/g,
    '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>'
  );

  // =========================
  // LINK
  // =========================
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // =========================
  // QUOTE
  // =========================
  html = html.replace(
    /^&gt;\s?(.*)$/gm,
    '<blockquote>$1</blockquote>'
  );

  html = html.replace(
    /^>\s?(.*)$/gm,
    '<blockquote>$1</blockquote>'
  );

  // =========================
  // MENTION
  // =========================
  html = html.replace(
    /(^|[\s>])@([a-zA-Z0-9._-]{2,30})/g,
    '$1<span class="mention" data-username="$2">@$2</span>'
  );

  // =========================
  // LINE BREAK
  // =========================
  html = html.replace(/\n/g, '<br>');

  return html;
}


function getMentionedUsersHtml(text) {
  if (!text) return '';

  const mentionRegex = /@([a-zA-Z0-9._-]{2,30})/g;
  const users = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    users.push(match[1]);
  }

  if (!users.length) return '';
  const uniqueUsers = [...new Set(users)];

  return `
    <div class="mentioned-users">
      ${uniqueUsers.map(username => `
        <span
          class="mention"
          data-username="${username}">
          @${username}
        </span>
      `).join('')}
    </div>
  `;
}

// =========================
// PRESET FRAMES
// =========================

const presetFrames = [
  "/assets/hakoroku/avatar-frames/1.png",
  "/assets/hakoroku/avatar-frames/2.png",
  "/assets/hakoroku/avatar-frames/3.png",
  "/assets/hakoroku/avatar-frames/4.png",
  "/assets/hakoroku/avatar-frames/5.png",
  "/assets/hakoroku/avatar-frames/6.png",
  "/assets/hakoroku/avatar-frames/7.png",
  "/assets/hakoroku/avatar-frames/8.png",
  "/assets/hakoroku/avatar-frames/9.png",
  "/assets/hakoroku/avatar-frames/10.png",
  "/assets/hakoroku/avatar-frames/11.png",
  "/assets/hakoroku/avatar-frames/12.png",
  "/assets/hakoroku/avatar-frames/13.png",
  "/assets/hakoroku/avatar-frames/14.png",
  "/assets/hakoroku/avatar-frames/15.png",
  "/assets/hakoroku/avatar-frames/16.png",
  "/assets/hakoroku/avatar-frames/17.png",
  "/assets/hakoroku/avatar-frames/18.png",
  "/assets/hakoroku/avatar-frames/19.png",
  "/assets/hakoroku/avatar-frames/20.png",
  "/assets/hakoroku/avatar-frames/21.png",
  "/assets/hakoroku/avatar-frames/22.png",
  "/assets/hakoroku/avatar-frames/23.png",
  "/assets/hakoroku/avatar-frames/24.png",
  "/assets/hakoroku/avatar-frames/25.png",
  "/assets/hakoroku/avatar-frames/26.png",
  "/assets/hakoroku/avatar-frames/27.png",
  "/assets/hakoroku/avatar-frames/28.png",
  "/assets/hakoroku/avatar-frames/29.png",
  "/assets/hakoroku/avatar-frames/30.png",
];

window.selectedFrame = "";
renderFrameOptions();
// =========================
// RENDER FRAME OPTIONS
// =========================

function renderFrameOptions() {
  const container = document.getElementById('frame-options');
  if (!container) return;
  
  container.innerHTML = '';

  // === OPTION NONE ===
  const noneDiv = document.createElement('div');
  noneDiv.style.cssText = `
    cursor:pointer;
    border:2px solid #7c3aed;
    border-radius:14px;
    overflow:hidden;
    width:80px;
    height:80px;
    background:#222;
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#aaa;
    font-size:12px;
    text-align:center;
  `;
  noneDiv.innerHTML = `
    <div style="text-align:center;">
      <strong>None</strong><br>
      <small>No Frame</small>
    </div>
  `;
  noneDiv.onclick = () => {
    document.querySelectorAll('#frame-options > div').forEach(d => {
      d.style.borderColor = '#444';
    });
    noneDiv.style.borderColor = '#7c3aed';
    window.selectedFrame = "";
    updateSettingsAvatarPreview();
  };
  container.appendChild(noneDiv);

  // Preset frames
  presetFrames.forEach(url => {
    const div = document.createElement('div');
    div.style.cssText = `
      cursor:pointer;
      border:2px solid #444;
      border-radius:14px;
      overflow:hidden;
      width:80px;
      height:80px;
      background:#222;
      position:relative;
    `;

    div.innerHTML = `
      <img src="${ANONYMOUS_AVATAR}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; padding:8px;">
      <img src="${url}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none;">
    `;

    div.onclick = () => {
      document.querySelectorAll('#frame-options > div').forEach(d => {
        d.style.borderColor = '#444';
      });
      div.style.borderColor = '#7c3aed';
      window.selectedFrame = url;
      updateSettingsAvatarPreview();
    };

    container.appendChild(div);
  });
}

function updateSettingsAvatarPreview() {
  const preview =
    document.getElementById(
      'settings-avatar-preview'
    );

  const frame =
    document.getElementById(
      'settings-avatar-frame'
    );

  if (!preview || !frame) return;

  frame.src =
    window.selectedFrame || '';

  frame.style.display =
    window.selectedFrame
      ? 'block'
      : 'none';
}

async function fixOldUsernames() {
  const snap = await db.collection('comments').get();

  snap.forEach(async doc => {
    const data = doc.data();

    if (data.username) {
      const clean = data.username
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');

      await doc.ref.update({
        username: clean
      });
    }
  });
}

let allUsers = [];
let allUsersLoading = null;
const ALL_USERS_CACHE_KEY = 'commentWidget_allUsers_v1';
const ALL_USERS_CACHE_TTL_MS = 60 * 60 * 1000;

function readAllUsersCache() {
  try {
    const raw = sessionStorage.getItem(ALL_USERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !Array.isArray(parsed.users)) return null;
    if (Date.now() - parsed.ts > ALL_USERS_CACHE_TTL_MS) return null;
    return parsed.users;
  } catch (e) {
    return null;
  }
}

function writeAllUsersCache(users) {
  try {
    sessionStorage.setItem(ALL_USERS_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      users: users.map(u => ({
        uid: u.uid,
        username: u.username || '',
        displayName: u.displayName || '',
        avatar: u.avatar || '',
        level: u.level || 1,
        commentCount: u.commentCount || 0
      }))
    }));
  } catch (e) { /* quota sessionStorage penuh — ignore */ }
}

async function loadAllUsers() {
  if (allUsers.length > 0) return allUsers;

  const cached = readAllUsersCache();
  if (cached && cached.length) {
    allUsers = cached;
    cached.forEach(u => {
      if (u.uid && !userStatsCache[u.uid]) {
        userStatsCache[u.uid] = {
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          commentCount: u.commentCount || 0,
          level: u.level || 1
        };
      }
    });
    console.log('✅ allUsers dari session cache:', allUsers.length);
    return allUsers;
  }

  if (allUsersLoading) return allUsersLoading;

  allUsersLoading = (async () => {
    try {
      console.log('🔄 Lazy-load users untuk mention (max 80)...');
      const snapshot = await db.collection('userStats')
        .orderBy('commentCount', 'desc')
        .limit(80)
        .get();

      allUsers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const level = getCommentLevel(data.commentCount || 0);
        const user = {
          uid: doc.id,
          username: data.username || '',
          displayName: data.displayName || data.username || 'Anonymous',
          avatar: data.avatar || ANONYMOUS_AVATAR,
          level,
          commentCount: data.commentCount || 0
        };
        allUsers.push(user);
        if (!userStatsCache[doc.id]) {
          userStatsCache[doc.id] = { ...data, level };
        }
      });
      writeAllUsersCache(allUsers);
      console.log('✅ Lazy-loaded', allUsers.length, 'users');
      return allUsers;
    } catch (error) {
      console.error('Gagal load users:', error);
      return [];
    } finally {
      allUsersLoading = null;
    }
  })();

  return allUsersLoading;
}

 // ==================== OPTIMASI AVATAR OTOMATIS ====================
function getOptimizedAvatar(avatarUrl, size = 96) {
  if (!avatarUrl || avatarUrl === ANONYMOUS_AVATAR) {
    return ANONYMOUS_AVATAR;
  }

  if (avatarUrl.includes("googleusercontent.com") || avatarUrl.includes("lh3.googleusercontent.com")) {
    return avatarUrl.replace(/=s\d+/, `=s${size}`);
  }

  if (avatarUrl.includes("gravatar.com")) {
    const separator = avatarUrl.includes('?') ? '&' : '?';
    return avatarUrl + separator + `s=${size}&d=mp`;
  }

  if (avatarUrl.includes("ibb.co") || avatarUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
    return avatarUrl;
  }

  return avatarUrl;
}

   function renderComment(comment) {
  console.time(`⏱️ renderComment ${comment.id || 'unknown'}`);
  
  const div = document.createElement('div');

  // ==================== CUSTOM SHAPE + BORDER + FONT ====================
  let shapeClass = '';
  let borderClass = '';
  let fontClass = '';
  
  const userData = comment.uid && userStatsCache[comment.uid]
                   ? userStatsCache[comment.uid]
                   : (comment.userSettings || {});

  if (userData.customShape) shapeClass = userData.customShape;
  if (userData.customBorder) borderClass = `custom-border ${userData.customBorder}`;
  if (userData.customFontStyle) fontClass = userData.customFontStyle;

  div.className = `comment ${shapeClass} ${borderClass} ${fontClass}`;
  // ====================================================================

  div.dataset.replyCount = 0;
  if (comment.userSettings?.background) {
    div.style.setProperty('--custom-bg', `url('${comment.userSettings.background}')`);
  }
  if (comment.id) {
    div.dataset.commentId = comment.id;
    div.dataset.pinned = comment.pinned ? "true" : "false";
  }

  const timestamp = comment.date
    ? (comment.date.toDate ? comment.date.toDate().getTime() : new Date(comment.date).getTime())
    : 0;
  div.dataset.timestamp = timestamp;
  div.dataset.likes = comment.likes || 0;
  div.dataset.dislikes = comment.dislikes || 0;

  const isAdminMod = comment.email && adminEmails.includes(comment.email.trim().toLowerCase());
  const isVip = comment.email && vipEmails.includes(comment.email.trim().toLowerCase());
  if (isAdminMod) div.classList.add('admin-mod');
  else if (isVip) div.classList.add('vip');

  // ==================== AVATAR ====================
  let avatarSrc = ANONYMOUS_AVATAR;
  if (comment.avatar) avatarSrc = getOptimizedAvatar(comment.avatar);
  if (comment.uid && userStatsCache[comment.uid] && userStatsCache[comment.uid].avatar) {
    avatarSrc = getOptimizedAvatar(userStatsCache[comment.uid].avatar);
  } else if (comment.email && typeof md5 !== "undefined") {
    const hash = md5(comment.email.trim().toLowerCase());
    avatarSrc = `https://www.gravatar.com/avatar/${hash}?s=96&d=mp`;
  }

  const customFrame = comment.uid && userStatsCache[comment.uid]
                      ? userStatsCache[comment.uid].customAvatarFrame
                      : '';
  const hasFrame = !!customFrame;

  let avatarClass = hasFrame ? 'avatar-ring frame-active' : 'avatar-ring';
  if (!comment.uid) {
    avatarClass += ' anonymous';
  }

  const avatarHtml = `
    <div class="avatar-wrapper">
      <img src="${avatarSrc}"
           alt="Avatar ${comment.author || 'User'}"
           class="${avatarClass}"
           width="45"
           height="45"
           loading="lazy"
           decoding="async"
           fetchpriority="low"
           data-level="1"
           style="${comment.uid && !hasFrame ? `--hue: calc(1 * 137.508);` : ''}">
      
      ${customFrame ? `
        <img src="${customFrame}"
             class="avatar-custom-frame"
             width="70"
             height="70"
             loading="lazy"
             decoding="async">
      ` : ''}
    </div>
  `;

  // ==================== CUSTOM FONT & BORDER ====================
  const userFont = comment.userSettings?.customFontStyle || 
                  (comment.uid && userStatsCache[comment.uid]?.customFontStyle);
  if (userFont) div.classList.add(userFont);

  const userBorder = comment.userSettings?.customBorder ||
                    (comment.uid && userStatsCache[comment.uid]?.customBorder);
  if (userBorder) div.classList.add('custom-border', userBorder);

  const isOwnComment = currentUser && (comment.uid === currentUser.uid || 
                     (comment.email && comment.email === currentUser.email));

  const imageHtml = comment.image ? `<img src="${comment.image}" class="comment-image" loading="lazy" decoding="async">` : '';

  let badgeHtml = comment.uid ? `<span class="badge" id="badge-${comment.id}" data-uid="${comment.uid}" style="display:none;"></span>` : '';
  
  let specialBadge = '';
  if (isAdminMod) specialBadge = `<span class="badge admin-mod">Admin/Mod</span>`;
  else if (isVip) specialBadge = `<span class="badge vip">VIP</span>`;

  const userIsAdmin = window.isCurrentUserAdmin?.() || false;

  div.innerHTML = `
    <div class="comment-author">
      ${avatarHtml}
      <div class="author-meta">
        <div class="author-name-row">
          <span class="author-name">${comment.displayName || comment.author || 'Anonymous'}</span>
          ${badgeHtml}
          ${specialBadge}
          ${(() => {
            if (!comment.uid) return '';
            const stats = userStatsCache[comment.uid];
            if (!stats?.customBadge) return '';
            const badge = BADGES.find(b => b.id === stats.customBadge);
            return badge ? `<span class="user-custom-badge ${badge.id}">${badge.text}</span>` : '';
          })()}
        </div>
        ${(() => {
          let username = null;
          if (comment.uid && userStatsCache[comment.uid]?.username) username = userStatsCache[comment.uid].username;
          if (!username && comment.email?.includes('@users.noreply.github.com')) username = comment.email.split('@')[0];
          return username ? `<div class="author-username">@${username}</div>` : '';
        })()}
      </div>
    </div>

    ${comment.quotedFrom ? `
    <div class="quote-block" style="pointer-events:none; user-select:none;">
      <div class="quote-author">💬 @${(comment.quotedFrom.username || 'user').replace(/</g,'&lt;')}</div>
      <div style="font-style:italic; opacity:0.9; white-space:pre-wrap; word-break:break-word;">${(comment.quotedFrom.text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    </div>` : ''}
    <div class="comment-text">${parseMarkdown(comment.text || '')}</div>
    ${imageHtml}
    <div class="comment-date">
      ${comment.date ? new Date(comment.date.toDate ? comment.date.toDate() : comment.date).toLocaleString() : 'Loading all...'}
    </div>

    <div class="comment-actions">
      <div class="left-actions">
        <button class="reply-button" data-comment-id="${comment.id || ''}">Reply</button>
        <button class="quote-button" data-comment-id="${comment.id || ''}" title="Quote Reply">Quote</button>
        ${isOwnComment ? `
          <button class="edit-button" data-comment-id="${comment.id || ''}">Edit</button>
          <button class="delete-button" data-comment-id="${comment.id || ''}">Delete</button>
        ` : ''}
        <button class="report-button" data-comment-id="${comment.id || ''}" title="Laporkan komentar">🚩</button>
        ${userIsAdmin && comment.id ? `<button class="pin-button" data-comment-id="${comment.id}" title="Pin / Unpin">📌</button>` : ''}
      </div>
      <div class="right-actions">
        <button class="btn-like ${getVote(comment.id) === 'like' ? 'active' : ''}" data-count="${comment.likes || 0}">👍 ${comment.likes || 0}</button>
        <button class="btn-dislike ${getVote(comment.id) === 'dislike' ? 'active' : ''}" data-count="${comment.dislikes || 0}">👎 ${comment.dislikes || 0}</button>
      </div>
    </div>
            
        <div class="reply-form-container" id="reply-form-${comment.id}">
          <form class="reply-form" data-parent-id="${comment.id || ''}">
            <input type="text" class="reply-author" placeholder="Your Name" maxlength="50"/>
            <div class="reply-input-wrapper">
  <textarea 
    class="reply-text"
    placeholder="Write your reply..."
    maxlength="1000"></textarea>

  <!-- TOOLBAR MARKDOWN + UPLOAD -->
  <div class="inside-toolbar">

    <!-- UPLOAD -->
    <label class="reply-upload-btn" title="Upload image">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <input 
        type="file" 
        class="reply-image"
        accept="image/jpeg,image/png,image/gif"
        hidden
      />
    </label>

    <!-- BOLD -->
    <button type="button" class="md-btn" data-md="bold" title="Bold">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
      </svg>
    </button>

    <!-- ITALIC -->
    <button type="button" class="md-btn" data-md="italic" title="Italic">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="4" x2="10" y2="4"></line>
        <line x1="14" y1="20" x2="5" y2="20"></line>
        <line x1="15" y1="4" x2="9" y2="20"></line>
      </svg>
    </button>

    <!-- SPOILER -->
    <button type="button" class="md-btn" data-md="spoiler" title="Spoiler">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 12a5 5 0 0 1-10 0 5 5 0 0 1 10 0z"></path>
        <path d="M12 2v2"></path><path d="M12 20v2"></path>
      </svg>
    </button>

    <!-- LINK -->
    <button type="button" class="md-btn" data-md="link" title="Insert Link">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>

    <!-- CODE -->
    <button type="button" class="md-btn" data-md="code" title="Code">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    </button>

    <!-- QUOTE -->
    <button type="button" class="md-btn" data-md="quote" title="Quote">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

  </div>
</div>

<div class="reply-preview" 
     style="display:none; margin-top:12px; position:relative;">

  <img class="reply-preview-img"
       style="max-width:400px; max-height:400px; width:100%; height:auto; border-radius:8px;" />

  <button type="button"
          class="remove-reply-preview"
          style="position:absolute; top:-10px; right:-10px; width:28px; height:28px;
                 background:#ff4444; color:white; border:none; border-radius:50%;
                 font-size:18px; cursor:pointer; z-index:10;">
    ×
  </button>
</div>
            <div class="reply-actions">
  <button type="submit">Post Reply</button>
  <button type="button" class="cancel-reply">Cancel</button>
</div>
          </form>
        </div>
        <div class="replies"></div>
        ${isOwnComment ? `
          <div class="edit-form-container" id="edit-form-${comment.id || ''}" style="display:none;">
            <form class="edit-form" data-comment-id="${comment.id || ''}">
              <div class="comment-input-wrapper">
  <textarea class="edit-text" placeholder="Edit your comment..." required maxlength="1000"></textarea>

  <!-- TOOLBAR MARKDOWN + UPLOAD -->
  <div class="inside-toolbar">

    <!-- UPLOAD -->
    <label class="reply-upload-btn" title="Upload image">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <input 
        type="file" 
        class="reply-image"
        accept="image/jpeg,image/png,image/gif"
        hidden
      />
    </label>

    <!-- BOLD -->
    <button type="button" class="md-btn" data-md="bold" title="Bold">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
      </svg>
    </button>

    <!-- ITALIC -->
    <button type="button" class="md-btn" data-md="italic" title="Italic">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="4" x2="10" y2="4"></line>
        <line x1="14" y1="20" x2="5" y2="20"></line>
        <line x1="15" y1="4" x2="9" y2="20"></line>
      </svg>
    </button>

    <!-- SPOILER -->
    <button type="button" class="md-btn" data-md="spoiler" title="Spoiler">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 12a5 5 0 0 1-10 0 5 5 0 0 1 10 0z"></path>
        <path d="M12 2v2"></path><path d="M12 20v2"></path>
      </svg>
    </button>

    <!-- LINK -->
    <button type="button" class="md-btn" data-md="link" title="Insert Link">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>

    <!-- CODE -->
    <button type="button" class="md-btn" data-md="code" title="Code">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    </button>

    <!-- QUOTE -->
    <button type="button" class="md-btn" data-md="quote" title="Quote">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <button type="button" class="md-btn" data-md="mention" title="Mention User (@)">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <text x="12" y="17" font-size="17" text-anchor="middle" fill="currentColor" font-weight="700" stroke="none">@</text>
  </svg>
</button>
  </div>
</div>

             <div class="edit-preview"
     style="display:none; margin-top:12px; position:relative;">

  <img class="edit-preview-img"
       style="max-width:400px;
              max-height:400px;
              width:100%;
              height:auto;
              border-radius:8px;" />

  <button type="button"
          class="remove-edit-preview"
          style="position:absolute;
                 top:-10px;
                 right:-10px;
                 width:28px;
                 height:28px;
                 background:#ff4444;
                 color:white;
                 border:none;
                 border-radius:50%;
                 font-size:18px;
                 cursor:pointer;
                 z-index:10;">
    ×
  </button>

</div>
              
              <div class="reply-actions">
  <button type="submit">Save Changes</button>
  <button type="button" class="cancel-edit">Cancel</button>
</div>
            </form>
          </div>
        ` : ''}
      `;

  // ==================== LOAD LEVEL (DISAMAKAN DENGAN MODAL) ====================
  if (comment.uid) {
    const userId = comment.uid;
    const badgeId = `badge-${comment.id}`;
    const cachedStats = userStatsCache[userId];
    const statsRequest = cachedStats
      ? Promise.resolve({
          exists: !cachedStats._empty,
          data: () => cachedStats
        })
      : db.collection('userStats').doc(userId).get();

    statsRequest.then(doc => {
      const data = doc.exists ? doc.data() : {};
      
      const level = getCommentLevel(data.commentCount || 0);

      // Update Badge
      const badgeEl = document.getElementById(badgeId);
      if (badgeEl) {
        let badgeClass = "";
        let badgeText = `Lv ${level}`;

        if (level >= 110) { 
          badgeClass = "transcendent"; 
          badgeText = `Transcendent Lv ${level}`; 
        } else if (level >= 100) { 
          badgeClass = "legendary"; 
          badgeText = `Legendary Lv ${level}`; 
        } else if (level >= 80) { 
          badgeClass = "epic"; 
          badgeText = `Epic Lv ${level}`; 
        } else if (level >= 50) { 
          badgeClass = "elite"; 
          badgeText = `Elite Lv ${level}`; 
        }

        badgeEl.className = `badge ${badgeClass}`;
        badgeEl.textContent = badgeText;
        badgeEl.style.display = "inline-block";
        badgeEl.setAttribute('data-level', level);
        badgeEl.style.setProperty('--level', level);
        badgeEl.style.setProperty('--hue', `calc(${level} * 137.508)`);
      }

      const avatar = div.querySelector('.avatar-ring');
      if (avatar) {
        avatar.dataset.level = level;
        avatar.style.setProperty('--hue', `calc(${level} * 137.508)`);
        avatar.classList.remove('elite', 'epic', 'legendary', 'transcendent');
        if (level >= 110) avatar.classList.add('transcendent');
        else if (level >= 100) avatar.classList.add('legendary');
        else if (level >= 80) avatar.classList.add('epic');
        else if (level >= 50) avatar.classList.add('elite');
      }

      div.setAttribute('data-level', level);
      div.style.setProperty('--level', level);
      div.style.setProperty('--hue', `calc(${level} * 137.508)`);
      
      const customBg =
  data.customCommentBg ||
  userStatsCache[comment.uid]?.customCommentBg ||
  '';

if (level >= 110) {

  div.classList.add('transcendent');

  if (customBg) {
    div.style.setProperty(
      '--custom-bg',
      `url("${customBg}")`
    );

    console.log(
      'BACKGROUND TRANSCENDENT:',
      customBg
    );
  }
}

    }).catch(err => console.error('Gagal load user stats untuk level:', err));
  }

  const avatarContainer = div.querySelector('.comment-author');
  if (avatarContainer && comment.uid) {
    avatarContainer.style.cursor = 'pointer';
    avatarContainer.onclick = (e) => {
      e.stopImmediatePropagation();
      showUserProfile(comment.uid);
    };
  }

  console.timeEnd(`⏱️ renderComment ${comment.id || 'unknown'}`);
  return div;
}
    
   function applyUserStats(div, stats) {

  const level = stats.level || 1;

  div.dataset.level = level;
  div.style.setProperty('--level', level);
  div.style.setProperty(
    '--hue',
    `calc(${level} * 137.508)`
  );
}

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  if (!list) return;

  window.__commentsCache = comments;
  const fullCount = comments.length;
  comments = getCommentsToRender(comments);

  if (list.dataset.lastCount == comments.length && !window._forceCommentRerender) {

  }
  list.dataset.lastCount = comments.length;
  list.dataset.fullCount = fullCount;
  window._forceCommentRerender = false;
  
  const oldScroll = window.scrollY;
  const noCommentMsg = list.querySelector('.no-comments, div[style*="Belum ada komentar"]');
  if (noCommentMsg) noCommentMsg.remove();
  const existing = {};
  list.querySelectorAll('.comment').forEach(el => {
  const id = el.dataset.commentId;
    if (id) existing[id] = el;
  });
  const latestIds = new Set(comments.map(c => c.id));

  Object.keys(existing).forEach(id => {
    if (!latestIds.has(id)) {
      existing[id].remove();
    }
  });

  const elements = {};

  comments.forEach(comment => {
    if (existing[comment.id]) {
      const oldEl = existing[comment.id];
      
      oldEl.dataset.commentId = comment.id;
      oldEl.dataset.pinned = comment.pinned ? "true" : "false";
      // Update data
      const timestamp = comment.date ? 
        (comment.date.toDate ? comment.date.toDate().getTime() : new Date(comment.date).getTime()) : 0;

      oldEl.dataset.timestamp = timestamp;
      oldEl.dataset.likes = comment.likes || 0;
      oldEl.dataset.dislikes = comment.dislikes || 0;

      const textEl = oldEl.querySelector('.comment-text');
      if (textEl) textEl.innerHTML = parseMarkdown(comment.text || '');

      const dateEl = oldEl.querySelector('.comment-date');
      if (dateEl) {
        dateEl.textContent = comment.date ? 
          new Date(comment.date.toDate ? comment.date.toDate() : comment.date).toLocaleString() : 'Loading all...';
      }

      elements[comment.id] = oldEl;
    } else {
      elements[comment.id] = renderComment(comment);
    }
  });

  const orphanReplies = [];

comments.forEach(comment => {
  const el = elements[comment.id];

  if (comment.parentId) {
    const parentEl = elements[comment.parentId] || 
                     document.querySelector(`[data-comment-id="${comment.parentId}"]`);

    if (parentEl) {
      let repliesContainer = parentEl.querySelector('.replies');
      if (!repliesContainer) {
        repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies';
        parentEl.appendChild(repliesContainer);
      }

      const existingReplies = Array.from(repliesContainer.children);
      
      if (existingReplies.length === 0) {
        repliesContainer.appendChild(el);
      } else {

          const isNewest = !existingReplies.some(reply => {
          const replyTime = Number(reply.dataset.timestamp || 0);
          const newTime = Number(el.dataset.timestamp || 0);
          return replyTime > newTime;
        });

        if (isNewest) {
          repliesContainer.insertBefore(el, repliesContainer.firstChild);
        } else {
          repliesContainer.appendChild(el);
        }
      }
    } else {
      orphanReplies.push(comment);
    }
  } else {
    if (el.parentNode !== list) {
      list.insertBefore(el, list.firstChild);
    }
  }
});

  orphanReplies.forEach(comment => {
    const parent = document.querySelector(`[data-comment-id="${comment.parentId}"]`);
    if (parent) {
      let repliesContainer = parent.querySelector('.replies');
      if (!repliesContainer) {
        repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies';
        parent.appendChild(repliesContainer);
      }
      repliesContainer.appendChild(elements[comment.id]);
    }
  });

  // === UPDATE SORT BAR & NO COMMENTS ===
  updateUIAfterRender(list);
  attachReplyListeners();
  attachReplyFormListeners();
  attachEditButtons();
  attachEditFormListeners();
  attachLikeDislikeListeners();
  attachReportListeners();
  sortComments();
  attachQuoteListeners();
  initMentionSystem();
  attachPinListeners();
  setTimeout(function() {
    if (typeof applyCollapsedView === 'function') applyCollapsedView();
  }, 0);
}


function updateUIAfterRender(list) {
  const realComments =
    list.querySelectorAll(":scope > .comment").length;
  const sortBar =
    document.querySelector(".comment-sort-bar");
  
  if (sortBar) {
    sortBar.style.display =
      realComments > 0 ? "flex" : "none";
  }
  const noMsg =
    list.querySelector(".no-comments");
  
  if (realComments > 0 && noMsg) {
    noMsg.remove();
  }
}
  

    let scrollObserverAttached = false;



function updateLoadMoreUI() {
  const wrap = document.getElementById('load-more-wrap');
  const btn = document.getElementById('load-more-btn');
  const endEl = document.getElementById('load-more-end');
  const list = document.getElementById('comments-list');
  if (!wrap) return;

  const cache = window.__commentsCache || [];
  const totalTops = cache.filter(function(c) { return !c.parentId; }).length;
  const shownTops = list
    ? Array.from(list.children).filter(function(el) {
        return el.classList && el.classList.contains('comment');
      }).length
    : 0;
  const remaining = Math.max(0, totalTops - shownTops);

  if (window.__showAllComments || totalTops <= LIMIT || remaining === 0) {
    wrap.style.display = 'none';
    if (endEl) {
      endEl.style.display = (window.__showAllComments && totalTops > LIMIT) ? 'block' : 'none';
    }
  } else {
    wrap.style.display = 'flex';
    if (endEl) endEl.style.display = 'none';
    var label = btn && btn.querySelector('.load-more-label');
    if (label) label.textContent = 'Show all comments (' + remaining + ' more)';
    if (btn) btn.disabled = false;
  }
}


function applyCollapsedView() {
  const list = document.getElementById('comments-list');
  if (!list) return;

  list.classList.remove('collapsed-view');
  Array.from(list.children).forEach(function(el) {
    if (el.classList) el.classList.remove('overflow-hidden');
  });
  updateLoadMoreUI();
}



async function startRealtimeListener() {
  if (unsubscribeComments) {
    unsubscribeComments();
    unsubscribeComments = null;
  }

  const commentsList = document.getElementById("comments-list");
  if (!commentsList) return;

  commentsList.innerHTML = `
    <div id="comment-loading" class="comment-loading">
      <div class="spinner"></div>
      <p>Loading comments...</p>
    </div>
  `;
  setFormDisabled(true);

  try {
    const commentsRef = db
      .collection('comments')
      .doc(postId)
      .collection('postComments')
      .orderBy('date', 'desc')
      .limit(150);

    unsubscribeComments = commentsRef.onSnapshot(async (snapshot) => {
      const comments = [];
      snapshot.forEach(doc => {
        comments.push({ id: doc.id, ...doc.data() });
      });

      window.__commentsCache = comments;

      const visibleComments = getCommentsToRender(comments);
      const uniqueUids = [...new Set(
        visibleComments.filter(c => c.uid).map(c => c.uid)
      )];
      await batchGetUserStats(uniqueUids);

      const loadingEl = document.getElementById("comment-loading");
      if (loadingEl) loadingEl.remove();

      if (comments.length === 0) {
        commentsList.innerHTML = `
          <div class="no-comments" style="text-align:center; padding:20px; opacity:.7;">
            Belum ada komentar
          </div>
        `;
        safeUpdateCount(0);
      } else {
        renderComments(comments);
        if (typeof attachMarkdownButtons === 'function') attachMarkdownButtons();
        safeUpdateCount(comments.length);
      }

      setFormDisabled(false);
    }, (err) => {
      console.error(err);
      commentsList.innerHTML = `<div class="no-comments" style="text-align:center;padding:20px;color:#ff5555;">Gagal memuat komentar</div>`;
      setFormDisabled(false);
    });

  } catch (err) {
    console.error(err);
    setFormDisabled(false);
  }
}

window.setCommentCommunityPageId = function(pageId) {
  const nextPageId = String(pageId || '')
    .replace(/^[\/]+|[\/]+$/g, '')
    .replace(/[\/]/g, '__')
    .replace(/\.html$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'home';
  if (nextPageId === postId) return;

  postId = nextPageId;
  lastVisible = null;
  isLoading = false;
  noMoreData = false;
  window.__showAllComments = false;
  window.__commentsCache = [];
  startRealtimeListener();
};

async function loadMoreComments() {
  window.__showAllComments = true;
  noMoreData = true;
  const btn = document.getElementById('load-more-btn');
  if (btn) {
    btn.disabled = true;
    const label = btn.querySelector('.load-more-label');
    if (label) label.textContent = 'Memuat...';
  }

  const cache = window.__commentsCache || [];
  if (cache.length) {
    const uniqueUids = [...new Set(cache.filter(c => c.uid).map(c => c.uid))];
    await batchGetUserStats(uniqueUids);
    window._forceCommentRerender = true;
    renderComments(cache);
  } else {
    applyCollapsedView();
  }
}



function observeScroll() {
  if (window.__commentScrollAttached) return;

  window.__commentScrollAttached = true;
  window.addEventListener('scroll', () => {
    if (isLoading || noMoreData) return;
    
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const fullHeight = document.body.offsetHeight;
    
  });
}

/* ================= SORT COMMENT ================= */
let currentSort = "newest";

document.querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {
document.querySelectorAll(".sort-btn").forEach(b=>{
      b.classList.remove("active");
    });

    btn.classList.add("active");

    currentSort = btn.dataset.sort;

    sortComments();
  });
});

function sortComments() {
  if (sortingLocked) return;
  
  const commentsList = document.getElementById("comments-list");
  if (!commentsList) return;

  const comments = Array.from(commentsList.querySelectorAll(":scope > .comment"));

  comments.sort((a, b) => {
    const aPinned = a.dataset.pinned === "true" || a.classList.contains('pinned');
    const bPinned = b.dataset.pinned === "true" || b.classList.contains('pinned');

    if (aPinned !== bPinned) {
      return bPinned ? 1 : -1;
    }

    if (aPinned && bPinned) {
      const aPinTime = Number(a.dataset.pinnedAt || 0);
      const bPinTime = Number(b.dataset.pinnedAt || 0);
      return bPinTime - aPinTime;
    }

    const aTime = Number(a.dataset.timestamp || 0);
    const bTime = Number(b.dataset.timestamp || 0);

    if (currentSort === "newest") {
      return bTime - aTime;
    } else if (currentSort === "oldest") {
      return aTime - bTime;
    } else if (currentSort === "hot") {
    
      const aScore = (Number(a.dataset.likes || 0) * 1.5) - (Number(a.dataset.dislikes || 0) * 0.8);
      const bScore = (Number(b.dataset.likes || 0) * 1.5) - (Number(b.dataset.dislikes || 0) * 0.8);
      return bScore - aScore;
    }

    return 0;
  });

  comments.forEach(comment => {
    commentsList.appendChild(comment);
  });

  attachPinListeners();
}

function appendComments(comments) {
  const list = document.getElementById('comments-list');

  comments.forEach(comment => {

    const el = renderComment(comment);

    // reply
if (comment.parentId) {
  const parent = document.querySelector(`[data-comment-id="${comment.parentId}"]`);
  if (parent) {
    let repliesContainer = parent.querySelector('.replies');
    if (!repliesContainer) {
      repliesContainer = document.createElement('div');
      repliesContainer.className = 'replies';
      parent.appendChild(repliesContainer);
    }

    repliesContainer.insertBefore(el, repliesContainer.firstChild);
  }
} else {
  list.appendChild(el);
}

  });

  attachLikeDislikeListeners();
  attachReplyFormListeners();
  attachEditFormListeners();
  attachQuoteListeners();
  initMentionSystem();
}

function generateUsername(user, fallbackName = '') {
  if (!user) return null;

  if (
    user.providerData &&
    user.providerData.some(p => p.providerId === 'github.com')
  ) {
    const githubUsername = localStorage.getItem(GITHUB_USERNAME_KEY);

    if (githubUsername) {
      return githubUsername.toLowerCase();
    }
  }

  let base =
    fallbackName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'user';

  return base
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .substring(0, 30);
}

  async function addComment(authorInputValue, text, image, isReply = false, parentId = null) {

  let finalAuthor = authorInputValue.trim();
  if (!finalAuthor) finalAuthor = 'Anonymous';

  let displayName = finalAuthor;
  let username = null;
  if (currentUser) {
    
    username = generateUsername(currentUser, finalAuthor);
    
    const stats = userStatsCache[currentUser.uid];
    if (stats && stats.displayName) {
      displayName = stats.displayName;
    }
  }

  const newComment = {
    author: displayName,
    displayName: displayName,
    username: username,
    text: text.trim(),
    image: image || null,
    date: firebase.firestore.FieldValue.serverTimestamp(),
    parentId: parentId || null,
    avatar: currentUser ? currentUser.photoURL : ANONYMOUS_AVATAR,
    email: currentUser ? currentUser.email : null,
    uid: currentUser ? currentUser.uid : null,
    likes: 0,
    dislikes: 0
  };

  if (typeof activeQuoteData !== 'undefined' && activeQuoteData) {
    newComment.quotedFrom = {
      commentId: activeQuoteData.commentId,
      username: activeQuoteData.username,
      text: activeQuoteData.text,
      avatar: activeQuoteData.avatar || null
    };
  }

  let commentSaved = false;
  try {
    sortingLocked = true;

    const ref = await db.collection('comments')
      .doc(postId)
      .collection('postComments')
      .add(newComment);
    commentSaved = true;

    console.log("Comment success:", ref.id);

    if (typeof activeQuoteData !== 'undefined') {
      activeQuoteData = null;
      const ov = document.getElementById('quote-overlay');
      if (ov) ov.remove();
    }

        // ==================== POINTS + REPUTATION ====================
    if (currentUser && currentUser.uid) {
      const userRef = db.collection('userStats').doc(currentUser.uid);
      const textLength = text.length;
      const reputationGain = Math.floor(textLength / 1);

      await userRef.set({
        points: firebase.firestore.FieldValue.increment(isReply ? 2 : 1),
        reputation: firebase.firestore.FieldValue.increment(reputationGain),
        commentCount: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      const earnedPoints = isReply ? 2 : 1;

      if (!userStatsCache[currentUser.uid]) {
        userStatsCache[currentUser.uid] = {};
      }

      userStatsCache[currentUser.uid].points = (userStatsCache[currentUser.uid].points || 0) + earnedPoints;
      userStatsCache[currentUser.uid].reputation = (userStatsCache[currentUser.uid].reputation || 0) + reputationGain;
      userStatsCache[currentUser.uid].commentCount = (userStatsCache[currentUser.uid].commentCount || 0) + 1;

      console.log(`✅ User ${currentUser.uid} earned ${earnedPoints} points + ${reputationGain} reputation (${textLength} chars)`);
    }

    await addMentionNotifications(text);

    setTimeout(() => {
      sortingLocked = false;
      sortComments();
    }, 400);
    return true;

  } catch (err) {
    console.error("Gagal kirim komentar:", err);
    sortingLocked = false;
    return commentSaved;
  }
}

// ====================== DISABLE AUTHOR INPUT ======================
function resolveAuthorName() {
  try {
    if (typeof currentUser !== 'undefined' && currentUser) {
      const stats = (typeof userStatsCache !== 'undefined' && userStatsCache[currentUser.uid])
        ? userStatsCache[currentUser.uid]
        : null;
      const name = (stats && (stats.displayName || stats.username))
        || currentUser.displayName
        || localStorage.getItem('commentWidget_displayName')
        || localStorage.getItem('commentWidget_customUsername')
        || (currentUser.email ? currentUser.email.split('@')[0] : '')
        || 'Anonymous';
      return String(name).trim() || 'Anonymous';
    }
  } catch (e) {}

  const saved = localStorage.getItem('commentWidget_displayName')
    || localStorage.getItem('commentWidget_customUsername')
    || '';
  return (saved && saved.trim()) ? saved.trim() : 'Anonymous';
}

function disableAuthorInputForLoggedInUser() {
  const authorInput = document.getElementById('author');
  const lockIcon = document.querySelector('.lock-icon');
  const tooltip = document.querySelector('.custom-tooltip');
  const wrapper = document.querySelector('.input-lock-wrapper');

  if (!authorInput) return;

  const name = resolveAuthorName();

  if (typeof currentUser !== 'undefined' && currentUser) {

    if (!authorInput.value.trim() || authorInput.value.trim() === 'Anonymous' || authorInput.readOnly) {
      authorInput.value = name;
    } else if (name && name !== 'Anonymous') {

      authorInput.value = name;
    }

    authorInput.readOnly = true;
    authorInput.style.background = 'rgba(255,255,255,0.08)';
    authorInput.style.cursor = 'not-allowed';

    if (lockIcon) lockIcon.style.display = 'flex';
    if (tooltip) tooltip.style.display = 'block';
    if (wrapper) wrapper.style.paddingRight = '';
  } else {
    authorInput.readOnly = false;
    authorInput.style.background = '';
    authorInput.style.cursor = 'text';

    if (!authorInput.value.trim()) {
      authorInput.value = name;
    }

    if (lockIcon) lockIcon.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    if (wrapper) wrapper.style.paddingRight = '';
  }
}

function ensureAuthorFieldFilled() {
  const authorInput = document.getElementById('author');
  if (!authorInput) return;
  if (!authorInput.value || !authorInput.value.trim()) {
    authorInput.value = resolveAuthorName();
  }
}


window.addEventListener('load', () => {
  setTimeout(disableAuthorInputForLoggedInUser, 800);
});

const originalSignInSuccess = window.onAuthSuccess;

function attachPinListeners() {
  document.querySelectorAll('.pin-button').forEach(btn => {
    btn.onclick = async () => {
      if (!isCurrentUserAdmin()) return;

      const commentId = btn.dataset.commentId;
      if (!commentId) return;

      try {
        const commentRef = db
          .collection('comments')
          .doc(postId)
          .collection('postComments')
          .doc(commentId);

        const doc = await commentRef.get();
        if (!doc.exists) {
          alert("Komentar tidak ditemukan!");
          return;
        }

        const currentPinned = doc.data().pinned || false;

        await commentRef.update({
          pinned: !currentPinned,
          pinnedAt: !currentPinned ? firebase.firestore.FieldValue.serverTimestamp() : null
        });
        
        startRealtimeListener();

      } catch (err) {
        console.error("Pin error:", err);
        alert("Gagal pin komentar: " + err.message);
      }
    };
  });
}

function initEditPreviewListeners() {
  document.addEventListener("change", function(e){
    if(!e.target.matches(".edit-form .reply-image")) return;
    const file = e.target.files[0];
    if(!file) return;
    const form = e.target.closest(".edit-form");
    if(!form) return;
    const preview =
      form.querySelector(".edit-preview");
    const previewImg =
      form.querySelector(".edit-preview-img");
    const reader = new FileReader();
    
    reader.onload = function(ev){
      previewImg.src = ev.target.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(file);
  });

  document.addEventListener("click", function(e){
    if(!e.target.matches(".remove-edit-preview")) return;
    const form =
      e.target.closest(".edit-form");

    if(!form) return;

    form.querySelector(".edit-preview").style.display = "none";
    form.querySelector(".edit-preview-img").src = "";
    form.querySelector(".reply-image").value = "";
  });
}

initEditPreviewListeners();

    async function editComment(commentId, newText, newImage) {
      const ref = db.collection('comments').doc(postId).collection('postComments').doc(commentId);
      const update = { text: newText.trim(), date: firebase.firestore.FieldValue.serverTimestamp() };
      if (window.removeImageOnEdit) update.image = null;
      else if (newImage) update.image = newImage;
      try {
        await ref.update(update);
        delete window.removeImageOnEdit;
      } catch (e) {
        console.error('Gagal edit:', e);
        alert('Gagal edit: ' + e.message);
      }
    }

    async function deleteComment(commentId) {
  if (!commentId) return;

  if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
    return;
  }

  const commentRef = db.collection('comments')
    .doc(postId)
    .collection('postComments')
    .doc(commentId);

  try {
    await commentRef.delete();
    console.log("✅ Komentar berhasil dihapus");
  } catch (e) {
    console.error('Gagal delete:', e);
    if (e.code === 'permission-denied') {
      console.log("Permission error, tapi komentar biasanya sudah terhapus.");
    } else {
      alert('Gagal menghapus: ' + e.message);
    }
  }
}

document.addEventListener('click', (e) => {
  const delBtn = e.target.closest('.delete-button');
  if (!delBtn) return;

  const commentId = delBtn.dataset.commentId;
  if (!commentId) return;

  deleteComment(commentId);
});

function attachEditButtons() {

  document.querySelectorAll('.edit-button').forEach(btn => {

    btn.onclick = () => {

      const commentId =
        btn.dataset.commentId;

      showEditForm(commentId);
    };
  });
}

    function showEditForm(commentId) {
  document.querySelectorAll('.edit-form-container').forEach(el => {
    el.style.display = 'none';
  });

  const editContainer = document.getElementById(`edit-form-${commentId}`);
  if (!editContainer) {
    console.error("Edit container tidak ditemukan:", commentId);
    return;
  }

  db.collection('comments')
    .doc(postId)
    .collection('postComments')
    .doc(commentId)
    .get()
    .then(doc => {
      if (doc.exists) {
        const comment = doc.data();
        const textarea = editContainer.querySelector('.edit-text');
    
        let editText = comment.text || '';
        if (comment.quotedFrom) {
         
          editText = comment.text || '';
        } else {
      
          editText = editText.replace(/^(>\s*.*\n?)+/gm, '').trim();
        }
        textarea.value = editText;

        let quotePreview = editContainer.querySelector('.edit-quote-preview');
        if (comment.quotedFrom) {
          if (!quotePreview) {
            quotePreview = document.createElement('div');
            quotePreview.className = 'edit-quote-preview quote-block';
            quotePreview.style.cssText = 'margin-bottom:10px; pointer-events:none; user-select:none;';
            textarea.parentNode.insertBefore(quotePreview, textarea);
          }
          quotePreview.innerHTML = `
            <div class="quote-author">💬 @${(comment.quotedFrom.username || 'user').replace(/</g,'&lt;')}</div>
            <div style="font-style:italic; opacity:0.9;">${(comment.quotedFrom.text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          `;
          quotePreview.style.display = 'block';
        } else if (quotePreview) {
          quotePreview.style.display = 'none';
        }

        // Reset preview
        const previewContainer = editContainer.querySelector('.current-image-preview');
        if (previewContainer) {
          const previewImg = previewContainer.querySelector('img');
          if (comment.image && previewImg) {
            previewImg.src = comment.image;
            previewContainer.style.display = 'block';
          } else {
            previewContainer.style.display = 'none';
          }
        }

        editContainer.style.display = 'block';
        textarea.focus();
      } else {
        alert("Komentar tidak ditemukan");
      }
    })
    .catch(e => {
      console.error('Gagal load edit:', e);
      alert('Gagal membuka edit form');
    });
}

function resetAllReplyAuthorFields() {
  document.querySelectorAll('.reply-author').forEach(input => {

    let finalName = '';

    if (currentUser) {
      const stats = userStatsCache[currentUser.uid];

      if (stats?.displayName) {
        finalName = stats.displayName;
      } else if (stats?.username) {
        finalName = stats.username;
      }
    }

    if (!finalName) {
      finalName =
        localStorage.getItem('commentWidget_displayName') ||
        currentUser?.displayName ||
        'Anonymous';
    }

    input.value = finalName;
  });
}

    function attachReplyListeners() {
  document.querySelectorAll('.reply-button').forEach(btn => {
    btn.onclick = () => {
      const parentId = btn.dataset.commentId;
      const replyContainer = document.getElementById(`reply-form-${parentId}`);
      
      if (replyContainer) {
        document.querySelectorAll('.reply-form-container').forEach(el => el.style.display = 'none');
        replyContainer.style.display = 'block';

        const replyAuthorInput = replyContainer.querySelector('.reply-author');
        if (replyAuthorInput) {
          let displayName = 'Anonymous';

          if (currentUser) {
            const stats = userStatsCache[currentUser.uid];
            if (stats && stats.displayName) {
              displayName = stats.displayName;
            } else if (currentUser.displayName) {
              displayName = currentUser.displayName;
            } else {
              displayName = localStorage.getItem('commentWidget_displayName') || 'Anonymous';
            }
          } else {
            displayName = localStorage.getItem('commentWidget_displayName') || 'Anonymous';
          }

          replyAuthorInput.value = displayName || (typeof resolveAuthorName === 'function' ? resolveAuthorName() : 'Anonymous');
        }

        replyContainer.querySelector('.reply-text').focus();
      }
    };
  });
}

   function attachReplyFormListeners() {
  document.querySelectorAll('.reply-form').forEach(form => {

    form.onsubmit = null;

    const textarea = form.querySelector('.reply-text');
    const previewContainer = form.querySelector('.reply-preview');
    const previewImg = form.querySelector('.reply-preview-img');
    const removeBtn = form.querySelector('.remove-reply-preview');
    const fileInput = form.querySelector('.reply-image');

if (fileInput) {
  fileInput.addEventListener('change', function () {
    const file = this.files[0];

    if (file) {
      getBase64(file, base64 => {
        if (base64) {
          previewImg.src = base64;
          previewContainer.style.display = 'block';
          textarea.dataset.pastedImage = base64;
        }
      });
    }
  });
}

    textarea.addEventListener('paste', e =>
      handlePaste(e, textarea, previewContainer, previewImg, removeBtn)
    );

    form.onsubmit = async e => {

  e.preventDefault();

  if (commentsLoading) {
    alert('Komentar masih loading...');
    return;
  }

  if (form.dataset.submitting === "true") return;
      form.dataset.submitting = "true";

      const parentId = form.dataset.parentId;
      const authorInput = form.querySelector('.reply-author').value;
      const text = textarea.value.trim();

      if (!text || !parentId) {
        form.dataset.submitting = "false";
        return;
      }

      const sendReply = async (img) => {
        try {
          const saved = await addComment(authorInput, text, img, true, parentId);
          if (!saved) {
            alert('Komentar gagal dikirim. Silakan coba lagi.');
            return;
          }

          db.collection('comments')
            .doc(postId)
            .collection('postComments')
            .doc(parentId)
            .get()
            .then(doc => {
              if (doc.exists) {
                const parentComment = { id: doc.id, ...doc.data() };

                if (
                  currentUser &&
                  (parentComment.uid !== currentUser.uid || DEBUG_SELF_NOTIFICATION)
                ) {
                  addReplyNotification(parentComment, text);
                }
              }
            })
            .catch(err => console.error('Gagal ambil parent comment:', err));

          form.reset();
          textarea.dataset.pastedImage = '';
          previewContainer.style.display = 'none';
          form.closest('.reply-form-container').style.display = 'none';
        } finally {
          form.dataset.submitting = "false";
        }
      };

      if (textarea.dataset.pastedImage) {
        await sendReply(textarea.dataset.pastedImage);
        return;
      }
      const fileInput = form.querySelector('.reply-image');
      if (fileInput.files[0]) {
        try {
          const imageUrl = await uploadToImgBB(fileInput.files[0]);
          if (!imageUrl) return;
          await sendReply(imageUrl);
        } catch (error) {
          console.error('Gagal mengunggah gambar balasan:', error);
          alert('Gambar gagal diunggah. Silakan coba lagi.');
        } finally {
          form.dataset.submitting = "false";
        }
        return;
      }
      await sendReply(null);
    };

    form.querySelector('.cancel-reply').onclick = () => {
      form.closest('.reply-form-container').style.display = 'none';
      previewContainer.style.display = 'none';
      textarea.dataset.pastedImage = '';
    };

    if (removeBtn) {
      removeBtn.onclick = () => {
        previewContainer.style.display = 'none';
        textarea.dataset.pastedImage = '';
      };
    }
  });
}

    function attachEditFormListeners() {

  document.querySelectorAll('.edit-form').forEach(form => {

    const textarea =
      form.querySelector('.edit-text');
    const previewContainer =
      form.querySelector('.edit-preview');
    const previewImg =
      form.querySelector('.edit-preview-img');
    const removeBtn =
      form.querySelector('.remove-edit-preview');

    textarea.addEventListener('paste', e =>
      handlePaste(
        e,
        textarea,
        previewContainer,
        previewImg,
        removeBtn
      )
    );

    form.onsubmit = e => {

      e.preventDefault();

      const commentId =
        form.dataset.commentId;
      const text =
        textarea.value.trim();

      if (!text || !commentId) return;

      let image = null;

      if (textarea.dataset.pastedImage) {

        image = textarea.dataset.pastedImage;

      } else {

        const fileInput =
          form.querySelector('.reply-image');

        if (fileInput && fileInput.files[0]) {

          (async () => {
       const imageUrl =
         await uploadToImgBB(fileInput.files[0]);

       if (!imageUrl) return;
       editComment(commentId, text, imageUrl);
       form.reset();

            form.closest('.edit-form-container').style.display = 'none';
            document.getElementById('comment-form-container').style.display = 'block';
          });

          return;
        }
      }

      editComment(commentId, text, image);

      form.reset();

      textarea.dataset.pastedImage = '';
      previewContainer.style.display = 'none';
      form.closest('.edit-form-container').style.display = 'none';
      document.getElementById('comment-form-container').style.display = 'block';
    };

      form.querySelector('.cancel-edit').onclick = () => {
      form.closest('.edit-form-container').style.display = 'none';

      document.getElementById('comment-form-container').style.display = 'block';
      textarea.dataset.pastedImage = '';
    };

    if (removeBtn) {

      removeBtn.onclick = () => {

        previewContainer.style.display = 'none';
        textarea.dataset.pastedImage = '';
        form.querySelector('.reply-image').value = '';
        window.removeImageOnEdit = true;
      };
    }
  });
}


    document.getElementById('comment-form').onsubmit = async e => {

  e.preventDefault();

  if (commentsLoading) {
    alert('Komentar masih loading...');
    return;
  }

  let authorInput = document.getElementById('author').value;
  const text = document.getElementById('comment-text').value.trim();

  if (!text) return alert('Comment cannot be empty');

  // =========================
  // ANTI SPAM
  // =========================

  const now = Date.now();

  const spamKey =
    `comment_rate_${currentUser?.uid || 'guest'}`;

  const history = JSON.parse(
    localStorage.getItem(spamKey) || '[]'
  );

  const recent = history.filter(
    t => now - t < 60000
  );

  if (recent.length >= 5) {
    alert('Terlalu banyak komentar. Tunggu sebentar.');
    return;
  }

  const lastCommentKey = `last_comment_${currentUser?.uid || 'guest'}`;
  const lastComment =
    localStorage.getItem(lastCommentKey);

  if (
    lastComment &&
    lastComment.trim().toLowerCase() ===
    text.trim().toLowerCase()
  ) {
    alert('Komentar duplikat terdeteksi.');
    return;
  }

  if (/(.)\1{15,}/i.test(text)) {
    alert('Spam karakter terdeteksi.');
    return;
  }

  // =========================

      let image = null;
      const textarea = document.getElementById('comment-text');
      if (textarea.dataset.pastedImage) {
        image = textarea.dataset.pastedImage;
      } else {
        const fileInput = document.getElementById('comment-image');
        if (fileInput.files[0]) {
          (async () => {

       const imageUrl =
        await uploadToImgBB(fileInput.files[0]);
        if (!imageUrl) return;
        const saved = await addComment(authorInput, text, imageUrl);
        if (!saved) {
          alert('Komentar gagal dikirim. Silakan coba lagi.');
          return;
        }
        recent.push(now);
        localStorage.setItem(spamKey, JSON.stringify(recent));
        localStorage.setItem(lastCommentKey, text);
        e.target.reset();
        document.getElementById('author').value = authorInput;
        document.getElementById('comment-preview').style.display = 'none';
        textarea.dataset.pastedImage = '';
        })();
          return;
        }
      }

      const saved = await addComment(authorInput, text, image);
      if (!saved) {
        alert('Komentar gagal dikirim. Silakan coba lagi.');
        return;
      }
      recent.push(now);
      localStorage.setItem(spamKey, JSON.stringify(recent));
      localStorage.setItem(lastCommentKey, text);
      e.target.reset();
      document.getElementById('author').value = authorInput;
      document.getElementById('comment-preview').style.display = 'none';
      textarea.dataset.pastedImage = '';
    };

    document.getElementById('remove-comment-preview').onclick = () => {
      document.getElementById('comment-preview').style.display = 'none';
      document.getElementById('comment-text').dataset.pastedImage = '';
    };

const commentFileInput = document.getElementById('comment-image');
const commentTextarea = document.getElementById('comment-text');
const commentPreview = document.getElementById('comment-preview');
const commentPreviewImg = document.getElementById('comment-preview-img');

if (commentFileInput) {
  commentFileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      getBase64(file, base64 => {
        if (base64) {
          commentPreviewImg.src = base64;
          commentPreview.style.display = 'block';
          commentTextarea.dataset.pastedImage = base64;
        }
      });
    }
  });
}

    auth.onAuthStateChanged(user => {
  currentUser = user;

  if (unsubscribeUserStats) {
    unsubscribeUserStats();
    unsubscribeUserStats = null;
  }

  const mainAuthorInput = document.getElementById('author');

  if (user) {
    // ==================== LOGIN ====================
    console.log("✅ Logged in as:", user.email || user.displayName);

    let displayName = localStorage.getItem('commentWidget_displayName') || 
                     user.displayName || 
                     generateUsername(user) || 
                     "Anonymous";

     const mainAuthorInput = document.getElementById('author');

  if (!mainAuthorInput) return;

  if (user) {
    mainAuthorInput.value = displayName;
    mainAuthorInput.readOnly = true;
    mainAuthorInput.style.cursor = 'not-allowed';
    mainAuthorInput.style.background = 'rgba(255,255,255,0.08)';
  }

    const ref = db.collection('userStats').doc(user.uid);
    const generatedUsername = generateUsername(user);

    ref.get().then(async doc => {
  const accountCreated = firebase.firestore.Timestamp.fromDate(
  new Date(user.metadata.creationTime)
);

  if (!doc.exists) {
  await ref.set({
    commentCount: 0,
    username: generatedUsername,
    displayName: displayName,
    joinedAt: accountCreated,
    createdAt: accountCreated
  }, { merge: true });
} else {
  const data = doc.data() || {};

  const updates = {};

  if (!data.username) updates.username = generatedUsername;
  if (!data.displayName) updates.displayName = displayName;

  if (!data.joinedAt) {
    updates.joinedAt = accountCreated;
  }

  if (!data.createdAt) {
    updates.createdAt = accountCreated;
  }

  if (Object.keys(updates).length > 0) {
    await ref.set(updates, { merge: true });
  }
}

if (user) {

  const banDoc = await db
    .collection('bannedUsers')
    .doc(user.uid)
    .get();

  if (banDoc.exists && banDoc.data().active) {

    alert(
      "Akun Anda telah diblokir.\n\nAlasan: " +
      (banDoc.data().reason || "Tidak diketahui")
    );

    setFormDisabled(true);

    const form = document.getElementById("comment-form");

    if (form) {
      form.innerHTML = `
        <div style="
          padding:20px;
          border:2px solid #f44336;
          background:#fff3f3;
          color:#c62828;
          border-radius:8px;
          text-align:center;
        ">
          🚫 Akun ini telah diblokir
          <br><br>
          Alasan:
          <br>
          ${banDoc.data().reason || "-"}
        </div>
      `;
    }

    return;
  }
}

  userStatsCache[user.uid] = doc.exists ? doc.data() : {};
  listenUserStats(user.uid);
  updateUI();
  loadUserNotifications();
  updateTranscendentGear();
  refreshDMBadgeOnce();

}).catch(err => {
  console.error('Gagal load userStats:', err);
  updateUI();
});

  } else {
    // ==================== LOGOUT ====================
    console.log("👋 User logged out");

    const savedName = localStorage.getItem('commentWidget_displayName');

    if (mainAuthorInput) {
      mainAuthorInput.value = savedName || resolveAuthorName();
    }

    unreadReplies = 0;
    replyNotifications = [];
    if (typeof updateReplyBadge === 'function') updateReplyBadge();

    const gear = document.getElementById('transcendent-gear-auth');
    if (gear) gear.style.display = 'none';

    userStatsCache = {};
  }

  setupAuthorInputListener();
  attachMarkdownButtons();
  startRealtimeListener();

  updateUI();
  setupUserAvatarClick();
  resetAllReplyAuthorFields();
});

function updateTranscendentGear() {
  const gear = document.getElementById('transcendent-gear-auth');
  if (gear && currentUser) {
    gear.style.display = 'flex';
  }
}

function getVote(commentId) {
  return localStorage.getItem("vote_" + commentId);
}

function setVote(commentId, value) {
  if (value) {
    localStorage.setItem("vote_" + commentId, value);
  } else {
    localStorage.removeItem("vote_" + commentId);
  }
}

function hasLiked(commentId) {
  return localStorage.getItem("liked_" + commentId) === "1";
}

function setLiked(commentId) {
  localStorage.setItem("liked_" + commentId, "1");
}

async function likeClick(btn) {
  const commentEl = btn.closest('.comment');
  const commentId = commentEl.dataset.commentId;
  const dislikeBtn = commentEl.querySelector('.btn-dislike');
  const prev = getVote(commentId);
  const ref = db.collection('comments').doc(postId).collection('postComments').doc(commentId);

  let likes = Number(commentEl.dataset.likes || 0);
  let dislikes = Number(commentEl.dataset.dislikes || 0);
  let updateData = {};
  let pointsChange = 0;
  let reputationChange = 0;

  try {
    if (prev === "like") {
      // Un-like
      updateData.likes = firebase.firestore.FieldValue.increment(-1);
      likes--;
      setVote(commentId, null);
      btn.classList.remove("active");
      pointsChange = -5;
      reputationChange = -1;
    } else {
      // Like
      updateData.likes = firebase.firestore.FieldValue.increment(1);
      likes++;

      if (prev === "dislike") {
        updateData.dislikes = firebase.firestore.FieldValue.increment(-1);
        dislikes--;
        dislikeBtn.classList.remove("active");
        pointsChange = 6;
        reputationChange = 2;
      } else {
        pointsChange = 5;
        reputationChange = 1;
      }

      setVote(commentId, "like");
      btn.classList.add("active");
    }

    commentEl.dataset.likes = likes;
    commentEl.dataset.dislikes = dislikes;
    btn.dataset.count = likes;
    btn.innerHTML = `👍 ${likes}`;
    dislikeBtn.dataset.count = dislikes;
    dislikeBtn.innerHTML = `👎 ${dislikes}`;

    await ref.update(updateData);

    const snap = await ref.get();
    const commentData = snap.data();

    if (commentData?.uid && currentUser && commentData.uid !== currentUser.uid) {
      
      if (pointsChange !== 0) {
        await addUserPoints(commentData.uid, pointsChange);
      }

      if (reputationChange !== 0) {
        const userRef = db.collection("userStats").doc(commentData.uid);
        
        await userRef.set({
          reputation: firebase.firestore.FieldValue.increment(reputationChange),
          likesReceived: firebase.firestore.FieldValue.increment(
            reputationChange > 0 ? 1 : (reputationChange === -2 ? -1 : 0)
          ),
          dislikesReceived: firebase.firestore.FieldValue.increment(
            reputationChange < 0 ? 1 : (reputationChange === 2 ? -1 : 0)
          )
        }, { merge: true });
      }

      refreshUserStats(commentData.uid);
    }

    if (currentSort === "hot") sortComments();

  } catch (e) {
    console.error("Like error:", e);
  }
}

async function dislikeClick(btn) {
  const commentEl = btn.closest('.comment');
  const commentId = commentEl.dataset.commentId;
  const likeBtn = commentEl.querySelector('.btn-like');
  const prev = getVote(commentId);
  const ref = db.collection('comments').doc(postId).collection('postComments').doc(commentId);

  let likes = Number(commentEl.dataset.likes || 0);
  let dislikes = Number(commentEl.dataset.dislikes || 0);
  let updateData = {};
  let pointsChange = 0;
  let reputationChange = 0;

  try {
    if (prev === "dislike") {
      updateData.dislikes = firebase.firestore.FieldValue.increment(-1);
      dislikes--;
      setVote(commentId, null);
      btn.classList.remove("active");
      pointsChange = 1;
      reputationChange = -1;
    } else {

      updateData.dislikes = firebase.firestore.FieldValue.increment(1);
      dislikes++;

      if (prev === "like") {
        updateData.likes = firebase.firestore.FieldValue.increment(-1);
        likes--;
        likeBtn.classList.remove("active");
        pointsChange = -6;
        reputationChange = -2;
      } else {
        pointsChange = -1;
        reputationChange = -1;
      }

      setVote(commentId, "dislike");
      btn.classList.add("active");
    }

    commentEl.dataset.likes = likes;
    commentEl.dataset.dislikes = dislikes;
    likeBtn.dataset.count = likes;
    likeBtn.innerHTML = `👍 ${likes}`;
    btn.dataset.count = dislikes;
    btn.innerHTML = `👎 ${dislikes}`;

    await ref.update(updateData);

    const snap = await ref.get();
    const commentData = snap.data();

    if (commentData?.uid && currentUser && commentData.uid !== currentUser.uid) {
  if (pointsChange !== 0) {
    await addUserPoints(commentData.uid, pointsChange);
  }

  if (reputationChange !== 0) {
    const userRef = db.collection("userStats").doc(commentData.uid);
    
    await userRef.set({
      reputation: firebase.firestore.FieldValue.increment(reputationChange),
      likesReceived: firebase.firestore.FieldValue.increment(
        reputationChange > 0 ? 1 : (reputationChange < -1 ? -1 : 0)
      ),
      dislikesReceived: firebase.firestore.FieldValue.increment(
        reputationChange < 0 ? 1 : 0
      )
    }, { merge: true });
  }

  refreshUserStats(commentData.uid);
}

    if (currentSort === "hot") sortComments();

  } catch (e) {
    console.error("Dislike error:", e);
  }
}


async function refreshUserStats(uid) {
  if (!uid) return;
  
  try {
    const doc = await db.collection('userStats').doc(uid).get();
    if (doc.exists) {
      userStatsCache[uid] = doc.data();
      
      const data = doc.data();

userStatsCache[uid] = data;

window.currentProfileUser = {
  uid,
  displayName: data.displayName || 'Anonymous',
  avatar: data.avatar || ANONYMOUS_AVATAR
};
      
      const modal = document.getElementById('legacy-comment-profile-modal');
      if (modal && modal.style.display !== 'none') {
        showUserProfile(uid);
      }

      document.querySelectorAll(`[data-uid="${uid}"]`).forEach(el => {
        const badgeEl = el.querySelector('.badge');
        if (badgeEl) {
          const level = calculateLevel(userStatsCache[uid].points || 0);
          badgeEl.textContent = `Lv ${level}`;
        }
      });
    }
  } catch (e) {
    console.error("Refresh user stats failed:", e);
  }
}

function attachLikeDislikeListeners() {
  document.querySelectorAll('.btn-like').forEach(btn => {
    btn.onclick = () => likeClick(btn);
  });
  
  document.querySelectorAll('.btn-dislike').forEach(btn => {
    btn.onclick = () => dislikeClick(btn);
  });
}
    const authorInput = document.getElementById('author');
    if (authorInput && !currentUser) {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      authorInput.value = saved || 'Anonymous';
    }

    setupAuthorInputListener();

async function addUserPoints(uid, amount) {
  if (!uid || amount === 0) return;

  const ref = db.collection('userStats').doc(uid);
  
  try {
    await ref.set({
      points: firebase.firestore.FieldValue.increment(amount)
    }, { merge: true });

    // Update cache
    if (userStatsCache[uid]) {
      userStatsCache[uid].points = (userStatsCache[uid].points || 0) + amount;
    }

    console.log(`💰 Points updated: ${uid} ${amount > 0 ? '+' : ''}${amount}`);

    setTimeout(() => {
      const list = document.getElementById('comments-list');
      if (list) {
        startRealtimeListener();
      }
    }, 800);

  } catch (e) {
    console.error("addUserPoints failed:", e);
  }
}

    // ==================== MARKDOWN TOOLBAR HANDLER ====================
function insertMarkdown(textarea, type) {
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  let replacement = '';
  let cursorOffset = 0;
  
  switch (type) {
    case 'bold':   replacement = `**${selectedText || 'teks tebal'}**`; break;
    case 'italic': replacement = `*${selectedText || 'teks miring'}*`; break;
    case 'spoiler': replacement = `||${selectedText || 'spoiler'}||`; break;
    case 'link':
      replacement = `[${selectedText || 'teks'}](https://)`;
      cursorOffset = replacement.length - 1;
      break;
    case 'code':   replacement = selectedText ? `\`${selectedText}\`` : '`kode`'; break;
    case 'quote':  replacement = `> ${selectedText || 'kutipan'}`; break;
    case 'mention':
      replacement = '@';
      cursorOffset = 1;
      break;
      
    default: return;
  }
  
  textarea.value = 
    textarea.value.substring(0, start) + 
    replacement + 
    textarea.value.substring(end);
  
  const newPos = start + (type === 'link' ? cursorOffset : replacement.length);
  textarea.focus();
  textarea.setSelectionRange(newPos, newPos);
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.md-btn');
  if (!btn) return;
  
  let textarea = btn.closest('.comment-input-wrapper')?.querySelector('textarea') ||
                 btn.closest('.reply-input-wrapper')?.querySelector('textarea') ||
                 btn.closest('.edit-form')?.querySelector('textarea') ||
                 document.getElementById('comment-text');

  if (textarea) {
    insertMarkdown(textarea, btn.dataset.md);
  }
});

attachMarkdownButtons = function() { /* kosongkan yang lama */ };

const originalRenderComments = renderComments;
renderComments = function(comments) {
  originalRenderComments(comments);
  setTimeout(() => {
  }, 100);
};

const originalAttachReplyFormListeners = attachReplyFormListeners;
attachReplyFormListeners = function() {
  if (originalAttachReplyFormListeners) originalAttachReplyFormListeners();
};

function attachMarkdownButtons() {
  document.querySelectorAll('.md-btn').forEach(btn => {
    btn.removeEventListener('click', btn._markdownHandler);
    
    btn._markdownHandler = function() {
      let textarea = 
        btn.closest('.comment-input-wrapper')?.querySelector('textarea') ||
        btn.closest('.reply-input-wrapper')?.querySelector('textarea') ||
        document.getElementById('comment-text');

      if (textarea) {
        insertMarkdown(textarea, btn.dataset.md);
      }
    };

    btn.addEventListener('click', btn._markdownHandler);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachMarkdownButtons();
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.delete-button')) {
    setTimeout(() => {
      const list = document.getElementById('comments-list');
      if (list) updateUIAfterRender(list);
    }, 800);
  }
});

// ==================== REPORT MODAL ====================
let currentReportCommentId = null;
let currentReportedUid = "";
let currentReportedName = "";
let currentReportedUsername = "";

function showReportModal(commentId) {
  window.loadCommentFeatureStyles?.('report');
  currentReportCommentId = commentId;

  let modal = document.getElementById('report-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'report-modal';
    modal.innerHTML = `
      <div id="report-modal-content">
        <h3>🚩 Laporkan Komentar</h3>
        <p style="text-align:center; color:#aaa; margin-bottom:20px;">Pilih alasan pelaporan</p>
        
        <div class="report-option" data-reason="Spam">Spam / Iklan</div>
        <div class="report-option" data-reason="Out of Topics">Out of Topics</div>
        <div class="report-option" data-reason="Penghinaan / Bullying">Penghinaan / Bullying</div>
        <div class="report-option" data-reason="Hoax / Misinformasi">Hoax / Misinformasi</div>
        <div class="report-option" data-reason="Lainnya">Lainnya</div>

        <input type="text" id="report-reason-other" placeholder="Jelaskan lebih detail (opsional)" style="display:none;">

        <div class="report-actions">
          <button id="report-cancel">Batal</button>
          <button id="report-submit">Kirim Laporan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';

  // Event listeners
  document.querySelectorAll('.report-option').forEach(opt => {
    opt.onclick = () => {
      document.querySelectorAll('.report-option').forEach(o => o.style.borderColor = '#444');
      opt.style.borderColor = '#ff5252';

      const otherInput = document.getElementById('report-reason-other');
      if (opt.dataset.reason === "Lainnya") {
        otherInput.style.display = 'block';
        otherInput.focus();
      } else {
        otherInput.style.display = 'none';
      }
    };
  });

  document.getElementById('report-cancel').onclick = () => {
    modal.style.display = 'none';
  };

  document.getElementById('report-submit').onclick = () => {
    submitReport();
  };
}

async function submitReport() {
  const selected = document.querySelector(
    '.report-option[style*="border-color: rgb(255, 82, 82)"]'
  );

  let reason =
    selected
      ? selected.dataset.reason
      : null;

  const otherReason =
    document
      .getElementById('report-reason-other')
      .value
      .trim();

  if (!reason) {
    alert("Pilih salah satu alasan!");
    return;
  }

  if (reason === "Lainnya" && !otherReason) {
    alert("Mohon jelaskan alasan lainnya.");
    return;
  }

  if (reason === "Lainnya") {
    reason = otherReason;
  }

  if (!currentUser) {
    alert("Harap login terlebih dahulu.");
    return;
  }

  try {

    const userStatsDoc = await db
      .collection('userStats')
      .doc(currentUser.uid)
      .get();

    const stats =
      userStatsDoc.exists
        ? userStatsDoc.data()
        : {};

    const reporterName =
      stats.displayName ||
      stats.username ||
      currentUser.displayName ||
      currentUser.email ||
      "Anonymous";

    await db.collection('reports').add({
  commentId: currentReportCommentId,
  postId: postId,

  reporterUid: currentUser.uid,
  reporterName: reporterName,
  reporterUsername: stats.username || "",

  reportedUid: currentReportedUid,
  reportedName: currentReportedName,

  commentLink:
    window.location.href +
    "#comment-" +
    currentReportCommentId,

  reason: reason,

  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  status: "pending"
});

    document.getElementById(
      'report-modal'
    ).style.display = 'none';

    alert(
      "✅ Laporan berhasil dikirim. Terima kasih atas kontribusinya!"
    );

  } catch (e) {

    console.error(e);

    alert(
      "Gagal mengirim laporan."
    );
  }
}

function attachReportListeners() {
  console.log('renderGameRolesPicker called');
  document.querySelectorAll('.report-button').forEach(btn => {
    btn.onclick = () => {
      const commentId = btn.dataset.commentId;
      if (commentId) showReportModal(commentId);
    };
  });
}

function renderGameRolesPicker() {
  const container = document.getElementById('game-roles-picker');
  if (!container) {
    console.warn('game-roles-picker container tidak ditemukan');
    return;
  }

  container.innerHTML = '';

  GAME_ROLES.forEach((role, index) => {
    const div = document.createElement('div');
    div.className = 'game-role-option';
    div.style.cssText = `
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      transition: all 0.2s;
      user-select: none;
    `;
    div.innerHTML = `
      <span style="font-size:1.2em;">${role.icon}</span>
      <span>${role.name}</span>
    `;

    div.onclick = () => {
      div.classList.toggle('selected');
      if (div.classList.contains('selected')) {
        div.style.borderColor = role.color;
        div.style.background = `rgba(167,139,250,0.25)`;
        div.style.color = '#fff';
      } else {
        div.style.borderColor = 'transparent';
        div.style.background = 'rgba(255,255,255,0.08)';
        div.style.color = '';
      }
    };

    container.appendChild(div);
  });

  console.log('✅ renderGameRolesPicker selesai, total roles:', GAME_ROLES.length);
}

// ==================== GAME ROLES ====================
const GAME_ROLES = [
  // HoYoverse
  { id: "genshin", name: "Genshin Impact", icon: "🌟", color: "#a78bfa" },
  { id: "honkai-star-rail", name: "Honkai: Star Rail", icon: "🚂", color: "#c084fc" },
  { id: "zenless-zone-zero", name: "Zenless Zone Zero", icon: "🦾", color: "#22d3ee" },

  // Anime / Gacha
  { id: "azur-lane", name: "Azur Lane", icon: "⚓", color: "#60a5fa" },
  { id: "blue-archive", name: "Blue Archive", icon: "📖", color: "#f472b6" },
  { id: "nikke", name: "Goddess of Victory: Nikke", icon: "🔫", color: "#f59e0b" },
  { id: "arknights", name: "Arknights", icon: "🛡️", color: "#64748b" },
  { id: "punishing-gray-raven", name: "Punishing: Gray Raven", icon: "⚔️", color: "#ef4444" },
  { id: "wuthering-waves", name: "Wuthering Waves", icon: "🌊", color: "#4ade80" },
  { id: "tower-of-fantasy", name: "Tower of Fantasy", icon: "🌌", color: "#8b5cf6" },

  // MOBA
  { id: "mobile-legends", name: "Mobile Legends", icon: "🛡️", color: "#3b82f6" },
  { id: "league-of-legends", name: "League of Legends", icon: "⚔️", color: "#f59e0b" },
  { id: "wild-rift", name: "League of Legends: Wild Rift", icon: "💎", color: "#06b6d4" },
  { id: "dota-2", name: "Dota 2", icon: "🔥", color: "#ef4444" },

  // FPS / Shooter
  { id: "valorant", name: "Valorant", icon: "🎯", color: "#f43f5e" },
  { id: "counter-strike-2", name: "Counter-Strike 2", icon: "💣", color: "#f97316" },
  { id: "call-of-duty", name: "Call of Duty", icon: "🔫", color: "#eab308" },
  { id: "warzone", name: "Warzone", icon: "☠️", color: "#84cc16" },
  { id: "apex-legends", name: "Apex Legends", icon: "🏹", color: "#ef4444" },
  { id: "overwatch-2", name: "Overwatch 2", icon: "🦸", color: "#fb923c" },
  { id: "rainbow-six-siege", name: "Rainbow Six Siege", icon: "🚔", color: "#64748b" },

  // Battle Royale
  { id: "pubg", name: "PUBG", icon: "🍗", color: "#f59e0b" },
  { id: "free-fire", name: "Free Fire", icon: "🔥", color: "#f97316" },
  { id: "fortnite", name: "Fortnite", icon: "🏗️", color: "#22c55e" },

  // Sandbox / Survival
  { id: "minecraft", name: "Minecraft", icon: "⛏️", color: "#22c55e" },
  { id: "terraria", name: "Terraria", icon: "🌳", color: "#84cc16" },
  { id: "roblox", name: "Roblox", icon: "🧱", color: "#ef4444" },
  { id: "palworld", name: "Palworld", icon: "🐾", color: "#06b6d4" },

  // RPG
  { id: "elden-ring", name: "Elden Ring", icon: "👑", color: "#eab308" },
  { id: "dark-souls", name: "Dark Souls", icon: "🔥", color: "#dc2626" },
  { id: "monster-hunter", name: "Monster Hunter", icon: "🐉", color: "#16a34a" },
  { id: "final-fantasy-xiv", name: "Final Fantasy XIV", icon: "✨", color: "#8b5cf6" },
  { id: "skyrim", name: "Skyrim", icon: "🐲", color: "#94a3b8" },
  { id: "the-witcher-3", name: "The Witcher 3", icon: "🐺", color: "#ef4444" },

  // MMORPG
  { id: "world-of-warcraft", name: "World of Warcraft", icon: "🌍", color: "#f59e0b" },
  { id: "black-desert", name: "Black Desert Online", icon: "🏜️", color: "#64748b" },
  { id: "runescape", name: "RuneScape", icon: "⚒️", color: "#ca8a04" },

  // Racing
  { id: "forza-horizon-5", name: "Forza Horizon 5", icon: "🏎️", color: "#f97316" },
  { id: "gran-turismo-7", name: "Gran Turismo 7", icon: "🚗", color: "#3b82f6" },
  { id: "need-for-speed", name: "Need for Speed", icon: "🚓", color: "#ef4444" },

  // Sports
  { id: "ea-fc-26", name: "EA Sports FC", icon: "⚽", color: "#22c55e" },
  { id: "nba-2k", name: "NBA 2K", icon: "🏀", color: "#f97316" },

  // Horror
  { id: "resident-evil", name: "Resident Evil", icon: "🧟", color: "#dc2626" },
  { id: "dead-by-daylight", name: "Dead by Daylight", icon: "🪝", color: "#9333ea" },
  { id: "silent-hill", name: "Silent Hill", icon: "🌫️", color: "#64748b" },

  // Nintendo
  { id: "pokemon", name: "Pokémon", icon: "⚡", color: "#eab308" },
  { id: "zelda", name: "The Legend of Zelda", icon: "🗡️", color: "#22c55e" },
  { id: "mario", name: "Super Mario", icon: "🍄", color: "#ef4444" },

  // Fighting
  { id: "tekken-8", name: "Tekken 8", icon: "🥊", color: "#ef4444" },
  { id: "street-fighter-6", name: "Street Fighter 6", icon: "👊", color: "#f97316" },
  { id: "mortal-kombat-1", name: "Mortal Kombat 1", icon: "🐉", color: "#dc2626" },

  // Indie
  { id: "hollow-knight", name: "Hollow Knight", icon: "🪲", color: "#94a3b8" },
  { id: "stardew-valley", name: "Stardew Valley", icon: "🌾", color: "#22c55e" },
  { id: "among-us", name: "Among Us", icon: "🚀", color: "#f43f5e" }
];

// ==================== CUSTOM BADGE EXPAND ====================
const BADGES = [
  { id: "", text: "None", style: "background:#2a2a2a; color:#ddd;" },
  { id: "milf", text: "Milf Lover", style: "background:linear-gradient(45deg,#ff4d6d,#ff8fab); color:white;" },
  { id: "horny", text: "Team Horny", style: "background:linear-gradient(45deg,#ff7b00,#ffcc00); color:#111;" },
  { id: "night-owl", text: "Night Owl", style: "background:linear-gradient(90deg,#2a1b4a,#6b46c1); color:#e0bbff;" },
  { id: "chaos-entity", text: "Chaos Entity", style: "background:linear-gradient(45deg,#ff0066,#8b00ff,#ff00cc); color:white;" },
  { id: "yandere-energy", text: "Yandere Energy", style: "background:linear-gradient(90deg,#ff1493,#ff69b4); color:white;" },
  { id: "cultured", text: "Cultured", style: "background:linear-gradient(90deg,#d4af37,#ffd700); color:#2c1e0f;" },
  { id: "npc", text: "NPC", style: "background:#555555; color:#aaffaa; border:1px solid #00ff00;" },
  { id: "lore-master", text: "Lore Master", style: "background:linear-gradient(90deg,#4a2c0b,#8b5a2b); color:#ffdd88;" },
  { id: "touch-grass", text: "Touch Grass", style: "background:linear-gradient(90deg,#228b22,#32cd32); color:white;" },
  { id: "gremlin", text: "Gremlin", style: "background:linear-gradient(45deg,#00ff66,#39ff14); color:black;" },
  { id: "certified-degenerate", text: "Certified Degenerate", style: "background:linear-gradient(90deg,#8b0000,#ff4500); color:#ffff00;" },
  { id: "waifu-collector", text: "Waifu Collector", style: "background:linear-gradient(45deg,#ff69b4,#ff1493,#db7093); color:white;" },
  { id: "manga-addict", text: "Manga Addict", style: "background:linear-gradient(90deg,#9b59b6,#8e44ad); color:white;" },
  { id: "sleep-deprived", text: "Sleep Deprived", style: "background:linear-gradient(90deg,#191970,#4169e1); color:#aaccff;" },
  { id: "horny-jail-escapee", text: "Horny Jail Escapee", style: "background:linear-gradient(45deg,#ff00aa,#ff0088); color:white;" },
  { id: "elite-reader", text: "Elite Reader", style: "background:linear-gradient(90deg,#00bfff,#1e90ff); color:white;" },
  { id: "keyboard-warrior", text: "Keyboard Warrior", style: "background:linear-gradient(90deg,#ff4500,#ff8c00); color:white;" },
  { id: "dungeon-master", text: "Dungeon Master", style: "background:linear-gradient(45deg,#4b0082,#8a2be2); color:#e0b0ff;" },
  { id: "gacha-victim", text: "Gacha Victim", style: "background:linear-gradient(90deg,#ff00ff,#00ffff,#ffff00); color:black;" },
  { id: "onee-san-hunter", text: "Onee-san Hunter", style: "background:linear-gradient(90deg,#ff69b4,#ff1493); color:white;" },
  { id: "tsundere", text: "Tsundere", style: "background:linear-gradient(90deg,#ff3333,#ff9999); color:white;" },
  { id: "baka-squad", text: "Baka Squad", style: "background:linear-gradient(45deg,#ffcc00,#ff8800); color:black;" },
  { id: "void-walker", text: "Void Walker", style: "background:linear-gradient(90deg,#1a0033,#4b0082); color:#bb99ff;" },
  { id: "brain-not-found", text: "404 Brain Not Found", style: "background:#111111; color:#ff3366; border:1px dashed #ff3366;" },
  { id: "professional-lurker", text: "Professional Lurker", style: "background:linear-gradient(90deg,#2f2f2f,#555555); color:#aaaaaa;" },
  { id: "cosmic-simp", text: "Cosmic Simp", style: "background:linear-gradient(45deg,#00ffff,#ff00ff,#ffff00); color:black;" },
  { id: "schizo-poster", text: "Schizo Poster", style: "background:linear-gradient(45deg,#6b21a8,#a855f7,#c026d3); color:white;" },
  { id: "doomer", text: "Doomer", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#94a3b8; border:1px dashed #64748b;" },
  { id: "coomer", text: "Coomer", style: "background:linear-gradient(45deg,#db2777,#f472b6); color:white;" },
  { id: "terminally-online", text: "Terminally Online", style: "background:linear-gradient(90deg,#1f2937,#4b5563); color:#e2e8f0;" },
  { id: "egirl-hunter", text: "E-girl Hunter", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#db2777); color:white;" },
  { id: "chuuni", text: "Chuuni", style: "background:linear-gradient(135deg,#7c3aed,#a855f7,#c084fc); color:white;" },
  { id: "neet-lord", text: "NEET Lord", style: "background:linear-gradient(90deg,#334155,#475569); color:#cbd5e1; border:1px solid #64748b;" },
  { id: "incognito-degen", text: "Incognito Degenerate", style: "background:linear-gradient(45deg,#4f46e5,#6366f1); color:white;" },
  { id: "rage-baiter", text: "Rage Baiter", style: "background:linear-gradient(90deg,#b91c1c,#ef4444); color:white;" },
  { id: "shipper-supreme", text: "Shipper Supreme", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6); color:white;" },
  { id: "lurker-god", text: "Lurker God", style: "background:linear-gradient(90deg,#1e2937,#334155,#475569); color:#94a3b8;" },
  { id: "menhera", text: "Menhera", style: "background:linear-gradient(45deg,#db2777,#e11d48); color:white;" },
  { id: "power-bottom", text: "Power Bottom", style: "background:linear-gradient(45deg,#7e22ce,#a855f7); color:white;" },
  { id: "salaryman-slave", text: "Salaryman Slave", style: "background:linear-gradient(90deg,#374151,#4b5563); color:#9ca3af;" },
  { id: "isekai-protagonist", text: "Isekai Protagonist", style: "background:linear-gradient(45deg,#eab308,#f59e0b); color:#1f2937;" },
  { id: "trash-taste", text: "Trash Taste Enjoyer", style: "background:linear-gradient(90deg,#854d0e,#b45309); color:#fef3c7;" },
  { id: "paradox-simp", text: "Paradoxical Simp", style: "background:linear-gradient(45deg,#ec4899,#6366f1); color:white;" },
  { id: "fourchan-refugee", text: "4chan Refugee", style: "background:linear-gradient(90deg,#111827,#1f2937); color:#9ca3af; border:1px dashed #6b7280;" },
  { id: "cope-enjoyer", text: "Cope Enjoyer", style: "background:linear-gradient(45deg,#854d0e,#b45309); color:#fef3c7;" },
  { id: "seethe-lord", text: "Seethe Lord", style: "background:linear-gradient(90deg,#b91c1c,#ef4444); color:white;" },
  { id: "ratio-touch-grass", text: "Ratio + Touch Grass", style: "background:linear-gradient(90deg,#166534,#4ade80); color:#052e16;" },
  { id: "based-department", text: "Based Department", style: "background:linear-gradient(45deg,#15803d,#22c55e); color:white;" },
  { id: "cringe-overlord", text: "Cringe Overlord", style: "background:linear-gradient(90deg,#7f1d1d,#ef4444); color:#fecaca;" },
  { id: "malding-champion", text: "Malding Champion", style: "background:linear-gradient(45deg,#991b1b,#f87171); color:white;" },
  { id: "hikikomori-emperor", text: "Hikikomori Emperor", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#cbd5e1; border:1px dashed #64748b;" },
  { id: "yabai-energy", text: "Yabai Energy", style: "background:linear-gradient(45deg,#c026d3,#db2777); color:white;" },
  { id: "sugoi-desu", text: "Sugoi Desu", style: "background:linear-gradient(90deg,#ec4899,#f472b6); color:white;" },
  { id: "ara-ara-enjoyer", text: "Ara Ara Enjoyer", style: "background:linear-gradient(45deg,#9f1239,#e11d48); color:white;" },
  { id: "onii-chan-protector", text: "Onii-chan Protector", style: "background:linear-gradient(90deg,#7e22ce,#a855f7); color:white;" },
  { id: "imouto-collector", text: "Imouto Collector", style: "background:linear-gradient(45deg,#db2777,#f472b6); color:white;" },
  { id: "genshin-addict", text: "Genshin Addict", style: "background:linear-gradient(90deg,#854d0e,#eab308); color:#451a03;" },
  { id: "fomo-victim", text: "FOMO Victim", style: "background:linear-gradient(45deg,#4338ca,#6366f1); color:white;" },
  { id: "doom-scroller", text: "Doom Scroller", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#94a3b8;" },
  { id: "reply-guy", text: "Reply Guy", style: "background:linear-gradient(45deg,#854d0e,#ca8a04); color:white;" },
  { id: "main-character-syndrome", text: "Main Character Syndrome", style: "background:linear-gradient(90deg,#7c3aed,#a855f7); color:white;" },
  { id: "final-boss-of-simping", text: "Final Boss of Simping", style: "background:linear-gradient(45deg,#9f1239,#ec4899,#db2777); color:white;" },
  { id: "weeb-supreme", text: "Weeb Supreme", style: "background:linear-gradient(45deg,#ff00ff,#00ffff,#ffff00); color:#000;" },
  { id: "otaku-overlord", text: "Otaku Overlord", style: "background:linear-gradient(90deg,#6b46c1,#9f7aea,#c4b5fd); color:#fff;" },
  { id: "waifu-defender", text: "Waifu Defender", style: "background:linear-gradient(45deg,#ff69b4,#ff1493,#db2777); color:#fff;" },
  { id: "two-d-only", text: "2D Only", style: "background:#1a0033; color:#bb99ff; border:2px dashed #c084fc;" },
  { id: "isekai-veteran", text: "Isekai Veteran", style: "background:linear-gradient(45deg,#eab308,#f59e0b,#fcd34d); color:#1f2937;" },
  { id: "senpai-noticer", text: "Senpai Noticer", style: "background:linear-gradient(90deg,#ff3366,#ff6699); color:#fff;" },
  { id: "ara-ara-collector", text: "Ara Ara Collector", style: "background:linear-gradient(45deg,#9f1239,#e11d48); color:#fff;" },
  { id: "light-novel-degen", text: "Light Novel Degenerate", style: "background:linear-gradient(90deg,#4a2c0b,#8b5a2b); color:#ffdd88;" },
  { id: "chuuni-lord", text: "Chuuni Lord", style: "background:linear-gradient(135deg,#7c3aed,#a855f7,#c026d3); color:#fff;" },
  { id: "trap-connoisseur", text: "Trap Connoisseur", style: "background:linear-gradient(45deg,#ff00aa,#ff66cc); color:#fff;" },
  { id: "yuri-enjoyer", text: "Yuri Enjoyer", style: "background:linear-gradient(90deg,#db2777,#f472b6); color:#fff;" },
  { id: "kawaii-overlord", text: "Kawaii Overlord", style: "background:linear-gradient(45deg,#ff99cc,#ff66aa); color:#000;" },
  { id: "hololive-simp", text: "Hololive Simp", style: "background:linear-gradient(45deg,#22d3ee,#67e8f9); color:#000;" },
  { id: "visual-novel-addict", text: "Visual Novel Addict", style: "background:linear-gradient(45deg,#7c3aed,#c084fc); color:white;" },
  { id: "mecha-pilot", text: "Mecha Pilot", style: "background:linear-gradient(90deg,#0f172a,#334155,#64748b); color:#e2e8f0;" },
  { id: "figurine-hoarder", text: "Figurine Hoarder", style: "background:linear-gradient(45deg,#f59e0b,#fcd34d,#fde68a); color:#422006;" },
  { id: "anime-onahole", text: "Anime Onahole", style: "background:linear-gradient(45deg,#db2777,#ff66cc,#f9a8d4); color:white;" },
  { id: "raid-boss", text: "Raid Boss", style: "background:linear-gradient(45deg,#991b1b,#dc2626,#f87171); color:white;" },
  { id: "anime-speedrunner", text: "Anime Speedrunner", style: "background:linear-gradient(90deg,#2563eb,#38bdf8); color:white;" },
  { id: "isekai-truck-victim", text: "Truck-kun Victim", style: "background:linear-gradient(45deg,#f59e0b,#facc15,#fde047); color:#111;" },
  { id: "vtuber-rabbit-hole", text: "VTuber Rabbit Hole", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6,#22d3ee); color:white;" },
  { id: "wifi-warrior", text: "WiFi Warrior", style: "background:linear-gradient(90deg,#0f172a,#2563eb); color:#dbeafe;" },
  { id: "ranked-demon", text: "Ranked Demon", style: "background:linear-gradient(45deg,#7f1d1d,#dc2626,#f87171); color:white;" },
  { id: "afk-legend", text: "AFK Legend", style: "background:linear-gradient(90deg,#374151,#6b7280); color:#f3f4f6;" },
  { id: "loot-goblin", text: "Loot Goblin", style: "background:linear-gradient(45deg,#22c55e,#84cc16,#facc15); color:#111;" },
  { id: "fps-sweat", text: "FPS Sweat", style: "background:linear-gradient(90deg,#111827,#1d4ed8); color:#dbeafe;" },
  { id: "combo-dropper", text: "Combo Dropper", style: "background:linear-gradient(45deg,#f97316,#fb7185); color:white;" },
  { id: "maid-cafe-regular", text: "Maid Cafe Regular", style: "background:linear-gradient(45deg,#f9a8d4,#f472b6,#ec4899); color:white;" },
  { id: "goblin-mode", text: "Goblin Mode", style: "background:linear-gradient(45deg,#166534,#22c55e,#4ade80); color:white;" },
  { id: "anime-marathoner", text: "Anime Marathoner", style: "background:linear-gradient(90deg,#7c3aed,#c084fc); color:white;" },
  { id: "patch-note-reader", text: "Patch Note Reader", style: "background:linear-gradient(90deg,#0f172a,#334155,#475569); color:#e2e8f0;" },
  { id: "boss-music-enjoyer", text: "Boss Music Enjoyer", style: "background:linear-gradient(45deg,#7e22ce,#c026d3,#ec4899); color:white;" },
  { id: "daily-quest-slave", text: "Daily Quest Slave", style: "background:linear-gradient(90deg,#92400e,#ca8a04,#facc15); color:#111;" },
  { id: "ping-999", text: "Ping 999", style: "background:linear-gradient(90deg,#991b1b,#ef4444); color:white;" },
  { id: "anime-ending-destroyed-me", text: "Ending Destroyed Me", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "waifu-meta-abuser", text: "Waifu Meta Abuser", style: "background:linear-gradient(45deg,#ff1493,#ec4899,#f472b6); color:white;" },
  { id: "controller-thrower", text: "Controller Thrower", style: "background:linear-gradient(90deg,#7f1d1d,#dc2626); color:white;" },
  { id: "opening-skipper", text: "Opening Skipper", style: "background:linear-gradient(90deg,#334155,#64748b); color:#f8fafc;" },
  { id: "ending-enjoyer", text: "Ending Enjoyer", style: "background:linear-gradient(45deg,#1d4ed8,#7c3aed,#ec4899); color:white;" },
  { id: "gacha-god", text: "Gacha God", style: "background:linear-gradient(45deg,#facc15,#22d3ee,#ec4899,#facc15); color:#111;" },
  { id: "skill-issue", text: "Skill Issue", style: "background:linear-gradient(90deg,#111827,#ef4444); color:white;" },
  { id: "anime-ost-addict", text: "OST Addict", style: "background:linear-gradient(45deg,#4f46e5,#9333ea,#ec4899); color:white;" },
  { id: "last-online-3am", text: "Last Online 3AM", style: "background:linear-gradient(90deg,#0f172a,#312e81); color:#c7d2fe;" },
  { id: "npc-dialogue-skipper", text: "Dialogue Skipper", style: "background:linear-gradient(90deg,#4b5563,#9ca3af); color:#111;" },
  { id: "cutscene-enjoyer", text: "Cutscene Enjoyer", style: "background:linear-gradient(45deg,#2563eb,#7c3aed); color:white;" },
  { id: "voice-actor-enjoyer", text: "Seiyuu Enjoyer", style: "background:linear-gradient(45deg,#db2777,#8b5cf6); color:white;" },
  { id: "achaaan", text: "Nyaa~", style: "background:linear-gradient(45deg,#f9a8d4,#f472b6,#fbcfe8); color:#111;" },
  { id: "white-hair-enjoyer", text: "White Hair Enjoyer", style: "background:linear-gradient(45deg,#dbeafe,#cbd5e1,#f8fafc); color:#111;" },
  { id: "silver-hair-simp", text: "Silver Hair Simp", style: "background:linear-gradient(45deg,#94a3b8,#e2e8f0,#cbd5e1); color:#111;" },
  { id: "twin-tail-lover", text: "Twintail Lover", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#f9a8d4); color:white;" },
  { id: "kuudere-enjoyer", text: "Kuudere Enjoyer", style: "background:linear-gradient(90deg,#60a5fa,#2563eb); color:white;" },
  { id: "gyaru-enjoyer", text: "Gyaru Enjoyer", style: "background:linear-gradient(45deg,#fb7185,#f59e0b,#fde047); color:#111;" },
  { id: "glasses-supremacy", text: "Glasses Supremacy", style: "background:linear-gradient(90deg,#334155,#64748b); color:#f8fafc;" },
  { id: "short-hair-propaganda", text: "Short Hair Propaganda", style: "background:linear-gradient(45deg,#7c3aed,#a855f7); color:white;" },
  { id: "long-hair-cult", text: "Long Hair Cult", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "catgirl-enjoyer", text: "Catgirl Enjoyer", style: "background:linear-gradient(45deg,#f472b6,#ec4899,#db2777); color:white;" },
  { id: "fox-girl-follower", text: "Fox Girl Follower", style: "background:linear-gradient(45deg,#f97316,#fb923c,#fdba74); color:#111;" },
  { id: "maid-enjoyer", text: "Maid Enjoyer", style: "background:linear-gradient(45deg,#111827,#374151,#9ca3af); color:white;" },
  { id: "goth-girl-enjoyer", text: "Goth Girl Enjoyer", style: "background:linear-gradient(45deg,#111827,#4c1d95,#7c3aed); color:#e9d5ff;" },
  { id: "muscle-waifu-appreciator", text: "Muscle Waifu Appreciator", style: "background:linear-gradient(45deg,#b91c1c,#ef4444,#f87171); color:white;" },
  { id: "hoodie-waifu-enjoyer", text: "Hoodie Waifu Enjoyer", style: "background:linear-gradient(90deg,#1e2937,#475569); color:#f1f5f9;" },
  { id: "fang-lover", text: "Fang Lover", style: "background:linear-gradient(45deg,#ec4899,#ef4444); color:white;" },
  { id: "thigh-high-supremacy", text: "Thigh High Supremacy", style: "background:linear-gradient(45deg,#7c3aed,#ec4899); color:white;" },
  { id: "office-lady-enjoyer", text: "Office Lady Enjoyer", style: "background:linear-gradient(45deg,#374151,#6b7280,#9ca3af); color:white;" },
  { id: "dark-elf-believer", text: "Dark Elf Believer", style: "background:linear-gradient(45deg,#166534,#7c3aed,#111827); color:#f8fafc;" },
  { id: "school-uniform-lover", text: "Uniform Aesthetic", style: "background:linear-gradient(45deg,#2563eb,#60a5fa,#dbeafe); color:#111;" },
  { id: "red-eyes-enjoyer", text: "Red Eyes Enjoyer", style: "background:linear-gradient(45deg,#7f1d1d,#dc2626,#f87171); color:white;" },
  { id: "flat-is-justice", text: "Flat Is Justice", style: "background:linear-gradient(45deg,#60a5fa,#a5b4fc,#c4b5fd); color:#111;" },
  { id: "medium-is-premium", text: "Medium Is Premium", style: "background:linear-gradient(45deg,#f472b6,#fb7185,#fda4af); color:white;" },
  { id: "oppai-enjoyer", text: "Oppai Enjoyer", style: "background:linear-gradient(45deg,#ec4899,#db2777,#be185d); color:white;" },
  { id: "boing-boing-energy", text: "Boing Boing Energy", style: "background:linear-gradient(45deg,#f59e0b,#f97316,#ef4444); color:white;" },
  { id: "petite-supremacy", text: "Petite Supremacy", style: "background:linear-gradient(45deg,#67e8f9,#a5f3fc,#dbeafe); color:#111;" },
  { id: "balanced-build", text: "Balanced Build", style: "background:linear-gradient(45deg,#8b5cf6,#c084fc,#e9d5ff); color:#111;" },
  { id: "anime-physics-believer", text: "Anime Physics", style: "background:linear-gradient(45deg,#f43f5e,#ec4899,#8b5cf6); color:white;" },
  { id: "isekai-enjoyer", text: "Isekai Enjoyer", style: "background:linear-gradient(45deg,#f59e0b,#fde047,#facc15); color:#111;" },
  { id: "romcom-addict", text: "RomCom Addict", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#f9a8d4); color:white;" },
  { id: "slice-of-life-soul", text: "Slice of Life Soul", style: "background:linear-gradient(45deg,#60a5fa,#93c5fd,#dbeafe); color:#111;" },
  { id: "psychological-damage", text: "Psychological Damage", style: "background:linear-gradient(45deg,#4c1d95,#7c3aed,#c084fc); color:white;" },
  { id: "mecha-enjoyer", text: "Mecha Enjoyer", style: "background:linear-gradient(45deg,#334155,#64748b,#94a3b8); color:white;" },
  { id: "dark-fantasy-cult", text: "Dark Fantasy Cult", style: "background:linear-gradient(45deg,#111827,#4c1d95,#7f1d1d); color:white;" },
  { id: "shounen-bloodline", text: "Shounen Bloodline", style: "background:linear-gradient(45deg,#dc2626,#f97316,#facc15); color:white;" },
  { id: "seinen-enjoyer", text: "Seinen Enjoyer", style: "background:linear-gradient(45deg,#1e2937,#475569,#64748b); color:#f8fafc;" },
  { id: "yuri-propaganda", text: "Yuri Propaganda", style: "background:linear-gradient(45deg,#db2777,#f472b6,#f9a8d4); color:white;" },
  { id: "horror-route", text: "Horror Route", style: "background:linear-gradient(45deg,#111827,#7f1d1d,#dc2626); color:white;" },
  { id: "fantasy-guild-member", text: "Fantasy Guild", style: "background:linear-gradient(45deg,#166534,#22c55e,#4ade80); color:#111;" },
  { id: "cyberpunk-mindset", text: "Cyberpunk Mindset", style: "background:linear-gradient(45deg,#06b6d4,#8b5cf6,#ec4899); color:white;" },
  { id: "school-festival-arc", text: "School Festival Arc", style: "background:linear-gradient(45deg,#fb7185,#f472b6,#f9a8d4); color:white;" },
  { id: "sports-anime-energy", text: "Sports Anime Energy", style: "background:linear-gradient(45deg,#2563eb,#22c55e,#facc15); color:white;" },
  { id: "idol-hell", text: "Idol Hell", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6,#22d3ee); color:white;" },
  { id: "visual-novel-route", text: "Visual Novel Route", style: "background:linear-gradient(45deg,#7c3aed,#c084fc,#f9a8d4); color:white;" },
  { id: "gacha-lore-reader", text: "Gacha Lore Reader", style: "background:linear-gradient(45deg,#facc15,#f97316,#ef4444); color:white;" },
  { id: "post-apocalyptic-vibes", text: "Post-Apocalyptic", style: "background:linear-gradient(45deg,#374151,#6b7280,#9ca3af); color:white;" },
  { id: "cute-girls-doing-things", text: "CGDCT Enjoyer", style: "background:linear-gradient(45deg,#f9a8d4,#fbcfe8,#fdf2f8); color:#111;" },
  { id: "villainess-route", text: "Villainess Route", style: "background:linear-gradient(45deg,#7c3aed,#ec4899,#f43f5e); color:white;" },
  { id: "drama-victim", text: "Drama Victim", style: "background:linear-gradient(45deg,#7f1d1d,#b91c1c,#ef4444); color:white;" },
  { id: "emotional-damage", text: "Emotional Damage", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "toxic-romance-reader", text: "Toxic Romance", style: "background:linear-gradient(45deg,#be123c,#ec4899,#f472b6); color:white;" },
  { id: "pain-arc-enjoyer", text: "Pain Arc Enjoyer", style: "background:linear-gradient(45deg,#111827,#4b5563,#7c3aed); color:white;" },
  { id: "betrayal-route", text: "Betrayal Route", style: "background:linear-gradient(45deg,#991b1b,#dc2626,#f87171); color:white;" },
  { id: "red-flag-collector", text: "Red Flag Collector", style: "background:linear-gradient(45deg,#b91c1c,#ef4444,#fb7185); color:white;" },
  { id: "copium-inhaler", text: "Copium Inhaler", style: "background:linear-gradient(45deg,#2563eb,#60a5fa,#93c5fd); color:#111;" },
  { id: "suffering-build", text: "Suffering Build", style: "background:linear-gradient(45deg,#1e2937,#374151,#6b7280); color:white;" },
  { id: "ntr-enjoyer", text: "NTR Enjoyer", style: "background:linear-gradient(45deg,#1e293b,#7f1d1d,#dc2626); color:white;" }
];

let allBadgesExpanded = false;

function renderBadges(expanded = false) {
  const container = document.getElementById('badge-picker');
  if (!container) return;

  container.innerHTML = '';

  container.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
    align-items: center;
  `;

  const displayBadges = expanded ? BADGES : BADGES.slice(0, 24);

  displayBadges.forEach(badge => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    const btn = document.createElement('button');
    btn.className = 'custom-badge-option';
    btn.dataset.badge = badge.id;

    btn.style.cssText = `
      border: none;
      outline: none;
      border-radius: 999px;
      padding: 4px 12px;
      min-height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      transition: all 0.18s ease;
      position: relative;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      ${badge.style}
    `;

    btn.innerHTML = `
      <span style="
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        ${badge.text}
      </span>
    `;

    function applySelectedStyle() {
      document.querySelectorAll('.custom-badge-option').forEach(el => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
        el.style.outline = 'none';
        el.classList.remove('active');
      });

      btn.classList.add('active');
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = `
        0 0 0 2px rgba(255,255,255,0.15),
        0 0 14px rgba(167,139,250,0.75),
        0 4px 18px rgba(0,0,0,0.45)
      `;
    }

    if (window.selectedBadge === badge.id) {
      setTimeout(applySelectedStyle, 0);
    }

    btn.onclick = () => {
      window.selectedBadge = badge.id;
      applySelectedStyle();
    };

    btn.onmouseenter = () => {
      if (!btn.classList.contains('active')) {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.45)';
      }
    };

    btn.onmouseleave = () => {
      if (!btn.classList.contains('active')) {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
      }
    };

    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  });
}

function toggleBadgeExpand() {
  allBadgesExpanded = !allBadgesExpanded;

  renderBadges(allBadgesExpanded);

  const btn = document.getElementById('expand-badges-btn');

  if (btn) {
    btn.textContent = allBadgesExpanded
      ? '↑ Collapse'
      : '↓ Expand All Badges';
  }
}

// ==================== FONT STYLE PRESETS ====================
const fontPresets = [
  { id: "", name: "Default", class: "", preview: "System Font" },
  { id: "anime", name: "Anime", class: "font-anime", preview: "やあ、元気？" },
  { id: "comic", name: "Comic Bold", class: "font-comic", preview: "POW! BOOM!" },
  { id: "cyberpunk", name: "Cyberpunk", class: "font-cyberpunk", preview: "N E O N" },
  { id: "typewriter", name: "Typewriter", class: "font-typewriter", preview: "Dear Diary..." },
  { id: "elegant", name: "Elegant", class: "font-elegant", preview: "Once upon a time" },
  { id: "retro", name: "Retro Game", class: "font-retro", preview: "8 BIT VIBES" },
  { id: "handwritten", name: "Handwritten", class: "font-handwritten", preview: "Love Letter" },
  { id: "gothic", name: "Gothic", class: "font-gothic", preview: "Dark Soul" },
  { id: "bold-impact", name: "Impact", class: "font-bold-impact", preview: "MAXIMUM" },
  { id: "pixel", name: "Pixel Game", class: "font-pixel", preview: "GAME OVER" },
  { id: "kawaii", name: "Kawaii", class: "font-kawaii", preview: "Kyaa~ ✨" },
  { id: "horror", name: "Horror", class: "font-horror", preview: "RUN..." },
  { id: "magic", name: "Magic Spell", class: "font-magic", preview: "Abracadabra" },
  { id: "hacker", name: "Hacker", class: "font-hacker", preview: "ACCESS GRANTED" },
  { id: "fantasy", name: "Fantasy", class: "font-fantasy", preview: "Dragonborn" },
  { id: "modern", name: "Modern Sans", class: "font-modern", preview: "Clean Vibes" },
  { id: "script", name: "Elegant Script", class: "font-script", preview: "Sincerely" },
  { id: "bold-sans", name: "Bold Sans", class: "font-bold-sans", preview: "HEADLINE" },
  { id: "vaporwave", name: "Vaporwave", class: "font-vaporwave", preview: "ＡＥＳＴＨＥＴＩＣ" }
];

// ==================== BORDER PRESETS ====================
const borderPresets = [
  { id: "", name: "Default", class: "" },
  { id: "shake", name: "Shake", class: "border-shake" },
  { id: "glitch-lite", name: "Glitch Lite", class: "border-glitch-lite" },
  { id: "flicker", name: "Flicker", class: "border-flicker" },
  { id: "float", name: "Float", class: "border-float" },
  { id: "pulse", name: "Pulse", class: "border-pulse" },
  { id: "spectrum", name: "Spectrum", class: "border-spectrum" },
  { id: "breath", name: "Breath", class: "border-breath" },
  { id: "drift", name: "Drift", class: "border-drift" },
  { id: "chaos", name: "Chaos", class: "border-chaos" }
];

const borderShapes = [
  { id: "", name: "Default", class: "" },
  { id: "box", name: "Box", class: "shape-box" },
  { id: "rounded", name: "Rounded", class: "shape-rounded" },
  { id: "octagon", name: "Octagon", class: "shape-octagon" },
  { id: "cyber", name: "Cyber Cut", class: "shape-cyber" },
  { id: "corner", name: "Corner Only", class: "shape-corner" },
  { id: "corner-alt", name: "Corner Alt", class: "shape-corner-alt" },
  { id: "corner-top", name: "Corner Top", class: "shape-corner-top" },
  { id: "corner-bottom", name: "Corner Bottom", class: "shape-corner-bottom" },
  { id: "blob", name: "Blob", class: "shape-blob" },
  { id: "dashed", name: "Dashed", class: "shape-dashed" },
  { id: "dotted", name: "Dotted", class: "shape-dotted" },
  { id: "diagonal", name: "Diagonal Line", class: "shape-diagonal" },
  { id: "zigzag", name: "Zigzag", class: "shape-zigzag" },
  { id: "grid", name: "Tech Grid", class: "shape-grid" }
];


let selectedShapeClass = "";

function renderBorderShapePicker() {
  const container = document.getElementById("border-shape-picker");
  if (!container) return;

  container.innerHTML = '';

  borderShapes.forEach(shape => {
    const div = document.createElement('div');
    div.className = `shape-option ${shape.class}`;
    div.dataset.shape = shape.id;
    div.style.cssText = `
      padding: 12px 10px;
      text-align: center;
      cursor: pointer;
      border: 2px solid transparent;
      border-radius: 10px;
      background: rgba(255,255,255,0.06);
      transition: all 0.2s ease;
      font-size: 0.9em;
      font-weight: 600;
    `;
    div.textContent = shape.name;

    div.onmouseenter = () => {
      div.style.borderColor = '#7c3aed';
      div.style.transform = 'scale(1.03)';
    };
    div.onmouseleave = () => {
      if (selectedShapeClass !== shape.class) {
        div.style.borderColor = 'transparent';
        div.style.transform = 'scale(1)';
      }
    };

    div.onclick = () => {
      document.querySelectorAll('#border-shape-picker .shape-option').forEach(el => {
        el.style.borderColor = 'transparent';
        el.style.boxShadow = 'none';
      });

      div.style.borderColor = '#7c3aed';
      div.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.3)';
      
      selectedShapeClass = shape.class;
      console.log('Bentuk border dipilih:', shape.name);
    };

    if (selectedShapeClass === shape.class) {
      div.style.borderColor = '#7c3aed';
      div.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.3)';
    }

    container.appendChild(div);
  });
}

const originalOpenUserSettings = openUserSettings;
openUserSettings = function() {
  if (typeof originalOpenUserSettings === 'function') originalOpenUserSettings();
  setTimeout(() => {
    renderBorderShapePicker();
  }, 100);
};

let selectedBorderClass = "";

// Render Border Picker
function renderBorderPicker() {
  const container = document.getElementById('border-picker');
  if (!container) return;

  container.innerHTML = '';

  borderPresets.forEach(border => {

    const div = document.createElement('div');

    div.className =
      `custom-border-option comment custom-border ${border.class}`;

    div.style.cssText = `
      position: relative;
      padding: 12px 10px;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      border: 2px solid transparent;
      background:
        linear-gradient(
          135deg,
          rgba(255,255,255,0.04),
          rgba(255,255,255,0.01)
        );

      font-weight: 700;
      transition: all 0.25s ease;
      overflow: hidden;
      isolation: isolate;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 72px;
      color: white;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    `;

    div.textContent = border.name;

    // Hover
    div.onmouseenter = () => {
      div.style.transform = 'translateY(-2px) scale(1.02)';
    };

    div.onmouseleave = () => {
      div.style.transform = 'translateY(0) scale(1)';
    };

    // Select
    div.onclick = () => {

      document
        .querySelectorAll('#border-picker .custom-border-option')
        .forEach(el => {

          el.style.borderColor = 'transparent';
          el.style.boxShadow = 'none';
        });

      div.style.borderColor = '#7c3aed';
      div.style.boxShadow = 'none';

      selectedBorderClass = border.class;
    };

    // Restore Selected
    if (selectedBorderClass === border.class) {
      div.style.borderColor = '#7c3aed';
      div.style.boxShadow =
        '0 0 18px rgba(124,58,237,0.45)';
    }

    container.appendChild(div);
  });
}

async function saveUserSettings() {
  if (!currentUser) {
    alert("Harap login terlebih dahulu!");
    return;
  }
  
  const userRef = db.collection('userStats').doc(currentUser.uid);
  const newDisplayName = document.getElementById('custom-displayname-input').value.trim() ||
    currentUser.displayName || "Anonymous";
  
  // === GAME ROLES ===
  const selectedElements = document.querySelectorAll('#game-roles-picker .game-role-option.selected');
  const selectedRoles = Array.from(selectedElements).map(el => {
    const index = Array.from(el.parentNode.children).indexOf(el);
    return GAME_ROLES[index] ? GAME_ROLES[index].id : null;
  }).filter(Boolean);
  
  const disableAnimEl = document.getElementById('disable-animations-toggle');
  const disableAnimations = disableAnimEl ? disableAnimEl.checked : false;
  localStorage.setItem('commentWidget_disableAnimations', disableAnimations ? 'true' : 'false');
  applyAnimationSetting(disableAnimations);

  const settings = {
    customBadge: window.selectedBadge || "",
    customBorder: selectedBorderClass || "",
    customShape: selectedShapeClass || "",
    customAvatarFrame: window.selectedFrame || "",
    customCommentBg: selectedCustomBg || "",
    customFontStyle: selectedFontClass || "",
    displayName: newDisplayName,
    username: document.getElementById('custom-username-input').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''),
    bio: document.getElementById('custom-bio-input').value.trim(),
    avatar: document.getElementById('settings-avatar-preview').src || currentUser.photoURL || ANONYMOUS_AVATAR,
    gameRoles: selectedRoles,
    disableAnimations: disableAnimations
  };
  
  try {
    await userRef.set(settings, { merge: true });
    
    if (!userStatsCache[currentUser.uid]) userStatsCache[currentUser.uid] = {};
    Object.assign(userStatsCache[currentUser.uid], settings);
    
    const authorInput = document.getElementById('author');
    if (authorInput) {
      authorInput.value = newDisplayName;
      localStorage.setItem('commentWidget_displayName', newDisplayName);
    }
    
    alert("✅ Pengaturan & Game Roles berhasil disimpan!");
    
    document.getElementById('user-settings-modal').style.display = 'none';
 
    const list = document.getElementById('comments-list');
    if (list) list.innerHTML = '';
    
    startRealtimeListener();
    
    setTimeout(() => {
      refreshUserComments(currentUser.uid);
    }, 1000);
    
  } catch (e) {
    console.error("Save error:", e);
    alert("Gagal menyimpan: " + e.message);
  }
}

// ====================== MENTION AUTOCOMPLETE FULL FIX ======================
disableAuthorInputForLoggedInUser();

  setTimeout(function() { if (typeof ensureAuthorFieldFilled === 'function') { disableAuthorInputForLoggedInUser(); ensureAuthorFieldFilled(); } }, 300);
  setTimeout(function() { if (typeof disableAuthorInputForLoggedInUser === 'function') disableAuthorInputForLoggedInUser(); }, 1200);

let mentionDropdown = null;
let currentTextarea = null;
let mentionStartPos = -1;
let mentionInitialized = false;


// Refresh komentar milik user (simple version)
function refreshUserComments(uid) {
  if (!uid) return;
  
  document.querySelectorAll(`.comment[data-uid="${uid}"]`).forEach(comment => {
    const stats = userStatsCache[uid];
    if (!stats) return;
    
    // Refresh badge level
    const badge = comment.querySelector('.badge');
    if (badge) {
      const level = getCommentLevel(stats.commentCount || 0);
      badge.textContent = `Lv ${level}`;
    }
    
    // Refresh custom border
    if (stats.customBorder) {
      comment.className = comment.className.replace(/border-\w+/g, '');
      comment.classList.add('custom-border', stats.customBorder);
    }
    
    // Refresh custom font
    if (stats.customFontStyle) {
      comment.classList.add(stats.customFontStyle);
    }
  });
  
  console.log('✅ Komentar user sudah di-refresh');
}

function calculateLevel(points = 0) {
  return Math.floor(points / 100) + 1;
}

// ====================== CREATE DROPDOWN ======================
function createMentionDropdown() {

  if (mentionDropdown) return mentionDropdown;

  mentionDropdown = document.createElement('div');
  mentionDropdown.id = 'mention-dropdown';
  mentionDropdown.style.cssText = `
    position: fixed;
    background: #1f1f2e;
    border: 2px solid #7c3aed;
    border-radius: 12px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.95);
    max-height: 360px;
    overflow-y: auto;
    z-index: 2147483647;
    width: 320px;
    display: none;
    font-size: 0.95em;
    padding: 8px 0;
    color: white;
    scrollbar-width: thin;
    backdrop-filter: blur(12px);
  `;

  (document.body || document.documentElement)
    .appendChild(mentionDropdown);

  // CLICK ITEM
  mentionDropdown.addEventListener('click', function(e) {

    const item = e.target.closest('.mention-item');
    if (!item) return;
    const username =
      item.dataset.username;
    insertMention(username);
  });

  return mentionDropdown;
}

// ====================== FILTER USERS ======================
function filterUsers(query = '') {
  try {
    if (
      typeof allUsers === 'undefined' ||
      !Array.isArray(allUsers)
    ) {
      console.warn('allUsers belum tersedia');
      return [];
    }

    query =
      String(query)
      .toLowerCase()
      .trim();

    return allUsers
      .filter(user => {

        if (!user) return false;

        const username =
          String(user.username || '')
          .toLowerCase();

        const display =
          String(user.displayName || '')
          .toLowerCase();

        if (!query) {
          return username || display;
        }

        return (
          username.includes(query) ||
          display.includes(query)
        );
      })
      .slice(0, 10);

  } catch(err) {

    console.error(
      'filterUsers error:',
      err
    );

    return [];
  }
}

// ====================== SHOW SUGGESTIONS ======================
async function showMentionSuggestions(
  textarea,
  query,
  startPos
) {

  try {

    currentTextarea = textarea;
    mentionStartPos = startPos;

    if (!allUsers.length) {
      const dropdown = createMentionDropdown();
      dropdown.innerHTML = '<div style="padding:12px 16px;color:#aaa;">Memuat pengguna...</div>';
      dropdown.style.display = 'block';
      await loadAllUsers();
    }

    const users =
      filterUsers(query);
    const dropdown =
      createMentionDropdown();

    if (!users.length) {

      hideMentionSuggestions();
      return;

    }

    let html = '';

    users.forEach(user => {

      const display =
        user.displayName ||
        user.username ||
        'User';
      const username =
        user.username ||
        display;
      const avatar =
        user.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(display)}&background=7c3aed&color=fff`;

      html += `
        <div 
          class="mention-item"
          data-username="${username}"
          style="
            padding:11px 16px;
            cursor:pointer;
            display:flex;
            align-items:center;
            gap:12px;
            transition:0.15s;
          "
          onmouseenter="this.style.background='rgba(124,58,237,0.25)'"
          onmouseleave="this.style.background='transparent'"
        >

          <img
            src="${avatar}"
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(display)}'"
            style="
              width:38px;
              height:38px;
              border-radius:50%;
              object-fit:cover;
              border:2px solid #7c3aed;
              flex-shrink:0;
            "
          >

          <div style="flex:1;min-width:0;">

            <div style="
              font-weight:700;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${display}
            </div>

            <small style="
              color:#aaa;
            ">
              @${username}
            </small>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // ================= POSITION =================
    const rect =
      textarea.getBoundingClientRect();

    let topPos =
      rect.bottom + 8;

    let leftPos =
      rect.left;

    if (
      topPos + 360 >
      window.innerHeight
    ) {

      topPos =
        rect.top - 370;
    }

    if (
      leftPos + 320 >
      window.innerWidth
    ) {

      leftPos =
        window.innerWidth - 330;
    }

    if (leftPos < 10) {
      leftPos = 10;
    }

    if (topPos < 10) {
      topPos = 10;
    }

    dropdown.style.top =
      `${topPos}px`;

    dropdown.style.left =
      `${leftPos}px`;

  } catch(err) {

    console.error(
      'showMentionSuggestions error:',
      err
    );
  }
}

// ====================== HIDE ======================
function hideMentionSuggestions() {
  if (!mentionDropdown) return;

  mentionDropdown.style.display =
    'none';
}

// ====================== INSERT MENTION ======================

function insertMention(username) {
  try {
    if (
      !currentTextarea ||
      mentionStartPos === -1
    ) return;

    const text =
      currentTextarea.value;

    const cursorPos =
      currentTextarea.selectionStart;

    const before =
      text.substring(
        0,
        mentionStartPos
      );

    const after =
      text.substring(cursorPos);

    const newText =
      before +
      '@' +
      username +
      ' ' +
      after;

    currentTextarea.value =
      newText;

    currentTextarea.focus();

    const newCursorPos =
      before.length +
      username.length +
      2;

    currentTextarea.setSelectionRange(
      newCursorPos,
      newCursorPos
    );

    currentTextarea.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );

    hideMentionSuggestions();

  } catch(err) {

    console.error(
      'insertMention error:',
      err
    );
  }
}

// ====================== SETUP ======================
function setupMentionAutocomplete() {
  if (mentionInitialized) return;
  mentionInitialized = true;
  createMentionDropdown();

  // ================= INPUT =================
  document.addEventListener(
    'input',
    function(e) {
      try {
        const target =
          e.target;

        if (
          !target.matches(
            '#comment-text, .reply-text, .edit-text'
          )
        ) {
          return;
        }

        const textarea =
          target;

        const cursorPos =
          textarea.selectionStart;

        const textBefore =
          textarea.value.substring(
            0,
            cursorPos
          );

        const match =
          textBefore.match(
            /@([a-zA-Z0-9._-]*)$/
          );

        console.log(
          'Mention Match:',
          match
        );

        if (match) {

          showMentionSuggestions(
            textarea,
            match[1],
            cursorPos -
            match[1].length -
            1
          );
        } else {

          hideMentionSuggestions();
        }
      } catch(err) {

        console.error(
          'mention input error:',
          err
        );
      }
    }
  );

  // ================= CLICK OUTSIDE =================
  document.addEventListener(
    'click',
    function(e) {
      try {

        if (
          mentionDropdown &&
          !e.target.closest('#mention-dropdown') &&
          !e.target.matches(
            '#comment-text, .reply-text, .edit-text'
          )
        ) {

          hideMentionSuggestions();
        }

      } catch(err) {

        console.error(err);
      }
    }
  );

  // ================= ESC =================

  document.addEventListener(
    'keydown',
    function(e) {

      try {

        if (
          !mentionDropdown ||
          mentionDropdown.style.display === 'none'
        ) return;

        if (e.key === 'Escape') {

          hideMentionSuggestions();
        }
      } catch(err) {

        console.error(err);
      }
    }
  );

  console.log(
    '✅ Mention autocomplete initialized'
  );
}

// ====================== INIT ======================
window.addEventListener(
  'load',
  function() {
    setTimeout(() => {
      setupMentionAutocomplete();
    }, 500);
  }
);

// ==================== MENTION AUTOCOMPLETE + CACHE BUSTER ====================
let mentionVersion = "20250526_03";

console.log(`✅ Mention System Loaded - v${mentionVersion}`);

function attachMentionListeners() {
  const textareas = document.querySelectorAll('#comment-text, .reply-text, .edit-text');
  
  textareas.forEach(textarea => {
    if (textarea._mentionHandler) {
      textarea.removeEventListener('input', textarea._mentionHandler);
    }
    
    textarea._mentionHandler = function() {
      const cursorPos = this.selectionStart;
      const textBefore = this.value.substring(0, cursorPos);
      const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

      if (match) {
        showMentionSuggestions(this, match[1], cursorPos - match[1].length - 1);
      } else {
        hideMentionSuggestions();
      }
    };

    textarea.addEventListener('input', textarea._mentionHandler);
  });
}

function initMentionSystem() {
  attachMentionListeners();
  
  if (!window.mentionObserver) {
    window.mentionObserver = new MutationObserver(() => {
      attachMentionListeners();
    });
    window.mentionObserver.observe(document.body, { childList: true, subtree: true });
  }
}

setTimeout(initMentionSystem, 500);
setTimeout(initMentionSystem, 1500);
setTimeout(initMentionSystem, 3000);

window.initMentionSystem = initMentionSystem;


function calculateLevel(points = 0) {
  return Math.floor(points / 100) + 1;
}


async function showUserProfile(uid) {
  let modal = document.getElementById('legacy-comment-profile-modal');

  if (!modal) {
    console.log("Creating user profile modal...");
    modal = document.createElement('div');
    modal.id = 'legacy-comment-profile-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 99999; display: none;
      align-items: center; justify-content: center; padding: 12px; box-sizing: border-box;
    `;

    modal.innerHTML = `
      <div style="background:#1f1f2e; width:100%; max-width:380px; border-radius:14px; padding:18px; position:relative; color:white; box-shadow:none;">
        <button onclick="closeProfileModal()" style="position:absolute; top:10px; right:14px; background:none; border:none; font-size:24px; color:#aaa; cursor:pointer;">×</button>

        <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:16px;">
          <div style="display:flex; flex-direction:column; align-items:flex-start; flex-shrink:0;">
            <img id="modal-avatar" src="" style="width:80px; height:80px; border-radius:15px; border:3px solid #7c3aed; object-fit:cover;">
            <div style="margin-top:8px; font-size:0.78em; color:#aaa; text-align:left;">
              <div style="color:#777;">Joined</div>
              <div id="modal-joined" style="color:#60a5fa; font-weight:600;">—</div>
            </div>
          </div>

          <div style="flex:1; min-width:0;">
            <h2 id="modal-displayname" style="margin:0; font-size:1.15rem; font-weight:700; line-height:1.3; word-break:break-word;">Loading all...</h2>
            <p id="modal-username" style="margin:4px 0; color:#aaa; font-size:0.85rem;"></p>
            <p id="modal-bio" style="margin:6px 0 0; color:#ccc; font-size:0.85rem; line-height:1.4; word-break:break-word;"></p>
          </div>
        </div>

         <button
  id="profile-dm-btn"
  style="
    width:100%;
    height:34px;
    background:transparent;
    color:#22c55e;
    border:1px solid #22c55e;
    border-radius:8px;
    font-size:12px;
    font-weight:600;
    cursor:pointer;
    margin-bottom:12px;
  "
>
  Message
</button>

        <div style="background:#28283a; border-radius:12px; padding:14px; margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:center;">
            <div><div style="color:#aaa;font-size:.75rem;">Level</div><div id="modal-level" style="color:#ffd700;font-weight:700;margin-top:4px;"></div></div>
            <div><div style="color:#aaa;font-size:.75rem;">Points</div><div id="modal-points" style="color:#ffd700;font-weight:700;margin-top:4px;"></div></div>
            <div><div style="color:#aaa;font-size:.75rem;">Comments</div><div id="modal-commentcount" style="margin-top:4px;"></div></div>
            <div><div style="color:#aaa;font-size:.75rem;">Reputation</div><div id="modal-reputation" style="font-weight:700;margin-top:4px;"></div></div>
          </div>
        </div>


        <div style="
  width:100%;
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:12px;
  color:#ddd;
  font-size:13px;
  font-weight:700;
">
  <span>Badge Collection</span>
  <div style="
    flex:1;
    height:1px;
    background:rgba(255,255,255,.15);
  "></div>
</div>

<div id="modal-badge" style="text-align:center; min-height:32px;"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  // Reset
  modal.querySelector('#modal-avatar').src = ANONYMOUS_AVATAR || '';
  modal.querySelector('#modal-displayname').textContent = 'Memuat profil...';
  modal.querySelector('#modal-username').textContent = '';
  modal.querySelector('#modal-bio').textContent = '';
  modal.querySelector('#modal-joined').textContent = '—';
  modal.style.setProperty('display', 'flex', 'important');

  try {
    const doc = await db.collection('userStats').doc(uid).get();
    const data = doc.exists ? doc.data() : {};
    
    const dmBtn = modal.querySelector('#profile-dm-btn');

if (dmBtn) {
  dmBtn.onclick = () => {
    openDmToUser(
      uid,
      data.displayName || 'Anonymous',
      data.avatar || ANONYMOUS_AVATAR
    );
  };
}
    
console.log("UID:", uid);
console.log("DATA:", data);
console.log("joinedAt:", data.joinedAt);
console.log("createdAt:", data.createdAt);

    modal.querySelector('#modal-avatar').src = data.avatar || ANONYMOUS_AVATAR;
    modal.querySelector('#modal-displayname').textContent = data.displayName || 'Anonymous';
    modal.querySelector('#modal-username').textContent = data.username ? '@' + data.username : '';
    modal.querySelector('#modal-bio').textContent = data.bio || 'Belum ada bio.';

    // ==================== JOINED DATE FIXED ====================
const joinedEl = modal.querySelector('#modal-joined');
let joinedDate = '—';

const getJoinedDate = (timestamp) => {
  if (!timestamp) return '—';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

if (data.joinedAt) {
  joinedDate = getJoinedDate(data.joinedAt);
} else if (data.createdAt) {
  joinedDate = getJoinedDate(data.createdAt);
} else if (uid === currentUser?.uid && currentUser.metadata?.creationTime) {
  joinedDate = new Date(currentUser.metadata.creationTime).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

    if (joinedEl) joinedEl.textContent = joinedDate;
    // ==================== END FIX ====================

    const level = getCommentLevel(data.commentCount || 0);
    modal.querySelector('#modal-level').textContent = `Lv. ${level}`;

    modal.querySelector('#modal-points').textContent = `${(data.points || 0).toLocaleString()} pts`;
    modal.querySelector('#modal-commentcount').textContent = (data.commentCount || 0).toLocaleString();

    const reputation = data.reputation || 0;
    const repEl = modal.querySelector('#modal-reputation');
    repEl.textContent = reputation >= 0 ? `+${reputation.toLocaleString()}` : reputation.toLocaleString();
    repEl.style.color = reputation > 0 ? '#4ade80' : reputation < 0 ? '#ef4444' : '#aaa';

    // Badge
    const badgeDiv = modal.querySelector('#modal-badge');
    badgeDiv.innerHTML = '';
    if (data.customBadge) {
      const badge = BADGES.find(b => b.id === data.customBadge);
      if (badge) {
        const el = document.createElement('span');
        el.className = `user-custom-badge ${badge.id}`;
        el.style.cssText = badge.style || '';
        el.textContent = badge.text;
        badgeDiv.appendChild(el);
      }
    }

        // ==================== GAME ROLES DISPLAY ====================
    let existingRoles = modal.querySelector('#modal-game-roles');
    if (existingRoles) existingRoles.remove();

    const rolesDiv = document.createElement('div');
    rolesDiv.id = 'modal-game-roles';
    rolesDiv.style.cssText = `
  margin-top:14px;
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  align-items:center;
  gap:6px;
`;

    if (data.gameRoles && Array.isArray(data.gameRoles) && data.gameRoles.length > 0) {

  const title = document.createElement('div');
  title.style.cssText = `
  width:100%;
  display:flex;
  align-items:center;
  gap:10px;
  margin:0 0 12px 0;
  color:#fff;
  font-size:13px;
  font-weight:700;
  letter-spacing:.5px;
`;

  title.innerHTML = `
    <span>Game Roles</span>
    <div style="
      flex:1;
      height:1px;
      background:rgba(255,255,255,.15);
    "></div>
  `;

  rolesDiv.appendChild(title);

  data.gameRoles.forEach(rId => {
    const role = GAME_ROLES.find(r => r.id === rId);

    if (role) {
      const badge = document.createElement('span');

      badge.style.cssText = `
  padding:3px 8px;
  border-radius:8px;
  background:rgba(255,255,255,.06);
  color:${role.color};
  font-size:.72em;
  font-weight:600;
  border:1px solid rgba(255,255,255,.08);
  display:inline-flex;
  align-items:center;
  gap:4px;
`;

      badge.innerHTML = `${role.icon} ${role.name}`;
      rolesDiv.appendChild(badge);
    }
  });
}

    const badgeContainer = modal.querySelector('#modal-badge');
    if (badgeContainer && badgeContainer.parentNode) {
      badgeContainer.parentNode.appendChild(rolesDiv);
    }

    modal.style.display = 'flex';

  } catch (e) {
    console.error('Error loading profile:', e);
    modal.querySelector('#modal-displayname').textContent = 'Profil tidak tersedia';
    modal.querySelector('#modal-bio').textContent = 'Gagal memuat data profil. Coba lagi nanti.';
  }
}

async function addUserPoints(uid, amount) {
  if (!uid) return;

  const ref =
    db.collection('userStats').doc(uid);

  await ref.set({
    points: firebase.firestore.FieldValue.increment(amount)
  }, { merge: true });

  if (userStatsCache[uid]) {
    userStatsCache[uid].points =
      (userStatsCache[uid].points || 0) +
      amount;
  }
}

function closeProfileModal() {
  const modal =
    document.getElementById('legacy-comment-profile-modal');

  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
  }
}

// ==================== CLICK AVATAR TOP BAR PROFILE ====================
function setupUserAvatarClick() {
  const userInfo = document.getElementById('user-info');
  const avatar = document.getElementById('user-avatar');

  if (!userInfo) return;

  const openProfile = (e) => {
    if (e.target.closest('.user-action-icons') || 
        e.target.closest('.user-action-btn') || 
        e.target.closest('.signout-btn')) {
      return;
    }

    if (currentUser && currentUser.uid) {
      showUserProfile(currentUser.uid);
    } else {
      alert("Silakan login terlebih dahulu untuk melihat profil.");
    }
  };

  userInfo.style.cursor = 'pointer';
  userInfo.onclick = openProfile;

  if (avatar) {
    avatar.onclick = (e) => {
      e.stopImmediatePropagation();
      if (currentUser && currentUser.uid) {
        showUserProfile(currentUser.uid);
      } else {
        alert("Silakan login terlebih dahulu untuk melihat profil.");
      }
    };
  }
}

document.addEventListener('load', function(e) {
  if (e.target.tagName === 'IMG' && e.target.classList.contains('avatar-ring')) {
    e.target.classList.add('loaded');
  }
}, true);

let currentChatUid = null;
let currentChatUnsubscribe = null
window.userStatsCache = window.userStatsCache || {};
window.dmUserCache = window.dmUserCache || {};

function initDM() {
  const dmBtn = document.getElementById('dm-btn');
  if (!dmBtn) {
    console.warn("Tombol DM (#dm-btn) tidak ditemukan");
    return;
  }

  dmBtn.onclick = null;
  dmBtn.removeEventListener('click', dmBtn._dmHandler);
  dmBtn._dmHandler = function() {
  window.loadCommentFeatureStyles?.('dm');
  if (!currentUser) {
    alert("Silakan login terlebih dahulu untuk menggunakan Direct Message.");
    return;
  }
  

  const dmModal = document.getElementById('dm-modal');

  if (dmModal) {
    dmModal.style.display = 'flex';

    currentChatUid = null;
    resetDMInput();
    loadDmInbox();
  }
};

  dmBtn.addEventListener('click', dmBtn._dmHandler);
  console.log("✅ Tombol DM di atas sudah aktif");
}

window.addEventListener('load', function() {
  setTimeout(() => {
    initDM();
    setupUserAvatarClick();
  }, 800);
});


async function loadDmInbox() {
  const inboxEl = document.getElementById('dm-inbox');
  if (!inboxEl) return;
  startDMBadgeLive();
   updateDMMyAvatar();
  inboxEl.innerHTML = '<div style="padding:40px; text-align:center; color:#ccc;">Loading messages...</div>';
  
  if (!currentUser) {
    inboxEl.innerHTML = '<div style="padding:40px; text-align:center; color:#f66;">Please sign in to see your inbox.</div>';
    return;
  }
  
  try {
    const snap = await db.collection('directMessages')
      .where('participants', 'array-contains', currentUser.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const chats = new Map();
    
    for (const doc of snap.docs) {
      const m = doc.data();
      const otherUid = m.from === currentUser.uid ? m.to : m.from;
      if (!otherUid) continue;
      
      let displayName = 'User';
      let avatar = ANONYMOUS_AVATAR;
      
      if (m.from === currentUser.uid) {
        displayName = m.toName || displayName;
        avatar = m.toAvatar || avatar;
      } else {
        displayName = m.fromName || displayName;
        avatar = m.fromAvatar || avatar;
      }
      
      window.dmUserCache[otherUid] = {
  displayName,
  avatar
};
      
      if (displayName === 'User' || avatar === ANONYMOUS_AVATAR) {
        const userData = await getUserData(otherUid);
        displayName = userData.displayName || userData.username || displayName;
        avatar = userData.photoURL || userData.avatar || avatar;
      }
      
      const lastMsgTime = m.timestamp ? m.timestamp.toDate() : new Date(0);
      
      if (!chats.has(otherUid) || lastMsgTime > chats.get(otherUid).timestamp) {
        chats.set(otherUid, {
          uid: otherUid,
          displayName,
          avatar,
          lastMessage: (m.text || '').substring(0, 55) + ((m.text || '').length > 55 ? '...' : ''),
          timestamp: lastMsgTime,
          timeStr: m.timestamp ?
            m.timestamp.toDate().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) :
            ''
        });
      }
    }
    
    if (chats.size === 0) {
      inboxEl.innerHTML = `<div style="padding:60px 20px; text-align:center; color:#777;">Belum ada percakapan</div>`;
      return;
    }
    
    let html = '';
    chats.forEach(chat => {
      html += `
<div class="dm-user-item" onclick="openChat('${chat.uid}')">

  <img
    src="${chat.avatar}"
    class="dm-user-avatar"
    onerror="this.src='${ANONYMOUS_AVATAR}'"
  >

  <div class="dm-user-info">
    <div class="dm-user-name">
      ${chat.displayName}
    </div>

    <div class="dm-user-lastmsg">
      ${chat.lastMessage}
    </div>
  </div>

  <small class="dm-user-time">
    ${chat.timeStr}
  </small>

</div>`;
    });
    
    inboxEl.innerHTML = html;
    
  } catch (e) {
    console.error("Inbox load error:", e);
    inboxEl.innerHTML = `<div style="color:#ff6b6b; padding:30px; text-align:center;">Gagal memuat inbox</div>`;
  }
}

if (!currentChatUid) {
  const messagesContainer =
    document.getElementById("dm-chat-messages");

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#ccc;
        text-align:center;
        padding:20px;
      ">
        Select a conversation to start chatting
      </div>
    `;
  }
}
// ==================== HELPER GET USER DATA ====================
async function getUserData(uid) {
  try {
    const doc = await db.collection('userStats').doc(uid).get();
    
    if (!doc.exists) return {};
    
    const data = doc.data();
    
    return {
      displayName: data.displayName,
      username: data.username,
      avatar: data.avatar,
      photoURL: data.avatar
    };
  } catch (err) {
    console.error(err);
    return {};
  }
}

// ==================== MARK AS READ ====================
async function markMessagesAsRead(otherUid) {
  if (!currentUser || !otherUid) return;

  try {
    const q = db.collection("directMessages")
      .where("participants", "array-contains", currentUser.uid)
      .where("to", "==", currentUser.uid)
      .where("read", "==", false);

    const snap = await q.get();

    if (snap.empty) {
      console.log("✅ Tidak ada pesan unread");
      return;
    }

    const batch = db.batch();
    let count = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      if (data.from === otherUid) {
        batch.update(doc.ref, { read: true });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} pesan ditandai sudah dibaca`);
    }
  } catch (e) {
    console.warn("Mark as read gagal (bukan error fatal):", e.message);
  }
}

// ==================== OPEN CHAT (Versi Diperbaiki) ====================
async function openChat(uid) {

if (!firebase.auth().currentUser) {
    alert("Login ulang terlebih dahulu");
    return;
  }

  if (!currentUser || !uid) return;

  unsubscribeCurrentChat();
  currentChatUid = uid;

  await markMessagesAsRead(uid);

  const messagesContainer = document.getElementById('dm-chat-messages');
  const header = document.getElementById('dm-chat-header');

  if (header) header.style.display = 'flex';

  const cachedUser = window.dmUserCache?.[uid] || {};
  let userData = {};

  try {
    userData = await getUserData(uid);
  } catch (e) {
    console.error("Gagal mengambil data user:", e);
  }

  const textArea = document.getElementById("dm-text");
  const sendBtn = document.getElementById("dm-send-btn");

if (textArea) {
  textArea.disabled = false;
  textArea.placeholder = "Type a message...";
}

if (sendBtn) {
  sendBtn.disabled = false;
  sendBtn.style.opacity = "1";
  sendBtn.style.pointerEvents = "auto";
}

  const displayName = userData.displayName || 
                     userData.username || 
                     cachedUser.displayName || 
                     "User";
  const username = userData.username ||
                    displayName
                   .toLowerCase()
                   .replace(/\s+/g, '');

  document.getElementById('dm-chat-name').textContent = displayName;

  const avatar = userData.photoURL || 
                userData.avatar || 
                cachedUser.avatar || 
                ANONYMOUS_AVATAR;
                

  const statusEl =
  document.getElementById('dm-chat-status');

if (statusEl) {
  statusEl.textContent = `@${username}`;
}
  const avatarEl = document.getElementById('dm-chat-avatar');
  if (avatarEl) {
    avatarEl.src = avatar;
    avatarEl.onerror = () => avatarEl.src = ANONYMOUS_AVATAR;
  }

  // Mobile handling
  if (window.innerWidth <= 768) {
    document.getElementById("dm-inbox")?.classList.add("mobile-hide");
    document.getElementById("dm-chat-area")?.classList.add("mobile-open");
  }

  messagesContainer.innerHTML = `
    <div style="text-align:center; padding:80px 20px; color:#ccc;">
      Loading chat...
    </div>
  `;

  // Listener chat
  const query = db.collection('directMessages')
    .where('participants', 'array-contains', currentUser.uid)
    .orderBy('timestamp', 'asc');

  currentChatUnsubscribe = query.onSnapshot(
    (snap) => {

      messagesContainer.innerHTML = '';

      let messageCount = 0;

      snap.forEach(doc => {

        const m = doc.data();
        const messageId = doc.id;

        if (
          !m.participants?.includes(uid) ||
          !m.participants?.includes(currentUser.uid)
        ) {
          return;
        }

        messageCount++;

        const isMe =
          m.from === currentUser.uid;

        const div =
          document.createElement('div');

        div.style.cssText = isMe
          ? `
            align-self:flex-end;
            background:#2563eb;
            color:#fff;
            padding:11px 16px;
            border-radius:18px 18px 4px 18px;
            max-width:75%;
            margin:6px 0;
            position:relative;
          `
          : `
            align-self:flex-start;
            background:#333;
            color:#fff;
            padding:11px 16px;
            border-radius:18px 18px 18px 4px;
            max-width:75%;
            margin:6px 0;
          `;

        const timeStr = m.timestamp
          ? m.timestamp
              .toDate()
              .toLocaleTimeString(
                'id-ID',
                {
                  hour: '2-digit',
                  minute: '2-digit'
                }
              )
          : '';

        div.innerHTML = `
          <div style="word-break:break-word;">
            ${
              m.deleted
                ? '<i style="opacity:.6">Message deleted</i>'
                : DOMPurify.sanitize(m.text || '')
            }
          </div>

          <small style="
            font-size:.75rem;
            opacity:.75;
            margin-top:5px;
            display:block;
            text-align:right;
          ">
            ${timeStr}
            ${m.edited ? '• edited' : ''}
          </small>

          ${
            isMe && !m.deleted
  ? `
    <div style="
      position:absolute;
      top:6px;
      right:-20px;
    ">

      <button
  class="dm-menu-trigger"
  onclick="this.blur(); toggleDmMenu(this)"
  style="
    background:none;
    border:none;
    outline:none;
    box-shadow:none;
    appearance:none;
    -webkit-appearance:none;
    color:#fff;
    cursor:pointer;
    padding:4px;
    display:flex;
    align-items:center;
    justify-content:center;
  "
>
  <svg xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor">
    <circle cx="12" cy="5" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="12" cy="19" r="2"/>
  </svg>
</button>

      <div class="dm-message-menu" style="
  display:none;
  position:absolute;
  top:24px;
  right:0;
  background:#222;
  border:1px solid rgba(255,255,255,.1);
  border-radius:10px;
  padding:4px;
  z-index:999;
">

  <button
    onclick="editMessage('${messageId}')"
    title="Edit"
    style="
      width:34px;
      height:34px;
      border:none;
      background:none;
      color:#60a5fa;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:8px;
    "
  >
    <svg xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  </button>

  <button
    onclick="deleteMessage('${messageId}')"
    title="Hapus"
    style="
      width:34px;
      height:34px;
      border:none;
      background:none;
      color:#ff6b6b;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:8px;
    "
  >
    <svg xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  </button>

</div>
  `
              : ''
          }
        `;

        if (isMe && !m.deleted) {
          div.querySelectorAll('button')
            .forEach(btn => {

              btn.addEventListener(
                'mouseenter',
                () => {
                  btn.style.background =
                    'rgba(255,255,255,.25)';
                }
              );

              btn.addEventListener(
                'mouseleave',
                () => {
                  btn.style.background =
                    'rgba(255,255,255,.12)';
                }
              );
            });
        }

        messagesContainer.appendChild(div);
      });

      if (messageCount === 0) {
        messagesContainer.innerHTML = `
          <div style="
            text-align:center;
            padding:90px 30px;
            color:#777;
          ">
            Belum ada pesan.<br>
            <small>
              Ketik di bawah untuk memulai percakapan
            </small>
          </div>
        `;
      }

      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

    },
    (error) => {

      console.error(
        "Chat listener error:",
        error
      );

      messagesContainer.innerHTML = `
        <div style="
          color:#f66;
          text-align:center;
          padding:60px;
        ">
          Gagal memuat chat
        </div>
      `;
    }
  );
}

function unsubscribeCurrentChat() {
  if (currentChatUnsubscribe) {
    currentChatUnsubscribe();
    currentChatUnsubscribe = null;
  }
}

window.toggleDmMenu = function(btn) {

  document
    .querySelectorAll('.dm-message-menu')
    .forEach(menu => {
      if (menu !== btn.nextElementSibling) {
        menu.style.display = 'none';
      }
    });

  const menu = btn.nextElementSibling;

  menu.style.display =
    menu.style.display === 'block'
      ? 'none'
      : 'block';
};

document.addEventListener('click', (e) => {

  if (
    !e.target.closest('.dm-message-menu') &&
    !e.target.closest('[onclick*="toggleDmMenu"]')
  ) {
    document
      .querySelectorAll('.dm-message-menu')
      .forEach(menu => {
        menu.style.display = 'none';
      });
  }

});

// ==================== SEND, EDIT, DELETE ====================
async function sendDirectMessage() {
  if (!currentChatUid) {
    alert("Select a user first");
    return;
  }

  const textArea = document.getElementById('dm-text');
  const text = textArea.value.trim();

  if (!text) return;
  
  try {
    const firestoreUser = await getUserData(currentChatUid);

const cachedUser =
  window.dmUserCache?.[currentChatUid] || {};
    
    await db.collection('directMessages').add({
  from: currentUser.uid,
  fromName: currentUser.displayName || 'User',
  fromAvatar: currentUser.photoURL || ANONYMOUS_AVATAR,

  toName:
    firestoreUser.displayName ||
    firestoreUser.username ||
    cachedUser.displayName ||
    'User',

  toAvatar:
    firestoreUser.photoURL ||
    firestoreUser.avatar ||
    cachedUser.avatar ||
    ANONYMOUS_AVATAR,

  to: currentChatUid,
  text,
  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  participants: [currentUser.uid, currentChatUid],
  read: false
});
    
    textArea.value = '';
  } catch (e) {
    console.error(e);
    alert("Gagal mengirim pesan.");
  }
}

window.editMessage = async function(messageId) {
  const ref = db.collection('directMessages').doc(messageId);
  try {
    const doc = await ref.get();
    if (!doc.exists || doc.data().from !== currentUser.uid) {
      return alert("Tidak bisa edit pesan ini");
    }
    
    const newText = prompt("Edit pesan:", doc.data().text);
    if (!newText?.trim()) return;
    
    await ref.update({
      text: newText.trim(),
      edited: true,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error(err);
    alert("Gagal edit pesan");
  }
};

window.deleteMessage = async function(messageId) {
  if (!confirm("Delete this message?")) return;
  try {
    await db.collection('directMessages').doc(messageId).update({
      deleted: true,
      text: ""
    });
  } catch (err) {
    console.error(err);
    alert("Gagal menghapus pesan");
  }
};

function resetDMInput() {
  const textArea = document.getElementById("dm-text");
  const sendBtn = document.querySelector(".dm-send-btn");

  if (textArea) {
    textArea.value = "";
    textArea.disabled = true;
    textArea.placeholder = "Select a conversation first";
  }

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.5";
    sendBtn.style.pointerEvents = "none";
  }
}

// ==================== CLOSE & CLEANUP ====================
function closeDmModal() {
  unsubscribeCurrentChat();
  stopDMBadgeLive();
  refreshDMBadgeOnce();
  document.getElementById('dm-modal').style.display = 'none';
  currentChatUid = null;
}

function backToInbox() {
  unsubscribeCurrentChat();

  document.getElementById("dm-inbox")?.classList.remove("mobile-hide");
  document.getElementById("dm-chat-area")?.classList.remove("mobile-open");
  document.getElementById("dm-chat-header").style.display = "none";

  currentChatUid = null;

  document.getElementById("dm-chat-name").textContent = "User";
  document.getElementById("dm-chat-status").textContent = "@username";

  const avatar = document.getElementById("dm-chat-avatar");
  if (avatar) avatar.src = "";

  document.getElementById("dm-chat-messages").innerHTML = `
  <div style="
    height:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#ccc;
    text-align:center;
  ">
    Select a conversation to start chatting
  </div>
`;

  resetDMInput();
}


window.openDmToUser = async function(uid, displayName, avatar) {
  if (!uid || !currentUser) return;

  await updateDMMyAvatar();

  window.dmUserCache[uid] = {
    displayName: displayName || "User",
    avatar: avatar || ANONYMOUS_AVATAR
  };

  closeProfileModal();

  const dmModal = document.getElementById('dm-modal');
  if (dmModal) dmModal.style.display = 'flex';
  openChat(uid);
};

function initDMButtons() {
  const closeBtn = document.getElementById('dm-close-btn');
  const backBtn = document.getElementById('dm-back-btn');
  
  if (closeBtn) closeBtn.addEventListener('click', closeDmModal);
  if (backBtn) backBtn.addEventListener('click', backToInbox);
}

firebase.auth().onAuthStateChanged((user) => {
  currentUser = user;
  disableAuthorInputForLoggedInUser();
  setTimeout(function() { if (typeof ensureAuthorFieldFilled === 'function') { disableAuthorInputForLoggedInUser(); ensureAuthorFieldFilled(); } }, 300);
  setTimeout(function() { if (typeof disableAuthorInputForLoggedInUser === 'function') disableAuthorInputForLoggedInUser(); }, 1200);

  if (!user) return;

  initDM();
  initDMButtons();
  refreshDMBadgeOnce();
});

let dmBadgeUnsubscribe = null;

async function refreshDMBadgeOnce() {
  if (!currentUser) return;
  const badge = document.getElementById("dm-unread-badge");
  if (!badge) return;

  try {
    const snap = await db
      .collection("directMessages")
      .where("participants", "array-contains", currentUser.uid)
      .where("to", "==", currentUser.uid)
      .where("read", "==", false)
      .limit(30)
      .get();

    const count = snap.size;
    badge.textContent =
      count > 99 ? "99+" :
      count > 0 ? count : "";
  } catch (e) {
    console.warn('DM badge refresh skip:', e.message);
  }
}

function startDMBadgeLive() {
  if (!currentUser) return;
  const badge = document.getElementById("dm-unread-badge");
  if (!badge) return;
  if (dmBadgeUnsubscribe) return;

  dmBadgeUnsubscribe = db
    .collection("directMessages")
    .where("participants", "array-contains", currentUser.uid)
    .where("to", "==", currentUser.uid)
    .where("read", "==", false)
    .limit(30)
    .onSnapshot((snap) => {
      const count = snap.size;
      badge.textContent =
        count > 99 ? "99+" :
        count > 0 ? count : "";
    }, err => console.warn('DM badge live:', err.message));
}

function stopDMBadgeLive() {
  if (dmBadgeUnsubscribe) {
    dmBadgeUnsubscribe();
    dmBadgeUnsubscribe = null;
  }
}

function initDMBadge() {
  refreshDMBadgeOnce();
}

function initDM() {
  const dmBtn = document.getElementById('dm-btn');
  if (!dmBtn) return;
  dmBtn.onclick = async () => {

    if (!firebase.auth().currentUser) {
      alert("Silakan login terlebih dahulu");
      return;
    }

    currentUser = firebase.auth().currentUser;

    const dmModal =
      document.getElementById('dm-modal');
    dmModal.style.display = 'flex';
    await loadDmInbox();
  };
}

async function updateDMMyAvatar() {
  const avatarEl = document.getElementById("dm-my-avatar");
  if (!avatarEl || !currentUser) return;

  let avatar =
    userStatsCache[currentUser.uid]?.avatar;

  if (!avatar) {
    try {
      const doc = await db
        .collection("userStats")
        .doc(currentUser.uid)
        .get();

      if (doc.exists) {
        avatar = doc.data().avatar;

        userStatsCache[currentUser.uid] =
          doc.data();
      }
    } catch (e) {
      console.error(e);
    }
  }

  avatarEl.src =
    avatar ||
    currentUser.photoURL ||
    ANONYMOUS_AVATAR;
}

  
// ==================== ANIMATION DISABLE ====================
function applyAnimationSetting(disabled) {
  const widget = document.getElementById('comment-widget') || document.body;
  if (disabled) {
    widget.classList.add('no-animations');
    document.documentElement.classList.add('no-animations');
  } else {
    widget.classList.remove('no-animations');
    document.documentElement.classList.remove('no-animations');
  }
}

function initAnimationSetting() {
  const disabled = localStorage.getItem('commentWidget_disableAnimations') === 'true';
  applyAnimationSetting(disabled);

  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'disable-animations-toggle') {
      applyAnimationSetting(e.target.checked);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimationSetting);
} else {
  initAnimationSetting();
}
