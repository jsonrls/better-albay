// Preserve visibility without rendering unsupported statistics.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.animate-on-scroll').forEach(function (element) {
    element.classList.add('visible');
  });
});
