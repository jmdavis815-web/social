// ===========================
//  YEAR IN FOOTER
// ===========================
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

// ===========================
//  THEME TOGGLE (LIGHT/DARK)
// ===========================
const themeToggle = document.getElementById("themeToggle");
const rootHtml = document.documentElement;

function setTheme(theme) {
  if (!rootHtml) return;
  rootHtml.setAttribute("data-bs-theme", theme);
  try {
    localStorage.setItem("openwall-theme", theme);
  } catch (e) {
    // ignore storage errors
  }

  if (themeToggle) {
    const label =
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.setAttribute("aria-label", label);
  }
}

(function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("openwall-theme");
  } catch (e) {
    saved = null;
  }

  if (saved === "light" || saved === "dark") {
    setTheme(saved);
  } else if (window.matchMedia) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  } else {
    setTheme("light");
  }
})();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = rootHtml.getAttribute("data-bs-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });
}

// ===========================
//  STORAGE KEYS & HELPERS
// ===========================
const USERS_KEY = "openwall-users";
const CURRENT_USER_KEY = "openwall-current";
const POSTS_KEY = "openwall-posts";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return fallback;
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return safeParse(raw, []) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    // ignore
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return safeParse(raw, null);
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    // ignore
  }
}

function clearCurrentUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    // ignore
  }
}

function loadPosts() {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return safeParse(raw, []) || [];
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    // ignore
  }
}

// ===========================
//  UTILS
// ===========================
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + "m ago";
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + "h ago";
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return diffDay + "d ago";

  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function getUserPosts(userId) {
  const all = loadPosts();
  return all
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ===========================
//  TOAST HELPER
// ===========================
function showProfileToast(message, type) {
  const variant = type === "error" ? "danger" : "success";

  // Fallback to alert if Bootstrap isn't available
  if (typeof bootstrap === "undefined" || !bootstrap.Toast) {
    alert(message);
    return;
  }

  let container = document.getElementById("profileToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "profileToastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  toastEl.className =
    "toast align-items-center text-bg-" + variant + " border-0";
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body small">
        ${escapeHtml(message)}
      </div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        data-bs-dismiss="toast"
        aria-label="Close"
      ></button>
    </div>
  `;

  container.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: 2600 });
  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });
  toast.show();
}

// ===========================
//  AUTH UI (NAVBAR)
// ===========================
function updateAuthUI() {
  const user = getCurrentUser();

  const loginNavBtn = document.getElementById("loginNavBtn");
  const signupNavBtn = document.getElementById("signupNavBtn");

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
          // Optionally redirect:
          // window.location.href = "index.html";
        });
      }
    }

    if (userBadge) {
      userBadge.textContent = "@" + (user.username || "user");
      userBadge.href = "profile.html?userId=" + encodeURIComponent(user.id);
      userBadge.style.cursor = "pointer";
    }
  } else {
    if (loginNavBtn) loginNavBtn.style.display = "";
    if (signupNavBtn) signupNavBtn.style.display = "";

    if (userBadge && userBadge.parentNode) {
      userBadge.parentNode.removeChild(userBadge);
    }
    if (logoutBtn && logoutBtn.parentNode) {
      logoutBtn.parentNode.removeChild(logoutBtn);
    }
  }
}

// ===========================
//  PROFILE RENDERING
// ===========================
function resolveProfileUser() {
  const users = loadUsers();
  const current = getCurrentUser();
  const userIdParam = getQueryParam("userId");

  let user = null;
  let isOwnProfile = false;

  if (userIdParam) {
    const idNum = Number(userIdParam);
    user = users.find((u) => u.id === idNum) || null;
    if (current && user && current.id === user.id) {
      isOwnProfile = true;
    }
  } else if (current) {
    user = users.find((u) => u.id === current.id) || current;
    isOwnProfile = true;
  }

  return { user, isOwnProfile };
}

function renderProfileHeader(user, isOwnProfile) {
  const headerEl = document.getElementById("profileHeader");
  if (!headerEl) return;

  const posts = getUserPosts(user.id);
  const postCount = posts.length;

  const initials = getInitials(user.name || user.username || "User");

  const avatarHtml = user.avatar
    ? `<img src="${user.avatar}" alt="${escapeHtml(
        user.name || user.username || "User"
      )} avatar" class="profile-avatar-img" />`
    : `<div class="profile-avatar-fallback">${escapeHtml(initials)}</div>`;

  headerEl.innerHTML = `
    <div class="card-body d-flex flex-wrap align-items-center gap-3">
      <div class="profile-avatar-wrapper">
        ${avatarHtml}
      </div>

      <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h1 class="h5 mb-0">${escapeHtml(user.name || "Unnamed user")}</h1>
            <div class="text-body-secondary small">
              @${escapeHtml(user.username || "user")}
            </div>
          </div>

          ${
            isOwnProfile
              ? `<button
                  type="button"
                  class="btn btn-outline-soft btn-sm"
                  id="editProfileScrollBtn"
                >
                  Edit profile
                </button>`
              : ""
          }
        </div>

        <div class="d-flex gap-3 mt-2 small text-body-secondary">
          <span>${postCount} post${postCount === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  `;

  if (isOwnProfile) {
    const btn = document.getElementById("editProfileScrollBtn");
    const editCard = document.getElementById("profileEditCard");
    if (btn && editCard) {
      btn.addEventListener("click", () => {
        editCard.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
}

function renderProfileAbout(user) {
  const aboutCard = document.getElementById("profileAbout");
  if (aboutCard) {
    const bio = user.bio && user.bio.trim() ? user.bio.trim() : "No bio yet.";
    const location = user.location && user.location.trim()
      ? user.location.trim()
      : "—";
    const website = user.website && user.website.trim()
      ? user.website.trim()
      : "";

    let websiteDisplay = "—";
    let websiteHref = "#";
    if (website) {
      websiteHref = website;
      websiteDisplay = website.replace(/^https?:\/\//i, "");
    }

    aboutCard.innerHTML = `
      <div class="card-body">
        <h2 class="h6 mb-2">About</h2>
        <p class="mb-2 text-body-secondary">${escapeHtml(bio)}</p>
        <p class="small mb-1">
          <strong>Location:</strong>
          <span>${escapeHtml(location)}</span>
        </p>
        <p class="small mb-0">
          <strong>Website:</strong>
          ${
            website
              ? `<a href="${escapeHtml(
                  websiteHref
                )}" target="_blank" rel="noopener noreferrer">
                   ${escapeHtml(websiteDisplay)}
                 </a>`
              : "—"
          }
        </p>
      </div>
    `;
  }

  // Also keep older sidebar "About" (if present) in sync
  const bioTextEl = document.getElementById("profileBioText");
  const locTextEl = document.getElementById("profileLocationText");
  const websiteLinkEl = document.getElementById("profileWebsiteLink");

  if (bioTextEl) {
    bioTextEl.textContent =
      user.bio && user.bio.trim() ? user.bio.trim() : "No bio yet.";
  }
  if (locTextEl) {
    locTextEl.textContent =
      user.location && user.location.trim() ? user.location.trim() : "—";
  }
  if (websiteLinkEl) {
    if (user.website && user.website.trim()) {
      websiteLinkEl.href = user.website;
      websiteLinkEl.textContent = user.website.replace(/^https?:\/\//i, "");
    } else {
      websiteLinkEl.href = "#";
      websiteLinkEl.textContent = "—";
    }
  }
}

function renderProfilePosts(user) {
  const postsContainer = document.getElementById("profilePosts");
  const legacyList = document.getElementById("profilePostList");

  const posts = getUserPosts(user.id);

  if (postsContainer) {
    if (!posts.length) {
      postsContainer.innerHTML = `
        <div class="card-body">
          <h2 class="h6 mb-2">Posts</h2>
          <p class="small text-body-secondary mb-0">
            This user hasn&apos;t posted anything yet.
          </p>
        </div>
      `;
    } else {
      const itemsHtml = posts
        .map((post) => {
          const when = timeAgo(post.createdAt);
          return `
            <article class="border-top small py-2">
              <div class="d-flex justify-content-between">
                <span class="text-body-secondary">${when}</span>
                <span class="text-body-secondary">${escapeHtml(
                  post.visibility || "Public"
                )}</span>
              </div>
              <div class="mt-1">
                ${escapeHtml(post.body || "")}
              </div>
            </article>
          `;
        })
        .join("");

      postsContainer.innerHTML = `
        <div class="card-body">
          <h2 class="h6 mb-2">Posts</h2>
          ${itemsHtml}
        </div>
      `;
    }
  }

  // Legacy post list if still present
  if (legacyList) {
    legacyList.innerHTML = "";
    if (!posts.length) {
      const p = document.createElement("p");
      p.className = "small text-body-secondary mb-0";
      p.textContent = "This user hasn't posted anything yet.";
      legacyList.appendChild(p);
    } else {
      posts.forEach((post) => {
        const when = timeAgo(post.createdAt);
        const article = document.createElement("article");
        article.className = "border-top small py-2";
        article.innerHTML = `
          <div class="d-flex justify-content-between">
            <span class="text-body-secondary">${when}</span>
            <span class="text-body-secondary">${escapeHtml(
              post.visibility || "Public"
            )}</span>
          </div>
          <div class="mt-1">
            ${escapeHtml(post.body || "")}
          </div>
        `;
        legacyList.appendChild(article);
      });
    }
  }
}

function renderProfileTopics(user) {
  const topicsContainer = document.getElementById("profileTopics");
  if (!topicsContainer) return;

  const posts = getUserPosts(user.id);
  const tagCounts = {};

  posts.forEach((post) => {
    const tags = post.tags || [];
    tags.forEach((tag) => {
      const key = String(tag).toLowerCase();
      if (!key) return;
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });

  topicsContainer.innerHTML = "";

  const entries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    const small = document.createElement("small");
    small.className = "text-body-secondary";
    small.textContent =
      "Topics this user posts about will appear here as they start using #hashtags.";
    topicsContainer.appendChild(small);
    return;
  }

  entries.slice(0, 10).forEach(([tag, count]) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = "#" + tag + " · " + count;
    topicsContainer.appendChild(pill);
  });
}

// ===========================
//  EDIT PROFILE (OWN PROFILE)
// ===========================
function setupEditProfile(user, isOwnProfile) {
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

  form.dataset.userId = String(user.id);

  if (form.dataset.bound === "true") {
    return;
  }
  form.dataset.bound = "true";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = Number(form.dataset.userId);
    let users = loadUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      showProfileToast("Could not find your user record.", "error");
      return;
    }

    const updatedUser = { ...users[index] };

    if (nameInput) updatedUser.name = nameInput.value.trim() || updatedUser.name;
    if (usernameInput)
      updatedUser.username = usernameInput.value.trim() || updatedUser.username;
    if (locationInput) updatedUser.location = locationInput.value.trim();
    if (websiteInput) updatedUser.website = websiteInput.value.trim();
    if (bioInput) updatedUser.bio = bioInput.value.trim();

    // Handle avatar upload if a new file was chosen
    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
      const file = avatarInput.files[0];

      if (!file.type.startsWith("image/")) {
        showProfileToast("Please choose an image file for your avatar.", "error");
        return;
      }

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsDataURL(file);
        });
        updatedUser.avatar = dataUrl;
      } catch (err) {
        console.error(err);
        showProfileToast(
          "There was a problem reading that image. Try a different file.",
          "error"
        );
        return;
      }
    }

    users[index] = updatedUser;
    saveUsers(users);

    const current = getCurrentUser();
    if (current && current.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    // Update this user's posts with new name/username
    const posts = loadPosts();
    let changed = false;
    posts.forEach((p) => {
      if (p.userId === updatedUser.id) {
        if (p.name !== updatedUser.name || p.username !== updatedUser.username) {
          p.name = updatedUser.name;
          p.username = updatedUser.username;
          changed = true;
        }
      }
    });
    if (changed) {
      savePosts(posts);
    }

    showProfileToast("Profile updated.", "success");
    // Re-render profile with latest info
    renderProfilePage();
    updateAuthUI();
  });
}

// ===========================
//  MAIN ENTRY
// ===========================
function renderProfilePage() {
  const result = resolveProfileUser();
  const user = result.user;
  const isOwnProfile = result.isOwnProfile;

  if (!user) {
    const headerEl = document.getElementById("profileHeader");
    const aboutCard = document.getElementById("profileAbout");
    const postsContainer = document.getElementById("profilePosts");
    const topicsContainer = document.getElementById("profileTopics");

    if (headerEl) {
      headerEl.innerHTML = `
        <div class="card-body">
          <h1 class="h5 mb-1">User not found</h1>
          <p class="small text-body-secondary mb-0">
            We couldn't find that profile. It may have been removed from this browser.
          </p>
        </div>
      `;
    }
    if (aboutCard) aboutCard.innerHTML = "";
    if (postsContainer) postsContainer.innerHTML = "";
    if (topicsContainer) {
      topicsContainer.innerHTML = "";
      const small = document.createElement("small");
      small.className = "text-body-secondary";
      small.textContent = "No topics to show.";
      topicsContainer.appendChild(small);
    }
    return;
  }

  renderProfileHeader(user, isOwnProfile);
  renderProfileAbout(user);
  renderProfilePosts(user);
  renderProfileTopics(user);
  setupEditProfile(user, isOwnProfile);
}

// Initialize on load
updateAuthUI();
renderProfilePage();
