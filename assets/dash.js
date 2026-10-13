// Mock dashboard: the low-stock tile filters the stock table to reorder alerts.
(function () {
  const btn = document.querySelector('.dash .tile-alert');
  const table = document.getElementById('dash-stock');
  if (!btn || !table) return;
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    table.classList.toggle('only-low', on);
  });
})();
