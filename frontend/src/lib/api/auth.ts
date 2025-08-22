import api from './axios.js';

export async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    const { token } = res.data;

    localStorage.setItem('access_token', token);

    return token;
}

export async function googleLogin(clientId: string, credential: string) {
    const res = await api.post('/auth/google-login', { clientId, credential });
    const { token } = res.data;

    localStorage.setItem('access_token', token);

    return token;
}

export async function facebookLogin(accessToken: string) {
    const res = await api.post('/auth/facebook-login', { accessToken });
    const { token } = res.data;

    localStorage.setItem('access_token', token);

    return token;
}

export function logout() {
    localStorage.removeItem('access_token');
}


export function isLoggedIn(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
}