// ================== GLOBAL AUTH LOADER ==================
(function () {
  window.triggerLogin = async function (provider) {
    if (provider === "email") {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (typeof firebase === "undefined") return;

    try {
      let authProvider;
      switch (provider) {
        case "google":
          authProvider = new firebase.auth.GoogleAuthProvider();
          break;
        case "github":
          authProvider = new firebase.auth.GithubAuthProvider();
          break;
        case "facebook":
          authProvider = new firebase.auth.FacebookAuthProvider();
          break;
        case "twitter":
          authProvider = new firebase.auth.TwitterAuthProvider();
          break;
        default:
          return;
      }

      await firebase.auth().signInWithPopup(authProvider);
    } catch (error) {
      console.error("Login dengan penyedia sosial gagal.", error);
    }
  };

  function initGlobalAuth() {
    if (typeof firebase === "undefined" || !firebase.auth) {
      setTimeout(initGlobalAuth, 150);
      return;
    }

    try {
      firebase.app();
    } catch {
      setTimeout(initGlobalAuth, 150);
      return;
    }

    if (window.__authListenerAttached) return;
    window.__authListenerAttached = true;

    firebase.auth().onAuthStateChanged((user) => {
      window.currentUser = user;
      window.updateHeaderAuth?.();
    });
  }

  initGlobalAuth();
})();
