// ===========================
//  FIREBASE APP + FIRESTORE
// ===========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// 🔹 Your Firebase web config
const firebaseConfig = {
  apiKey: "AIzaSyCx_ChAZXvx1CX-GBNbgiv1znL95z8JCJo",
  authDomain: "openwall-b9fc7.firebaseapp.com",
  projectId: "openwall-b9fc7",
  storageBucket: "openwall-b9fc7.firebasestorage.app",
  messagingSenderId: "584620300362",
  appId: "1:584620300362:web:c313bcc2c982b638a16eb3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Collections
const usersCol = collection(db, "users");
const postsCol = collection(db, "posts");
const followsCol = collection(db, "follows");   // followerId -> targetId
const commentsCol = collection(db, "comments"); // comments for posts

// ===========================
//  LOCAL STORAGE KEYS
// ===========================
const USERS_KEY = "openwall-users";           // array of users
const CURRENT_USER_KEY = "openwall-current";  // current logged-in user
const POSTS_KEY = "openwall-posts";           // array of posts
const COMMENTS_KEY = "openwall-comments";     // map: postId -> array of comments
const FOLLOWS_KEY = "openwall-follows";       // map followerId -> [followedUserId, ...]
const LIKES_KEY = "openwall-likes";           // map userId -> [likedPostId, ...]

function loadLikes() {
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLikes(map) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(map));
}

// Returns an array of postIds this user has liked
function getUserLikedPostIds(userId) {
  if (!userId) return [];
  const map = loadLikes();
  const entry = map[String(userId)];
  return Array.isArray(entry) ? entry : [];
}

function hasUserLikedPost(userId, postId) {
  if (!userId || !postId) return false;
  const likedIds = getUserLikedPostIds(userId);
  return likedIds.includes(postId);
}

// Set or clear a like for (userId, postId)
function setUserLike(userId, postId, liked) {
  if (!userId || !postId) return;

  const map = loadLikes();
  const key = String(userId);
  let list = Array.isArray(map[key]) ? map[key] : [];

  const idx = list.indexOf(postId);
  if (liked) {
    if (idx === -1) list.push(postId);
  } else {
    if (idx !== -1) list.splice(idx, 1);
  }

  map[key] = list;
  saveLikes(map);
}

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
    This is a front-end prototype. Data is stored in Firestore + this browser.
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
//  SIMPLE AUTH HELPERS
// ===========================
let activeTopic = null; // current hashtag filter
let activeFeedFilter = "following"; // "following" | "all"
let activeSearchQuery = "";

function extractTagsFromText(text) {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY)) || [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function loadCommentsMap() {
  try {
    return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
  } catch {
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

function addCommentToLocal(postId, comment) {
  const map = loadCommentsMap();
  const key = String(postId);
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(comment);
  saveCommentsMap(map);
}

function loadFollows() {
  try {
    return JSON.parse(localStorage.getItem(FOLLOWS_KEY)) || {};
  } catch {
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

function getFollowerIds(userId) {
  if (!userId) return [];
  const map = loadFollows();
  const targetKey = String(userId);
  const followers = [];

  for (const [followerId, followingList] of Object.entries(map)) {
    if (Array.isArray(followingList) && followingList.includes(targetKey)) {
      followers.push(followerId); // keep as string; we only need counts
    }
  }
  return followers;
}

function isFollowing(followerId, targetId) {
  if (!followerId || !targetId) return false;
  const targetKey = String(targetId);
  const following = getFollowingIds(followerId).map(String);
  return following.includes(targetKey);
}

function toggleFollowLocal(followerId, targetId) {
  if (!followerId || !targetId || String(followerId) === String(targetId)) {
    return false;
  }

  const map = loadFollows();
  const followerKey = String(followerId);
  const targetKey = String(targetId);

  let list = Array.isArray(map[followerKey]) ? map[followerKey] : [];

  const idx = list.indexOf(targetKey);
  let nowFollowing;
  if (idx === -1) {
    list.push(targetKey);
    nowFollowing = true;
  } else {
    list.splice(idx, 1);
    nowFollowing = false;
  }

  map[followerKey] = list;
  saveFollows(map);
  return nowFollowing;
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

  return new Date(timestamp).toLocaleDateString();
}

// Just read an image file as a data URL (no resize)
async function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Resize helper
async function resizeImageTo300px(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const maxSize = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round(height * (maxSize / width));
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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

  const topTopics = stats.slice(0, 6);

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

  const result = Object.values(stats)
    .map((entry) => {
      const user = users.find((u) => u.id == entry.userId) || {};
      return {
        ...entry,
        name: user.name || "Unknown",
        username: user.username || "user",
        avatarUrl: user.avatarDataUrl || user.avatar || null,
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
      : `
      <div class="mini-avatar">
        ${escapeHtml(initials)}
      </div>
    `;

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
//  RENDER POSTS ON MAIN WALL
// ===========================
function renderPosts() {
  const container = document.getElementById("postList");
  if (!container) return;

  // Load posts & sort newest first
  const allPosts = loadPosts()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  // Apply hashtag filter if active
  let posts = allPosts;
  if (activeTopic) {
    posts = allPosts.filter((p) => {
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      return tags.includes(activeTopic);
    });
  }

  if (activeFeedFilter === "following" && currentUser) {
    const followingIds = getFollowingIds(currentUser.id);

    posts = posts.filter((p) => {
      // Always show your own posts
      if (p.userId === currentUser.id) return true;
      // Otherwise only posts from people you follow
      return followingIds.includes(p.userId);
    });
  }

  container.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.textContent = activeTopic
      ? `No posts found for #${activeTopic} yet.`
      : activeFeedFilter === "following"
      ? "No posts from people you follow yet. Try the All tab."
      : "No posts yet. Be the first to post!";
    container.appendChild(empty);
    return;
  }

    // 🔹 Apply "Following" vs "All" feed filter
  const currentUser = getCurrentUser();
  if (!currentUser) {
    // If not logged in, always show ALL
    activeFeedFilter = "all";
  }

  if (activeFeedFilter === "following" && currentUser) {
    const followingIds = getFollowingIds(currentUser.id);

    posts = posts.filter((p) => {
      // Always show your own posts
      if (p.userId === currentUser.id) return true;
      // Otherwise only posts from people you follow
      return followingIds.includes(p.userId);
    });
  }

  // 🔍 Apply text / topic search if present
  const q = (activeSearchQuery || "").trim().toLowerCase();
  if (q) {
    posts = posts.filter((p) => {
      const body = (p.body || "").toLowerCase();
      const tags = (p.tags || []).map((t) => String(t).toLowerCase());

      const inBody = body.includes(q);
      const inTags = tags.some((tag) => tag.includes(q));

      return inBody || inTags;
    });
  }

  container.innerHTML = "";

  const users = loadUsers();

  posts.forEach((post) => {
    const author =
      users.find((u) => u.id === post.userId) || {
        name: post.name || "Unknown",
        username: post.username || "user",
      };

    const initials =
      (author.name || "U")
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    const avatarUrl = author.avatarDataUrl || author.avatar || null;
    const avatarInner = `
      <a href="profile.html?userId=${author.id}" class="avatar-link">
        ${
          avatarUrl
            ? `<img
                 src="${escapeHtml(avatarUrl)}"
                 alt="${escapeHtml(author.name || "Avatar")}"
                 class="post-avatar-img"
               />`
            : `<div class="post-avatar-fallback">${escapeHtml(initials)}</div>`
        }
      </a>
    `;

    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = typeof post.likes === "number" ? post.likes : 0;
    const commentsForPost = getCommentsForPost(post.id);
    const commentCount = commentsForPost.length;
    const userLiked =
      currentUser && hasUserLikedPost(currentUser.id, post.id);

    const canDelete = currentUser && currentUser.id === post.userId;

    const bodyHtml = escapeHtml(post.body || "").replace(/\n/g, "<br>");

    const postImageHtml = post.imageDataUrl
      ? `
        <div class="post-image mt-2">
          <img
            src="${escapeHtml(post.imageDataUrl)}"
            alt="Post image"
            class="post-image-img"
          />
        </div>
      `
      : "";

    const article = document.createElement("article");
    article.className = "post-card mb-2";
    article.dataset.postId = post.id;
    article.id = `post-${post.id}`;

    article.innerHTML = `
      <div class="d-flex gap-2">
        <div class="post-avatar">
          ${avatarInner}
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <div>
              <span class="post-username">
                ${escapeHtml(author.name || "Unknown")}
              </span>
              <span class="text-body-secondary small ms-1">
                @${escapeHtml(author.username || "user")}
              </span>
            </div>
            <div class="d-flex align-items-center gap-2">
              ${
                canDelete
                  ? `<button
                       type="button"
                       class="btn btn-link btn-sm text-danger p-0 delete-post-btn"
                       data-post-id="${post.id}"
                     >
                       Delete
                     </button>`
                  : ""
              }
              <span class="post-meta small text-body-secondary">
                ${when} · ${escapeHtml(visibility)}
              </span>
            </div>
          </div>

          <div class="post-body">
            ${bodyHtml}
            ${postImageHtml}
          </div>

          <div class="post-actions mt-1">
            <button
              type="button"
              class="like-btn"
              data-liked="${userLiked}"
              data-count="${likes}"
            >
              <span class="heart-icon">${userLiked ? "♥" : "♡"}</span>
              <span class="like-count">${likes}</span>
            </button>

            <button type="button" class="comment-btn">
              💬 <span class="comment-count">${commentCount}</span>
            </button>

            <button
              type="button"
              class="share-btn"
              data-post-id="${post.id}"
            >
              ↻ Share
            </button>
          </div>

          <div class="post-comments mt-2" hidden>
            <div class="comment-list mb-2"></div>
            <form class="comment-form">
              <div class="d-flex gap-2 mb-1">
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
              </div>
              <input
                type="file"
                class="form-control form-control-sm comment-image-input"
                accept="image/*"
              />
            </form>
          </div>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
}

// ===========================
//  RENDER COMMENTS FOR A POST
// ===========================
function renderCommentsForPost(postId, commentsSection) {
  if (!commentsSection) return;

  const listEl = commentsSection.querySelector(".comment-list");
  if (!listEl) return;

  const comments = getCommentsForPost(postId);
  listEl.innerHTML = "";

  if (!comments.length) {
    listEl.innerHTML = `
      <div class="text-body-secondary small">
        No comments yet. Be the first to reply.
      </div>
    `;
    return;
  }

  const posts = loadPosts();
  const post = posts.find((p) => p.id === postId);
  const currentUser = getCurrentUser();

  comments
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .forEach((c) => {
      const item = document.createElement("div");
      item.className = "comment-item small";

      const when = timeAgo(c.createdAt || Date.now());

      const canDelete =
        currentUser &&
        (currentUser.id === c.userId ||
          (post && currentUser.id === post.userId));

      const deleteBtnHtml = canDelete
        ? `
        <button
          type="button"
          class="btn btn-link btn-sm text-danger p-0 ms-2 delete-comment-btn"
          data-comment-id="${c.id}"
          data-post-id="${postId}"
          data-comment-user-id="${c.userId}"
        >
          Delete
        </button>
      `
        : "";

      const imageHtml = c.imageDataUrl
        ? `
        <div class="mt-1">
          <img
            src="${escapeHtml(c.imageDataUrl)}"
            alt="Comment image"
            class="comment-image"
          />
        </div>
      `
        : "";

      const displayName = c.name || "Unknown";
      const displayHandle = c.username || "user";
      const initials = displayName.charAt(0).toUpperCase();

      const avatarHtml = c.avatarDataUrl
        ? `
        <div class="comment-avatar">
          <img
            src="${escapeHtml(c.avatarDataUrl)}"
            alt="${escapeHtml(displayName || "Avatar")}"
          />
        </div>
      `
        : `
        <div class="comment-avatar comment-avatar-fallback">
          ${escapeHtml(initials)}
        </div>
      `;

      const bodyText = c.body ?? c.text ?? "";

      item.innerHTML = `
      <div class="d-flex align-items-start">
        ${avatarHtml}
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${escapeHtml(displayName)}</strong>
              <span class="text-body-secondary ms-1">
                @${escapeHtml(displayHandle)}
              </span>
            </div>
            <div class="d-flex align-items-center">
              <span class="text-body-secondary small">${when}</span>
              ${deleteBtnHtml}
            </div>
          </div>
          <div class="comment-body">
            ${escapeHtml(bodyText)}
          </div>
          ${imageHtml}
        </div>
      </div>
    `;

      listEl.appendChild(item);
    });
}

// ===========================
//  FIRESTORE SYNC
// ===========================
async function syncPostsFromFirestore() {
  const postsSnap = await getDocs(query(postsCol, orderBy("createdAt", "desc")));
  let posts = [];

  if (postsSnap.empty) {
    // Demo posts ONLY in localStorage (do NOT write to Firestore)
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
  } else {
    posts = postsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id ?? Number(d.id),
        ...data,
      };
    });
  }

  savePosts(posts);
}

async function syncFollowsFromFirestore() {
  const snap = await getDocs(followsCol);
  const map = {};
  snap.forEach((d) => {
    const f = d.data();
    const followerId = String(f.followerId);
    const targetId = String(f.targetId); // 👈 make sure this is string

    if (!map[followerId]) map[followerId] = [];
    if (!map[followerId].includes(targetId)) {
      map[followerId].push(targetId);
    }
  });
  saveFollows(map);
}

async function syncCommentsFromFirestore() {
  const snap = await getDocs(commentsCol);
  const map = {};
  snap.forEach((d) => {
    const c = d.data();
    const key = String(c.postId);
    if (!map[key]) map[key] = [];
    map[key].push(c);
  });
  saveCommentsMap(map);
}

async function syncUsersFromFirestore() {
  const usersSnap = await getDocs(usersCol);
  let users = [];

  if (usersSnap.empty) {
    // Demo users ONLY in localStorage (do NOT write to Firestore)
    users = [
      {
        id: 1,
        name: "Michael",
        username: "michael",
        email: "michael@example.com",
      },
      {
        id: 2,
        name: "Alex Smith",
        username: "alex",
        email: "alex@example.com",
      },
      {
        id: 3,
        name: "Jordan",
        username: "jordan",
        email: "jordan@example.com",
      },
    ];
  } else {
    users = usersSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id ?? d.id,
        ...data,
      };
    });
  }

  saveUsers(users);
}

function initTopicSearchBar() {
  const input = document.getElementById("topicSearchInput");
  if (!input) return;

  // Restore any existing query if you navigate away & back
  input.value = activeSearchQuery;

  // Prevent Enter from accidentally submitting anything
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    activeSearchQuery = input.value;
    renderPosts();
  });
}

// ===========================
//  INIT POSTS
// ===========================
function initPosts() {
  renderFeedFilterBar();
  initTopicSearchBar();      // 🔍 NEW
  renderPosts();
  renderPopularTopics();
  renderActiveTopicBar();
  renderPeopleToFollow();
}

function renderFeedFilterBar() {
  const bar = document.getElementById("feedFilterBar");
  if (!bar) return;

  const btnFollowing = document.getElementById("feedFilterFollowing");
  const btnAll = document.getElementById("feedFilterAll");
  const currentUser = getCurrentUser();

  // If not logged in, force All
  if (!currentUser) {
    activeFeedFilter = "all";
  }

  if (btnFollowing) {
    const isActive = activeFeedFilter === "following" && !!currentUser;
    btnFollowing.classList.toggle("btn-main", isActive);
    btnFollowing.classList.toggle("btn-outline-soft", !isActive);
    btnFollowing.disabled = !currentUser; // can't use Following if logged out
  }

  if (btnAll) {
    const isActive = activeFeedFilter === "all" || !currentUser;
    btnAll.classList.toggle("btn-main", isActive);
    btnAll.classList.toggle("btn-outline-soft", !isActive);
  }
}

document.addEventListener("click", function (e) {
  const followBtn = e.target.closest("#feedFilterFollowing");
  const allBtn = e.target.closest("#feedFilterAll");

  if (!followBtn && !allBtn) return;

  const currentUser = getCurrentUser();
  if (!currentUser && followBtn) {
    alert("Log in to see your Following feed.");
    return;
  }

  if (followBtn) {
    activeFeedFilter = "following";
  }
  if (allBtn) {
    activeFeedFilter = "all";
  }

  renderFeedFilterBar();
  renderPosts();
  renderActiveTopicBar();
  renderPopularTopics();
  renderPeopleToFollow();
});

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
  if (!userBadge) {
    userBadge = document.createElement("a");
    userBadge.id = "navUserBadge";
    userBadge.className = "avatar-link me-1";
    userBadge.style.display = "inline-flex";
    userBadge.style.alignItems = "center";
    userBadge.style.justifyContent = "center";
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

    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Error signing out:", err);
      }
      clearCurrentUser();
      updateAuthUI();
    });
  }
}

    if (userBadge) {
  const avatarUrl = user.avatarDataUrl || user.avatar || null;
  const displayName = user.name || user.username || "User";
  const initials =
    (displayName || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const avatarHtml = avatarUrl
    ? `
      <div class="mini-avatar">
        <img
          src="${escapeHtml(avatarUrl)}"
          alt="${escapeHtml(initials)}"
          class="post-avatar-img"
        />
      </div>
    `
    : `
      <div class="mini-avatar">
        ${escapeHtml(initials)}
      </div>
    `;

  userBadge.innerHTML = avatarHtml;
  userBadge.href = `profile.html?userId=${encodeURIComponent(user.id)}`;
  userBadge.title = `${displayName} (@${user.username})`;
  userBadge.style.cursor = "pointer";
}

    if (composerInput) {
      composerInput.disabled = false;
      composerInput.placeholder = `Share what's on your mind, ${user.name}…`;
    }
    if (composerNote) {
      composerNote.textContent =
        "Your posts will appear at the top of the wall.";
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
      composerNote.textContent =
        "Log in or create an account to start posting.";
    }
    if (composerButton) {
      composerButton.disabled = false;
      composerButton.textContent = "Log in to post";
      composerButton.setAttribute("data-bs-toggle", "modal");
      composerButton.setAttribute("data-bs-target", "#loginModal");
    }
  }
  renderFeedFilterBar();
}

// ===========================
//  APP INIT (SYNC + RENDER)
// ===========================
(async function initApp() {
  try {
    await syncUsersFromFirestore();
    await syncPostsFromFirestore();
    await syncFollowsFromFirestore();
    await syncCommentsFromFirestore();
  } catch (err) {
    console.error("Error syncing from Firestore:", err);
  }
  initPosts();
  updateAuthUI();
})();

// ===========================
//  AUTH STATE LISTENER
// ===========================
onAuthStateChanged(auth, async (fbUser) => {
  if (!fbUser) {
    // Signed out
    clearCurrentUser();
    updateAuthUI();
    return;
  }

  const uid = fbUser.uid;

  try {
    const userDoc = await getDoc(doc(usersCol, uid));

    let user;
    if (userDoc.exists()) {
      const data = userDoc.data();
      user = {
        id: uid,
        ...data,
      };
    } else {
      // Fallback: create a basic profile if somehow missing
      user = {
        id: uid,
        name: fbUser.displayName || "New User",
        username:
          fbUser.email?.split("@")[0] || `user-${uid.slice(0, 6)}`,
        email: fbUser.email || "",
        createdAt: Date.now(),
      };
      await setDoc(doc(usersCol, uid), user);
    }

    setCurrentUser(user);
    updateAuthUI();
  } catch (err) {
    console.error("Error in onAuthStateChanged profile sync:", err);
  }
});

// ===========================
//  COMPOSER HANDLER (CREATE POST)
// ===========================
const composerInputEl = document.querySelector(".composer-input");
const composerButtonEl = document.querySelector(
  ".composer-card button.btn-main"
);
const composerImageInputEl = document.querySelector(".composer-image-input");

if (composerButtonEl && composerInputEl) {
  composerButtonEl.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) {
      return;
    }

    const text = composerInputEl.value.trim();
    const hasText = !!text;

    let imageDataUrl = null;
    const hasImageFile =
      composerImageInputEl &&
      composerImageInputEl.files &&
      composerImageInputEl.files[0];

    // If there is an image file, try to resize it
    if (hasImageFile) {
      const file = composerImageInputEl.files[0];
      try {
        imageDataUrl = await resizeImageTo300px(file);
      } catch (err) {
        console.error("Error reading post image:", err);
        if (!hasText) {
          alert(
            "Your image couldn't be processed. Try a smaller image or add some text."
          );
          return;
        }
        imageDataUrl = null;
      }
    }

    // If no text and no image, do nothing
    if (!hasText && !imageDataUrl) return;

    const posts = loadPosts();
    const now = Date.now();

    const newPost = {
      id: now,
      userId: user.id,
      name: user.name,
      username: user.username,
      body: text,
      createdAt: now,
      visibility: "Public",
      likes: 0,
      tags: extractTagsFromText(text),
      imageDataUrl: imageDataUrl || null,
    };

    posts.push(newPost);
    savePosts(posts);

    // Write to Firestore
    try {
      await setDoc(doc(postsCol, String(newPost.id)), newPost);
    } catch (err) {
      console.error("Error writing post to Firestore:", err);
    }

    // Clear inputs
    composerInputEl.value = "";
    if (composerImageInputEl) {
      composerImageInputEl.value = "";
    }

    renderPosts();
    renderPopularTopics();
    renderActiveTopicBar();
    renderPeopleToFollow();
  });

  composerInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      composerButtonEl.click();
    }
  });
}

// ===========================
//  DELETE POST (only author)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".delete-post-btn");
  if (!btn) return;

  const user = getCurrentUser();
  if (!user) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to delete your posts.");
    }
    return;
  }

  const postId = Number(btn.getAttribute("data-post-id"));
  if (!postId) return;

  const posts = loadPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  if (post.userId !== user.id) {
    alert("You can only delete your own posts.");
    return;
  }

  if (!confirm("Delete this post? This cannot be undone.")) return;

  // 🔹 1) Remove post from localStorage
  const updatedPosts = posts.filter((p) => p.id !== postId);
  savePosts(updatedPosts);

  // 🔹 2) Remove related comments from localStorage
  const commentsMap = loadCommentsMap();
  delete commentsMap[String(postId)];
  saveCommentsMap(commentsMap);

  // 🔹 3) Remove this post from likes map (so no stale likes)
  const likesMap = loadLikes();
  Object.keys(likesMap).forEach((uid) => {
    const list = likesMap[uid];
    if (Array.isArray(list)) {
      likesMap[uid] = list.filter((id) => id !== postId);
    }
  });
  saveLikes(likesMap);

  // 🔹 4) Delete from Firestore: post + its comments
  try {
    // Delete the post doc
    await deleteDoc(doc(postsCol, String(postId)));
  } catch (err) {
    console.error("Error deleting post from Firestore:", err);
  }

  try {
    // Delete all comments tied to this post
    const q = query(commentsCol, where("postId", "==", postId));
    const snap = await getDocs(q);
    const deletionPromises = snap.docs.map((d) =>
      deleteDoc(doc(commentsCol, d.id))
    );
    await Promise.all(deletionPromises);
  } catch (err) {
    console.error("Error deleting comments for post:", err);
  }

  // 🔹 5) Re-render UI pieces
  renderPosts();
  renderPopularTopics();
  renderActiveTopicBar();
  renderPeopleToFollow();
});

// ===========================
//  SIGNUP HANDLER (Firebase Auth)
// ===========================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
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

    try {
      // 1) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = cred.user.uid;

      // 2) Create profile doc in Firestore
      const newUser = {
        id: uid,
        name,
        username,
        email,
        createdAt: Date.now(),
      };

      await setDoc(doc(usersCol, uid), newUser);

      // 3) Save locally & update UI
      const users = loadUsers();
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
    } catch (err) {
      console.error("Error signing up:", err);
      alert(err.message || "There was an error creating your account.");
    }
  });
}

// ===========================
//  LOGIN HANDLER (Firebase Auth)
// ===========================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
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

    try {
      // Firebase Auth handles password verification
      await signInWithEmailAndPassword(auth, email, password);

      // onAuthStateChanged will fire and load the profile
      const loginModalEl = document.getElementById("loginModal");
      if (loginModalEl && typeof bootstrap !== "undefined") {
        const modalInstance =
          bootstrap.Modal.getInstance(loginModalEl) ||
          new bootstrap.Modal(loginModalEl);
        modalInstance.hide();
      }

      loginForm.reset();
    } catch (err) {
      console.error("Error logging in:", err);
      alert(err.message || "There was an error during login. Please try again.");
    }
  });
}

// ===========================
//  SHARE BUTTON — REPOST WITH COMMENT
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".share-btn");
  if (!btn) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to share posts.");
    }
    return;
  }

  const article = btn.closest(".post-card");
  if (!article || !article.dataset.postId) return;

  const postId = Number(article.dataset.postId);

  const posts = loadPosts();
  const original = posts.find((p) => p.id === postId);
  if (!original) {
    console.warn("Original post not found for share:", postId);
    alert("That post could not be found to share.");
    return;
  }

  // Ask the user for an optional comment
  const commentText = window.prompt(
    "Add a comment to share this post (optional):",
    ""
  );

  // If they cancelled the prompt, do nothing
  if (commentText === null) {
    return;
  }

  const trimmedComment = commentText.trim();

  // Build the new post body (your comment + original content)
  const sharedFromHandle = original.username || "user";
  const originalBody = original.body || "";

  let combinedBody;
  if (trimmedComment) {
    combinedBody =
      `${trimmedComment}\n\n` +
      `🔁 Shared from @${sharedFromHandle}:\n` +
      originalBody;
  } else {
    combinedBody = `🔁 Shared from @${sharedFromHandle}:\n${originalBody}`;
  }

  const now = Date.now();

  const newPost = {
    id: now,
    userId: currentUser.id,
    name: currentUser.name,
    username: currentUser.username,
    body: combinedBody,
    createdAt: now,
    visibility: "Public",
    likes: 0,
    tags: extractTagsFromText(combinedBody),
    imageDataUrl: original.imageDataUrl || null,
    sharedFromPostId: original.id,
    sharedFromUserId: original.userId,
  };

  // Save locally
  posts.push(newPost);
  savePosts(posts);

  // Save to Firestore
  try {
    await setDoc(doc(postsCol, String(newPost.id)), newPost);
  } catch (err) {
    console.error("Error writing shared post to Firestore:", err);
  }

  // Re-render wall + sidebars
  renderPosts();
  renderPopularTopics();
  renderActiveTopicBar();
  renderPeopleToFollow();

  // Optionally scroll to top so they see their shared post
  const feed = document.getElementById("postList");
  if (feed) {
    feed.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// ===========================
//  LIKE BUTTON TOGGLE (per-user, saved)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".like-btn");
  if (!btn) return;

  const user = getCurrentUser();
  if (!user) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to like posts.");
    }
    return;
  }

  const article = btn.closest(".post-card");
  if (!article || !article.dataset.postId) return;

  const postId = Number(article.dataset.postId);
  let count = parseInt(btn.getAttribute("data-count"), 10) || 0;

  // 🔹 Check if this user has already liked this post
  const alreadyLiked = hasUserLikedPost(user.id, postId);
  const nowLiked = !alreadyLiked;

  // Update local like map
  setUserLike(user.id, postId, nowLiked);

  // Update count
  count = nowLiked ? count + 1 : Math.max(0, count - 1);

  // Update button UI
  btn.setAttribute("data-liked", nowLiked);
  btn.setAttribute("data-count", count);

  const heartEl = btn.querySelector(".heart-icon");
  const countEl = btn.querySelector(".like-count");

  if (heartEl) heartEl.textContent = nowLiked ? "♥" : "♡";
  if (countEl) countEl.textContent = count;

  // Update local posts array + Firestore
  const posts = loadPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index !== -1) {
    posts[index].likes = count;
    savePosts(posts);
    renderPopularTopics();
    renderPeopleToFollow();

    try {
      await updateDoc(doc(postsCol, String(postId)), { likes: count });
    } catch (err) {
      console.error("Error updating likes in Firestore:", err);
    }
  }
});

// ===========================
//  FOLLOW / UNFOLLOW BUTTONS (Firestore)
// ===========================
document.addEventListener("click", async function (e) {
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

  const targetId = btn.getAttribute("data-follow-user-id"); // 👈 no Number()
  if (!targetId || String(targetId) === String(current.id)) return;

  // Local toggle
  const nowFollowing = toggleFollowLocal(current.id, targetId);

  btn.textContent = nowFollowing ? "Following" : "Follow";
  btn.classList.toggle("btn-main", nowFollowing);
  btn.classList.toggle("btn-outline-soft", !nowFollowing);

  // Firestore write
  const followDocId = `${current.id}_${targetId}`;
  try {
    if (nowFollowing) {
      await setDoc(doc(followsCol, followDocId), {
        followerId: String(current.id),
        targetId: String(targetId),
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(doc(followsCol, followDocId));
    }
  } catch (err) {
    console.error("Error updating follow in Firestore:", err);
  }

  // Refresh suggestions
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
//  DELETE COMMENT (Main feed)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".delete-comment-btn");
  if (!btn) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    } else {
      alert("Log in to delete comments.");
    }
    return;
  }

  const commentId = Number(btn.getAttribute("data-comment-id"));
  const postId = Number(btn.getAttribute("data-post-id"));
  const commentUserId = Number(btn.getAttribute("data-comment-user-id"));

  if (!commentId || !postId) return;

  const posts = loadPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  const isPostOwner = currentUser.id === post.userId;
  const isCommentOwner = currentUser.id === commentUserId;

  if (!isPostOwner && !isCommentOwner) {
    alert("You can only delete your own comments or comments on your posts.");
    return;
  }

  if (!confirm("Delete this comment? This cannot be undone.")) return;

  // 1) Remove from local comments map
  const commentsMap = loadCommentsMap();
  const key = String(postId);
  const list = Array.isArray(commentsMap[key]) ? commentsMap[key] : [];
  commentsMap[key] = list.filter((c) => c.id !== commentId);
  saveCommentsMap(commentsMap);

  // 2) Delete from Firestore
  try {
    await deleteDoc(doc(commentsCol, String(commentId)));
  } catch (err) {
    console.error("Error deleting comment from Firestore:", err);
  }

  // 3) Re-render comments for this post
  const article = btn.closest(".post-card");
  if (article) {
    const commentsSection = article.querySelector(".post-comments");
    if (commentsSection) {
      renderCommentsForPost(postId, commentsSection);
    }

    // 4) Update comment count badge
    const countEl = article.querySelector(".comment-btn .comment-count");
    if (countEl) {
      const updatedList = commentsMap[key] || [];
      countEl.textContent = updatedList.length.toString();
    }
  }
});

// ===========================
//  COMMENT FORM SUBMIT (Firestore)
// ===========================
document.addEventListener("submit", async function (e) {
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
  const fileInput = form.querySelector(".comment-image-input");
  if (!input) return;

  const text = input.value.trim();
  let imageDataUrl = null;

  const hasFile = fileInput && fileInput.files && fileInput.files[0];

  // If there is a file, try to read & RESIZE it as a data URL
  if (hasFile) {
    const file = fileInput.files[0];
    try {
      imageDataUrl = await resizeImageTo300px(file);
    } catch (err) {
      console.error("Error reading comment image on this device:", err);
      if (!text) {
        alert(
          "Your image couldn't be processed on this device. Try a smaller image or add some text."
        );
        return;
      }
      imageDataUrl = null;
    }
  }

  // If no text and no image, do nothing
  if (!text && !imageDataUrl) return;

  const commentId = Date.now();
  const comment = {
    id: commentId,
    postId,
    userId: user.id,
    name: user.name,
    username: user.username,
    avatarDataUrl: user.avatarDataUrl || null,
    body: text,
    text: text, // for backward compatibility
    imageDataUrl: imageDataUrl || null,
    createdAt: Date.now(),
  };

  // Local cache
  addCommentToLocal(postId, comment);
  input.value = "";
  if (fileInput) {
    fileInput.value = "";
  }

  // Firestore write (even if it fails, local comment still shows)
  try {
    await setDoc(doc(commentsCol, String(commentId)), comment);
  } catch (err) {
    console.error("Error writing comment to Firestore:", err);
  }

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

// ===========================
//  LOGOUT BUTTONS (legacy header version)
// ===========================
function updateAuthButtons() {
  const current = getCurrentUser();
  const loginBtn = document.getElementById("loginNavBtn");
  const signupBtn = document.getElementById("signupNavBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!loginBtn || !signupBtn || !logoutBtn) return;

  if (current) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    signupBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-follow-user-id], [data-follow-target-id]");
  if (!btn) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToastError("You must be logged in to follow users.");
    return;
  }

  const targetId =
    btn.dataset.followUserId || btn.dataset.followTargetId;

  const nowFollowing = toggleFollowLocal(currentUser.id, Number(targetId));

  // Update button label + style
  btn.textContent = nowFollowing ? "Following" : "Follow";
  btn.classList.toggle("btn-main", nowFollowing);
  btn.classList.toggle("btn-outline-soft", !nowFollowing);

  // Optional: Sync to Firestore
  // await setDoc(doc(followsCol), { followerId: currentUser.id, targetId });

  // Refresh profile header if on profile page
  if (typeof renderProfileHeader === "function") {
    const user = getProfileUser();
    const isOwnProfile = currentUser.id === user.id;
    renderProfileHeader(user, isOwnProfile);
  }

  showToastSuccess(nowFollowing ? "Following user" : "Unfollowed");
});

