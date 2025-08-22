import api from './axios.js';

export async function purchase(blocks: Record<string, number>[]): Promise<any> {
    const res = await api.post('/purchase', { blocks });
    return res.data;
}