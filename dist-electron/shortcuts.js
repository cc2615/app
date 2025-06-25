"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsHelper = void 0;
const electron_1 = require("electron");
class ShortcutsHelper {
    appState;
    isToggling = false;
    constructor(appState) {
        this.appState = appState;
        electron_1.app.on("will-quit", () => {
            electron_1.globalShortcut.unregisterAll();
        });
    }
    registerGlobalShortcuts() {
        this.unregisterAllShortcuts();
        this.registerScreenshotShortcut();
        this.registerProcessShortcut();
        this.registerResetShortcut();
        this.registerMoveShortcuts();
        this.registerShowHideShortcut();
    }
    registerShowHideShortcutOnly() {
        this.unregisterAllShortcuts();
        setTimeout(() => {
            this.registerShowHideShortcut();
        }, 50);
    }
    registerNonToggleShortcuts() {
        setTimeout(() => {
            this.unregisterNonToggleShortcuts();
            this.registerScreenshotShortcut();
            this.registerProcessShortcut();
            this.registerResetShortcut();
            this.registerMoveShortcuts();
        }, 50);
    }
    unregisterAllShortcuts() {
        electron_1.globalShortcut.unregisterAll();
    }
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
            if (this.isToggling)
                return;
            this.isToggling = true;
            this.appState.toggleMainWindow();
            setTimeout(() => {
                this.isToggling = false;
            }, 200);
            const mainWindow = this.appState.getMainWindow();
            if (mainWindow && this.appState.isVisible()) {
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