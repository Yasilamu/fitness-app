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

const createInstallPanel = ({
  showButton = false,
  text = "\u0041\u006e\u0064\u0072\u006f\u0069\u0064 \u53ef\u76f4\u63a5\u5b89\u88dd\uff1b\u0069\u0050\u0068\u006f\u006e\u0065 \u8acb\u7528\u5206\u4eab\u9078\u55ae\u52a0\u5165\u4e3b\u756b\u9762\u3002"
} = {}) => {
  if (installPanel) return installPanel;
  installPanel = document.createElement("section");
  installPanel.className = "pwa-install";
  installPanel.setAttribute("aria-label", "\u5b89\u88dd FitPlan");
  installPanel.innerHTML = `
    <div>
      <strong>\u628a FitPlan \u52a0\u5230\u624b\u6a5f</strong>
      <span data-pwa-help>${text}</span>
    </div>
    <button class="install-button" type="button" data-pwa-install ${showButton ? "" : "hidden"}>\u5b89\u88dd</button>
    <button class="close-button" type="button" data-pwa-close aria-label="\u95dc\u9589\u5b89\u88dd\u63d0\u793a">\u00d7</button>
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
    text: "\u53ef\u5b89\u88dd\u6210\u624b\u6a5f App\uff0c\u4e4b\u5f8c\u4e5f\u80fd\u96e2\u7dda\u958b\u555f\u57fa\u672c\u529f\u80fd\u3002"
  });
  panel.querySelector("[data-pwa-install]").hidden = false;
  panel.querySelector("[data-pwa-help]").textContent = "\u53ef\u5b89\u88dd\u6210\u624b\u6a5f App\uff0c\u4e4b\u5f8c\u4e5f\u80fd\u96e2\u7dda\u958b\u555f\u57fa\u672c\u529f\u80fd\u3002";
});
