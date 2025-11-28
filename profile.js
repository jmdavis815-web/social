// ===========================
//  YEAR IN FOOTER
// ===========================
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ===========================
//  THEME TOGGLE
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
//  STORAGE KEYS + HELPERS
// ===========================
const USERS_KEY = "openwall-users";
const CURRENT_USER_KEY = "openwall-current";
const POSTS_KEY = "openwall-posts";

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function timeAgo(ts) {
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString();
}

function prettyDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ===========================
//  PROFILE RENDERING
// ===========================
function computeProfileStats(userId) {
  const posts = loadPosts().filter((p) => p.userId === userId);
  const postCount = posts.length;
  const totalLikes = posts.reduce(
    (sum, p) => sum + (typeof p.likes === "number" ? p.likes : 0),
    0
  );
  const avgLikes = postCount ? (totalLikes / postCount).toFixed(1) : "0";

  // top topic from tags
  const topicCounts = {};
  posts.forEach((p) => {
    (p.tags || []).forEach((t) => {
      const tag = String(t).toLowerCase();
      topicCounts[tag] = (topicCounts[tag] || 0) + 1;
    });
  });

  let topTag = "—";
  let topCount = 0;
  Object.entries(topicCounts).forEach(([tag, count]) => {
    if (count > topCount) {
      topCount = count;
      topTag = `#${tag}`;
    }
  });

  return { postCount, totalLikes, avgLikes, topTag, posts };
}

function renderProfileHeader(user, stats) {
  const initials =
    (user.name || "U")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const avatarEl = document.getElementById("profileAvatarInitials");
  const nameEl = document.getElementById("profileName");
  const handleEl = document.getElementById("profileHandle");
  const joinedEl = document.getElementById("profileJoined");
  const postCountEl = document.getElementById("profilePostCount");
  const likeCountEl = document.getElementById("profileLikeCount");
  const avgLikesEl = document.getElementById("profileAvgLikes");
  const topTagEl = document.getElementById("profileTopTag");

  if (avatarEl) avatarEl.textContent = escapeHtml(initials);
  if (nameEl) nameEl.textContent = user.name || "Unknown user";
  if (handleEl) handleEl.textContent = `@${user.username || "user"}`;

  if (joinedEl) {
    if (user.createdAt) {
      joinedEl.textContent = `Joined ${prettyDate(user.createdAt)}`;
    } else {
      joinedEl.textContent = "Joined —";
    }
  }

  if (postCountEl) postCountEl.textContent = stats.postCount;
  if (likeCountEl) likeCountEl.textContent = stats.totalLikes;
  if (avgLikesEl) avgLikesEl.textContent = stats.avgLikes;
  if (topTagEl) topTagEl.textContent = stats.topTag;

  document.title = `${user.name || "Profile"} · OpenWall`;
}

function renderProfileAbout(user) {
  const bioEl = document.getElementById("profileBioText");
  const locEl = document.getElementById("profileLocationText");
  const webLink = document.getElementById("profileWebsiteLink");

  if (bioEl) {
    bioEl.textContent = user.bio && user.bio.trim()
      ? user.bio.trim()
      : "No bio yet.";
  }

  if (locEl) {
    locEl.textContent =
      user.location && user.location.trim() ? user.location.trim() : "—";
  }

  if (webLink) {
    if (user.website && user.website.trim()) {
      let url = user.website.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      webLink.href = url;
      webLink.textContent = user.website.trim();
    } else {
      webLink.removeAttribute("href");
      webLink.textContent = "—";
    }
  }
}

function renderProfileTopics(userId) {
  const topicsEl = document.getElementById("profileTopics");
  if (!topicsEl) return;

  const posts = loadPosts().filter((p) => p.userId === userId);
  const counts = {};

  posts.forEach((p) => {
    (p.tags || []).forEach((t) => {
      const tag = String(t).toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  topicsEl.innerHTML = "";

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    const small = document.createElement("small");
    small.className = "text-body-secondary";
    small.textContent =
      "Topics this user posts about will appear here as they post.";
    topicsEl.appendChild(small);
    return;
  }

  entries.slice(0, 8).forEach(([tag, count]) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = `#${tag} · ${count}`;
    topicsEl.appendChild(pill);
  });
}

function renderUserProfilePosts(userId) {
  const container = document.getElementById("profilePostList");
  if (!container) return;

  const posts = loadPosts()
    .filter((p) => p.userId === userId)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  container.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.textContent = "No posts yet.";
    container.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post-card mb-2";

    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = post.likes ?? 0;

    const initials =
      (post.name || "")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    article.innerHTML = `
      <div class="d-flex gap-2">
        <div class="post-avatar">${escapeHtml(initials)}</div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <div>
              <span class="post-username">${escapeHtml(
                post.name || "Unknown"
              )}</span>
            </div>
            <span class="post-meta">${when} · ${escapeHtml(
      visibility
    )}</span>
          </div>
          <div class="post-body">
            ${escapeHtml(post.body || "")}
          </div>
          <div class="post-actions">
            <button
              type="button"
              class="like-btn"
              data-liked="false"
              data-count="${likes}"
              disabled
            >
              <span class="heart-icon">♡</span>
              <span class="like-count">${likes}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
}

// ===========================
//  EDIT PROFILE (CURRENT USER)
// ===========================
function enableProfileEditing(user) {
  const editBtn = document.getElementById("editProfileBtn");
  const editCard = document.getElementById("profileEditFormCard");
  const form = document.getElementById("editProfileForm");
  const cancelBtn = document.getElementById("cancelEdit");

  const nameInput = document.getElementById("editName");
  const usernameInput = document.getElementById("editUsername");
  const bioInput = document.getElementById("editBio");
  const locationInput = document.getElementById("editLocation");
  const websiteInput = document.getElementById("editWebsite");

  if (!editBtn || !editCard || !form) return;

  // show edit button
  editBtn.classList.remove("d-none");

  const fillForm = () => {
    if (nameInput) nameInput.value = user.name || "";
    if (usernameInput) usernameInput.value = user.username || "";
    if (bioInput) bioInput.value = user.bio || "";
    if (locationInput) locationInput.value = user.location || "";
    if (websiteInput) websiteInput.value = user.website || "";
  };

  fillForm();

  editBtn.addEventListener("click", () => {
    fillForm();
    editCard.classList.remove("d-none");
    nameInput && nameInput.focus();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      editCard.classList.add("d-none");
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newName = (nameInput?.value || "").trim() || "Unknown";
    const newUsername = (usernameInput?.value || "").trim() || "user";
    const newBio = (bioInput?.value || "").trim();
    const newLocation = (locationInput?.value || "").trim();
    const newWebsite = (websiteInput?.value || "").trim();

    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      alert("Could not update this profile.");
      return;
    }

    const updatedUser = {
      ...users[idx],
      name: newName,
      username: newUsername,
      bio: newBio,
      location: newLocation,
      website: newWebsite,
    };

    users[idx] = updatedUser;
    saveUsers(users);
    setCurrentUser(updatedUser);

    // update all posts for this user with new name/username
    const posts = loadPosts();
    posts.forEach((p) => {
      if (p.userId === updatedUser.id) {
        p.name = updatedUser.name;
        p.username = updatedUser.username;
      }
    });
    savePosts(posts);

    const stats = computeProfileStats(updatedUser.id);
    renderProfileHeader(updatedUser, stats);
    renderProfileAbout(updatedUser);
    renderUserProfilePosts(updatedUser.id);

    editCard.classList.add("d-none");
  });
}

// ===========================
//  INIT PAGE
// ===========================
(function initProfilePage() {
  const users = loadUsers();
  let viewedUser = null;

  const paramId = getQueryParam("userId");
  const currentUser = getCurrentUser();

  if (paramId) {
    const idNum = Number(paramId);
    viewedUser = users.find((u) => u.id === idNum) || null;
  } else if (currentUser) {
    viewedUser = users.find((u) => u.id === currentUser.id) || null;
  }

  if (!viewedUser) {
    const header = document.getElementById("profileHeader");
    if (header) {
      header.innerHTML =
        '<p class="text-danger small mb-0">Profile not found.</p>';
    }
    return;
  }

  const stats = computeProfileStats(viewedUser.id);
  renderProfileHeader(viewedUser, stats);
  renderProfileAbout(viewedUser);
  renderProfileTopics(viewedUser.id);
  renderUserProfilePosts(viewedUser.id);

  if (currentUser && currentUser.id === viewedUser.id) {
    enableProfileEditing(viewedUser);
  }
})();
