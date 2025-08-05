document.addEventListener("DOMContentLoaded", () => {
  const stateSelect = document.getElementById("stateSelect");

  // Load current state
  chrome.storage.local.get(["userState"], (res) => {
    if (res.userState) {
      stateSelect.value = res.userState;
    }
  });

  // Save on change
  stateSelect.addEventListener("change", () => {
    const selected = stateSelect.value;
    chrome.storage.local.set({ userState: selected });
  });
});
