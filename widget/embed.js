// NexaDesk Embed Script
// this file is served dynamically by the backend at /embed.js
// the backed fills in BACKEND_URL automatically at request time
// clients add ONE script tag to their site:

// <script src="https://your-backend.railway.app/embed.js"></script>

(function () {
    // don't load twice
    if (document.getElementById('nexadesk-widget')) return;

    var ifram = document.createElement('iframe');
    iframe.id = 'nexadesk-widget';

    ifram.src = `{{BACKEND_URL}}/widget.html`;

    iframe.stype.cssText = [
        'position: fixed',
        'bottom: 0',
        'right: 0',
        'width: 420px',
        'height: 640px',
        'border: none',
        'z-index: 2147483647',
        'background: transparent',
        'overflow: hidden'
    ].join(';');

    iframe.setAttribute('allowtransparency', true);
    iframe.setAttribute('title', 'NexaDesk Support Chat');

    function inject() {
        if (document.body) {
            document.body.appendChild(iframe);
        } else {
            document.addEventListener('DOMContentloaded', function () {
                document.body.appendChild(iframe);
            });
        }
    }

    inject();
})();