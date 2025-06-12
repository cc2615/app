export {};

declare global {
  interface Window {
    electron?: {
      openPopup: () => void;
    };
  }
}
