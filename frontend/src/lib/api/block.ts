import api from './axios.js';

export async function list(): Promise<any> {
    const res = await api.get('/block');
    return res.data;
}

export async function listByTile(tileX: number, tileY: number): Promise<any> {
    const res = await api.get(`/block/tile?tileX=${tileX}&tileY=${tileY}`);
    return res.data;
}