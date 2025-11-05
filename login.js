// public/js/login.js
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = ''; // Vider l'ancien message d'erreur

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // C'EST ICI QUE TOUT SE JOUE
            localStorage.setItem('token', data.token); // On sauvegarde le token
            window.location.href = '/interface-app.html'; // On redirige vers l'application
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});
