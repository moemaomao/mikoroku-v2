(function () {
  const STORAGE_KEY_PREFIX = "mikoroku-series-cover:";

  window.getSeriesCoverPreference = function (slug) {
    if (!slug) return "";
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + slug) || "";
    } catch (error) {
      console.warn("Could not read the saved series cover preference.", error);
      return "";
    }
  };
})();
