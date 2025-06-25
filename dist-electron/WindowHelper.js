"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowHelper = void 0;
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const isDev = process.env.NODE_ENV === "development" || !electron_1.app.isPackaged;
const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${node_path_1.default.join(__dirname, "../dist/index.html")}`;
console.log("Environment:", isDev ? "development" : "production");
console.log("Loading URL:", startUrl);
class WindowHelper {
    mainWindow = null;
    isWindowVisible = false;
    windowPosition = null;
    windowSize = null;
    appState;
    screenWidth = 0;
    screenHeight = 0;
    step = 0;
    currentX = 0;
    currentY = 0;
    constructor(appState) {
        this.appState = appState;
    }
    setWindowDimensions(width, height) {
        if (!this.mainWindow || this.mainWindow.isDestroyed())
            return;
        const [currentX, currentY] = this.mainWindow.getPosition();
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const workArea = primaryDisplay.workAreaSize;
        const maxAllowedWidth = Math.floor(workArea.width * (this.appState.getHasDebugged() ? 0.75 : 0.5));
        const newWidth = Math.min(width + 32, maxAllowedWidth);
        const newHeight = Math.ceil(height);
        const maxX = workArea.width - newWidth;
        const newX = Math.min(Math.max(currentX, 0), maxX);
        this.mainWindow.setBounds({
            x: newX,
            y: currentY,
            width: newWidth,
            height: newHeight
        });
        this.windowPosition = { x: newX, y: currentY };
        this.windowSize = { width: newWidth, height: newHeight };
        this.currentX = newX;
    }
    createWindow() {
        if (this.mainWindow !== null)
            return;
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const workArea = primaryDisplay.workAreaSize;
        this.screenWidth = workArea.width;
        this.screenHeight = workArea.height;
        this.step = Math.floor(this.screenWidth / 10);
        this.currentX = 0;
        const windowSettings = {
            height: 600,
            width: 400,
            minWidth: undefined,
            maxWidth: undefined,
            x: this.currentX,
            y: 0,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: node_path_1.default.join(__dirname, "preload.js")
            },
            show: true,
            alwaysOnTop: true,
            frame: false,
            transparent: true,
            fullscreenable: false,
            hasShadow: false,
            backgroundColor: "#00000000",
            focusable: true
        };
        this.mainWindow = new electron_1.BrowserWindow(windowSettings);
        this.mainWindow.setContentProtection(false);
        if (process.platform === "darwin") {
            this.mainWindow.setVisibleOnAllWorkspaces(true, {
                visibleOnFullScreen: true
            });
            this.mainWindow.setHiddenInMissionControl(true);
            this.mainWindow.setAlwaysOnTop(true, "floating");
        }
        if (process.platform === "linux") {
            if (this.mainWindow.setHasShadow) {
                this.mainWindow.setHasShadow(false);
            }
            this.mainWindow.setFocusable(false);
        }
        this.mainWindow.setSkipTaskbar(true);
        this.mainWindow.setAlwaysOnTop(true);
        this.mainWindow.loadURL(startUrl)
            .then(() => {
            console.log("Successfully loaded URL:", startUrl);
        })
            .catch((err) => {
            console.error("Failed to load URL:", startUrl, err);
            this.mainWindow?.loadURL('data:text/html,<h1>Error loading app</h1><p>Check console for details</p>');
        });
        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('Failed to load:', validatedURL, errorCode, errorDescription);
        });
        this.mainWindow.webContents.on('did-finish-load', () => {
            console.log('Finished loading page');
        });
        const bounds = this.mainWindow.getBounds();
        this.windowPosition = { x: bounds.x, y: bounds.y };
        this.windowSize = { width: bounds.width, height: bounds.height };
        this.currentX = bounds.x;
        this.currentY = bounds.y;
        this.setupWindowListeners();
        this.isWindowVisible = true;
    }
    setupWindowListeners() {
        if (!this.mainWindow)
            return;
        this.mainWindow.on("move", () => {
            if (this.mainWindow) {
                const bounds = this.mainWindow.getBounds();
                this.windowPosition = { x: bounds.x, y: bounds.y };
                this.currentX = bounds.x;
                this.currentY = bounds.y;
            }
        });
        this.mainWindow.on("resize", () => {
            if (this.mainWindow) {
                const bounds = this.mainWindow.getBounds();
                this.windowSize = { width: bounds.width, height: bounds.height };
            }
        });
        this.mainWindow.on("closed", () => {
            this.mainWindow = null;
            this.isWindowVisible = false;
            this.windowPosition = null;
            this.windowSize = null;
        });
    }
    getMainWindow() {
        return this.mainWindow;
    }
    isVisible() {
        return this.isWindowVisible;
    }
    hideMainWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn("Main window does not exist or is destroyed.");
            return;
        }
        const bounds = this.mainWindow.getBounds();
        this.windowPosition = { x: bounds.x, y: bounds.y };
        this.windowSize = { width: bounds.width, height: bounds.height };
        this.mainWindow.hide();
        this.isWindowVisible = false;
        this.appState.shortcutsHelper.registerShowHideShortcutOnly();
    }
    showMainWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.warn("Main window does not exist or is destroyed.");
            return;
        }
        if (this.windowPosition && this.windowSize) {
            this.mainWindow.setBounds({
                x: this.windowPosition.x,
                y: this.windowPosition.y,
                width: this.windowSize.width,
                height: this.windowSize.height
            });
        }
        this.mainWindow.showInactive();
        this.isWindowVisible = true;
        this.appState.shortcutsHelper.registerNonToggleShortcuts();
    }
    toggleMainWindow() {
        if (this.isWindowVisible) {
            this.hideMainWindow();
        }
        else {
            this.showMainWindow();
        }
    }
    moveWindowRight() {
        if (!this.mainWindow)
            return;
        const windowWidth = this.windowSize?.width || 0;
        const halfWidth = windowWidth / 2;
        this.currentX = Number(this.currentX) || 0;
        this.currentY = Number(this.currentY) || 0;
        this.currentX = Math.min(this.screenWidth - halfWidth, this.currentX + this.step);
        this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY));
    }
    moveWindowLeft() {
        if (!this.mainWindow)
            return;
        const windowWidth = this.windowSize?.width || 0;
        const halfWidth = windowWidth / 2;
        this.currentX = Number(this.currentX) || 0;
        this.currentY = Number(this.currentY) || 0;
        this.currentX = Math.max(-halfWidth, this.currentX - this.step);
        this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY));
    }
    moveWindowDown() {
        if (!this.mainWindow)
            return;
        const windowHeight = this.windowSize?.height || 0;
        const halfHeight = windowHeight / 2;
        this.currentX = Number(this.currentX) || 0;
        this.currentY = Number(this.currentY) || 0;
        this.currentY = Math.min(this.screenHeight - halfHeight, this.currentY + this.step);
        this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY));
    }
    moveWindowUp() {
        if (!this.mainWindow)
            return;
        const windowHeight = this.windowSize?.height || 0;
        const halfHeight = windowHeight / 2;
        this.currentX = Number(this.currentX) || 0;
        this.currentY = Number(this.currentY) || 0;
        this.currentY = Math.max(-halfHeight, this.currentY - this.step);
        this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY));
    }
}
exports.WindowHelper = WindowHelper;
//# sourceMappingURL=WindowHelper.js.map