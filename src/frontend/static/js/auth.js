(function () {
    const TOKEN_KEY = 'access_token';

    function getAccessToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY);
        } catch (err) {
            console.error('auth.getAccessToken error', err);
            return null;
        }
    }

    function setAccessToken(token) {
        try {
            if (!token) {
                sessionStorage.removeItem(TOKEN_KEY);
                console.log('auth: access_token removed');
            } else {
                sessionStorage.setItem(TOKEN_KEY, token);
                console.log('auth: access_token saved (len=' + token.length + ')');
            }
        } catch (err) {
            console.error('auth.setAccessToken error', err);
        }
    }

    async function refreshAccessToken() {
        console.log('auth.refreshAccessToken: start');
        const res = await fetch('/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (!res.ok) {
            console.warn('auth.refreshAccessToken: refresh returned', res.status);
            // ВАЖНО: не удаляем access_token здесь — это может стереть валидный токен после редиректа
            throw new Error('Not authenticated');
        }

        const body = await res.json().catch(() => null);
        const token = body?.access_token;
        if (!token) {
            console.warn('auth.refreshAccessToken: no token in response');
            throw new Error('No access_token in refresh response');
        }

        setAccessToken(token);
        console.log('auth.refreshAccessToken: success');
        return token;
    }

    async function authFetch(url, options = {}) {
        const opts = {
            credentials: 'include',
            ...options,
            headers: {
                ...(options.headers || {}),
            },
        };

        let token = getAccessToken();
        console.log('auth.authFetch: token present?', !!token);

        if (token) {
            opts.headers.Authorization = `Bearer ${token}`;
            const res = await fetch(url, opts);
            if (res.status !== 401) return res;
            console.warn('auth.authFetch: request returned 401, will try refresh');
        }

        // Попробуем обновить токен (если это возможно)
        try {
            token = await refreshAccessToken();
        } catch (err) {
            console.warn('auth.authFetch: refresh failed, proceeding without token');
            return fetch(url, opts); // вернём оригинальный fetch (скорее всего 401)
        }

        opts.headers.Authorization = `Bearer ${token}`;
        return fetch(url, opts);
    }

    function isAuthenticated() {
        return !!getAccessToken();
    }

    function initAuthOnLoad() {
        try {
            const token = getAccessToken();
            console.log('auth.initAuthOnLoad: token exists?', !!token);
            // Если токен уже есть — не дергаем refresh
            if (token) return;

            // Токена нет — пытаемся тихо обновить (не удаляем ничего при неудаче)
            refreshAccessToken().catch(err => {
                console.log('auth.initAuthOnLoad: no refresh (user not logged in)');
            });
        } catch (err) {
            console.error('auth.initAuthOnLoad error', err);
        }
    }

    // автоинициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthOnLoad);
    } else {
        initAuthOnLoad();
    }

    window.auth = {
        getAccessToken,
        setAccessToken,
        refreshAccessToken,
        authFetch,
        isAuthenticated,
    };
})();
