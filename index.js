import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/games', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// MongoDB 연결 이벤트 핸들러
mongoose.connection.on('connected', () => {
  console.log('Mongoose가 MongoDB에 연결되었습니다.');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose 연결 오류:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose 연결이 해제되었습니다.');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, `index.html`), (err) => {
    if (err) {
      res.status(500).send('Error');
    }
  });
});

// games 폴더의 모든 서브폴더 게임 파일 서빙
app.get('/games/:folder/:filename', (req, res) => {
  const folder = req.params.folder;
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'games', folder, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('해당 게임을 찾을 수 없습니다.');
    }
  });
});

app.get('/:pageNumber', (req, res) => {
  const page = req.params.pageNumber;
  const filePath = path.join(__dirname, 'public', `${page}.html`);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('해당 페이지를 찾을 수 없습니다.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});