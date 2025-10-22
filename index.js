const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 80;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, `index.html`), (err) => {
    if (err) {
      res.status(500).send('Error');
    }
  });
});

// 데스크탑 게임 목록 API
app.get('/api/desktop-games', (req, res) => {
  const desktopDir = path.join(__dirname, 'games', 'desktop');
  
  fs.readdir(desktopDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '파일 목록을 읽을 수 없습니다.' });
    }
    
    // .html 파일만 필터링
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    res.json(htmlFiles);
  });
});

// 모바일 게임 목록 API
app.get('/api/mobile-games', (req, res) => {
  const mobileDir = path.join(__dirname, 'games', 'mobile');
  
  fs.readdir(mobileDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '파일 목록을 읽을 수 없습니다.' });
    }
    
    // .html 파일만 필터링
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    res.json(htmlFiles);
  });
});

// 데스크탑 게임 파일 서빙
app.get('/desktop/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'games', 'desktop', filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('해당 게임을 찾을 수 없습니다.');
    }
  });
});

// 모바일 게임 파일 서빙
app.get('/mobile/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'games', 'mobile', filename);

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