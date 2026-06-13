if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

const appFrame = document.querySelector(".app-frame");

appFrame?.addEventListener("load", () => {
  const doc = appFrame.contentDocument;
  if (!doc || doc.querySelector('link[href="responsive.css"]')) return;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = "responsive.css";
  doc.head.append(link);
});

const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
let deferredPrompt;
let installPanel;

const createInstallPanel = ({ showButton = false, text = "Android 可直接安裝；iPhone 請用分享選單加入主畫面。" } = {}) => {
  if (installPanel) return installPanel;
  installPanel = document.createElement("section");
  installPanel.className = "pwa-install";
  installPanel.setAttribute("aria-label", "安裝 FitPlan");
  installPanel.innerHTML = `
    <div>
      <strong>把 FitPlan 加到手機</strong>
      <span data-pwa-help>${text}</span>
    </div>
    <button class="install-button" type="button" data-pwa-install ${showButton ? "" : "hidden"}>安裝</button>
    <button class="close-button" type="button" data-pwa-close aria-label="關閉安裝提示">×</button>
  `;
  document.body.append(installPanel);

  installPanel.querySelector("[data-pwa-install]").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    installPanel.remove();
    installPanel = undefined;
  });

  installPanel.querySelector("[data-pwa-close]").addEventListener("click", () => {
    installPanel.remove();
    installPanel = undefined;
  });

  return installPanel;
};

if (!isStandalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
  createInstallPanel();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  const panel = createInstallPanel({
    showButton: true,
    text: "可安裝成手機 App，之後也能離線開啟基本功能。"
  });
  panel.querySelector("[data-pwa-install]").hidden = false;
  panel.querySelector("[data-pwa-help]").textContent = "可安裝成手機 App，之後也能離線開啟基本功能。";
});
