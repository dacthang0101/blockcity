import api from './axios.js';
import * as authService from './auth.js';

export async function getCurrentUser() {
    try {
        const res = await api.get('/me');
        return res.data;
    } catch (exception: any) {
        console.log(exception);
        if (exception.response?.data?.error?.code === "USER_NOT_FOUND") {
            console.error('>>> USER_NOT_FOUND');
            authService.logout();
        }
        return null;
    }
}
