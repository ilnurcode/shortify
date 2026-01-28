(function () {
    const form = document.getElementById('qrForm');
    let info = document.getElementById('info');
    const result = document.getElementById('result');

    if (!info) {
        info = document.createElement('div');
        info.id = 'info';
        info.className = 'alert d-none';
        info.setAttribute('role', 'alert');
        if (form && form.parentNode) form.parentNode.insertBefore(info, form);
    }

    function clearResult() {
        if (result) result.innerHTML = '';
    }

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

    if (!form) {
        showError('Форма не найдена (qrForm).');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (info) {
            info.classList.add('d-none');
            info.textContent = '';
        }
        clearResult();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const link = form.link.value.trim();
        if (!link) {
            showError('Введите ссылку');
            return;
        }

        // если токена нет — попробуем получить через refresh cookie
        if (window.auth && typeof window.auth.getAccessToken === 'function' && !window.auth.getAccessToken()) {
            try {
                await window.auth.refreshAccessToken();
            } catch (err) {
                showError('Неавторизован. Пожалуйста, войдите снова.');
                return;
            }
        }

        try {
            const res = await window.auth.authFetch('/qr/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({link})
            });

            if (!res.ok) {
                let body = null;
                try {
                    body = await res.json();
                } catch (err) {
                    body = null;
                }
                showError(body?.detail ?? body?.error ?? `Ошибка ${res.status}`);
                return;
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            showSuccess('QR-код успешно создан');

            if (result) {
                result.innerHTML = `
          <div class="d-flex flex-column align-items-center gap-3">
            <img id="qrImage" src="${objectUrl}" alt="QR" width="300" height="300">
            <button id="downloadBtn" type="button" class="btn btn-outline-primary">Скачать QR-код</button>
          </div>
        `;

                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        const a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = blob.type === 'image/svg+xml' ? 'qr.svg' : 'qr.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    });
                }
            }
        } catch (err) {
            showError('Ошибка сети: ' + (err && err.message ? err.message : String(err)));
        }
    });
})();
