// Customise page: no page-specific scene; motion.js runs the hero floats,
// headline lines, reveals and cursor follower.
(function () {
  const root = document.querySelector('[data-page]');
  TLMotion.start(root, { motion: () => 1, cursor: true });
})();
