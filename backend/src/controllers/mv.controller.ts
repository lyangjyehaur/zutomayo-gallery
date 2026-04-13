import { Request, Response } from 'express';
import { MVService } from '../services/mv.service.js';
import probe from 'probe-image-size';

const mvService = new MVService();

export const getMVs = async (req: Request, res: Response) => {
  try {
    const { search, year, album, artist, sort } = req.query;
    const data = await mvService.getAllMVs({
      search: search as string,
      year: year as string,
      album: album as string,
      artist: artist as string,
      sort: sort as 'asc' | 'desc'
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getMVById = async (req: Request, res: Response) => {
  const data = await mvService.getMVById(req.params.id);
  data ? res.json(data) : res.status(404).json({ message: 'MV not found' });
};

export const updateMVs = async (req: Request, res: Response) => {
  try {
    const newData = req.body;
    await mvService.updateAllMVs(newData);
    res.json({ message: 'Database_Updated_Successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Update Failed', error });
  }
};

export const probeImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const result = await probe(url, { timeout: 5000 });
    res.json({ width: result.width, height: result.height });
  } catch (error) {
    res.status(500).json({ message: 'Probe failed', error: (error as Error).message });
  }
};