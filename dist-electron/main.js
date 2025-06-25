"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppState = void 0;
const electron_1 = require("electron");
const ipcHandlers_1 = require("./ipcHandlers");
const WindowHelper_1 = require("./WindowHelper");
const ScreenshotHelper_1 = require("./ScreenshotHelper");
const shortcuts_1 = require("./shortcuts");
const ProcessingHelper_1 = require("./ProcessingHelper");
try {
    const dotenv = require('dotenv');
    const path = require('path');
    const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
    if (isDev) {
        dotenv.config({ path: path.join(__dirname, '../.env') });
    }
    else {
        dotenv.config({ path: path.join(process.resourcesPath, '.env') });
    }
}
catch (error) {
    console.warn('Could not load dotenv:', error instanceof Error ? error.message : String(error));
    if (!process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = 'AIzaSyDmeRWhbi6WMpre0iarWP8WcVt90QYZ-nM';
    }
}
class AppState {
    static instance = null;
    windowHelper;
    screenshotHelper;
    shortcutsHelper;
    processingHelper;
    view = "queue";
    problemInfo = null;
    hasDebugged = false;
    PROCESSING_EVENTS = {
        UNAUTHORIZED: "procesing-unauthorized",
        NO_SCREENSHOTS: "processing-no-screenshots",
        INITIAL_START: "initial-start",
        PROBLEM_EXTRACTED: "problem-extracted",
        SOLUTION_SUCCESS: "solution-success",
        INITIAL_SOLUTION_ERROR: "solution-error",
        DEBUG_START: "debug-start",
        DEBUG_SUCCESS: "debug-success",
        DEBUG_ERROR: "debug-error"
    };
    constructor() {
        this.windowHelper = new WindowHelper_1.WindowHelper(this);
        this.screenshotHelper = new ScreenshotHelper_1.ScreenshotHelper(this.view);
        this.processingHelper = new ProcessingHelper_1.ProcessingHelper(this);
        this.shortcutsHelper = new shortcuts_1.ShortcutsHelper(this);
    }
    static getInstance() {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }
        return AppState.instance;
    }
    getMainWindow() {
        return this.windowHelper.getMainWindow();
    }
    getView() {
        return this.view;
    }
    setView(view) {
        this.view = view;
        this.screenshotHelper.setView(view);
    }
    isVisible() {
        return this.windowHelper.isVisible();
    }
    getScreenshotHelper() {
        return this.screenshotHelper;
    }
    getProblemInfo() {
        return this.problemInfo;
    }
    setProblemInfo(problemInfo) {
        this.problemInfo = problemInfo;
    }
    getScreenshotQueue() {
        return this.screenshotHelper.getScreenshotQueue();
    }
    getExtraScreenshotQueue() {
        return this.screenshotHelper.getExtraScreenshotQueue();
    }
    createWindow() {
        this.windowHelper.createWindow();
    }
    hideMainWindow() {
        this.windowHelper.hideMainWindow();
    }
    showMainWindow() {
        this.windowHelper.showMainWindow();
    }
    toggleMainWindow() {
        console.log("Screenshots: ", this.screenshotHelper.getScreenshotQueue().length, "Extra screenshots: ", this.screenshotHelper.getExtraScreenshotQueue().length);
        this.windowHelper.toggleMainWindow();
    }
    setWindowDimensions(width, height) {
        this.windowHelper.setWindowDimensions(width, height);
    }
    clearQueues() {
        this.screenshotHelper.clearQueues();
        this.problemInfo = null;
        this.setView("queue");
    }
    async takeScreenshot() {
        if (!this.getMainWindow())
            throw new Error("No main window available");
        const screenshotPath = await this.screenshotHelper.takeScreenshot(() => this.hideMainWindow(), () => this.showMainWindow());
        return screenshotPath;
    }
    async getImagePreview(filepath) {
        return this.screenshotHelper.getImagePreview(filepath);
    }
    async deleteScreenshot(path) {
        return this.screenshotHelper.deleteScreenshot(path);
    }
    moveWindowLeft() {
        this.windowHelper.moveWindowLeft();
    }
    moveWindowRight() {
        this.windowHelper.moveWindowRight();
    }
    moveWindowDown() {
        this.windowHelper.moveWindowDown();
    }
    moveWindowUp() {
        this.windowHelper.moveWindowUp();
    }
    setHasDebugged(value) {
        this.hasDebugged = value;
    }
    getHasDebugged() {
        return this.hasDebugged;
    }
}
exports.AppState = AppState;
async function initializeApp() {
    const appState = AppState.getInstance();
    (0, ipcHandlers_1.initializeIpcHandlers)(appState);
    electron_1.app.whenReady().then(() => {
        console.log("App is ready");
        appState.createWindow();
        appState.shortcutsHelper.registerGlobalShortcuts();
    });
    electron_1.app.on("activate", () => {
        console.log("App activated");
        if (appState.getMainWindow() === null) {
            appState.createWindow();
        }
    });
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
    electron_1.app.dock?.hide();
    electron_1.app.commandLine.appendSwitch("disable-background-timer-throttling");
}
initializeApp().catch(console.error);
//# sourceMappingURL=main.js.map