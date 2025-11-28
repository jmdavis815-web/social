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
//  BASIC CONSTANTS & HELPERS
// ===========================
const USERS_KEY = "openwall-users";
const POSTS_KEY = "openwall-posts";
const COMMENTS_KEY = "openwall-comments"; // shared with index.js
const CURRENT_USER_KEY = "openwall-current";

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

  return new Date(timestamp).toLocaleDateString();
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

// Comments map: postId -> [comments]
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

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ===========================
//  TOAST HELPERS
// ===========================
let toastSuccessInstance = null;
let toastErrorInstance = null;

function initToasts() {
  if (typeof bootstrap === "undefined") return;

  const successEl = document.getElementById("toastSuccess");
  const errorEl = document.getElementById("toastError");

  if (successEl) {
    toastSuccessInstance = bootstrap.Toast.getOrCreateInstance(successEl);
  }
  if (errorEl) {
    toastErrorInstance = bootstrap.Toast.getOrCreateInstance(errorEl);
  }
}

function showToastSuccess(message) {
  if (typeof bootstrap === "undefined") return;
  const el = document.getElementById("toastSuccess");
  if (!el) return;

  const body = el.querySelector(".toast-body");
  if (body && message) body.textContent = message;

  const t = toastSuccessInstance || bootstrap.Toast.getOrCreateInstance(el);
  t.show();
}

function showToastError(message) {
  if (typeof bootstrap === "undefined") return;
  const el = document.getElementById("toastError");
  if (!el) return;

  const body = el.querySelector(".toast-body");
  if (body && message) body.textContent = message;

  const t = toastErrorInstance || bootstrap.Toast.getOrCreateInstance(el);
  t.show();
}

// ===========================
//  PROFILE DATA HELPERS
// ===========================
function getProfileUser() {
  const users = loadUsers();
  if (!users.length) return null;

  const idParam = getParam("userId");
  if (idParam) {
    const numericId = Number(idParam);
    let user = users.find((u) => u.id === numericId);
    if (!user) {
      user = users.find((u) => String(u.id) === idParam);
    }
    if (user) return user;
  }

  const current = getCurrentUser();
  if (current) {
    const fresh = users.find((u) => u.id === current.id);
    return fresh || current;
  }

  return users[0];
}

function getAvatarUrlForUser(user) {
  if (!user) return null;

  // Prefer new format
  if (user.avatarDataUrl) return user.avatarDataUrl;

  // Fallback: support old or mismatched saves
  if (user.avatar) return user.avatar;

  return null;
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function computeUserStats(userId) {
  const posts = loadPosts();
  let postCount = 0;
  let totalLikes = 0;

  posts.forEach((p) => {
    if (p.userId === userId) {
      postCount += 1;
      const likes = typeof p.likes === "number" ? p.likes : 0;
      totalLikes += likes;
    }
  });

  return { postCount, totalLikes };
}

function computeUserTopics(userId) {
  const posts = loadPosts();
  const topicStats = {};

  posts.forEach((p) => {
    if (p.userId !== userId) return;
    const tags = p.tags || [];
    const likes = typeof p.likes === "number" ? p.likes : 0;

    tags.forEach((raw) => {
      const tag = raw.toLowerCase();
      if (!topicStats[tag]) {
        topicStats[tag] = { topic: tag, postCount: 0, totalLikes: 0 };
      }
      topicStats[tag].postCount += 1;
      topicStats[tag].totalLikes += likes;
    });
  });

  return Object.values(topicStats).sort((a, b) => {
    if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes;
    return b.postCount - a.postCount;
  });
}

// ===========================
//  RENDER PROFILE HEADER
// ===========================
function renderProfileHeader(user, isOwnProfile) {
  const headerEl = document.getElementById("profileHeader");
  if (!headerEl) return;

  const stats = computeUserStats(user.id);
  const avatarUrl = getAvatarUrlForUser(user);
  const initials = getInitials(user.name);

  let avatarInner = "";
if (avatarUrl) {
  avatarInner = `
    <img
      src="${avatarUrl}"
      alt="${escapeHtml(user.name || "Avatar")}"
      class="post-avatar-img"
    />
  `;
} else {
  avatarInner = escapeHtml(initials);
}

  headerEl.innerHTML = `
    <div class="card-body d-flex align-items-center gap-3">
      <div class="post-avatar">
        ${avatarInner}
      </div>
      <div>
        <h1 class="h5 mb-1">${escapeHtml(user.name || "Unnamed user")}</h1>
        <div class="text-body-secondary small mb-1">
          @${escapeHtml(user.username || "user")}
          ${
            isOwnProfile
              ? '<span class="ms-1 badge bg-secondary-subtle text-body-secondary border">You</span>'
              : ""
          }
        </div>
        <div class="small text-body-secondary">
          <span>${stats.postCount} post${
    stats.postCount === 1 ? "" : "s"
  }</span>
          <span class="ms-2">${stats.totalLikes} like${
    stats.totalLikes === 1 ? "" : "s"
  }</span>
        </div>
      </div>
    </div>
  `;
}

// ===========================
//  RENDER ABOUT CARD
// ===========================
function renderProfileAbout(user) {
  const aboutEl = document.getElementById("profileAbout");
  if (!aboutEl) return;

  const bio = user.bio || "No bio yet.";
  const location = user.location || "—";
  const website = user.website || "";

  const websiteDisplay = website || "—";
  const websiteHref =
    website && !/^https?:\/\//i.test(website)
      ? `https://${website}`
      : website || "#";

  aboutEl.innerHTML = `
    <div class="card-body">
      <h2 class="h6 mb-2">About</h2>
      <p class="mb-2 text-body-secondary">${escapeHtml(bio)}</p>
      <p class="small mb-1">
        <strong>Location:</strong>
        <span class="ms-1">${escapeHtml(location)}</span>
      </p>
      <p class="small mb-0">
        <strong>Website:</strong>
        ${
          website
            ? `<a href="${escapeHtml(
                websiteHref
              )}" target="_blank" rel="noopener noreferrer" class="ms-1">
                 ${escapeHtml(websiteDisplay)}
               </a>`
            : '<span class="ms-1">—</span>'
        }
      </p>
    </div>
  `;
}

// ===========================
//  RENDER TOPICS (SIDEBAR)
// ===========================
function renderProfileTopics(user) {
  const topicsEl = document.getElementById("profileTopics");
  if (!topicsEl) return;

  const topics = computeUserTopics(user.id);
  topicsEl.innerHTML = "";

  if (!topics.length) {
    const small = document.createElement("small");
    small.className = "text-body-secondary";
    small.textContent = "Topics the user posts about will appear here.";
    topicsEl.appendChild(small);
    return;
  }

  topics.forEach((t) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = `#${t.topic} · ${t.totalLikes}♥`;
    pill.title = `${t.totalLikes} like${
      t.totalLikes === 1 ? "" : "s"
    } across ${t.postCount} post${t.postCount === 1 ? "" : "s"}`;
    topicsEl.appendChild(pill);
  });
}

// ===========================
//  RENDER COMMENTS FOR A POST
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
//  RENDER PROFILE POSTS
// ===========================
function renderProfilePosts(user) {
  const postsContainer = document.getElementById("profilePosts");
  if (!postsContainer) return;

  const allPosts = loadPosts()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  const userPosts = allPosts.filter((p) => p.userId === user.id);
  const commentsMap = loadCommentsMap();

  postsContainer.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h6 mb-0">Posts</h2>
      </div>
      <div id="profilePostList"></div>
    </div>
  `;

  const listEl = postsContainer.querySelector("#profilePostList");

  if (!userPosts.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.textContent = "This user hasn't posted anything yet.";
    listEl.appendChild(empty);
    return;
  }

  const initials = getInitials(user.name);
  const avatarUrl = getAvatarUrlForUser(user);
  const avatarInner = avatarUrl
  ? `
    <img
      src="${avatarUrl}"
      alt="${escapeHtml(user.name || "Avatar")}"
      class="post-avatar-img"
    />
  `
  : escapeHtml(initials);

  userPosts.forEach((post) => {
    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = post.likes ?? 0;
    const commentCount = (commentsMap[String(post.id)] || []).length;

    const article = document.createElement("article");
    article.className = "post-card mb-2";
    article.dataset.postId = post.id;

    const bodyHtml = escapeHtml(post.body || "").replace(/\n/g, "<br>");

    article.innerHTML = `
      <div class="d-flex gap-2">
        <div class="post-avatar">
          ${avatarInner}
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <div>
              <span class="post-username">${escapeHtml(
                post.name || user.name || "Unknown"
              )}</span>
            </div>
            <span class="post-meta">${when} · ${escapeHtml(visibility)}</span>
          </div>
          <div class="post-body">
            ${bodyHtml}
          </div>
          <div class="post-actions">
            <button
              type="button"
              class="like-btn"
              data-liked="false"
              data-count="${likes}"
            >
              <span class="heart-icon">♡</span>
              <span class="like-count">${likes}</span>
            </button>
            <button
              type="button"
              class="comment-btn"
              data-post-id="${post.id}"
            >
              <i>💬</i>
              <span class="comment-count">${commentCount}</span>
            </button>
            <button type="button">
              <i>↻</i> Share
            </button>
          </div>

          <div
            class="post-comments mt-2"
            data-comments-for="${post.id}"
            hidden
          >
            <div class="comment-list mb-2"></div>
            <form class="comment-form d-flex gap-2">
              <input
                type="text"
                class="form-control form-control-sm comment-input"
                placeholder="Write a comment…"
              />
              <button
                type="submit"
                class="btn btn-outline-soft btn-sm"
              >
                Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    listEl.appendChild(article);
  });
}

// ===========================
//  EDIT PROFILE FORM HANDLER
// ===========================
let pendingAvatarDataUrl = null;

function setupEditProfileForm(user, isOwnProfile) {
  const editCard = document.getElementById("profileEditCard");
  const form = document.getElementById("profileEditForm");
  if (!editCard || !form) return;

  if (!isOwnProfile) {
    editCard.hidden = true;
    return;
  }

  editCard.hidden = false;

  const nameInput = document.getElementById("editName");
  const usernameInput = document.getElementById("editUsername");
  const locationInput = document.getElementById("editLocation");
  const websiteInput = document.getElementById("editWebsite");
  const bioInput = document.getElementById("editBio");
  const avatarInput = document.getElementById("editAvatarInput");

  if (nameInput) nameInput.value = user.name || "";
  if (usernameInput) usernameInput.value = user.username || "";
  if (locationInput) locationInput.value = user.location || "";
  if (websiteInput) websiteInput.value = user.website || "";
  if (bioInput) bioInput.value = user.bio || "";

  pendingAvatarDataUrl = user.avatarDataUrl || null;

  if (avatarInput) {
    avatarInput.value = "";
    avatarInput.onchange = function () {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) {
        pendingAvatarDataUrl = user.avatarDataUrl || null;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        pendingAvatarDataUrl = event.target.result;
      };
      reader.onerror = () => {
        pendingAvatarDataUrl = user.avatarDataUrl || null;
        showToastError("Could not read that image file.");
      };
      reader.readAsDataURL(file);
    };
  }

  form.onsubmit = function (e) {
    e.preventDefault();

    try {
      const users = loadUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) {
        showToastError("Profile not found in storage.");
        return;
      }

      const updatedUser = { ...users[idx] };

      if (nameInput) updatedUser.name = nameInput.value.trim() || updatedUser.name;
      if (usernameInput)
        updatedUser.username = usernameInput.value.trim() || updatedUser.username;
      if (locationInput) updatedUser.location = locationInput.value.trim();
      if (websiteInput) updatedUser.website = websiteInput.value.trim();
      if (bioInput) updatedUser.bio = bioInput.value.trim();

      if (pendingAvatarDataUrl) {
        updatedUser.avatarDataUrl = pendingAvatarDataUrl;
      }

      // Save users
      users[idx] = updatedUser;
      saveUsers(users);

      const current = getCurrentUser();
      if (current && current.id === updatedUser.id) {
        setCurrentUser(updatedUser);
      }

      // Update posts to reflect new name/username
      const posts = loadPosts();
      let changed = false;
      posts.forEach((p) => {
        if (p.userId === updatedUser.id) {
          p.name = updatedUser.name;
          p.username = updatedUser.username;
          changed = true;
        }
      });
      if (changed) {
        savePosts(posts);
      }

      // Re-render profile sections
      renderProfileHeader(updatedUser, true);
      renderProfileAbout(updatedUser);
      renderProfileTopics(updatedUser);
      renderProfilePosts(updatedUser);

      showToastSuccess("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      showToastError("Something went wrong. Please try again.");
    }
  };
}

// ===========================
//  MAIN RENDER
// ===========================
function renderProfile() {
  const profileUser = getProfileUser();
  if (!profileUser) {
    const headerEl = document.getElementById("profileHeader");
    if (headerEl) {
      headerEl.innerHTML =
        '<div class="card-body text-body-secondary small">No users found. Create an account from the main feed first.</div>';
    }
    return;
  }

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser && currentUser.id === profileUser.id;

  renderProfileHeader(profileUser, isOwnProfile);
  renderProfileAbout(profileUser);
  renderProfileTopics(profileUser);
  renderProfilePosts(profileUser);
  setupEditProfileForm(profileUser, isOwnProfile);
}

// ===========================
//  LIKE / COMMENT HANDLERS
// ===========================

// Like toggle (profile posts)
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".like-btn");
  if (!btn) return;

  // Only handle likes inside profilePosts card
  if (!btn.closest("#profilePosts")) return;

  let liked = btn.getAttribute("data-liked") === "true";
  let count = parseInt(btn.getAttribute("data-count"), 10) || 0;

  liked = !liked;
  btn.setAttribute("data-liked", liked);

  count = liked ? count + 1 : Math.max(0, count - 1);
  btn.setAttribute("data-count", count);

  const heartEl = btn.querySelector(".heart-icon");
  const countEl = btn.querySelector(".like-count");

  if (heartEl) heartEl.textContent = liked ? "♥" : "♡";
  if (countEl) countEl.textContent = count;

  const article = btn.closest(".post-card");
  if (!article || !article.dataset.postId) return;

  const postId = Number(article.dataset.postId);
  const posts = loadPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index !== -1) {
    posts[index].likes = count;
    savePosts(posts);
  }

  const profileUser = getProfileUser();
  if (profileUser) {
    renderProfileTopics(profileUser);
  }
});

// Comment panel toggle
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".comment-btn");
  if (!btn) return;
  if (!btn.closest("#profilePosts")) return;

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

// Comment submit
document.addEventListener("submit", function (e) {
  const form = e.target.closest(".comment-form");
  if (!form) return;
  if (!form.closest("#profilePosts")) return;

  e.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    // On this page we don't have the login modal, so just alert.
    alert("Log in to add a comment.");
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
//  INIT
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  initToasts();
  renderProfile();
});
