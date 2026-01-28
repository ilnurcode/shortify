(function () {
    const form = document.getElementById('loginForm');
    const info = document.getElementById('info');

    function showErrors(detail) {
        if (!info) return console.error(detail);
        info.classList.remove('d-none', 'alert-success');
        info.classList.add('alert-danger');

        if (Array.isArray(detail)) {
            info.innerHTML = detail.map(err => {
                const field = Array.isArray(err.loc) ? err.loc.at(-1) : '';
                return `<div>${field ? `<strong>${field}</strong>: ` : ''}${err.msg || JSON.stringify(err)}</div>`;
            }).join('');
        } else if (typeof detail === 'string') {
            info.textContent = detail;
        } else if (detail && typeof detail === 'object') {
            info.textContent = detail.msg || detail.error || JSON.stringify(detail);
        } else {
            info.textContent = String(detail);
        }
    }

    function showSuccess(message) {
        if (!info) {
            console.log(message);
            return;
        }
        info.classList.remove('d-none', 'alert-danger');
        info.classList.add('alert-success');
        info.textContent = message;
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        if (info) {
            info.classList.add('d-none');
            info.textContent = '';
        }

        const payload = {
            email: form.email.value.trim(),
            password: form.password.value
        };

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            let body = null;
            try {
                body = await res.json();
            } catch (err) {
                body = null;
            }

            if (res.ok) {
                // сохраняем token синхронно
                const token = body?.access_token;
                if (token) {
                    if (window.auth && typeof window.auth.setAccessToken === 'function') {
                        window.auth.setAccessToken(token);
                    } else {
                        sessionStorage.setItem('access_token', token);
                        console.log('login: token saved to sessionStorage');
                    }
                } else {
                    // если сервер не вернул токен — попробуем получить через /refresh
                    if (window.auth && typeof window.auth.refreshAccessToken === 'function') {
                        try {
                            await window.auth.refreshAccessToken();
                        } catch (err) {
                            console.warn('login: refresh after login failed', err);
                        }
                    }
                }

                showSuccess(body?.message || 'Вход выполнен');

                // небольшой безопасный таймаут перед редиректом, чтобы все операции записи точно завершились
                setTimeout(() => {
                    window.location.replace('/');
                }, 120); // 120ms — очень маленькая пауза, но надёжная
            } else {
                const detail = body?.detail ?? body?.error ?? body ?? `Ошибка ${res.status}`;
                showErrors(detail);
            }
        } catch (err) {
            showErrors('Ошибка сети: ' + (err && err.message ? err.message : String(err)));
        }
    });
})();
