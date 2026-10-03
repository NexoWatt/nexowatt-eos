'use strict';
// Persönliches Passwort und Besitzcode ausschließlich im HTTPS-POST, nie URL/Storage.
document.getElementById('invitation').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const status = document.getElementById('status');
    button.disabled = true;
    try {
        const body = Object.fromEntries(new FormData(form));
        if (body.password !== body.passwordRepeat) throw new Error('Die Passwörter stimmen nicht überein.');
        const response = await fetch('/nexowatt/account/accept', { method: 'POST', credentials: 'omit', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-NexoWatt-EOS-Invitation': '1' }, body: JSON.stringify(body) });
        if (!response.ok) throw new Error('Einladung ungültig, abgelaufen oder vorübergehend gesperrt. Bitte die EOS-Administration kontaktieren.');
        form.reset(); form.hidden = true;
        status.textContent = 'Passwort gespeichert. Sie können sich jetzt mit Ihrem persönlichen Konto anmelden.';
    } catch (error) { status.textContent = error.message || 'Einrichtung nicht abgeschlossen.'; }
    finally { button.disabled = false; }
});
