// ===========================
//  YEAR IN FOOTER
// ===========================
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ===========================
//  THEME TOGGLE (LIGHT/DARK)
// ===========================
const themeToggle = document.getElementById("themeToggle");
const rootHtml = document.documentElement;

function setTheme(theme) {
  rootHtml.setAttribute("data-bs-theme", theme);
  localStorage.setItem("openwall-theme", theme);

  if (themeToggle) {
    const label =
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.setAttribute("aria-label", label);
  }
}

(function initTheme() {
  const saved = localStorage.getItem("openwall-theme");
  if (saved === "light" || saved === "dark") {
    setTheme(saved);
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
})();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = rootHtml.getAttribute("data-bs-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });
}

// ===========================
//  PROTOTYPE BANNER
// ===========================
(function initPrototypeBanner() {
  if (document.getElementById("prototypeBanner")) return;

  const nav = document.querySelector(".navbar");
  if (!nav) return;

  const banner = document.createElement("div");
  banner.id = "prototypeBanner";
  banner.className = "text-center small";
  banner.style.backgroundColor = "var(--accent-soft)";
  banner.style.color = "var(--accent)";
  banner.style.borderBottom = "1px solid var(--card-border)";
  banner.style.padding = "0.35rem 0.75rem";

  banner.innerHTML = `
    This is a front-end prototype. Login & posts are stored only in this browser.
    <button
      type="button"
      id="dismissPrototypeBanner"
      class="btn btn-outline-soft btn-sm py-0 px-2 ms-2"
    >
      Got it
    </button>
  `;

  if (nav.parentNode) {
    nav.parentNode.insertBefore(banner, nav.nextSibling);
  }

  const dismissBtn = document.getElementById("dismissPrototypeBanner");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      banner.remove();
    });
  }
})();

// ===========================
//  MODAL AUTO-FOCUS
// ===========================
(function initModalFocus() {
  const loginModalEl = document.getElementById("loginModal");
  const signupModalEl = document.getElementById("signupModal");

  if (loginModalEl) {
    loginModalEl.addEventListener("shown.bs.modal", () => {
      const input =
        loginModalEl.querySelector("input[type='email']") ||
        loginModalEl.querySelector("input");
      if (input) input.focus();
    });
  }

  if (signupModalEl) {
    signupModalEl.addEventListener("shown.bs.modal", () => {
      const input = signupModalEl.querySelector("input");
      if (input) input.focus();
    });
  }
})();

// ===========================
//  SIMPLE AUTH (LOCALSTORAGE)
// ===========================
const USERS_KEY = "openwall-users";           // array of users
const CURRENT_USER_KEY = "openwall-current";  // current logged-in user
const POSTS_KEY = "openwall-posts";           // array of posts
const COMMENTS_KEY = "openwall-comments";     // map: postId -> array of comments

// Currently active topic filter (e.g. "projects", "introductions")
let activeTopic = null;

// Extract hashtags from post text, e.g. "Loving this #projects #DailyUpdate"
// → ["projects", "dailyupdate"]
function extractTagsFromText(text) {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Follows: map followerId -> [followedUserId, ...]
const FOLLOWS_KEY = "openwall-follows";

function loadFollows() {
  try {
    return JSON.parse(localStorage.getItem(FOLLOWS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveFollows(map) {
  localStorage.setItem(FOLLOWS_KEY, JSON.stringify(map));
}

function getFollowingIds(userId) {
  if (!userId) return [];
  const map = loadFollows();
  const entry = map[String(userId)];
  return Array.isArray(entry) ? entry : [];
}

function isFollowing(followerId, targetId) {
  if (!followerId || !targetId) return false;
  const following = getFollowingIds(followerId);
  return following.includes(targetId);
}

function toggleFollow(followerId, targetId) {
  if (!followerId || !targetId || followerId === targetId) return false;

  const map = loadFollows();
  const key = String(followerId);
  const list = Array.isArray(map[key]) ? map[key] : [];

  const idx = list.indexOf(targetId);
  let nowFollowing;
  if (idx === -1) {
    list.push(targetId);
    nowFollowing = true;
  } else {
    list.splice(idx, 1);
    nowFollowing = false;
  }

  map[key] = list;
  saveFollows(map);
  return nowFollowing;
}

// ===========================
//  POSTS (LOCALSTORAGE)
// ===========================
function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

// ===========================
//  COMMENTS (LOCALSTORAGE)
// ===========================
function loadCommentsMap() {
  try {
    return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveCommentsMap(map) {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(map));
}

function getCommentsForPost(postId) {
  const map = loadCommentsMap();
  return map[String(postId)] || [];
}

function addCommentToPost(postId, comment) {
  const map = loadCommentsMap();
  const key = String(postId);
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(comment);
  saveCommentsMap(map);
}

// ===========================
//  UTILS
// ===========================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function timeAgo(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  // Fallback to date
  return new Date(timestamp).toLocaleDateString();
}

// ===========================
//  TOPIC STATS & POPULAR TOPICS
// ===========================
function computeTopicStats() {
  const posts = loadPosts();
  const stats = {};

  posts.forEach((post) => {
    const tags = post.tags || [];
    const likes = typeof post.likes === "number" ? post.likes : 0;

    tags.forEach((rawTag) => {
      const tag = rawTag.toLowerCase();
      if (!stats[tag]) {
        stats[tag] = {
          topic: tag,
          totalLikes: 0,
          postCount: 0,
        };
      }
      stats[tag].postCount += 1;
      stats[tag].totalLikes += likes;
    });
  });

  return Object.values(stats).sort((a, b) => {
    if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes;
    return b.postCount - a.postCount;
  });
}

function renderPopularTopics() {
  const container = document.getElementById("popularTopics");
  if (!container) return;

  const stats = computeTopicStats();
  container.innerHTML = "";

  if (!stats.length) {
    const empty = document.createElement("small");
    empty.className = "text-body-secondary";
    empty.textContent =
      "No hashtags yet. Add #tags in your posts to see topics here.";
    container.appendChild(empty);
    return;
  }

  const topTopics = stats.slice(0, 6); // show top 6

  topTopics.forEach((s) => {
    const span = document.createElement("span");
    span.className = "tag-pill";
    span.dataset.topic = s.topic;

    const likes = s.totalLikes || 0;
    span.textContent = `#${s.topic} · ${likes}♥`;

    span.title = `${likes} like${likes === 1 ? "" : "s"} across ${
      s.postCount
    } post${s.postCount === 1 ? "" : "s"}`;

    container.appendChild(span);
  });
}

// ===========================
//  USER LIKE STATS & PEOPLE TO FOLLOW
// ===========================
function computeUserLikeStats() {
  const posts = loadPosts();
  const users = loadUsers();
  const stats = {};

  // Sum likes per userId
  posts.forEach((post) => {
    const userId = post.userId;
    if (!userId) return;
    const likes = typeof post.likes === "number" ? post.likes : 0;

    if (!stats[userId]) {
      stats[userId] = {
        userId,
        totalLikes: 0,
        postCount: 0,
      };
    }
    stats[userId].postCount += 1;
    stats[userId].totalLikes += likes;
  });

  // Map to include user details
  const result = Object.values(stats)
    .map((entry) => {
      const user = users.find((u) => u.id === entry.userId) || {};
      return {
        ...entry,
        name: user.name || "Unknown",
        username: user.username || "user",
        avatarUrl: user.avatarDataUrl || user.avatar || null, // ✅ fallback to old avatar too
      };
    })
    .sort((a, b) => {
      if (b.totalLikes !== a.totalLikes) {
        return b.totalLikes - a.totalLikes;
      }
      return b.postCount - a.postCount;
    });

  return result;
}

function renderPeopleToFollow() {
  const container = document.getElementById("peopleToFollow");
  if (!container) return;

  const currentUser = getCurrentUser();
  const stats = computeUserLikeStats();

  container.innerHTML = "";

  // Filter out current user if logged in
  const filtered = currentUser
    ? stats.filter((s) => s.userId !== currentUser.id)
    : stats;

  if (!filtered.length) {
    const empty = document.createElement("small");
    empty.className = "text-body-secondary";
    empty.textContent =
      "Once people start posting and receiving likes, suggested accounts will appear here.";
    container.appendChild(empty);
    return;
  }

  // Show top 3
  const topUsers = filtered.slice(0, 3);

  topUsers.forEach((u) => {
    const row = document.createElement("div");
    row.className =
      "d-flex align-items-center justify-content-between mb-2";

    const initials =
      (u.name || "")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    const avatarHtml = u.avatarUrl
      ? `
        <div class="mini-avatar">
          <img
            src="${escapeHtml(u.avatarUrl)}"
            alt="${escapeHtml(initials)}"
            class="post-avatar-img"
          />
        </div>
      `
      : `<div class="mini-avatar">${escapeHtml(initials)}</div>`;

    // Are we already following this user?
    const isCurrentFollowing =
      currentUser ? isFollowing(currentUser.id, u.userId) : false;

    const btnLabel = isCurrentFollowing ? "Following" : "Follow";
    const btnClasses = isCurrentFollowing
      ? "btn btn-main btn-sm px-2 py-1"
      : "btn btn-outline-soft btn-sm px-2 py-1";

    row.innerHTML = `
      <a
        href="profile.html?userId=${u.userId}"
        class="d-flex align-items-center text-reset text-decoration-none"
      >
        ${avatarHtml}
        <div>
          <div class="fw-semibold" style="font-size: 0.86rem;">
            ${escapeHtml(u.name)}
          </div>
          <div class="text-body-secondary" style="font-size: 0.78rem;">
            @${escapeHtml(u.username)} · ${u.totalLikes}♥
          </div>
        </div>
      </a>
      <button
        class="${btnClasses}"
        type="button"
        data-follow-user-id="${u.userId}"
      >
        ${btnLabel}
      </button>
    `;

    container.appendChild(row);
  });
}

// ===========================
//  ACTIVE FILTER BAR
// ===========================
function renderActiveTopicBar() {
  const bar = document.getElementById("activeFilterBar");
  const label = document.getElementById("activeFilterLabel");

  if (!bar || !label) return;

  if (activeTopic) {
    label.textContent = `Filtered by #${activeTopic}`;
    bar.hidden = false;
  } else {
    bar.hidden = true;
  }
}

// ===========================
//  RENDER COMMENTS
// ===========================
function renderCommentsForPost(postId, commentsSection) {
  const listEl = commentsSection.querySelector(".comment-list");
  if (!listEl) return;

  const comments = getCommentsForPost(postId);
  listEl.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.textContent = "No comments yet. Be the first to reply.";
    listEl.appendChild(empty);
    return;
  }

  comments
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((c) => {
      const item = document.createElement("div");
      item.className = "comment-item small";

      const when = timeAgo(c.createdAt || Date.now());

      item.innerHTML = `
        <div class="d-flex justify-content-between">
          <div>
            <strong>${escapeHtml(c.name || "Unknown")}</strong>
            <span class="text-body-secondary ms-1">@${escapeHtml(
              c.username || "user"
            )}</span>
          </div>
          <span class="text-body-secondary">${when}</span>
        </div>
        <div class="comment-body">
          ${escapeHtml(c.body || "")}
        </div>
      `;

      listEl.appendChild(item);
    });
}

// ===========================
//  RENDER POSTS
// ===========================
function renderPosts() {
  const container = document.getElementById("postList");
  if (!container) return;

  const allPosts = loadPosts().slice().sort((a, b) => b.createdAt - a.createdAt);
  const commentsMap = loadCommentsMap();
  const users = loadUsers();

  const posts = activeTopic
    ? allPosts.filter((post) => {
        const tags = post.tags || [];
        return tags.includes(activeTopic);
      })
    : allPosts;

  container.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.style.padding = "0.5rem 0.25rem";
    empty.textContent = activeTopic
      ? `No posts found for #${activeTopic}.`
      : "No posts yet. Be the first to share something.";
    container.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post-card";
    article.dataset.postId = post.id;

    const author = users.find((u) => u.id == post.userId) || {};
    const initials =
      (author.name || post.name || "")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    const avatarUrl = author.avatarDataUrl || author.avatar || null;
    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = post.likes ?? 0;
    const commentCount = (commentsMap[String(post.id)] || []).length;

    const avatarHtml = avatarUrl
      ? `
        <div class="post-avatar">
          <img
            src="${escapeHtml(avatarUrl)}"
            alt="${escapeHtml(initials)}"
            class="post-avatar-img"
          />
        </div>
      `
      : `<div class="post-avatar">${escapeHtml(initials)}</div>`;

    article.innerHTML = `
      <div class="d-flex gap-2">

        <!-- CLICKABLE AVATAR -->
        <a href="profile.html?userId=${post.userId}" class="post-avatar-link" style="text-decoration:none;">
          ${avatarHtml}
        </a>

        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">

            <!-- CLICKABLE NAME -->
            <div>
              <a href="profile.html?userId=${post.userId}" class="post-username-link">
                <span class="post-username">${escapeHtml(
                  author.name || post.name || "Unknown"
                )}</span>
              </a>
            </div>

            <span class="post-meta">${when} · ${escapeHtml(visibility)}</span>
          </div>

          <div class="post-body">
            ${escapeHtml(post.body || "")}
          </div>

          <div class="post-actions">
            <button type="button" class="like-btn" data-liked="false" data-count="${likes}">
              <span class="heart-icon">♡</span>
              <span class="like-count">${likes}</span>
            </button>

            <button type="button" class="comment-btn" data-post-id="${post.id}">
              <i>💬</i>
              <span class="comment-count">${commentCount}</span>
            </button>

            <button type="button">
              <i>↻</i> Share
            </button>
          </div>

          <div class="post-comments mt-2" data-comments-for="${post.id}" hidden>
            <div class="comment-list mb-2"></div>

            <form class="comment-form d-flex gap-2">
              <input
                type="text"
                class="form-control form-control-sm comment-input"
                placeholder="Write a comment…"
              />
              <button type="submit" class="btn btn-outline-soft btn-sm">
                Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
}

// ===========================
//  INIT POSTS
// ===========================
function initPosts() {
  // Seed demo posts if none exist
  let posts = loadPosts();
  if (!posts.length) {
    const now = Date.now();
    posts = [
      {
        id: now - 3,
        userId: 1,
        name: "Michael",
        username: "michael",
        body:
          "First test of the new OpenWall feed ✅  Soon this page will show real posts from real accounts, always sorted with the latest at the top. #projects",
        createdAt: now - 2 * 60 * 1000,
        visibility: "Public",
        likes: 1,
        tags: ["projects"],
      },
      {
        id: now - 2,
        userId: 2,
        name: "Alex Smith",
        username: "alex",
        body:
          "Imagine using this feed like a micro-blog: quick updates, photos, or longer reflections. You can follow people you care about and keep everything in one simple stream. #dailyupdate",
        createdAt: now - 10 * 60 * 1000,
        visibility: "Public",
        likes: 0,
        tags: ["dailyupdate"],
      },
      {
        id: now - 1,
        userId: 3,
        name: "Jordan",
        username: "jordan",
        body:
          "Next steps: accounts, likes, comments, and the ability to filter your wall by people and tags. For now this layout shows how everything will look when wired to your backend. #randomthoughts",
        createdAt: now - 32 * 60 * 1000,
        visibility: "Friends",
        likes: 0,
        tags: ["randomthoughts"],
      },
    ];
    savePosts(posts);
  }

  // ✅ Seed demo users to match those posts, if no users yet
  let users = loadUsers();
  if (!users.length) {
    users = [
      {
        id: 1,
        name: "Michael",
        username: "michael",
        email: "michael@example.com",
        password: "demo",
      },
      {
        id: 2,
        name: "Alex Smith",
        username: "alex",
        email: "alex@example.com",
        password: "demo",
      },
      {
        id: 3,
        name: "Jordan",
        username: "jordan",
        email: "jordan@example.com",
        password: "demo",
      },
    ];
    saveUsers(users);
  }

  renderPosts();
  renderPopularTopics();
  renderActiveTopicBar();
  renderPeopleToFollow(); // make People to follow work from the start
}

// ===========================
//  AUTH UI UPDATES
// ===========================
function updateAuthUI() {
  const user = getCurrentUser();

  const loginNavBtn = document.getElementById("loginNavBtn");
  const signupNavBtn = document.getElementById("signupNavBtn");

  const composerInput = document.querySelector(".composer-input");
  const composerNote = document.querySelector(".composer-note");

  const composerButton = document.querySelector(
    ".composer-card button.btn-main"
  );

  let userBadge = document.getElementById("navUserBadge");
  let logoutBtn = document.getElementById("navLogoutBtn");

  if (user) {
    if (loginNavBtn) loginNavBtn.style.display = "none";
    if (signupNavBtn) signupNavBtn.style.display = "none";

    const navActionContainer = loginNavBtn
      ? loginNavBtn.parentElement
      : document.querySelector(".navbar .d-flex.align-items-center.gap-2");

    if (navActionContainer) {
      // create badge as a LINK to the profile
      if (!userBadge) {
        userBadge = document.createElement("a");
        userBadge.id = "navUserBadge";
        userBadge.className = "badge rounded-pill px-3 py-2 me-1";
        userBadge.style.backgroundColor = "var(--accent-soft)";
        userBadge.style.color = "var(--accent)";
        userBadge.style.textDecoration = "none";
        navActionContainer.prepend(userBadge);
      }

      if (!logoutBtn) {
        logoutBtn = document.createElement("button");
        logoutBtn.id = "navLogoutBtn";
        logoutBtn.type = "button";
        logoutBtn.className = "btn btn-outline-soft btn-sm";
        logoutBtn.textContent = "Log out";
        navActionContainer.appendChild(logoutBtn);

        logoutBtn.addEventListener("click", () => {
          clearCurrentUser();
          updateAuthUI();
        });
      }
    }

    if (userBadge) {
      userBadge.textContent = `@${user.username}`;
      userBadge.href = `profile.html?userId=${encodeURIComponent(user.id)}`;
      userBadge.style.cursor = "pointer";
    }

    if (composerInput) {
      composerInput.disabled = false;
      composerInput.placeholder = `Share what's on your mind, ${user.name}…`;
    }
    if (composerNote) {
      composerNote.textContent = "Your posts will appear at the top of the wall.";
    }
    if (composerButton) {
      composerButton.disabled = false;
      composerButton.textContent = "Post";
      composerButton.removeAttribute("data-bs-toggle");
      composerButton.removeAttribute("data-bs-target");
    }
  } else {
    if (loginNavBtn) loginNavBtn.style.display = "";
    if (signupNavBtn) signupNavBtn.style.display = "";

    if (userBadge && userBadge.parentNode)
      userBadge.parentNode.removeChild(userBadge);
    if (logoutBtn && logoutBtn.parentNode)
      logoutBtn.parentNode.removeChild(logoutBtn);

    if (composerInput) {
      composerInput.disabled = true;
      composerInput.placeholder = "Share what's on your mind, Michael…";
    }
    if (composerNote) {
      composerNote.textContent = "Log in or create an account to start posting.";
    }
    if (composerButton) {
      composerButton.disabled = false;
      composerButton.textContent = "Log in to post";
      composerButton.setAttribute("data-bs-toggle", "modal");
      composerButton.setAttribute("data-bs-target", "#loginModal");
    }
  }
}

// ===========================
//  INIT POSTS + AUTH UI
// ===========================
initPosts();
updateAuthUI();

// ===========================
//  COMPOSER HANDLER (CREATE POST)
// ===========================
const composerInputEl = document.querySelector(".composer-input");
const composerButtonEl = document.querySelector(
  ".composer-card button.btn-main"
);

if (composerButtonEl && composerInputEl) {
  composerButtonEl.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      return;
    }

    const text = composerInputEl.value.trim();
    if (!text) return;

    const posts = loadPosts();
    const now = Date.now();

    posts.push({
      id: now,
      userId: user.id,
      name: user.name,
      username: user.username,
      body: text,
      createdAt: now,
      visibility: "Public",
      likes: 0,
      tags: extractTagsFromText(text),
    });

    savePosts(posts);
    composerInputEl.value = "";
    renderPosts();
    renderPopularTopics();
    renderActiveTopicBar();
    renderPeopleToFollow(); // new post can affect suggestions
  });

  composerInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      composerButtonEl.click();
    }
  });
}

// ===========================
//  SIGNUP HANDLER
// ===========================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName")?.value.trim();
    const username =
      document.getElementById("signupUsername")?.value.trim();
    const email = document
      .getElementById("signupEmail")
      ?.value.trim()
      .toLowerCase();
    const password = document
      .getElementById("signupPassword")
      ?.value.trim();

    if (!name || !username || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    const users = loadUsers();
    const existing = users.find((u) => u.email === email);
    if (existing) {
      alert("An account with that email already exists. Try logging in.");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      username,
      email,
      password,
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    updateAuthUI();

    const signupModalEl = document.getElementById("signupModal");
    if (signupModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(signupModalEl) ||
        new bootstrap.Modal(signupModalEl);
      modalInstance.hide();
    }

    signupForm.reset();
  });
}

// ===========================
//  LOGIN HANDLER
// ===========================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document
      .getElementById("loginEmail")
      ?.value.trim()
      .toLowerCase();
    const password = document
      .getElementById("loginPassword")
      ?.value.trim();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    const users = loadUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      alert("No matching account found. Check your credentials or sign up.");
      return;
    }

    setCurrentUser(user);
    updateAuthUI();

    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.hide();
    }

    loginForm.reset();
  });
}

// ===========================
//  LIKE BUTTON TOGGLE
// ===========================
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".like-btn");
  if (!btn) return;

  let liked = btn.getAttribute("data-liked") === "true";
  let count = parseInt(btn.getAttribute("data-count"), 10) || 0;

  liked = !liked;
  btn.setAttribute("data-liked", liked);

  count = liked ? count + 1 : Math.max(0, count - 1);
  btn.setAttribute("data-count", count);

  const heartEl = btn.querySelector(".heart-icon");
  const countEl = btn.querySelector(".like-count");

  if (heartEl) {
    heartEl.textContent = liked ? "♥" : "♡";
  }
  if (countEl) {
    countEl.textContent = count;
  }

  const article = btn.closest(".post-card");
  if (article && article.dataset.postId) {
    const postId = Number(article.dataset.postId);
    const posts = loadPosts();
    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      posts[index].likes = count;
      savePosts(posts);
      renderPopularTopics();   // likes affect topic rankings
      renderPeopleToFollow();  // likes affect people suggestions
    }
  }
});

// ===========================
//  FOLLOW / UNFOLLOW BUTTONS
// ===========================
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-follow-user-id]");
  if (!btn) return;

  const current = getCurrentUser();
  if (!current) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to follow people.");
    }
    return;
  }

  const targetId = Number(btn.getAttribute("data-follow-user-id"));
  if (!targetId || targetId === current.id) return;

  const nowFollowing = toggleFollow(current.id, targetId);

  btn.textContent = nowFollowing ? "Following" : "Follow";
  btn.classList.toggle("btn-main", nowFollowing);
  btn.classList.toggle("btn-outline-soft", !nowFollowing);

  // Refresh suggestions so people you follow can drop out if needed
  renderPeopleToFollow();
});

// ===========================
//  COMMENT BUTTON TOGGLE PANEL
// ===========================
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".comment-btn");
  if (!btn) return;

  const article = btn.closest(".post-card");
  if (!article || !article.dataset.postId) return;

  const postId = Number(article.dataset.postId);
  const commentsSection = article.querySelector(".post-comments");
  if (!commentsSection) return;

  const isHidden = commentsSection.hasAttribute("hidden");
  if (isHidden) {
    commentsSection.removeAttribute("hidden");
    renderCommentsForPost(postId, commentsSection);
    const input = commentsSection.querySelector(".comment-input");
    if (input) input.focus();
  } else {
    commentsSection.setAttribute("hidden", "true");
  }
});

// ===========================
//  COMMENT FORM SUBMIT
// ===========================
document.addEventListener("submit", function (e) {
  const form = e.target.closest(".comment-form");
  if (!form) return;

  e.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to add a comment.");
    }
    return;
  }

  const article = form.closest(".post-card");
  if (!article || !article.dataset.postId) return;

  const postId = Number(article.dataset.postId);
  const input = form.querySelector(".comment-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const comment = {
    id: Date.now(),
    postId,
    userId: user.id,
    username: user.username,
    name: user.name,
    body: text,
    createdAt: Date.now(),
  };

  addCommentToPost(postId, comment);
  input.value = "";

  const commentsSection = article.querySelector(".post-comments");
  if (commentsSection) {
    renderCommentsForPost(postId, commentsSection);
  }

  const countEl = article.querySelector(".comment-btn .comment-count");
  if (countEl) {
    let currentCount = parseInt(countEl.textContent || "0", 10) || 0;
    currentCount += 1;
    countEl.textContent = currentCount;
  }
});

// ===========================
//  TOPIC PILL FILTER + CLEAR
// ===========================
document.addEventListener("click", function (e) {
  // Clear filter button
  const clearBtn = e.target.closest("#clearFilterBtn");
  if (clearBtn) {
    activeTopic = null;
    document
      .querySelectorAll(".tag-pill[data-topic].active")
      .forEach((pill) => pill.classList.remove("active"));
    renderPosts();
    renderActiveTopicBar();
    renderPopularTopics();
    const feed = document.getElementById("postList");
    if (feed) {
      feed.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  // Topic pill
  const pill = e.target.closest(".tag-pill[data-topic]");
  if (!pill) return;

  const topic = pill.dataset.topic;

  if (activeTopic === topic) {
    activeTopic = null;
    pill.classList.remove("active");
  } else {
    activeTopic = topic;
    document
      .querySelectorAll(".tag-pill[data-topic].active")
      .forEach((el) => el.classList.remove("active"));
    pill.classList.add("active");
  }

  renderPosts();
  renderActiveTopicBar();

  const feed = document.getElementById("postList");
  if (feed) {
    feed.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
