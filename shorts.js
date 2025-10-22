const API_BASE = "https://moletube.onrender.com";
const feed = document.getElementById("shortsFeed");
const overlay = document.getElementById("unmuteOverlay");
let isMuted = true;

// Load first short
loadShort();

// Load one short at a time
async function loadShort() {
  try {
    const res = await fetch(`${API_BASE}/api/shorts`);
    const data = await res.json();
    if (!data || !data.length) return;
    const short = data[0];

    const iframe = document.createElement("iframe");
    iframe.src = `${short.url}?autoplay=1&mute=${isMuted ? 1 : 0}`;
    iframe.allow = "autoplay; encrypted-media";
    iframe.dataset.url = short.url;
    iframe.loading = "lazy";

    feed.appendChild(iframe);
  } catch (err) {
    console.error("Error loading short:", err);
  }
}

// Load next short when near bottom
document.querySelector(".shorts-container").addEventListener("scroll", e => {
  const el = e.target;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    loadShort();
  }
});

// Show overlay until unmuted
overlay.classList.remove("hidden");
overlay.onclick = () => {
  isMuted = false;
  overlay.classList.add("hidden");

  const last = feed.lastElementChild;
  if (last) {
    last.src = last.dataset.url + "?autoplay=1&mute=0";
  }
};
