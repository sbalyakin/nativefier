document.getElementById('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const usernameInput = document.getElementById('username-input');
  const username = usernameInput.value;
  const passwordInput = document.getElementById('password-input');
  const password = passwordInput.value;
  window.webholmLogin.submit(username, password);
});
