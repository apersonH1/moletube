const API_BASE = "https://moletube.onrender.com";

// Fetch logged/random videos
async function loadVideos() {
  try {
    const res = await fetch(`${API_BASE}/api/shorts`);
    const data = await res.json();
    renderVideos(data);
  } catch (err) {
    console.error("Error loading videos:", err);
  }
}

// Render video thumbnails
function renderVideos(videos) {
  const grid = document.getElementById("videoGrid");
  grid.innerHTML = "";
  videos.forEach(v => {
    const id = extractId(v.url);
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="${v.title}">
      <h3>${v.title}</h3>
      <p>${v.channel}</p>
    `;
    card.onclick = () => {
      window.location.href = `watch.html?url=${encodeURIComponent(v.url)}&title=${encodeURIComponent(v.title)}&channel=${encodeURIComponent(v.channel)}`;
    };
    grid.appendChild(card);
  });
}

// Extract YouTube ID
function extractId(url) {
  const match = url.match(/embed\/([^/?]+)/);
  return match ? match[1] : "";
}

// Handle search
const searchBar = document.getElementById("searchBar");
searchBar.addEventListener("keypress", async e => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (!query) return;
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const vids = (data.items || []).map(item => ({
        url: `https://www.youtube-nocookie.com/embed/${item.id.videoId}`,
        title: item.snippet.title,
        channel: item.snippet.channelTitle
      }));
      renderVideos(vids);
    } catch (err) {
      console.error("Search error:", err);
    }
  }
});

// Load initial videos
loadVideos();
