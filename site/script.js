const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const panels = Array.from(document.querySelectorAll(".platform-panel"));

function selectPlatformTab(button) {
  const panelId = button.getAttribute("aria-controls");

  tabButtons.forEach((tab) => {
    const isSelected = tab === button;
    tab.classList.toggle("active", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isSelected = panel.id === panelId;
    panel.classList.toggle("active", isSelected);
    panel.hidden = !isSelected;
  });
}

tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => selectPlatformTab(button));

  button.addEventListener("keydown", (event) => {
    const currentIndex = tabButtons.indexOf(button);
    const lastIndex = tabButtons.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      tabButtons[nextIndex].focus();
      selectPlatformTab(tabButtons[nextIndex]);
    }
  });

  button.tabIndex = index === 0 ? 0 : -1;
});
