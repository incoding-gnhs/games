import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from './models/user.js';
import Score from './models/score.js';
import Reward from './models/reward.js';

// ES6 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// JSON 파싱 미들웨어
app.use(express.json());

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
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

// ==================== 데이터 클리너 ====================
// 10초마다 실행되어 User에 존재하지 않는 studentId를 가진 Score와 Reward 삭제
async function cleanOrphanedData() {
  try {
    // 모든 사용자의 studentId 목록 가져오기
    const users = await User.find({}, { studentId: 1, _id: 0 });
    const validStudentIds = users.map(user => user.studentId);
    
    // User에 없는 studentId를 가진 Score 삭제
    const scoreResult = await Score.deleteMany({ 
      studentId: { $nin: validStudentIds } 
    });
    
    // User에 없는 studentId를 가진 Reward 삭제
    const rewardResult = await Reward.deleteMany({ 
      studentId: { $nin: validStudentIds } 
    });
    
    if (scoreResult.deletedCount > 0 || rewardResult.deletedCount > 0) {
      console.log(`[클리너] Score ${scoreResult.deletedCount}개, Reward ${rewardResult.deletedCount}개 삭제됨`);
    }
  } catch (error) {
    console.error('[클리너] 오류:', error);
  }
}

// 10초마다 클리너 실행
setInterval(cleanOrphanedData, 10000);

// 서버 시작 시 한 번 실행
cleanOrphanedData();

// ==================== 정적 파일 제공 ====================

app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));

// ==================== API 엔드포인트 ====================

// 로그인/회원가입 API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { studentId, name } = req.body;
    
    // 입력 유효성 검증
    if (!studentId || !name) {
      return res.status(400).json({ error: '학번과 이름을 입력해주세요.' });
    }

    // 학번 형식 검증 (5자리 숫자)
    if (!/^\d{5}$/.test(studentId)) {
      return res.status(400).json({ error: '학번은 5자리 숫자로 입력해주세요.' });
    }

    // 이름 형식 검증 (2-3글자)
    if (name.length < 2 || name.length > 3) {
      return res.status(400).json({ error: '이름은 2글자 또는 3글자로 입력해주세요.' });
    }

    // 학번으로 사용자 찾기
    let user = await User.findOne({ studentId });
    
    if (user) {
      // 사용자가 존재하는 경우
      if (user.name === name) {
        // 이름이 일치하면 로그인 성공
        return res.json({ 
          success: true,
          action: 'login',
          message: '로그인되었습니다.', 
          user: {
            studentId: user.studentId,
            name: user.name
          }
        });
      } else {
        // 이름이 불일치하면 기존 이름 알려주기
        return res.json({ 
          success: false,
          action: 'name_mismatch',
          message: '이름이 일치하지 않습니다.',
          existingName: user.name,
          studentId: user.studentId
        });
      }
    } else {
      // 사용자가 없으면 새로 생성
      user = new User({ name, studentId });
      await user.save();
      
      return res.status(201).json({ 
        success: true,
        action: 'signup',
        message: '회원가입이 완료되었습니다.', 
        user: {
          studentId: user.studentId,
          name: user.name
        }
      });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 이름 변경 API
app.put('/api/auth/update-name', async (req, res) => {
  try {
    const { studentId, newName } = req.body;
    
    if (!studentId || !newName) {
      return res.status(400).json({ error: '학번과 새 이름을 입력해주세요.' });
    }

    // 이름 형식 검증
    if (newName.length < 2 || newName.length > 3) {
      return res.status(400).json({ error: '이름은 2글자 또는 3글자로 입력해주세요.' });
    }

    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(404).json({ error: '해당 학번을 찾을 수 없습니다.' });
    }

    const oldName = user.name;
    user.name = newName;
    await user.save();

    res.json({ 
      success: true,
      message: '이름이 변경되었습니다.',
      oldName,
      newName,
      user: {
        studentId: user.studentId,
        name: user.name
      }
    });
  } catch (error) {
    console.error('이름 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학생 생성 또는 조회
app.post('/api/students', async (req, res) => {
  try {
    const { name, studentId } = req.body;
    
    if (!name || !studentId) {
      return res.status(400).json({ error: '이름과 학번을 입력해주세요.' });
    }

    // 이미 존재하는 학생인지 확인
    let user = await User.findOne({ studentId });
    
    if (user) {
      return res.json({ message: '이미 존재하는 학생입니다.', user });
    }

    // 새 학생 생성
    user = new User({ name, studentId });
    await user.save();
    
    res.status(201).json({ message: '학생이 생성되었습니다.', user });
  } catch (error) {
    console.error('학생 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학생 ID로 보상 추가
app.post('/api/students/:studentId/rewards', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '보상 제목을 입력해주세요.' });
    }

    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(404).json({ error: '해당 학생을 찾을 수 없습니다.' });
    }

    const newReward = new Reward({
      studentId,
      title,
      description: description || '',
      earnedAt: new Date(),
      claimed: false
    });

    await newReward.save();

    res.status(201).json({ 
      message: '보상이 추가되었습니다.', 
      reward: newReward
    });
  } catch (error) {
    console.error('보상 추가 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학생 ID로 보상 목록 조회
app.get('/api/students/:studentId/rewards', async (req, res) => {
  try {
    const { studentId } = req.params;

    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(404).json({ error: '해당 학생을 찾을 수 없습니다.' });
    }

    const rewards = await Reward.find({ studentId }).sort({ earnedAt: -1 });

    res.json({ 
      studentId: user.studentId,
      name: user.name,
      rewards 
    });
  } catch (error) {
    console.error('보상 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 보상 수령 처리
app.put('/api/students/:studentId/rewards/:rewardId/claim', async (req, res) => {
  try {
    const { studentId, rewardId } = req.params;

    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(404).json({ error: '해당 학생을 찾을 수 없습니다.' });
    }

    const reward = await Reward.findById(rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: '해당 보상을 찾을 수 없습니다.' });
    }

    if (reward.studentId !== studentId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    if (reward.claimed) {
      return res.status(400).json({ error: '이미 수령한 보상입니다.' });
    }

    reward.claimed = true;
    reward.claimedAt = new Date();
    await reward.save();

    res.json({ 
      message: '보상을 수령했습니다.', 
      reward 
    });
  } catch (error) {
    console.error('보상 수령 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 미수령 보상 조회
app.get('/api/students/:studentId/rewards/unclaimed', async (req, res) => {
  try {
    const { studentId } = req.params;

    const user = await User.findOne({ studentId });
    
    if (!user) {
      return res.status(404).json({ error: '해당 학생을 찾을 수 없습니다.' });
    }

    const unclaimedRewards = await Reward.find({ 
      studentId, 
      claimed: false 
    }).sort({ earnedAt: -1 });

    res.json({ 
      studentId: user.studentId,
      name: user.name,
      unclaimedRewards 
    });
  } catch (error) {
    console.error('미수령 보상 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ==================== 게임 랭킹 시스템 API ====================

// 게임 점수 기록
app.post('/api/games/:gameName/scores', async (req, res) => {
  try {
    const { gameName } = req.params;
    const { studentId, score } = req.body;

    if (!studentId || score === undefined) {
      return res.status(400).json({ error: '학번과 점수는 필수입니다.' });
    }

    const newScore = new Score({
      studentId,
      gameName,
      score
    });

    await newScore.save();

    res.status(201).json({ 
      message: '점수가 기록되었습니다.', 
      score: newScore 
    });
  } catch (error) {
    console.error('점수 기록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 게임 결과 페이지용 - 점수 저장 후 순위 정보 반환
app.post('/api/games/:gameName/submit-score', async (req, res) => {
  try {
    const { gameName } = req.params;
    const { studentId, score } = req.body;

    if (!studentId || score === undefined) {
      return res.status(400).json({ error: '학번과 점수는 필수입니다.' });
    }

    // 점수 저장
    const newScore = new Score({
      studentId,
      gameName,
      score
    });
    await newScore.save();

    // 전체 랭킹 계산 (각 학생의 최고 점수 기준)
    const allRankings = await Score.aggregate([
      { $match: { gameName } },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: '$studentId',
          studentId: { $first: '$studentId' },
          score: { $first: '$score' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $project: {
          _id: 0,
          studentId: 1,
          score: 1,
          createdAt: 1
        }
      }
    ]);

    // 각 학생의 이름 조회
    const studentIds = allRankings.map(r => r.studentId);
    const users = await User.find({ studentId: { $in: studentIds } }).select('studentId name');
    const userMap = {};
    users.forEach(user => {
      userMap[user.studentId] = user.name;
    });

    console.log('학생 ID 목록:', studentIds);
    console.log('조회된 사용자:', users);
    console.log('사용자 맵:', userMap);

    // 현재 학생의 최고 점수
    const myBestScore = await Score.findOne({ gameName, studentId })
      .sort({ score: -1 })
      .select('score');

    const myScore = myBestScore ? myBestScore.score : score;

    // 내 순위 찾기
    const myRank = allRankings.findIndex(r => r.studentId === studentId) + 1;
    const totalPlayers = allRankings.length;
    const percentile = totalPlayers > 0 ? ((totalPlayers - myRank + 1) / totalPlayers * 100).toFixed(1) : 100;

    // 내 앞뒤 3명씩 (총 7명)
    const myIndex = myRank - 1;
    const startIndex = Math.max(0, myIndex - 3);
    const endIndex = Math.min(allRankings.length, myIndex + 4);
    const nearbyRankings = allRankings.slice(startIndex, endIndex).map((r, idx) => ({
      rank: startIndex + idx + 1,
      studentId: r.studentId,
      name: userMap[r.studentId] || r.studentId, // 이름이 없으면 학번 표시
      score: r.score,
      isMe: r.studentId === studentId
    }));

    // 상위 10% 체크 및 보상 지급
    let rewardEarned = false;
    const topPercentile = 100 - parseFloat(percentile); // 상위 몇 %인지 계산
    
    console.log(`학생 ${studentId} - 순위: ${myRank}/${totalPlayers}, percentile: ${percentile}%, 상위: ${topPercentile}%`);
    
    if (topPercentile <= 10) {
      console.log(`상위 10% 달성! 보상 지급 시도...`);
      
      // 전체 보상 개수 체크
      const totalRewardsCount = await Reward.countDocuments({ title: '까먹는 젤리' });
      const maxRewards = parseInt(process.env.MAX_JELLY_REWARDS) || 200;
      
      console.log(`전체 보상 개수: ${totalRewardsCount}/${maxRewards}`);
      
      if (totalRewardsCount >= maxRewards) {
        console.log('⚠️ 보상 최대 개수에 도달했습니다. 더 이상 보상을 지급할 수 없습니다.');
      } else {
        // 이미 해당 게임에서 보상을 받았는지 체크
        const existingReward = await Reward.findOne({
          studentId,
          title: '까먹는 젤리',
          description: `${gameName} 상위 10% 달성`
        });

        console.log('기존 보상 조회 결과:', existingReward);

        if (!existingReward) {
          // 보상 생성
          const reward = new Reward({
            studentId,
            title: '까먹는 젤리',
            description: `${gameName} 상위 10% 달성`,
            claimed: false
          });
          await reward.save();
          rewardEarned = true;
          console.log('보상 생성 완료!', reward);
          console.log(`현재 전체 보상 개수: ${totalRewardsCount + 1}/${maxRewards}`);
        } else {
          console.log('이미 해당 게임에서 보상을 받았습니다.');
        }
      }
    } else {
      console.log(`상위 ${topPercentile}% - 보상 조건 미달 (상위 10% 이하만 가능)`);
    }

    res.json({
      success: true,
      currentScore: score,
      myBestScore: myScore,
      myRank,
      totalPlayers,
      percentile: parseFloat(percentile),
      nearbyRankings,
      rewardEarned,
      topPercentile: topPercentile.toFixed(1)
    });

  } catch (error) {
    console.error('점수 제출 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 특정 게임의 전체 랭킹 조회 (점수 높은 순) - 각 학생의 최고 점수만
app.get('/api/games/:gameName/rankings', async (req, res) => {
  try {
    const { gameName } = req.params;
    const limit = parseInt(req.query.limit) || 100; // 기본 100개
    const skip = parseInt(req.query.skip) || 0;

    // MongoDB aggregation을 사용하여 각 학생의 최고 점수만 추출
    const rankings = await Score.aggregate([
      { $match: { gameName } },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: '$studentId',
          studentId: { $first: '$studentId' },
          score: { $first: '$score' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { score: -1, createdAt: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          studentId: 1,
          score: 1,
          createdAt: 1
        }
      }
    ]);

    // 전체 학생 수 계산
    const totalStudents = await Score.aggregate([
      { $match: { gameName } },
      { $group: { _id: '$studentId' } },
      { $count: 'total' }
    ]);

    const total = totalStudents.length > 0 ? totalStudents[0].total : 0;

    res.json({ 
      gameName,
      total,
      limit,
      skip,
      rankings 
    });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 특정 게임의 TOP N 랭킹 조회 - 각 학생의 최고 점수만
app.get('/api/games/:gameName/top/:topN', async (req, res) => {
  try {
    const { gameName, topN } = req.params;
    const limit = parseInt(topN) || 10;

    // MongoDB aggregation을 사용하여 각 학생의 최고 점수만 추출
    const rankings = await Score.aggregate([
      { $match: { gameName } },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: '$studentId',
          studentId: { $first: '$studentId' },
          score: { $first: '$score' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { score: -1, createdAt: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          studentId: 1,
          score: 1,
          createdAt: 1
        }
      }
    ]);

    res.json({ 
      gameName,
      topN: limit,
      rankings 
    });
  } catch (error) {
    console.error('TOP 랭킹 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 특정 학생의 특정 게임 기록 조회
app.get('/api/games/:gameName/students/:studentId', async (req, res) => {
  try {
    const { gameName, studentId } = req.params;

    const scores = await Score.find({ gameName, studentId })
      .sort({ score: -1, createdAt: -1 })
      .select('score createdAt');

    if (scores.length === 0) {
      return res.status(404).json({ error: '해당 학생의 게임 기록이 없습니다.' });
    }

    // 최고 점수
    const bestScore = scores[0];
    
    // 평균 점수
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    res.json({ 
      gameName,
      studentId,
      totalPlays: scores.length,
      bestScore: bestScore.score,
      averageScore: Math.round(avgScore),
      scores 
    });
  } catch (error) {
    console.error('학생 게임 기록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 특정 학생의 특정 게임 최고 점수 조회
app.get('/api/games/:gameName/students/:studentId/best', async (req, res) => {
  try {
    const { gameName, studentId } = req.params;

    const bestScore = await Score.findOne({ gameName, studentId })
      .sort({ score: -1 })
      .select('score createdAt');

    if (!bestScore) {
      return res.status(404).json({ error: '해당 학생의 게임 기록이 없습니다.' });
    }

    // 전체 랭킹에서 순위 계산
    const rank = await Score.countDocuments({ 
      gameName, 
      score: { $gt: bestScore.score } 
    }) + 1;

    res.json({ 
      gameName,
      studentId,
      rank,
      bestScore 
    });
  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 학생의 모든 게임 기록 조회
app.get('/api/students/:studentId/games', async (req, res) => {
  try {
    const { studentId } = req.params;

    const allScores = await Score.find({ studentId })
      .sort({ createdAt: -1 });

    if (allScores.length === 0) {
      return res.status(404).json({ error: '해당 학생의 게임 기록이 없습니다.' });
    }

    // 게임별로 그룹화하여 최고 점수만 추출
    const gameStats = {};
    allScores.forEach(score => {
      if (!gameStats[score.gameName] || gameStats[score.gameName].score < score.score) {
        gameStats[score.gameName] = {
          gameName: score.gameName,
          bestScore: score.score,
          achievedAt: score.createdAt
        };
      }
    });

    res.json({ 
      studentId,
      totalGamesPlayed: Object.keys(gameStats).length,
      totalPlays: allScores.length,
      gameStats: Object.values(gameStats)
    });
  } catch (error) {
    console.error('학생 전체 게임 기록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 전체 게임 목록 조회 (기록이 있는 게임들)
app.get('/api/games', async (req, res) => {
  try {
    const games = await Score.distinct('gameName');
    
    const gameStats = await Promise.all(
      games.map(async (gameName) => {
        const count = await Score.countDocuments({ gameName });
        const topScore = await Score.findOne({ gameName }).sort({ score: -1 });
        
        return {
          gameName,
          totalPlays: count,
          topScore: topScore ? topScore.score : 0,
          topPlayer: topScore ? topScore.studentId : null
        };
      })
    );

    res.json({ 
      totalGames: games.length,
      games: gameStats 
    });
  } catch (error) {
    console.error('게임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ==================== 페이지 라우트 ====================

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

// 사용자 보상 조회 API
app.get('/api/rewards/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const rewards = await Reward.find({ studentId })
      .sort({ earnedAt: -1 })
      .select('title description claimed earnedAt claimedAt');

    // 전체 보상 개수 및 남은 보상 개수 계산
    const totalRewardsCount = await Reward.countDocuments({ title: '까먹는 젤리' });
    const maxRewards = parseInt(process.env.MAX_JELLY_REWARDS) || 200;
    const remainingRewards = Math.max(0, maxRewards - totalRewardsCount);

    res.json({
      success: true,
      rewards,
      stats: {
        totalDistributed: totalRewardsCount,
        maxRewards,
        remaining: remainingRewards
      }
    });
  } catch (error) {
    console.error('보상 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 보상 획득 처리 API (claimed 상태 변경)
app.put('/api/rewards/:rewardId/claim', async (req, res) => {
  try {
    const { rewardId } = req.params;

    const reward = await Reward.findById(rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: '보상을 찾을 수 없습니다.' });
    }

    if (reward.claimed) {
      return res.status(400).json({ error: '이미 획득한 보상입니다.' });
    }

    reward.claimed = true;
    reward.claimedAt = new Date();
    await reward.save();

    res.json({
      success: true,
      message: '보상을 획득했습니다.',
      reward
    });
  } catch (error) {
    console.error('보상 획득 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
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