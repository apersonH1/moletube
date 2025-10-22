const params = new URLSearchParams(window.location.search);
const url = params.get("url");
const title = params.get("title");
const channel = params.get("channel");

document.getElementById("watchFrame").src = url;
document.getElementById("videoTitle").textContent = title || "Untitled";
document.getElementById("videoChannel").textContent = channel || "Unknown Channel";
