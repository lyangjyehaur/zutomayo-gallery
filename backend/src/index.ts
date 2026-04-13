import express from 'express';
import cors from 'cors';
import mvRoutes from './routes/mv.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由註冊
app.use('/api/mvs', mvRoutes);

// 健康檢查
app.get('/health', (req, res) => res.send('ZTMY_SERVER_ALIVE'));

app.listen(PORT, () => {
  console.log(`ZTMY Backend running on http://localhost:${PORT}`);
});