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
  where,
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
const LIKES_KEY = "openwall-likes";  

function loadLikes() {
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLikes(map) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(map));
}// 👈 add this

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

function extractTagsFromText(text) {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
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
  if (snap.empty) {
    // If you seeded demo users from index.js, they'll get written there.
    return;
  }

  const users = snap.docs.map((d) => {
    const data = d.data();

    // Prefer an explicit "id" field, else use the doc id (UID)
    const effectiveId = data.id || d.id;

    return {
      ...data,
      id: effectiveId,                       // local user.id is always a string
      userId: data.userId || effectiveId,    // ensure userId is present for rules
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

            <!-- Following count: clickable -->
            <button
              type="button"
              class="btn btn-link p-0 ms-2 align-baseline following-trigger"
              id="profileFollowingTrigger"
              data-user-id="${user.id}"
            >
              ${followStats.followingCount} following
            </button>
          </div>
        </div>
      </div>
      ${isOwnProfile
  ? `<button id="editProfileBtn" class="btn btn-outline-soft btn-sm">Edit</button>`
  : followBtnHtml
}

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
  pill.dataset.topic = t.topic;   // 👈 important

  pill.textContent = `#${t.topic} · ${t.totalLikes}♥`;
  pill.title = `${t.totalLikes} like${
    t.totalLikes === 1 ? "" : "s"
  } across ${t.postCount} post${t.postCount === 1 ? "" : "s"}`;
  topicsEl.appendChild(pill);
});
}

// ===========================
//  RENDER FOLLOWING LIST CARD
// ===========================
function renderProfileFollowingList(profileUser, isOwnProfile) {
  const card = document.getElementById("profileFollowingCard");
  const listEl = document.getElementById("profileFollowingList");
  if (!card || !listEl) return;

  const followingIds = getFollowingIds(profileUser.id).map(String);
  const allUsers = loadUsers();

  const followingUsers = allUsers.filter((u) =>
    followingIds.includes(String(u.id))
  );

  if (!followingUsers.length) {
    listEl.innerHTML =
      '<small class="text-body-secondary">Not following anyone yet.</small>';
    return;
  }

  listEl.innerHTML = followingUsers
    .map((u) => {
      const avatarUrl = getAvatarUrlForUser(u);
      const initials = getInitials(u.name || "U");

      const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(
            avatarUrl
          )}" alt="${escapeHtml(
            u.name || "Avatar"
          )}" class="mini-avatar-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<div class="mini-avatar d-inline-flex align-items-center justify-content-center">${escapeHtml(
            initials
          )}</div>`;

      const profileLink = `profile.html?userId=${encodeURIComponent(u.id)}`;

      // Only show "Remove" / Unfollow button on your OWN profile
      const removeBtn = isOwnProfile
        ? `<button
             type="button"
             class="btn btn-outline-soft btn-sm unfollow-btn"
             data-target-id="${u.id}"
           >
             Remove
           </button>`
        : "";

      return `
        <div class="following-list-item d-flex justify-content-between align-items-center py-1 border-bottom">
          <div class="d-flex align-items-center gap-2">
            <a href="${profileLink}" class="avatar-link">
              ${avatarHtml}
            </a>
            <div>
              <a href="${profileLink}" class="text-decoration-none">
                <strong>${escapeHtml(u.name || "Unnamed user")}</strong>
              </a>
              <div class="text-body-secondary small">
                @${escapeHtml(u.username || "user")}
              </div>
            </div>
          </div>
          ${removeBtn}
        </div>
      `;
    })
    .join("");

  // Remove bottom border from last item
  const items = listEl.querySelectorAll(".following-list-item");
  if (items.length) {
    items[items.length - 1].classList.add("border-0");
  }
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

  // We need the post to know who owns it
  const posts = loadPosts();
  const post = posts.find((p) => p.id === postId);
  const currentUser = getCurrentUser();

  comments
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((c) => {
      const item = document.createElement("div");
      item.className = "comment-item small";
      const when = timeAgo(c.createdAt || Date.now());

      // Can delete if:
      //  - you're the post owner, OR
      //  - you're the comment author
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

      item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${escapeHtml(c.name || "Unknown")}</strong>
          <span class="text-body-secondary ms-1">@${escapeHtml(
            c.username || "user"
          )}</span>
        </div>
        <div class="d-flex align-items-center">
          <span class="text-body-secondary small">${when}</span>
          ${deleteBtnHtml}
        </div>
      </div>
      <div class="comment-body">
        ${escapeHtml(c.body || "")}
      </div>
      ${imageHtml}
    `;
      listEl.appendChild(item);
    });
}

// Current hashtag filter on THIS profile page
let profileActiveTopic = null;


// ===========================
//  RENDER PROFILE POSTS
// ===========================
function renderProfilePosts(profileUser, isOwnProfile) {
  const card = document.getElementById("profilePosts");
  if (!card || !profileUser) return;

  const allPosts = loadPosts();

// First: only this user's posts
let posts = allPosts.filter((p) => p.userId === profileUser.id);

// If a topic filter is active, restrict to posts that include that tag
if (profileActiveTopic) {
  posts = posts.filter((p) => {
    const tags = (p.tags || []).map((t) => t.toLowerCase());
    return tags.includes(profileActiveTopic);
  });
}

// Newest first
posts = posts.sort((a, b) => b.createdAt - a.createdAt);

  const currentUser = getCurrentUser();

  const avatarUrl = profileUser.avatarDataUrl || profileUser.avatar || null;
  const initials =
    (profileUser.name || "U")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const avatarInner = `
    <a href="profile.html?userId=${profileUser.id}" class="avatar-link">
      ${
        avatarUrl
          ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(
              profileUser.name || "Avatar"
            )}" class="post-avatar-img" />`
          : `<div class="post-avatar-fallback">${escapeHtml(initials)}</div>`
      }
    </a>
  `;

  let html = `<div class="card-body">`;

  // Header row
  html += `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h3 class="h6 mb-0">Posts</h3>
      <span class="text-body-secondary small">
        ${posts.length} post${posts.length === 1 ? "" : "s"}
      </span>
    </div>
  `;

  // Composer if it's the owner's profile
  if (isOwnProfile) {
    html += `
      <div class="composer-card mb-3">
        <div class="d-flex gap-2">
          <div class="post-avatar">
            ${avatarInner}
          </div>
          <div class="flex-grow-1">
            <textarea
              class="form-control form-control-sm profile-composer-input"
              rows="2"
              placeholder="Share what's on your mind, ${escapeHtml(
                profileUser.name || "friend"
              )}…"
            ></textarea>
            <div class="d-flex gap-2 mt-1">
              <input
                type="file"
                class="form-control form-control-sm profile-composer-image-input"
                accept="image/*"
              />
              <button
                type="button"
                class="btn btn-main btn-sm profile-composer-btn"
              >
                Post
              </button>
            </div>
            <div class="small text-body-secondary mt-1">
              Your posts here will also appear on the main wall.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (!posts.length) {
    html += `
      <div class="text-body-secondary small">
        ${
          isOwnProfile
            ? "You haven't posted anything yet."
            : "No posts from this user yet."
        }
      </div>
    `;
    html += `</div>`;
    card.innerHTML = html;
    if (isOwnProfile) attachProfileComposerHandlers(profileUser);
    return;
  }

  // List of posts
  html += `<div class="profile-post-list">`;

  posts.forEach((post) => {
    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = typeof post.likes === "number" ? post.likes : 0;
    const commentsForPost = getCommentsForPost(post.id);
    const commentCount = commentsForPost.length;
    const userLiked =
      currentUser && hasUserLikedPost(currentUser.id, post.id);
    const canDelete = currentUser && currentUser.id === post.userId;
    const bodyHtml = escapeHtml(post.body || "").replace(/\n/g, "<br>");

    const imageHtml = post.imageDataUrl
      ? `
        <div class="mt-2">
          <img
            src="${escapeHtml(post.imageDataUrl)}"
            alt="Post image"
            class="post-image"
          />
        </div>
      `
      : "";

    html += `
      <article class="post-card mb-2" data-post-id="${post.id}">
        <div class="d-flex gap-2">
          <div class="post-avatar">
            ${avatarInner}
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between">
              <div>
                <span class="post-username">
                  ${escapeHtml(profileUser.name || "Unknown")}
                </span>
                <span class="text-body-secondary small ms-1">
                  @${escapeHtml(profileUser.username || "user")}
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
            </div>
            ${imageHtml}

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

                <button type="button" class="share-btn">
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
      </article>
    `;
  });

  html += `</div></div>`;
  card.innerHTML = html;

  if (isOwnProfile) {
    attachProfileComposerHandlers(profileUser);
  }
}

// ===========================
//  PROFILE COMPOSER HANDLERS
// ===========================
function attachProfileComposerHandlers(profileUser) {
  const card = document.getElementById("profilePosts");
  if (!card) return;

  const input = card.querySelector(".profile-composer-input");
  const imageInput = card.querySelector(".profile-composer-image-input");
  const button = card.querySelector(".profile-composer-btn");
  if (!input || !button) return;

  const handleSubmit = async () => {
    const text = input.value.trim();
    const hasFile = imageInput && imageInput.files && imageInput.files[0];

    if (!text && !hasFile) return;

    let imageDataUrl = null;
    if (hasFile) {
      try {
        const file = imageInput.files[0];
        imageDataUrl = await resizeImageTo300px(file);
      } catch (err) {
        console.error("Error reading post image:", err);
        if (!text) {
          alert(
            "Your image couldn't be processed. Try a smaller image or add some text."
          );
          return;
        }
      }
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("Log in to post.");
      return;
    }

    const posts = loadPosts();
    const now = Date.now();

    const newPost = {
      id: now,
      userId: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      body: text,
      createdAt: now,
      visibility: "Public",
      likes: 0,
      tags: extractTagsFromText(text),
      imageDataUrl: imageDataUrl || null,
    };

    posts.push(newPost);
    savePosts(posts);

    try {
      await setDoc(doc(postsCol, String(newPost.id)), newPost);
    } catch (err) {
      console.error("Error writing profile post to Firestore:", err);
    }

    input.value = "";
    if (imageInput) {
      imageInput.value = "";
    }

    // Re-render posts (composer will be recreated + handlers reattached)
    renderProfilePosts(profileUser, true);
  };

  button.addEventListener("click", handleSubmit);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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

  // Only show edit section for your own profile
  if (!isOwnProfile) {
    card.style.display = "none";
    card.setAttribute("hidden", "true");
    return;
  } else {
    // keep it hidden by default; Edit button will reveal it
    card.style.display = "none";
    card.setAttribute("hidden", "true");
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
  pendingAvatarDataUrl = user.avatarDataUrl || user.avatar || null;

  // When user picks a new image file, RESIZE IT and store as data URL
  if (avatarInput) {
    avatarInput.value = "";
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) {
        // Reset to current avatar if they cancel
        pendingAvatarDataUrl = user.avatarDataUrl || user.avatar || null;
        return;
      }

      try {
        // 🔹 Use the helper you already defined
        const resizedDataUrl = await resizeImageTo300px(file);
        pendingAvatarDataUrl = resizedDataUrl;
        showToastSuccess("New profile picture ready — don’t forget to save.");
      } catch (err) {
        console.error("Error processing avatar image:", err);
        pendingAvatarDataUrl = user.avatarDataUrl || user.avatar || null;
        showToastError("Couldn’t process that image. Try a smaller file.");
      }
    });
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

      // Start from the existing user record
      const updatedUser = { ...users[idx] };

      if (nameInput)
        updatedUser.name = nameInput.value.trim() || updatedUser.name;
      if (usernameInput)
        updatedUser.username =
          usernameInput.value.trim() || updatedUser.username;
      if (locationInput) updatedUser.location = locationInput.value.trim();
      if (websiteInput) updatedUser.website = websiteInput.value.trim();
      if (bioInput) updatedUser.bio = bioInput.value.trim();

      // 🔹 If we have an avatar data URL, store it
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

            // 🔹 Always use the *authenticated* user's id as the Firestore doc id
      const current = getCurrentUser();
      if (!current) {
        showToastError("You must be logged in to update your profile.");
        return;
      }

      const docId = String(current.id);

      const firestoreUserData = {
        // IDs needed for security rules
        id: docId,
        userId: docId,

        // Profile fields
        name: updatedUser.name,
        username: updatedUser.username,
        location: updatedUser.location || "",
        website: updatedUser.website || "",
        bio: updatedUser.bio || "",
        avatarDataUrl: updatedUser.avatarDataUrl || null,
      };

      try {
        // Try updating existing doc
        await updateDoc(doc(usersCol, docId), firestoreUserData);
      } catch (err) {
        console.warn("updateDoc failed, trying setDoc", err);
        // If it doesn't exist yet, create it. This must still satisfy your rules:
        // request.auth.uid == userId (doc path) and == request.resource.data.userId
        await setDoc(doc(usersCol, docId), firestoreUserData);
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

function setupProfileComposer(profileUser) {
  const input = document.getElementById("profileComposerInput");
  const btn = document.getElementById("profileComposerBtn");
  if (!input || !btn) return;

  // Avoid stacking multiple listeners on re-render
  btn.onclick = null;
  input.onkeydown = null;

  const handlePost = async () => {
    const current = getCurrentUser();
    if (!current || current.id !== profileUser.id) {
      alert("You need to be logged in as this user to post here.");
      return;
    }

    const text = input.value.trim();
    if (!text) return;

    const posts = loadPosts();
    const now = Date.now();

    const newPost = {
      id: now,
      userId: current.id,
      name: current.name,
      username: current.username,
      body: text,
      createdAt: now,
      visibility: "Public",
      likes: 0,
      tags: extractTagsFromText(text),
    };

    posts.push(newPost);
    savePosts(posts);

    try {
      await setDoc(doc(postsCol, String(newPost.id)), newPost);
    } catch (err) {
      console.error("Error writing profile post to Firestore:", err);
    }

    input.value = "";

    // Re-render whole profile so stats, topics, and posts update
    renderProfile();
  };

  btn.onclick = handlePost;

  // Optional: Ctrl+Enter (or Cmd+Enter) to post
  input.onkeydown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePost();
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

// Like toggle (profile posts, per-user)
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".like-btn");
  if (!btn) return;

  // Only handle likes inside profilePosts card
  if (!btn.closest("#profilePosts")) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Log in to like posts.");
    return;
  }

  const article = btn.closest(".post-card");
  if (!article || !article.dataset.postId) return;
  const postId = Number(article.dataset.postId);

  let count = parseInt(btn.getAttribute("data-count"), 10) || 0;

  // Check existing like state for THIS user + THIS post
  const alreadyLiked = hasUserLikedPost(currentUser.id, postId);
  const nowLiked = !alreadyLiked;

  // Update local like map
  setUserLike(currentUser.id, postId, nowLiked);

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
  }

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

  // If there is a file, try to read & resize it as a data URL
if (hasFile) {
  const file = fileInput.files[0];
  try {
    // ⬇️ use the resize helper instead of the full image
    imageDataUrl = await resizeImageTo300px(file);
  } catch (err) {
    console.error("Error reading comment image on this device:", err);
    // If the user put text, we still post the text-only comment.
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
//  SHARE BUTTON — REPOST WITH COMMENT (Profile page)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".share-btn");
  if (!btn) return;

  // Only handle shares inside the profile posts card
  if (!btn.closest("#profilePosts")) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Log in to share posts.");
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
    // Optional: metadata about the original
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

  // Re-render profile so stats/topics update.
  const profileUser = getProfileUser();
  if (profileUser) {
    const isOwnProfile = currentUser.id === profileUser.id;
    renderProfileHeader(profileUser, isOwnProfile);
    renderProfileAbout(profileUser);
    renderProfileTopics(profileUser);
    renderProfilePosts(profileUser, isOwnProfile);
  }

  // Optional: small feedback
  if (typeof showToastSuccess === "function") {
    showToastSuccess("Post shared to your wall.");
  } else {
    console.log("Shared post created:", newPost.id);
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

  const targetId = btn.getAttribute("data-follow-target-id"); // 👈 no Number()
  if (!targetId || String(targetId) === String(current.id)) return;

  const nowFollowing = toggleFollowLocal(current.id, targetId);

  btn.textContent = nowFollowing ? "Following" : "Follow";
  btn.classList.toggle("btn-main", nowFollowing);
  btn.classList.toggle("btn-outline-soft", !nowFollowing);

  const profileUser = getProfileUser();
  const isOwnProfile = profileUser && String(profileUser.id) === String(current.id);

  // 🔹 Firestore follows
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
//  EDIT PROFILE BUTTON HANDLER
// ===========================
document.addEventListener("click", function (e) {
  const btn = e.target.closest("#editProfileBtn");
  if (!btn) return;

  const card = document.getElementById("profileEditCard");
  if (!card) return;

  const isHidden = card.style.display === "none" || card.hasAttribute("hidden");

  if (isHidden) {
    card.style.display = "";    // show
    card.removeAttribute("hidden");
    btn.textContent = "Close";
  } else {
    card.style.display = "none"; // hide
    btn.textContent = "Edit";
  }
});

// ===========================
//  SHOW / HIDE FOLLOWING LIST
// ===========================
document.addEventListener("click", function (e) {
  // Click on "X followers" button in header
  const trigger = e.target.closest("#profileFollowingTrigger");
  if (trigger) {
    const card = document.getElementById("profileFollowingCard");
    if (!card) return;

    const profileUser = getProfileUser();
    if (!profileUser) return;

    const current = getCurrentUser();
    const isOwnProfile =
      current && String(current.id) === String(profileUser.id);

    const isHidden =
      card.hasAttribute("hidden") || card.style.display === "none";

    if (isHidden) {
      renderProfileFollowingList(profileUser, isOwnProfile);
      card.style.display = "";
      card.removeAttribute("hidden");
    } else {
      card.style.display = "none";
      card.setAttribute("hidden", "true");
    }
    return;
  }

  // Close button on the Following card
  const closeBtn = e.target.closest("#closeFollowingCardBtn");
  if (closeBtn) {
    const card = document.getElementById("profileFollowingCard");
    if (card) {
      card.style.display = "none";
      card.setAttribute("hidden", "true");
    }
  }
});

// ===========================
//  UNFOLLOW FROM FOLLOWING LIST
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".unfollow-btn");
  if (!btn) return;

  const current = getCurrentUser();
  if (!current) {
    alert("Log in to manage who you follow.");
    return;
  }

  const targetId = btn.getAttribute("data-target-id");
  if (!targetId) return;

  if (!confirm("Stop following this user?")) return;

  // Only proceed if we are actually following them
  if (!isFollowing(current.id, targetId)) {
    return;
  }

  // 1) Update local follows map
  toggleFollowLocal(current.id, targetId); // we know it will remove since we just checked

  // 2) Delete follow doc in Firestore
  const followDocId = `${current.id}_${targetId}`;
  try {
    await deleteDoc(doc(followsCol, followDocId));
  } catch (err) {
    console.error("Error removing follow in Firestore:", err);
  }

  // 3) Re-render header stats and posts
  const profileUser = getProfileUser();
  if (profileUser) {
    const isOwnProfile = String(current.id) === String(profileUser.id);
    renderProfileHeader(profileUser, isOwnProfile);
    renderProfileAbout(profileUser);
    renderProfileTopics(profileUser);
    renderProfilePosts(profileUser, isOwnProfile);

    // 4) If following card is open, refresh the list
    const card = document.getElementById("profileFollowingCard");
    if (card && !card.hasAttribute("hidden")) {
      renderProfileFollowingList(profileUser, isOwnProfile);
    }
  }
});

// ===========================
//  DELETE POST (Profile page)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".delete-post-btn");
  if (!btn) return;

  // Only handle deletes inside the profile posts card
  if (!btn.closest("#profilePosts")) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Log in to delete your posts.");
    return;
  }

  const postId = Number(btn.getAttribute("data-post-id"));
  if (!postId) return;

  const posts = loadPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  if (post.userId !== currentUser.id) {
    alert("You can only delete your own posts.");
    return;
  }

  if (!confirm("Delete this post? This cannot be undone.")) return;

  // 1) Remove from local posts
  const updatedPosts = posts.filter((p) => p.id !== postId);
  savePosts(updatedPosts);

  // 2) Remove its comments locally
  const commentsMap = loadCommentsMap();
  delete commentsMap[String(postId)];
  saveCommentsMap(commentsMap);

  // 3) Clean it out of likes map (optional but tidy)
  const likesMap = loadLikes();
  Object.keys(likesMap).forEach((uid) => {
    const list = likesMap[uid];
    if (Array.isArray(list)) {
      likesMap[uid] = list.filter((id) => id !== postId);
    }
  });
  saveLikes(likesMap);

  // 4) Delete from Firestore: post + its comments
  try {
    await deleteDoc(doc(postsCol, String(postId)));
  } catch (err) {
    console.error("Error deleting post from Firestore:", err);
  }

  try {
    const q = query(commentsCol, where("postId", "==", postId));
    const snap = await getDocs(q);
    const deletions = snap.docs.map((d) => deleteDoc(doc(commentsCol, d.id)));
    await Promise.all(deletions);
  } catch (err) {
    console.error("Error deleting comments for post:", err);
  }

  // 5) Re-render profile UI so counts + posts update
  const profileUser = getProfileUser();
  if (profileUser) {
    const isOwnProfile = currentUser.id === profileUser.id;
    renderProfileHeader(profileUser, isOwnProfile);
    renderProfileAbout(profileUser);
    renderProfileTopics(profileUser);
    renderProfilePosts(profileUser, isOwnProfile);
  }
});

// ===========================
//  DELETE COMMENT (Profile page)
// ===========================
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".delete-comment-btn");
  if (!btn) return;

  // Only handle deletes inside the profile posts card
  if (!btn.closest("#profilePosts")) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Log in to delete comments.");
    return;
  }

  const commentId = Number(btn.getAttribute("data-comment-id"));
  const postId = Number(btn.getAttribute("data-post-id"));
  const commentUserId = Number(btn.getAttribute("data-comment-user-id"));

  if (!commentId || !postId) return;

  // Find post to see who owns it
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
//  PROFILE TOPIC FILTER
// ===========================
document.addEventListener("click", function (e) {
  // Only handle topic pills inside the profile sidebar
  const pill = e.target.closest("#profileTopics .tag-pill[data-topic]");
  if (!pill) return;

  const topic = pill.dataset.topic;
  if (!topic) return;

  // Toggle behaviour: click again to clear
  if (profileActiveTopic === topic) {
    profileActiveTopic = null;
    pill.classList.remove("active");
  } else {
    profileActiveTopic = topic;
    // Remove active from any other pills in the sidebar
    document
      .querySelectorAll("#profileTopics .tag-pill[data-topic].active")
      .forEach((el) => el.classList.remove("active"));

    pill.classList.add("active");
  }

  // Re-render the posts for this profile with the new filter
  const profileUser = getProfileUser();
  if (profileUser) {
    const currentUser = getCurrentUser();
    const isOwnProfile = currentUser && currentUser.id === profileUser.id;
    renderProfilePosts(profileUser, isOwnProfile);
  }

  // Optional: scroll posts into view
  const postsCard = document.getElementById("profilePosts");
  if (postsCard) {
    postsCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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

