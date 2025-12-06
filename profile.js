// ===========================
//  FIREBASE APP + FIRESTORE
// ===========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔹 Same config as index.js
const firebaseConfig = {
  apiKey: "AIzaSyCx_ChAZXvx1CX-GBNbgiv1znL95z8JCJo",
  authDomain: "openwall-b9fc7.firebaseapp.com",
  projectId: "openwall-b9fc7",
  storageBucket: "openwall-b9fc7.appspot.com",
  messagingSenderId: "584620300362",
  appId: "1:584620300362:web:c313bcc2c982b638a16eb3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore collections
const usersCol = collection(db, "users");
const postsCol = collection(db, "posts");
const commentsCol = collection(db, "comments");
const followsCol = collection(db, "follows");

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

// Follows: followerId -> [followedUserId, ...] (local cache)
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

function getFollowerIds(userId) {
  if (!userId) return [];
  const map = loadFollows();
  const followers = [];

  for (const [followerId, followingList] of Object.entries(map)) {
    if (Array.isArray(followingList) && followingList.includes(userId)) {
      followers.push(Number(followerId));
    }
  }
  return followers;
}

function isFollowing(followerId, targetId) {
  if (!followerId || !targetId) return false;
  const following = getFollowingIds(followerId);
  return following.includes(targetId);
}

function toggleFollowLocal(followerId, targetId) {
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

function computeFollowStats(userId) {
  const followers = getFollowerIds(userId);
  const following = getFollowingIds(userId);
  return {
    followerCount: followers.length,
    followingCount: following.length,
  };
}

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

// Resize an image file so the longest side is max 300px
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

// Just read an image file as a data URL (no resize)
async function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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

function addCommentToLocal(postId, comment) {
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
//  FIRESTORE SYNC HELPERS
// ===========================
async function syncUsersFromFirestore() {
  const snap = await getDocs(usersCol);
  let users = [];

  if (snap.empty) {
    // If you seeded demo users from index.js, they'll get written there.
    return;
  }

  users = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: data.id ?? Number(d.id),
      ...data,
    };
  });

  saveUsers(users);
}

async function syncPostsFromFirestore() {
  const snap = await getDocs(query(postsCol, orderBy("createdAt", "desc")));
  if (snap.empty) {
    return;
  }

  const posts = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: data.id ?? Number(d.id),
      ...data,
    };
  });

  savePosts(posts);
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

async function syncFollowsFromFirestore() {
  const snap = await getDocs(followsCol);
  const map = {};
  snap.forEach((d) => {
    const f = d.data();
    const followerId = String(f.followerId);
    const targetId = f.targetId;
    if (!map[followerId]) map[followerId] = [];
    if (!map[followerId].includes(targetId)) {
      map[followerId].push(targetId);
    }
  });
  saveFollows(map);
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
  if (user.avatarDataUrl) return user.avatarDataUrl;
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
  const followStats = computeFollowStats(user.id);
  const avatarUrl = getAvatarUrlForUser(user);
  const initials = getInitials(user.name);

  let avatarInner = "";
  if (avatarUrl) {
    avatarInner = `<img src="${avatarUrl}" alt="${escapeHtml(
      user.name || "Avatar"
    )}" style="width:100%;height:100%;object-fit:cover;" />`;
  } else {
    avatarInner = escapeHtml(initials);
  }

  const currentUser = getCurrentUser();
  const viewingUserId = currentUser ? currentUser.id : null;
  const showFollowButton = !isOwnProfile && !!viewingUserId;

  const isUserFollowing =
    showFollowButton && isFollowing(viewingUserId, user.id);

  const followBtnHtml = showFollowButton
    ? `
      <button
        type="button"
        class="btn ${isUserFollowing ? "btn-main" : "btn-outline-soft"} btn-sm"
        data-follow-target-id="${user.id}"
      >
        ${isUserFollowing ? "Following" : "Follow"}
      </button>
    `
    : "";

  headerEl.innerHTML = `
    <div class="card-body d-flex justify-content-between align-items-center gap-3">
      <div class="d-flex align-items-center gap-3">
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
            <span class="ms-2">${followStats.followerCount} follower${
              followStats.followerCount === 1 ? "" : "s"
            }</span>
            <span class="ms-2">${followStats.followingCount} following</span>
          </div>
        </div>
      </div>
      ${followBtnHtml}
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
      ${imageHtml}
    `;
      listEl.appendChild(item);
    });
}

// ===========================
//  RENDER PROFILE POSTS
// ===========================
function renderProfilePosts(user, isOwnProfile) {
  const postsContainer = document.getElementById("profilePosts");
  if (!postsContainer) return;

  const allPosts = loadPosts()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  const followingIds = isOwnProfile ? getFollowingIds(user.id) : [];

  const visiblePosts = allPosts.filter((p) => {
    if (isOwnProfile) {
      return p.userId === user.id || followingIds.includes(p.userId);
    }
    return p.userId === user.id;
  });

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

  if (!visiblePosts.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.textContent = isOwnProfile
      ? "You and the people you follow haven't posted anything yet."
      : "This user hasn't posted anything yet.";
    listEl.appendChild(empty);
    return;
  }

  const users = loadUsers();

  visiblePosts.forEach((post) => {
    const author = users.find((u) => u.id === post.userId) || user;

    const initials = getInitials(author.name || post.name);
    const avatarUrl = getAvatarUrlForUser(author);
    const avatarInner = avatarUrl
      ? `<img src="${avatarUrl}" alt="${escapeHtml(
          author.name || "Avatar"
        )}" style="width:100%;height:100%;object-fit:cover;" />`
      : escapeHtml(initials);

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
                post.name || author.name || "Unknown"
              )}</span>
              <span class="text-body-secondary small ms-1">@${escapeHtml(
                author.username || post.username || "user"
              )}</span>
            </div>
            <span class="post-meta">${when} · ${escapeHtml(
              visibility
            )}</span>
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

    listEl.appendChild(article);
  });
}

// ===========================
//  EDIT PROFILE FORM HANDLER
// ===========================
let pendingAvatarDataUrl = null;

function setupEditProfileForm(user, isOwnProfile) {
  const form = document.getElementById("editProfileForm");
  const card = document.getElementById("profileEditCard");

  if (!form || !card) return;

  // Only show edit form on your own profile
  if (!isOwnProfile) {
    card.style.display = "none";
    return;
  } else {
    card.style.display = "";
  }

  const nameInput = document.getElementById("editName");
  const usernameInput = document.getElementById("editUsername");
  const locationInput = document.getElementById("editLocation");
  const websiteInput = document.getElementById("editWebsite");
  const bioInput = document.getElementById("editBio");
  const avatarInput = document.getElementById("editAvatarInput");

  // Prefill fields
  if (nameInput) nameInput.value = user.name || "";
  if (usernameInput) usernameInput.value = user.username || "";
  if (locationInput) locationInput.value = user.location || "";
  if (websiteInput) websiteInput.value = user.website || "";
  if (bioInput) bioInput.value = user.bio || "";

  // Start with whatever avatar the user already has
  pendingAvatarDataUrl = user.avatarDataUrl || null;

  // When user picks a new image file
  if (avatarInput) {
    avatarInput.value = "";
    avatarInput.onchange = function () {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) {
        // Reset to current avatar if they cancel
        pendingAvatarDataUrl = user.avatarDataUrl || null;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        pendingAvatarDataUrl = event.target.result; // base64 image
      };
      reader.onerror = () => {
        pendingAvatarDataUrl = user.avatarDataUrl || null;
        showToastError("Could not read that image file.");
      };
      reader.readAsDataURL(file);
    };
  }

  form.onsubmit = async function (e) {
    e.preventDefault();

    try {
      const users = loadUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) {
        showToastError("Profile not found in storage.");
        return;
      }

      // ✅ FIXED: spread the existing user instead of `{ .users[idx] }`
      const updatedUser = { ...users[idx] };

      if (nameInput)
        updatedUser.name = nameInput.value.trim() || updatedUser.name;
      if (usernameInput)
        updatedUser.username =
          usernameInput.value.trim() || updatedUser.username;
      if (locationInput) updatedUser.location = locationInput.value.trim();
      if (websiteInput) updatedUser.website = websiteInput.value.trim();
      if (bioInput) updatedUser.bio = bioInput.value.trim();

      // If a new avatar was chosen, store it
      if (pendingAvatarDataUrl) {
        updatedUser.avatarDataUrl = pendingAvatarDataUrl;
      }

      // 🔹 Update Firestore user doc
      await updateDoc(doc(usersCol, String(updatedUser.id)), {
        name: updatedUser.name,
        username: updatedUser.username,
        location: updatedUser.location || "",
        website: updatedUser.website || "",
        bio: updatedUser.bio || "",
        avatarDataUrl: updatedUser.avatarDataUrl || null,
      }).catch(async (err) => {
        console.warn("updateDoc failed, trying setDoc", err);
        await setDoc(doc(usersCol, String(updatedUser.id)), updatedUser);
      });

      // Save locally
      users[idx] = updatedUser;
      saveUsers(users);

      const current = getCurrentUser();
      if (current && current.id === updatedUser.id) {
        setCurrentUser(updatedUser);
      }

      // Update posts with new name/username
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

      // Re-render profile sections so the new avatar shows up immediately
      renderProfileHeader(updatedUser, true);
      renderProfileAbout(updatedUser);
      renderProfileTopics(updatedUser);
      renderProfilePosts(updatedUser, true);

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
  renderProfilePosts(profileUser, isOwnProfile);
  setupEditProfileForm(profileUser, isOwnProfile);
}

// ===========================
//  LIKE / COMMENT HANDLERS
// ===========================

// Like toggle (profile posts)
document.addEventListener("click", async function (e) {
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

  // 🔹 Update Firestore likes
  try {
    await updateDoc(doc(postsCol, String(postId)), { likes: count });
  } catch (err) {
    console.error("Error updating likes in Firestore:", err);
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

document.addEventListener("submit", async function (e) {
  const form = e.target.closest(".comment-form");
  if (!form) return;
  if (!form.closest("#profilePosts")) return;

  e.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    alert("Log in to add a comment.");
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

  if (hasFile) {
    const file = fileInput.files[0];
    try {
      imageDataUrl = await readImageAsDataUrl(file);
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

  // Must have either text or image
  if (!text && !imageDataUrl) return;

  const commentId = Date.now();
  const comment = {
    id: commentId,
    postId,
    userId: user.id,
    username: user.username,
    name: user.name,
    body: text,
    imageDataUrl: imageDataUrl || null,
    createdAt: Date.now(),
  };

  // Local
  addCommentToLocal(postId, comment);
  input.value = "";
  if (fileInput) {
    fileInput.value = "";
  }

  // Firestore
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
//  FOLLOW / UNFOLLOW ON PROFILE
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest("[data-follow-target-id]");
  if (!btn) return;

  const current = getCurrentUser();
  if (!current) {
    alert("Log in to follow people.");
    return;
  }

  const targetId = Number(btn.getAttribute("data-follow-target-id"));
  if (!targetId || targetId === current.id) return;

  const nowFollowing = toggleFollowLocal(current.id, targetId);

  btn.textContent = nowFollowing ? "Following" : "Follow";
  btn.classList.toggle("btn-main", nowFollowing);
  btn.classList.toggle("btn-outline-soft", !nowFollowing);

  const profileUser = getProfileUser();
  const isOwnProfile = profileUser && profileUser.id === current.id;

  // 🔹 Firestore follows
  const followDocId = `${current.id}_${targetId}`;
  try {
    if (nowFollowing) {
      await setDoc(doc(followsCol, followDocId), {
        followerId: current.id,
        targetId,
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(doc(followsCol, followDocId));
    }
  } catch (err) {
    console.error("Error updating follow in Firestore:", err);
  }

  // Re-render header + posts so counts and wall update
  if (profileUser) {
    renderProfileHeader(profileUser, isOwnProfile);
    renderProfilePosts(profileUser, isOwnProfile);
  }
});

// ===========================
//  LOGOUT
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

// Handle clicks on the logout button
document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest("#logoutBtn");
  if (!logoutBtn) return;

  // Clear current user
  localStorage.removeItem("openwall-current");

  // Refresh navbar buttons
  updateAuthButtons();

  // Send back to home
  window.location.href = "index.html";
});

// ===========================
//  INIT
// ===========================
document.addEventListener("DOMContentLoaded", async () => {
  initToasts();
  updateAuthButtons(); // ✅ make navbar correct on load

  try {
    await Promise.all([
      syncUsersFromFirestore(),
      syncPostsFromFirestore(),
      syncCommentsFromFirestore(),
      syncFollowsFromFirestore(),
    ]);
  } catch (err) {
    console.error("Error syncing profile data from Firestore:", err);
  }

  renderProfile();
});
