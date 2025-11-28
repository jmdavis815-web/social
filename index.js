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

function renderPosts() {
  const container = document.getElementById("postList");
  if (!container) return;

  const posts = loadPosts().slice().sort((a, b) => b.createdAt - a.createdAt);
  container.innerHTML = "";

  if (!posts.length) {
    // Optional: show an empty state
    const empty = document.createElement("div");
    empty.className = "text-body-secondary small";
    empty.style.padding = "0.5rem 0.25rem";
    empty.textContent = "No posts yet. Be the first to share something.";
    container.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post-card";

    const initials = (post.name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

    const when = timeAgo(post.createdAt || Date.now());
    const visibility = post.visibility || "Public";
    const likes = post.likes ?? 0;

    article.innerHTML = `
      <div class="d-flex gap-2">
        <div class="post-avatar">${escapeHtml(initials)}</div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <div>
              <span class="post-username">${escapeHtml(post.name || "Unknown")}</span>
              <span class="post-handle ms-1">@${escapeHtml(post.username || "user")}</span>
            </div>
            <span class="post-meta">${when} · ${escapeHtml(visibility)}</span>
          </div>
          <div class="post-body">
            ${escapeHtml(post.body || "")}
          </div>
          <div class="post-actions">
            <button type="button">
              <i>♡</i> ${likes}
            </button>
            <button type="button">
              <i>💬</i> 0
            </button>
            <button type="button">
              <i>↻</i> Share
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
}

function initPosts() {
  let posts = loadPosts();
  if (!posts.length) {
    // Seed with a couple of example posts once
    const now = Date.now();
    posts = [
      {
        id: now - 3,
        userId: 1,
        name: "Michael",
        username: "michael",
        body:
          "First test of the new OpenWall feed ✅  Soon this page will show real posts from real accounts, always sorted with the latest at the top.",
        createdAt: now - 2 * 60 * 1000,
        visibility: "Public",
        likes: 12,
      },
      {
        id: now - 2,
        userId: 2,
        name: "Alex Smith",
        username: "alex",
        body:
          "Imagine using this feed like a micro-blog: quick updates, photos, or longer reflections. You can follow people you care about and keep everything in one simple stream.",
        createdAt: now - 10 * 60 * 1000,
        visibility: "Public",
        likes: 7,
      },
      {
        id: now - 1,
        userId: 3,
        name: "Jordan",
        username: "jordan",
        body:
          "Next steps: accounts, likes, comments, and the ability to filter your wall by people and tags. For now this layout shows how everything will look when wired to your backend.",
        createdAt: now - 32 * 60 * 1000,
        visibility: "Friends",
        likes: 19,
      },
    ];
    savePosts(posts);
  }
  renderPosts();
}

// ===========================
//  AUTH UI UPDATES
// ===========================
function updateAuthUI() {
  const user = getCurrentUser();

  const loginNavBtn = document.getElementById("loginNavBtn");
  const signupNavBtn = document.getElementById("signupNavBtn");

  // Composer elements
  const composerInput = document.querySelector(".composer-input");
  const composerNote = document.querySelector(".composer-note");

  const composerButton = document.querySelector(
    ".composer-card button.btn-main"
  );

  // User badge in navbar
  let userBadge = document.getElementById("navUserBadge");
  let logoutBtn = document.getElementById("navLogoutBtn");

  if (user) {
    // Hide login/signup buttons
    if (loginNavBtn) loginNavBtn.style.display = "none";
    if (signupNavBtn) signupNavBtn.style.display = "none";

    // Create user badge + logout button if missing
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
          clearCurrentUser();
          updateAuthUI();
        });
      }
    }

    if (userBadge) {
      userBadge.textContent = `@${user.username}`;
    }

    // Enable composer for posts
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
    // No user: show login/signup, remove badge/logout
    if (loginNavBtn) loginNavBtn.style.display = "";
    if (signupNavBtn) signupNavBtn.style.display = "";

    if (userBadge && userBadge.parentNode)
      userBadge.parentNode.removeChild(userBadge);
    if (logoutBtn && logoutBtn.parentNode)
      logoutBtn.parentNode.removeChild(logoutBtn);

    // Disable composer
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
const composerButtonEl = document.querySelector(".composer-card button.btn-main");

if (composerButtonEl && composerInputEl) {
  composerButtonEl.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      // Logged out: let Bootstrap open the login modal via data-bs-* attributes
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
    });

    savePosts(posts);
    composerInputEl.value = "";
    renderPosts();
  });

  // Optional: submit with Enter key
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
    const username = document.getElementById("signupUsername")?.value.trim();
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
      password, // NOTE: real apps should hash passwords.
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    updateAuthUI();

    // Close signup modal
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

    // Close login modal
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
