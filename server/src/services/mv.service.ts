import { MV_DATA } from '../assets/js/data.js';
import { MVItem } from './lib/types';

export class MVService {
  async getAllMVs(filters: {
    search?: string;
    year?: string;
    album?: string;
    artist?: string;
    sort?: 'asc' | 'desc';
  }): Promise<MVItem[]> {
    let data = [...(MV_DATA as MVItem[])];

    if (filters.search) {
      const k = filters.search.toLowerCase();
      data = data.filter(mv => 
        mv.title.toLowerCase().includes(k) || 
        mv.keywords.some(key => key.toLowerCase().includes(k))
      );
    }

    if (filters.year && filters.year !== 'all') {
      data = data.filter(mv => mv.year === filters.year || mv.date.startsWith(filters.year));
    }

    if (filters.artist && filters.artist !== 'all') {
      data = data.filter(mv => mv.artist === filters.artist);
    }

    if (filters.sort === 'asc') return data;
    return data.reverse();
  }

  async getMVById(id: string): Promise<MVItem | undefined> {
    return (MV_DATA as MVItem[]).find(mv => mv.id === id);
  }
}