(() => {
    'use strict';
    const VERSION = 'v7109-scroll-standard-password';
    const ensureScroll = () => {
        const root = document.documentElement;
        const paper = document.getElementById('app-paper');
        if (!paper || !root.classList.contains('eos-app') || !root.classList.contains('eos-route-intro')) return;
        paper.dataset.nexowattScrollable = 'true';
        paper.style.setProperty('overflow-x','hidden','important');
        paper.style.setProperty('overflow-y','scroll','important');
        paper.style.setProperty('height','calc(100dvh - var(--nx-content-top) - 12px)','important');
        paper.style.setProperty('max-height','calc(100dvh - var(--nx-content-top) - 12px)','important');
        paper.style.setProperty('min-height','0','important');
    };
    const apply = () => {
        document.documentElement.classList.add('eos-assist-disabled');
        // Current server-required password/security views are not stale legacy
        // launchers. Removing them leaves a blank page and blocks enrollment.
        if (!window.NEXOWATT_EOS_PASSWORD_SETUP_ACTIVE && !window.NEXOWATT_EOS_SECURITY_CHECK_ACTIVE) {
            document.documentElement.classList.remove('eos-first-login-active');
        }
        document.querySelectorAll('.eos-assist-root,.eos-assist-header-root,[data-eos-assist-root],.eos-passwordless-launcher,.eos-first-login-overlay:not([data-eos-auth-boundary]):not(#eos-product-portal)')
            .forEach(element => element.remove());
        ensureScroll();
    };
    let scheduled=false;
    const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply();});};
    const start=()=>{apply();new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('hashchange',schedule);window.addEventListener('resize',schedule,{passive:true});};
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
    window.NEXOWATT_EOS_STABLE_V7109=Object.freeze({version:VERSION,refresh:apply,ensureScroll});
})();
