(() => {
    'use strict';
    // NexoWatt EOS stable 7.9.97: EOS Assist remains disabled until the
    // read-only system assistant is rebuilt and accepted separately.
    window.NEXOWATT_EOS_ASSIST_DISABLED = true;
    document.documentElement.classList.add('eos-assist-disabled');
    document.querySelectorAll('.eos-assist-root,.eos-assist-header-root,[data-eos-assist-root]').forEach(element => element.remove());
})();
