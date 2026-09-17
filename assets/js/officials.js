// A verified current directory is required before publishing individual officeholders.
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('officials-container');
  if (container)
    container.innerHTML =
      '<p>An up-to-date Albay officials directory is not available on this site yet.</p><p><a href="https://albay.gov.ph/">Visit the official Albay government website</a></p>';
});
