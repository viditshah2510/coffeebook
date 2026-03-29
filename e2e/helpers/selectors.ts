export const SELECTORS = {
  // Auth
  passwordInput: '[placeholder="Enter password"]',
  enterButton: 'button:has-text("Enter")',

  // Header
  navMenu: '[data-testid="nav-menu"]',
  logoutButton: '[data-testid="logout-button"]',

  // Entry form
  coffeeNameInput: '[placeholder*="Bili hu"]',
  saveEntryButton: 'button[type="submit"]:has-text("Save Entry")',
  updateEntryButton: 'button[type="submit"]:has-text("Update Entry")',
  ratingSlider: '[role="slider"]',
  ratingClearButton: 'button:has-text("Clear")',

  // Entry detail
  editEntry: '[data-testid="edit-entry"]',
  deleteEntry: '[data-testid="delete-entry"]',

  // Toast (Sonner)
  toast: '[data-sonner-toast]',
};
