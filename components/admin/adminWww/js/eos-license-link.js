'use strict';
(() => {
    async function mount() {
        try {
            const response = await fetch('/nexowatt/security/context', { credentials: 'same-origin', cache: 'no-store' });
            if (!response.ok) return;
            const context = await response.json();
            if (context.role !== 'admin' || !context.authenticated || context.mustChangePassword) return;
            const link = document.createElement('a');
            link.href = '/nexowatt/license';
            link.textContent = 'EOS Lizenzverwaltung';
            link.title = 'Home / Pro und Adapterfreigaben verwalten';
            link.style.cssText = 'position:fixed;bottom:12px;right:18px;z-index:1199;background:#183e2d;color:#b2f4c1;padding:9px 14px;border:1px solid #629d75;border-radius:7px;font:13px Arial,sans-serif;text-decoration:none';
            document.body.appendChild(link);
        } catch { /* The server always enforces the permission independently. */ }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else void mount();
})();
