const form = document.getElementById("checkForm");
const urlInput = document.getElementById("urlInput");
const submitBtn = document.getElementById("submitBtn");
const progress = document.getElementById("progress");
const progressMessage = document.getElementById("progressMessage");
const error = document.getElementById("error");
const results = document.getElementById("results");
const openTables = document.getElementById("openTables");
const closedTables = document.getElementById("closedTables");

function showProgress(message) {
  progress.style.display = "block";
  progressMessage.textContent = message;
  error.style.display = "none";
  results.style.display = "none";
}

function showError(message) {
  error.textContent = message;
  error.style.display = "block";
  progress.style.display = "none";
  submitBtn.disabled = false;
}

function showResults(data) {
  progress.style.display = "none";
  results.style.display = "block";
  submitBtn.disabled = false;

  if (data.openTables.length === 0) {
    openTables.innerHTML =
      '<p class="empty">No publicly accessible tables found</p>';
  } else {
    openTables.innerHTML =
      "<ul>" +
      data.openTables.map((table) => `<li>${table}</li>`).join("") +
      "</ul>";
  }

  if (data.closedTables.length === 0) {
    closedTables.innerHTML = '<p class="empty">No closed tables found</p>';
  } else {
    closedTables.innerHTML =
      "<ul>" +
      data.closedTables.map((table) => `<li>${table}</li>`).join("") +
      "</ul>";
  }
}

async function checkSecurity(url) {
  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));

          if (data.type === "status") {
            showProgress(data.message);
          } else if (data.type === "result") {
            showResults(data.data);
          } else if (data.type === "error") {
            showError(data.message);
          }
        }
      }
    }
  } catch (err) {
    showError(err.message);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();

  if (!url) {
    showError("Please enter a URL");
    return;
  }

  submitBtn.disabled = true;
  showProgress("Validating URL...");

  await checkSecurity(url);
});
