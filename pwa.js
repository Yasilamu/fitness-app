if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
const installPanel = document.querySelector(".pwa-install");

if (isStandalone && installPanel) {
  installPanel.remove();
}

if (installPanel) {
  const installButton = installPanel.querySelector("[data-pwa-install]");
  const helpText = installPanel.querySelector("[data-pwa-help]");
  let deferredPrompt;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
    helpText.textContent = "可安裝成手機 App，之後也能離線開啟基本功能。";
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    installPanel.remove();
  });

  installPanel.querySelector("[data-pwa-close]").addEventListener("click", () => {
    installPanel.remove();
  });
}
