(function () {
  'use strict';
  var button = document.querySelector('[data-copy-contact-email]');
  var address = document.getElementById('contact-email-address');
  var status = document.getElementById('contact-copy-status');
  if (!button || !address || !status) return;
  button.hidden = false;
  button.style.removeProperty('display');
  button.addEventListener('click', async function () {
    var email = address.textContent.trim();
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      status.textContent = 'Email address copied. Paste it into your email service.';
    } catch (error) {
      var selection = window.getSelection ? window.getSelection() : null;
      if (selection && document.createRange) {
        var range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Email address selected. Copy it and paste it into your email service.';
      } else {
        status.textContent = 'Copy the email address shown above and paste it into your email service.';
      }
    }
  });
}());
