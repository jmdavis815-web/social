// ===========================
//  SHARED CONSTANTS
// ===========================
const USERS_KEY = "openwall-users";
const CURRENT_USER_KEY = "openwall-current";
const POSTS_KEY = "openwall-posts";

// ===========================
//  BASIC LOAD/SAVE HELPERS
// ===========================
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

// ===========================
//  THEME TOGGLE (same as index)
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
//  YEAR IN FOOTER
// ===========================
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ===========================
//  QUERY PARAM: WHICH PROFILE?
// ===========================
function getProfileUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idStr = params.get("userId");
  if (!idStr) return null;
  const num = Number(idStr);
  return Number.isNaN(num) ? null : num;
}

// ===========================
//  STATS FOR USER
// ===========================
function computeUserStats(userId) {
  const posts = loadPosts();
  let postCount = 0;
  let likeCount = 0;

  posts.forEach((p) => {
    if (p.userId === userId) {
      postCount += 1;
      likeCount += typeof p.likes === "number" ? p.likes : 0;
    }
  });

  return { postCount, likeCount };
}

// ===========================
//  RENDER PROFILE
// ===========================
function populateProfile(user) {
  const avatarEl = document.getElementById("profileAvatar");
  const nameDisplayEl = document.getElementById("profileNameDisplay");
  const handleDisplayEl = document.getElementById("profileHandleDisplay");
  const bioTextEl = document.getElementById("profileBioText");

  const postsStat = document.getElementById("profileStatsPosts");
  const likesStat = document.getElementById("profileStatsLikes");
  const postsStatSide = document.getElementById("profileStatsPostsSide");
  const likesStatSide = document.getElementById("profileStatsLikesSide");

  const name = user.name || "Unknown";
  const username = user.username || "user";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  if (avatarEl) avatarEl.textContent = initials;
  if (nameDisplayEl) nameDisplayEl.textContent = name;
  if (handleDisplayEl) handleDisplayEl.textContent = "@" + username;

  const bio =
    user.bio && user.bio.trim()
      ? user.bio.trim()
      : "This user hasn’t added a bio yet.";
  if (bioTextEl) bioTextEl.textContent = bio;

  const stats = computeUserStats(user.id);
  if (postsStat) postsStat.textContent = String(stats.postCount);
  if (likesStat) likesStat.textContent = String(stats.likeCount);
  if (postsStatSide) postsStatSide.textContent = String(stats.postCount);
  if (likesStatSide) likesStatSide.textContent = String(stats.likeCount);

  // Fill form fields
  const nameInput = document.getElementById("profileName");
  const usernameInput = document.getElementById("profileUsername");
  const bioInput = document.getElementById("profileBio");
  const locationInput = document.getElementById("profileLocation");
  const websiteInput = document.getElementById("profileWebsite");

  if (nameInput) nameInput.value = user.name || "";
  if (usernameInput) usernameInput.value = user.username || "";
  if (bioInput) bioInput.value = user.bio || "";
  if (locationInput) locationInput.value = user.location || "";
  if (websiteInput) websiteInput.value = user.website || "";
}

// ===========================
//  AUTH UI (reused logic)
// ===========================
function updateAuthUIProfilePage(currentUser) {
  const loginNavBtn = document.getElementById("loginNavBtn");
  const signupNavBtn = document.getElementById("signupNavBtn");

  let userBadge = document.getElementById("navUserBadge");
  let logoutBtn = document.getElementById("navLogoutBtn");

  if (currentUser) {
    if (loginNavBtn) loginNavBtn.style.display = "none";
    if (signupNavBtn) signupNavBtn.style.display = "none";

    const navActionContainer = loginNavBtn
      ? loginNavBtn.parentElement
      : document.querySelector(".navbar .d-flex.align-items-center.gap-2");

    if (navActionContainer) {
      if (!userBadge) {
        userBadge = document.createElement("span");
        userBadge.id = "navUserBadge";
        userBadge.className = "badge rounded-pill px-3 py-2 me-1";
        userBadge.style.backgroundColor = "var(--accent-soft)";
        userBadge.style.color = "var(--accent)";
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
          localStorage.removeItem(CURRENT_USER_KEY);
          window.location.href = "index.html";
        });
      }
    }

    if (userBadge) {
      userBadge.textContent = `@${currentUser.username}`;
      userBadge.style.cursor = "pointer";
      userBadge.onclick = () => {
        window.location.href = `profile.html?userId=${currentUser.id}`;
      };
    }
  } else {
    if (loginNavBtn) loginNavBtn.style.display = "";
    if (signupNavBtn) signupNavBtn.style.display = "";
    if (userBadge && userBadge.parentNode) userBadge.parentNode.removeChild(userBadge);
    if (logoutBtn && logoutBtn.parentNode) logoutBtn.parentNode.removeChild(logoutBtn);
  }
}

// ===========================
//  EDIT PROFILE HANDLING
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  const currentUser = getCurrentUser();
  updateAuthUIProfilePage(currentUser);

  const users = loadUsers();
  const queryUserId = getProfileUserIdFromUrl();

  let profileUser = null;

  if (queryUserId != null) {
    profileUser = users.find((u) => u.id === queryUserId) || null;
  }

  // If no user in URL, fall back to current user
  if (!profileUser && currentUser) {
    profileUser = currentUser;
  }

  // If still no user, force login
  if (!profileUser) {
    const notice = document.getElementById("profileEditNotice");
    if (notice) {
      notice.textContent =
        "You must be logged in to view a profile. Please log in first.";
    }

    const form = document.getElementById("profileForm");
    if (form) {
      Array.from(form.elements).forEach((el) => {
        el.disabled = true;
      });
    }

    // Optionally show login modal
    const loginModalEl = document.getElementById("loginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const modalInstance =
        bootstrap.Modal.getInstance(loginModalEl) ||
        new bootstrap.Modal(loginModalEl);
      modalInstance.show();
    }
    return;
  }

  // Ensure this user object has id
  if (!profileUser.id) {
    // older stored objects should have id from signup, but just in case
    profileUser.id = Date.now();
  }

  populateProfile(profileUser);

  const form = document.getElementById("profileForm");
  const saveBtn = document.getElementById("profileSaveBtn");
  const notice = document.getElementById("profileEditNotice");

  const isOwnProfile = currentUser && currentUser.id === profileUser.id;

  if (!isOwnProfile) {
    // Viewing someone else — read-only
    if (notice) {
      notice.textContent =
        "You’re viewing this profile in read-only mode. Only the owner can edit it.";
    }
    if (form) {
      Array.from(form.elements).forEach((el) => {
        if (el.tagName === "BUTTON") {
          el.disabled = true;
        } else {
          el.setAttribute("disabled", "true");
        }
      });
    }
    return;
  }

  // Own profile — allow editing
  if (notice) {
    notice.textContent = "This is your profile. Update your details below.";
  }

  if (form && saveBtn) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("profileName");
      const usernameInput = document.getElementById("profileUsername");
      const bioInput = document.getElementById("profileBio");
      const locationInput = document.getElementById("profileLocation");
      const websiteInput = document.getElementById("profileWebsite");

      const updatedUser = {
        ...profileUser,
        name: nameInput?.value.trim() || profileUser.name,
        username: usernameInput?.value.trim() || profileUser.username,
        bio: bioInput?.value.trim() || "",
        location: locationInput?.value.trim() || "",
        website: websiteInput?.value.trim() || "",
      };

      // Update in users array
      const idx = users.findIndex((u) => u.id === profileUser.id);
      if (idx !== -1) {
        users[idx] = updatedUser;
      }
      saveUsers(users);

      // Update current user if this is them
      setCurrentUser(updatedUser);

      profileUser = updatedUser;
      populateProfile(profileUser);
      updateAuthUIProfilePage(updatedUser);

      saveBtn.disabled = true;
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save changes";
      }, 1200);
    });
  }
});
