document.addEventListener("DOMContentLoaded", () => {
  // i18n translate all elements with data-i18n and data-i18n-placeholder
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) el.textContent = message;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const message = chrome.i18n.getMessage(key);
    if (message) el.placeholder = message;
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    const message = chrome.i18n.getMessage(key);
    if (message) el.title = message;
  });

  // Load your other data or UI states
  loadIconLinks();
  loadSavedOffers();

  // Display localized quick match label text
  const matchLabel = document.getElementById("matchLabel");
  if (matchLabel) {
    matchLabel.textContent = chrome.i18n.getMessage("quickMatch");
  }

  chrome.storage.local.get("cvText", (data) => {
    if (data.cvText) document.getElementById("cvInput").value = data.cvText;
  });

  // Create and insert the compatibility score button after textarea
  const scoreBtn = document.createElement("button");
  scoreBtn.classList.add("icon-btn");
  scoreBtn.id = "calculateMatch";
  scoreBtn.innerHTML = "📐";
  scoreBtn.title = chrome.i18n.getMessage("compatibilityScore") || "Compatibility Score";
  scoreBtn.onclick = calculateMatchScore;
  if (scoreBtn) scoreBtn.onclick = calculateMatchScore;

  const cvInput = document.getElementById("cvInput");
  if (cvInput) {
    cvInput.insertAdjacentElement("afterend", scoreBtn);
  }

  const scoreLabel = document.getElementById("scoreLabel");
  if (scoreLabel) {
    scoreLabel.title = chrome.i18n.getMessage("scoreLabel");
  }
  const coveredLabel = document.getElementById("coveredLabel");
  if (coveredLabel) {
    coveredLabel.title = chrome.i18n.getMessage("coveredLabel");
  }
  const missingLabel = document.getElementById("missingLabel");
  if (missingLabel) {
    missingLabel.title = chrome.i18n.getMessage("missingLabel");
  }


  // Optional save button event handler
  const saveBtn = document.getElementById("savePage");
  if (saveBtn) saveBtn.onclick = saveCurrentPage;
});

// Set version from manifest
const version = chrome.runtime.getManifest().version;
const versionEl = document.getElementById("versionLabel");
if (versionEl) versionEl.textContent = "v" + version;

const defaultIcons = {
  github: "https://github.com/antoinebrias/",
  linkedin: "https://www.linkedin.com/in/antoine-brias-2b64841a9/",
  blog: "https://www.briaslab.fr/blog/"
};

function loadIconLinks() {
  chrome.storage.local.get("links", (data) => {
    let links = data.links;

    if (!links || Object.keys(links).length === 0) {
      links = { ...defaultIcons };
      chrome.storage.local.set({ links });
    }

    const container = document.getElementById("iconLinks");
    container.innerHTML = "";

    for (const [key, url] of Object.entries(links)) {
      const row = createLinkRow(key, url, links, container);
      container.appendChild(row);
    }

    const addRow = document.createElement("div");
    addRow.className = "icon-row add-row";
    const addBtn = document.createElement("button");
    addBtn.innerHTML = "➕";
    addBtn.title = chrome.i18n.getMessage("linkUrlPrompt");

    addBtn.onclick = () => {
      const newRow = document.createElement("div");
      newRow.className = "icon-row";

      const fallback = document.createElement("div");
      fallback.className = "default-favicon";
      fallback.textContent = "🌐";  // Always show globe
      fallback.style.fontSize = "28px";
      fallback.style.display = "flex";
      fallback.style.alignItems = "center";
      fallback.style.justifyContent = "center";

      const input = document.createElement("input");
      input.placeholder = chrome.i18n.getMessage("linkUrlPrompt") || "Enter link...";
      input.title = chrome.i18n.getMessage("clipboard") || "Clipboard";

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        }
      });

      input.addEventListener("blur", () => {
        const url = input.value.trim();
        if (!url) {
          container.removeChild(newRow);
          return;
        }
        let key;
        try {
          const u = new URL(url);
          key = u.hostname.replace(/^www\./, "").split(".")[0];
        } catch {
          key = "link" + Date.now();
        }
        chrome.storage.local.get("links", (data) => {
          const updatedLinks = { ...(data.links || {}) };
          updatedLinks[key] = url;
          chrome.storage.local.set({ links: updatedLinks }, loadIconLinks);
        });
      });

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "🗑️";
      removeBtn.title = chrome.i18n.getMessage("deleteLink") || "Delete";
      removeBtn.onclick = () => container.removeChild(newRow);

      newRow.appendChild(fallback);
      newRow.appendChild(input);
      newRow.appendChild(removeBtn);

      container.insertBefore(newRow, addRow);

      input.focus();
    };

    addRow.appendChild(addBtn);
    container.appendChild(addRow);
  });
}

function createLinkRow(key, entry, links, container) {
  const row = document.createElement("div");
  row.className = "icon-row";

  const url = typeof entry === "string" ? entry : entry.url;
  let hue;

  if (typeof entry === "object" && entry.hue !== undefined) {
    hue = entry.hue;
  } else {
    hue = Math.floor(Math.random() * 360);
    links[key] = { url, hue };
    chrome.storage.local.set({ links });
  }

  const fallback = document.createElement("div");
  fallback.className = "default-favicon";
  fallback.textContent = "🌐";
  fallback.style.fontSize = "28px";
  fallback.style.display = "flex";
  fallback.style.alignItems = "center";
  fallback.style.justifyContent = "center";

  const icon = document.createElement("img");
  icon.alt = key;
  icon.title = chrome.i18n.getMessage("clipboard");
  icon.style.cursor = "pointer";
  icon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`;

  icon.onload = () => {
    if (icon.naturalHeight <= 16) row.replaceChild(fallback, icon);
  };
  icon.onerror = () => row.replaceChild(fallback, icon);

  icon.addEventListener("click", () => {
    navigator.clipboard.writeText(url);
    showTooltip(chrome.i18n.getMessage("copied") || "Copied!");
  });

  const input = document.createElement("input");
  input.value = url;
  input.title = chrome.i18n.getMessage("clipboard") || "Clipboard";
  input.addEventListener("change", () => {
    links[key] = { url: input.value, hue };
    chrome.storage.local.set({ links });
  });

  const removeBtn = document.createElement("button");
  removeBtn.innerHTML = "🗑️";
  removeBtn.title = chrome.i18n.getMessage("deleteLink") || "Delete";
  removeBtn.onclick = () => {
    delete links[key];
    chrome.storage.local.set({ links }, loadIconLinks);
  };

  row.appendChild(icon);
  row.appendChild(input);
  row.appendChild(removeBtn);

  return row;
}

function showTooltip(message) {
  const tooltip = document.getElementById("tooltip");
  tooltip.textContent = message;
  tooltip.style.opacity = "1";
  tooltip.style.pointerEvents = "auto";

  setTimeout(() => {
    tooltip.style.opacity = "0";
    tooltip.style.pointerEvents = "none";
  }, 2000);
}

function saveCurrentPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.storage.local.get("savedOffers", (data) => {
      const savedOffers = data.savedOffers || [];

      const alreadySaved = savedOffers.some(offer => offer.url === tab.url);
      if (alreadySaved) {
        showTooltip("This offer is already saved.");
        return;
      }

      savedOffers.push({
        url: tab.url,
        title: tab.title || "(sans titre)",
        date: new Date().toISOString(),
        applied: false,
      });

      chrome.storage.local.set({ savedOffers }, loadSavedOffers);
      showTooltip("Offer saved!");
    });
  });
}

function loadSavedOffers() {
  chrome.storage.local.get("savedOffers", (data) => {
    const container = document.getElementById("savedOffers");
    container.innerHTML = "";

    const offers = data.savedOffers || [];

    offers.forEach((offer, i) => {
      const row = document.createElement("div");
      row.className = "icon-row";

      const fallback = document.createElement("div");
      fallback.className = "default-favicon";
      fallback.textContent = "🌐";
      fallback.style.fontSize = "28px";
      fallback.style.display = "flex";
      fallback.style.alignItems = "center";
      fallback.style.justifyContent = "center";


      const icon = document.createElement("img");
      icon.alt = "favicon";
      icon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(offer.url)}`;
      icon.title = chrome.i18n.getMessage("clipboard") || "Copy link";
      icon.style.cursor = "pointer";

      icon.onerror = () => {
        fallback.title = icon.title;
        fallback.style.cursor = "pointer";
        fallback.textContent = "🌐";
        fallback.addEventListener("click", () => {
          navigator.clipboard.writeText(offer.url);
          showTooltip(chrome.i18n.getMessage("copied") || "Copied!");
        });
        icon.replaceWith(fallback);
      };

      icon.addEventListener("click", () => {
        navigator.clipboard.writeText(offer.url);
        showTooltip(chrome.i18n.getMessage("copied") || "Copied!");
      });

      const a = document.createElement("a");
      a.href = offer.url;
      a.textContent = offer.title;
      a.target = "_blank";
      a.title = offer.url;

      const date = document.createElement("small");
      const dt = new Date(offer.date);
      date.textContent = dt.toLocaleString(undefined, {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "🗑️";
      removeBtn.title = chrome.i18n.getMessage("deleteOffer") || "Delete offer";
      removeBtn.onclick = () => {
        offers.splice(i, 1);
        chrome.storage.local.set({ savedOffers: offers }, loadSavedOffers);
      };

      row.appendChild(icon);
      row.appendChild(a);
      row.appendChild(date);
      row.appendChild(removeBtn);

      container.appendChild(row);
    });

    const addRow = document.createElement("div");
    addRow.className = "icon-row add-row";
    const addBtn = document.createElement("button");
    addBtn.innerHTML = "➕";
    addBtn.title = chrome.i18n.getMessage("saveOffer");
    addBtn.onclick = saveCurrentPage;
    addRow.appendChild(addBtn);
    container.appendChild(addRow);
  });
}

// Matching Score Calculation
function calculateMatchScore() {
  console.log("🔍 Button clicked");

  const cvInputEl = document.getElementById("cvInput");
  if (!cvInputEl) return console.error("❌ CV input not found");

  const cvText = cvInputEl.value.toLowerCase();
  const cvTokens = new Set(cvText.match(/\b\w{3,}\b/g));

  chrome.storage.local.set({ cvText });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs?.length) return console.error("❌ No active tab");

    const tab = tabs[0];
    const url = new URL(tab.url || "");

    // Inject content script that adapts based on site
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (host) => {
        if (host.includes("linkedin.com")) {
          // Try multiple selectors that LinkedIn might use
          const el = document.querySelector(
            ".jobs-description__container, .description__text, .jobs-description-content__text, .jobs-box__html-content"
          );
          return el ? el.innerText.toLowerCase() : "";
        } else {
          return document.body.innerText.toLowerCase();
        }
      },
      args: [url.hostname]
    }, (results) => {
      const offerText = results?.[0]?.result;
      if (!offerText) return console.error("❌ No job description extracted");

      const offerTokens = offerText.split(/\W+/).filter(Boolean);
      const match = offerTokens.filter(t => cvTokens.has(t));
      const score = Math.round((match.length / offerTokens.length) * 100);

      const keywords = Array.from(new Set(
        offerTokens.filter(w => w.length > 5)
      )).slice(0, 20);
      const missing = keywords.filter(k => !cvTokens.has(k));

      document.getElementById("scoreValue").textContent = `${score}%`;
      document.getElementById("coveredValue").textContent = match.slice(0, 5).join(", ");
      document.getElementById("missingValue").textContent = missing.slice(0, 5).join(", ");
    });
  });
}
