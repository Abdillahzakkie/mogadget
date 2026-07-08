import axios from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true });
export const fetcher = <T>(url: string): Promise<T> => api.get(url).then((r) => r.data.data as T);
