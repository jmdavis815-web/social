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
//  AUTH UI UPDATES
// ===========================
function updateAuthUI() {
  const user = getCurrentUser();

  const loginNavBtn = document.getElementById("loginNavBtn");
  const signupNavBtn = document.getElementById("signupNavBtn");

  // Composer elements
  const composerInput = document.querySelector(".composer-input");
  const composerNote = document.querySelector(
    ".composer-card small.text-body-secondary"
  );
  const composerLoginBtn = document.querySelector(
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

    // Enable composer
    if (composerInput) {
      composerInput.disabled = false;
      composerInput.placeholder = `Share what's on your mind, ${user.name}…`;
    }
    if (composerNote) {
      composerNote.textContent = "Your posts will appear at the top of the wall.";
    }
    if (composerLoginBtn) {
      composerLoginBtn.disabled = true;
      composerLoginBtn.textContent = "You’re logged in";
    }
  } else {
    // No user: show login/signup, remove badge/logout
    if (loginNavBtn) loginNavBtn.style.display = "";
    if (signupNavBtn) signupNavBtn.style.display = "";

    if (userBadge && userBadge.parentNode) userBadge.parentNode.removeChild(userBadge);
    if (logoutBtn && logoutBtn.parentNode) logoutBtn.parentNode.removeChild(logoutBtn);

    // Disable composer
    if (composerInput) {
      composerInput.disabled = true;
      composerInput.placeholder = "Share what's on your mind, Michael…";
    }
    if (composerNote) {
      composerNote.textContent =
        "Log in or create an account to start posting.";
    }
    if (composerLoginBtn) {
      composerLoginBtn.disabled = false;
      composerLoginBtn.textContent = "Log in to post";
    }
  }
}

// Call once on load
updateAuthUI();

// ===========================
//  SIGNUP HANDLER
// ===========================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName")?.value.trim();
    const username = document.getElementById("signupUsername")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim().toLowerCase();
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
      password, // In a real app, NEVER store raw passwords.
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

    const email = document.getElementById("loginEmail")?.value
      .trim()
      .toLowerCase();
    const password = document.getElementById("loginPassword")?.value.trim();

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
