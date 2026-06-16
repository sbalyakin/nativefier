const urlInput = document.getElementById('url-input');
const params = new URLSearchParams(window.location.search);
const initialUrl = params.get('url');
if (initialUrl) {
  urlInput.value = initialUrl;
  urlInput.select();
}

document.getElementById('go-to-url-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const url = urlInput.value;
  if (url.trim()) {
    window.nativefierGoToUrl.submit(url.trim());
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    window.nativefierGoToUrl.cancel();
  }
});
