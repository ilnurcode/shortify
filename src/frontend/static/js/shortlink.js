(function () {
    const form = document.getElementById('shortForm');
    const info = document.getElementById('info');
    const result = document.getElementById('result');

    function showError(text) {
        if (!info) return console.error(text);
        info.classList.remove('d-none', 'alert-success');
        info.classList.add('alert-danger');
        info.textContent = text;
    }

    function showSuccess(text) {
        if (!info) return console.log(text);
        info.classList.remove('d-none', 'alert-danger');
        info.classList.add('alert-success');
        info.textContent = text;
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (info) {
            info.classList.add('d-none');
            info.textContent = '';
        }
        if (result) result.innerHTML = '';

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const link = form.link.value.trim();
        if (!link) {
            showError('Введите ссылку');
            return;
        }

        // если токена нет — попробуем refresh прежде чем слать authFetch
        if (window.auth && typeof window.auth.getAccessToken === 'function' && !window.auth.getAccessToken()) {
            try {
                await window.auth.refreshAccessToken();
            } catch (err) {
                showError('Неавторизован. Пожалуйста, войдите снова.');
                return;
            }
        }

        try {
            const res = await window.auth.authFetch('/shortlink', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({link})
            });

            let body = null;
            try {
                body = await res.json();
            } catch (err) {
                body = null;
            }

            if (!res.ok) {
                const msg = body?.detail ?? body?.error ?? `Ошибка ${res.status}`;
                showError(msg);
                return;
            }

            const shortUrl = body?.short_url;
            if (!shortUrl) {
                showError('Сервер вернул неожиданный ответ');
                return;
            }

            showSuccess('Короткая ссылка создана');
            result.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <a href="${shortUrl}" target="_blank" rel="noopener noreferrer">${shortUrl}</a>
          <button id="copyBtn" type="button" class="btn btn-sm btn-outline-secondary">Скопировать</button>
          <span id="copyInfo" aria-live="polite" class="small ms-2"></span>
        </div>
      `;

            const copyBtn = document.getElementById('copyBtn');
            const copyInfo = document.getElementById('copyInfo');

            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shortUrl);
                    copyInfo.textContent = 'Скопировано!';
                    copyInfo.style.color = 'green';
                    setTimeout(() => copyInfo.textContent = '', 2000);
                } catch (err) {
                    copyInfo.textContent = 'Ошибка копирования';
                    copyInfo.style.color = 'crimson';
                    setTimeout(() => copyInfo.textContent = '', 2500);
                }
            });
        } catch (err) {
            showError('Ошибка сети: ' + (err && err.message ? err.message : String(err)));
        }
    });
})();
