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

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("userId");
  if (!idParam) return null;

  const num = Number(idParam);
  // Allow both numeric and string ids
  return Number.isNaN(num) ? idParam : num;
}

// ===========================
//  RENDER: HEADER
// ===========================
function renderProfileHeader(user, isOwnProfile) {
  const header = document.getElementById("profileHeader");
  if (!header) return;

  const initials =
    (user.name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  header.innerHTML = `
    <div class="card-body d-flex align-items-center gap-3">
      <div class="profile-avatar">
        <img
          id="profileAvatarImage"
          class="profile-avatar-img d-none"
          alt="${escapeHtml(initials)}"
        />
        <span id="profileAvatarInitials">${escapeHtml(initials)}</span>
      </div>

      <div class="flex-grow-1">
        <h1 class="h5 mb-1">${escapeHtml(user.name || "Unnamed user")}</h1>
        <div class="text-body-secondary small">
          @${escapeHtml(user.username || "user")}
        </div>
      </div>

      ${
        isOwnProfile
          ? `
        <div class="ms-auto d-none d-md-block">
          <button type="button" id="editProfileScrollBtn" class="btn btn-outline-soft btn-sm">
            Edit profile
          </button>
        </div>
      `
          : ""
      }
    </div>
  `;

  // Wire up avatar image vs initials
  const avatarImg = document.getElementById("profileAvatarImage");
  const avatarInitials = document.getElementById("profileAvatarInitials");

  if (user.avatar && avatarImg) {
    avatarImg.src = user.avatar;
    avatarImg.classList.remove("d-none");
    if (avatarInitials) avatarInitials.style.display = "none";
  } else {
    if (avatarImg) avatarImg.classList.add("d-none");
    if (avatarInitials) avatarInitials.style.display = "inline-flex";
  }

  // "Edit profile" button scrolls to form
  const scrollBtn = document.getElementById("editProfileScrollBtn");
  const editCard = document.getElementById("profileEditCard");
  if (scrollBtn && editCard) {
    scrollBtn.addEventListener("click", () => {
      editCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

// ===========================
//  RENDER: ABOUT
// ===========================
function renderProfileAbout(user) {
  const about = document.getElementById("profileAbout");
  if (!about) return;

  const bio = user.bio || "This user hasn’t written a bio yet.";
  const location = user.location || "";
  const website = user.website || "";

  const websiteLink =
    website && website.trim()
      ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener" class="link-body-emphasis small">
           ${escapeHtml(website)}
         </a>`
      : "";

  about.innerHTML = `
    <div class="card-body">
      <h2 class="h6 mb-2">About</h2>
      <p class="mb-2 small">${escapeHtml(bio)}</p>

      <div class="small text-body-secondary">
        ${
          location
            ? `<div><i class="me-1">📍</i>${escapeHtml(location)}</div>`
            : ""
        }
        ${websiteLink ? `<div class="mt-1">🔗 ${websiteLink}</div>` : ""}
      </div>
    </div>
  `;
}

// ===========================
//  RENDER: POSTS BY THIS USER
// ===========================
function renderProfilePosts(user) {
  const postsContainer = document.getElementById("profilePosts");
  if (!postsContainer) return;

  const allPosts = loadPosts();
  const posts = allPosts
    .filter((p) => p.userId == user.id) // loose equals to handle string/number
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!posts.length) {
    postsContainer.innerHTML = `
      <div class="card-body">
        <h2 class="h6 mb-2">Posts</h2>
        <p class="small text-body-secondary mb-0">
          This user hasn’t posted anything yet.
        </p>
      </div>
    `;
    return;
  }

  const initials =
    (user.name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const avatarHtml = user.avatar
    ? `<div class="post-avatar">
         <img src="${escapeHtml(user.avatar)}"
              alt="${escapeHtml(initials)}"
              class="post-avatar-img" />
       </div>`
    : `<div class="post-avatar">${escapeHtml(initials)}</div>`;

  const cardsHtml = posts
    .map((post) => {
      const when = timeAgo(post.createdAt || Date.now());
      const visibility = post.visibility || "Public";

      return `
        <article class="post-card border-0 border-top">
          <div class="d-flex gap-2">
            ${avatarHtml}
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between">
                <div>
                  <span class="post-username">${escapeHtml(
                    user.name || "Unknown"
                  )}</span>
                  <span class="post-handle ms-1">@${escapeHtml(
                    user.username || "user"
                  )}</span>
                </div>
                <span class="post-meta small text-body-secondary">
                  ${when} · ${escapeHtml(visibility)}
                </span>
              </div>
              <div class="post-body mt-1 small">
                ${escapeHtml(post.body || "")}
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  postsContainer.innerHTML = `
    <div class="card-body">
      <h2 class="h6 mb-2">Posts</h2>
      <div class="profile-post-list">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// ===========================
//  EDIT PROFILE FORM
// ===========================
function setupProfileEditForm(user, isOwnProfile) {
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
  const bioInput = document.getElementById("editBio");
  const locationInput = document.getElementById("editLocation");
  const websiteInput = document.getElementById("editWebsite");
  const avatarInput = document.getElementById("editAvatarInput");

  if (nameInput) nameInput.value = user.name || "";
  if (usernameInput) usernameInput.value = user.username || "";
  if (bioInput) bioInput.value = user.bio || "";
  if (locationInput) locationInput.value = user.location || "";
  if (websiteInput) websiteInput.value = user.website || "";

  // Show a live preview when a new avatar is chosen
  if (avatarInput) {
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result;
        const img = document.getElementById("profileAvatarImage");
        const initialsSpan = document.getElementById("profileAvatarInitials");

        if (img && typeof dataUrl === "string") {
          img.src = dataUrl;
          img.classList.remove("d-none");
        }
        if (initialsSpan) {
          initialsSpan.style.display = "none";
        }
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const users = loadUsers();
    const idx = users.findIndex((u) => u.id == user.id);
    if (idx === -1) return;

    const updatedName = nameInput?.value.trim() || user.name || "";
    const updatedUsername = usernameInput?.value.trim() || user.username || "";
    const updatedBio = bioInput?.value.trim() || "";
    const updatedLocation = locationInput?.value.trim() || "";
    const updatedWebsite = websiteInput?.value.trim() || "";

    function finalizeSave(avatarDataUrl) {
      const updatedUser = {
        ...users[idx],
        name: updatedName,
        username: updatedUsername,
        bio: updatedBio,
        location: updatedLocation,
        website: updatedWebsite,
        avatar: avatarDataUrl || users[idx].avatar || null,
      };

      users[idx] = updatedUser;
      saveUsers(users);
      setCurrentUser(updatedUser);

      // Re-render with new data
      renderProfileHeader(updatedUser, true);
      renderProfileAbout(updatedUser);
      renderProfilePosts(updatedUser);

      alert("Profile updated.");
    }

    const file = avatarInput?.files && avatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = typeof ev.target?.result === "string"
          ? ev.target.result
          : null;
        finalizeSave(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      // No new image picked - keep existing avatar
      finalizeSave(null);
    }
  });
}

// ===========================
//  MAIN INIT
// ===========================
(function initProfilePage() {
  const userIdFromQuery = getUserIdFromQuery();
  const users = loadUsers();
  const currentUser = getCurrentUser();

  // Try to find user from query; if none, fall back to current user
  let profileUser = null;
  if (userIdFromQuery != null) {
    profileUser = users.find((u) => u.id == userIdFromQuery) || null;
  }
  if (!profileUser && currentUser) {
    profileUser = users.find((u) => u.id == currentUser.id) || currentUser;
  }

  if (!profileUser) {
    const main = document.getElementById("profileMain") || document.body;
    const wrapper = document.createElement("div");
    wrapper.className = "alert alert-warning mt-3";
    wrapper.textContent =
      "We couldn’t find that profile in this browser. Try creating an account on the main feed first.";
    main.appendChild(wrapper);
    return;
  }

  const isOwnProfile = currentUser && currentUser.id == profileUser.id;

  renderProfileHeader(profileUser, !!isOwnProfile);
  renderProfileAbout(profileUser);
  renderProfilePosts(profileUser);
  setupProfileEditForm(profileUser, !!isOwnProfile);
})();
