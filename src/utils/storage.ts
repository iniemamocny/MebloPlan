export function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write to localStorage for key "${key}"`, error);
    try {
      window.sessionStorage.setItem(key, value);
    } catch (sessionError) {
      console.warn(
        `Failed to write to sessionStorage for key "${key}"`,
        sessionError,
      );
    }
  }
}
