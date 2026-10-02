/* NexoWatt EOS stable runtime v98 */
(() => {
  'use strict';
  const MANAGED_USERS = new Set(['installer', 'guest', 'user']);
  const ASSIST_TEXT = /EOS\s*Assist/i;
  const PASSWORDLESS_TEXT = /Erstanmeldung\s+ohne\s+Passwort|first\s+sign-?in\s+without\s+password/i;
  const isLogin = () => /(?:\?|&)login(?:[=&]|$)/i.test(location.search) || /\/login(?:[/?#]|$)/i.test(location.pathname + location.hash);
  const visible = element => !!element && element.getClientRects().length > 0;
  const findInput = kind => {
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    if (kind === 'password') return inputs.find(input => input.type === 'password');
    return inputs.find(input => input.type !== 'password' && /user|login|name/i.test(`${input.name} ${input.id} ${input.autocomplete} ${input.getAttribute('aria-label') || ''}`)) || inputs.find(input => input.type !== 'password');
  };
  const findSubmit = () => [...document.querySelectorAll('button,input[type="submit"]')].find(element => visible(element) && (/anmelden|login|sign in/i.test((element.textContent || element.value || '').trim()) || element.type === 'submit'));
  const sync = () => {
    if (!isLogin()) return;
    document.documentElement.classList.add('nw-eos-login-v98');
    document.body?.classList.add('nw-eos-login-v98');
    const username = findInput('user');
    const password = findInput('password');
    const submit = findSubmit();
    const account = String(username?.value || '').trim().toLowerCase().replace(/^system\.user\./, '');
    if (submit && MANAGED_USERS.has(account) && !String(password?.value || '')) {
      submit.disabled = true;
      submit.setAttribute('aria-disabled', 'true');
    }
  };
  const hideLegacyUi = () => {
    for (const element of document.querySelectorAll('button,a,[role="button"],div,span')) {
      const value = (element.textContent || '').trim();
      if (!value || value.length > 100) continue;
      if (ASSIST_TEXT.test(value) || PASSWORDLESS_TEXT.test(value)) {
        const target = element.closest('button,a,[role="button"],[data-eos-assist],.eos-assist') || element;
        target.style.setProperty('display', 'none', 'important');
        target.setAttribute('aria-hidden', 'true');
      }
    }
  };
  const apply = () => { sync(); hideLegacyUi(); };
  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('input', apply, true);
  document.addEventListener('change', apply, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true }); else apply();
})();
