# 게임에 결과 페이지 연동하기 가이드

## 🎯 개요
모든 게임에 통일된 결과 페이지를 적용하여 순위, 상위%, 주변 랭킹을 표시합니다.

## 📋 적용 방법

### 1단계: 유틸리티 스크립트 추가

게임 HTML 파일의 `<head>` 또는 `</body>` 직전에 다음 스크립트를 추가하세요:

```html
<script src="/game-utils.js"></script>
```

### 2단계: 게임 시작 시 로그인 확인

게임 시작 함수에 다음 코드를 추가하세요:

```javascript
function startGame() {
    // 로그인 확인
    if (!checkLoginOrRedirect()) {
        return;
    }
    
    // 기존 게임 시작 로직...
}
```

### 3단계: 게임 오버 시 결과 페이지로 이동

게임이 끝날 때 다음 코드를 사용하세요:

```javascript
function endGame() {
    // 점수 계산
    const finalScore = calculateScore(); // 게임별 점수 계산 로직
    
    // 결과 페이지로 이동
    goToResultPage('게임이름', finalScore, 'all'); // 또는 'desktop', 'mobile', 'etc'
}
```

## 💡 전체 예시 코드

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>내 게임</title>
</head>
<body>
    <div id="game-container">
        <!-- 게임 내용 -->
    </div>

    <!-- 유틸리티 스크립트 추가 -->
    <script src="/game-utils.js"></script>
    
    <script>
        let score = 0;
        let gameActive = false;

        function startGame() {
            // 로그인 확인
            if (!checkLoginOrRedirect()) {
                return;
            }
            
            gameActive = true;
            score = 0;
            // 게임 로직...
        }

        function endGame() {
            gameActive = false;
            
            // 결과 페이지로 이동 (2초 후)
            setTimeout(() => {
                goToResultPage('내게임이름', score, 'all');
            }, 2000);
        }

        // 게임 로직...
    </script>
</body>
</html>
```

## 📌 주요 함수 설명

### `checkLoginOrRedirect()`
- 로그인 상태를 확인합니다
- 로그인 안되어있으면 홈으로 리다이렉트
- 반환값: `true` (로그인됨) / `false` (로그인 안됨)

### `goToResultPage(gameName, score, folder)`
- 게임 결과 페이지로 이동합니다
- **gameName**: 게임 이름 (예: "유리잔-깨기")
- **score**: 점수 (숫자)
- **folder**: 게임 폴더 (예: "all", "desktop", "mobile", "etc")

### `getStoredUser()`
- 로컬 스토리지에서 사용자 정보를 가져옵니다
- 반환값: `{ studentId: "12345", name: "홍길동" }` 또는 `null`

### `submitScore(gameName, score)` (선택사항)
- 결과 페이지로 가지 않고 점수만 제출하고 싶을 때 사용
- Promise를 반환하므로 `async/await` 사용 가능

## 🎮 폴더별 구분

- **all**: 모든 플랫폼에서 실행 가능한 게임
- **desktop**: PC에서만 실행 가능한 게임
- **mobile**: 모바일에서만 실행 가능한 게임
- **etc**: 기타 게임

## ⚠️ 주의사항

1. 게임 이름은 `info.json`에 등록된 이름과 **정확히 일치**해야 합니다
2. 점수는 **정수(integer)** 형태로 전달해야 합니다
3. 결과 페이지로 이동하기 전에 게임 종료 애니메이션을 보여주려면 `setTimeout` 사용

## 🔧 문제 해결

### 로그인이 안되어있는데 게임이 실행됨
→ `startGame()` 함수에 `checkLoginOrRedirect()` 추가 필요

### 결과 페이지에서 "게임 정보가 없습니다" 에러
→ 게임 이름이나 점수가 올바르게 전달되었는지 확인

### undefined 에러 발생
→ `game-utils.js` 스크립트가 제대로 로드되었는지 확인

## 📞 도움이 필요하면

- 30초-클릭게임.html 파일 참고
- 관리자에게 문의
