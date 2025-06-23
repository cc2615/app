"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsHelper = void 0;
const electron_1 = require("electron");
class ShortcutsHelper {
    appState;
    isToggling = false; // Prevent rapid toggling
    constructor(appState) {
        this.appState = appState;
        // Register will-quit listener only once
        electron_1.app.on("will-quit", () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
    // Register all shortcuts
    registerGlobalShortcuts() {
        this.unregisterAllShortcuts();
        this.registerScreenshotShortcut();
        this.registerProcessShortcut();
        this.registerResetShortcut();
        this.registerMoveShortcuts();
        this.registerShowHideShortcut();
    }
    // Register only the show/hide shortcut (Ctrl+B)
    registerShowHideShortcutOnly() {
        this.unregisterAllShortcuts();
        // Add small delay to prevent immediate re-triggering
        setTimeout(() => {
            this.registerShowHideShortcut();
        }, 50);
    }
    // Register all shortcuts except show/hide (for when window is shown)
    registerNonToggleShortcuts() {
        // Add small delay to prevent immediate triggering
        setTimeout(() => {
            this.unregisterNonToggleShortcuts();
            this.registerScreenshotShortcut();
            this.registerProcessShortcut();
            this.registerResetShortcut();
            this.registerMoveShortcuts();
        }, 50);
    }
    // Unregister all shortcuts
    unregisterAllShortcuts() {
        electron_1.globalShortcut.unregisterAll();
    }
    // Unregister only non-toggle shortcuts (keep show/hide active)
    unregisterNonToggleShortcuts() {
        electron_1.globalShortcut.unregister("CommandOrControl+H");
        electron_1.globalShortcut.unregister("CommandOrControl+Enter");
        electron_1.globalShortcut.unregister("CommandOrControl+R");
        electron_1.globalShortcut.unregister("CommandOrControl+Left");
        electron_1.globalShortcut.unregister("CommandOrControl+Right");
        electron_1.globalShortcut.unregister("CommandOrControl+Down");
        electron_1.globalShortcut.unregister("CommandOrControl+Up");
    }
    registerScreenshotShortcut() {
        electron_1.globalShortcut.register("CommandOrControl+H", async () => {
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow) {
                console.log("Taking screenshot...");
                try {
                    const screenshotPath = await this.appState.takeScreenshot();
                    const preview = await this.appState.getImagePreview(screenshotPath);
                    mainWindow.webContents.send("screenshot-taken", {
                        path: screenshotPath,
                        preview
                    });
                }
                catch (error) {
                    console.error("Error capturing screenshot:", error);
                }
            }
        });
    }
    registerProcessShortcut() {
        electron_1.globalShortcut.register("CommandOrControl+Enter", async () => {
            await this.appState.processingHelper.processScreenshots();
        });
    }
    registerResetShortcut() {
        electron_1.globalShortcut.register("CommandOrControl+R", () => {
            console.log("Command + R pressed. Canceling requests and resetting queues...");
            this.appState.processingHelper.cancelOngoingRequests();
            this.appState.clearQueues();
            console.log("Cleared queues.");
            this.appState.setView("queue");
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("reset-view");
            }
        });
    }
    registerMoveShortcuts() {
        electron_1.globalShortcut.register("CommandOrControl+Left", () => {
            console.log("Command/Ctrl + Left pressed. Moving window left.");
            this.appState.moveWindowLeft();
        });
        electron_1.globalShortcut.register("CommandOrControl+Right", () => {
            console.log("Command/Ctrl + Right pressed. Moving window right.");
            this.appState.moveWindowRight();
        });
        electron_1.globalShortcut.register("CommandOrControl+Down", () => {
            console.log("Command/Ctrl + down pressed. Moving window down.");
            this.appState.moveWindowDown();
        });
        electron_1.globalShortcut.register("CommandOrControl+Up", () => {
            console.log("Command/Ctrl + Up pressed. Moving window Up.");
            this.appState.moveWindowUp();
        });
    }
    registerShowHideShortcut() {
        electron_1.globalShortcut.register("CommandOrControl+B", () => {
            // Prevent rapid toggling
            if (this.isToggling)
                return;
            this.isToggling = true;
            this.appState.toggleMainWindow();
            // Reset the flag after a short delay
            setTimeout(() => {
                this.isToggling = false;
            }, 200);
            // If window exists and we're showing it, bring it to front
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow && this.appState.isVisible()) {
                // Force the window to the front on macOS
                if (process.platform === "darwin") {
                    mainWindow.setAlwaysOnTop(true, "normal");
                    setTimeout(() => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.setAlwaysOnTop(true, "floating");
                        }
                    }, 100);
                }
            }
        });
    }
}
exports.ShortcutsHelper = ShortcutsHelper;
//# sourceMappingURL=shortcuts.js.map