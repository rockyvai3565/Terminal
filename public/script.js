import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

window.addEventListener("load", async () => {
  const root = document.getElementById("app");
  const { bootTerminalUI } = await import(`./Terminal-ui.js`);

  let isMini = false;
  try {
    isMini = await sdk.isInMiniApp();
  } catch (e) {
    // If SDK cannot determine, assume web
    isMini = false;
  }

  const ui = bootTerminalUI({
    root,
    onReadyText: isMini ? "mini app detected ✓" : "web mode ✓"
  });
  ui.setEnv(isMini);

  // Always call ready() per requirements
  try {
    await sdk.actions.ready();
  } catch (e) {
    // ignore if not available in web mode
  }
});