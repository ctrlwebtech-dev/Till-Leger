// Sources page: no page-specific animation, so motion.js runs the reveals,
// the headline lines and the cursor follower.
(function () {
  const root = document.querySelector('[data-page]');
  TLMotion.start(root, { motion: () => 1, cursor: true });
})();
