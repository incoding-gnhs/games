// 게임 공통 유틸리티 함수

/**
 * 로컬 스토리지에서 사용자 정보 가져오기
 */
function getStoredUser() {
    const userJson = localStorage.getItem('gameUser');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * 로그인 상태 확인 (로그인 안되어있으면 홈으로 리다이렉트)
 */
function checkLoginOrRedirect() {
    const user = getStoredUser();
    if (!user) {
        alert('로그인이 필요합니다!');
        window.location.href = '/';
        return false;
    }
    return true;
}

/**
 * 게임 결과 페이지로 이동
 * @param {string} gameName - 게임 이름
 * @param {number} score - 점수
 * @param {string} folder - 게임 폴더 (all, desktop, mobile, etc)
 */
function goToResultPage(gameName, score, folder = 'all') {
    const user = getStoredUser();
    if (!user) {
        alert('로그인이 필요합니다!');
        window.location.href = '/';
        return;
    }

    window.location.href = `/game-result?game=${encodeURIComponent(gameName)}&score=${score}&folder=${folder}`;
}

/**
 * 점수를 서버에 제출
 * @param {string} gameName - 게임 이름
 * @param {number} score - 점수
 * @returns {Promise<object>} - 제출 결과
 */
async function submitScore(gameName, score) {
    const user = getStoredUser();
    if (!user) {
        throw new Error('로그인이 필요합니다.');
    }

    try {
        const response = await fetch(`/api/games/${encodeURIComponent(gameName)}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: user.studentId,
                score: score
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '점수 제출에 실패했습니다.');
        }

        return data;
    } catch (error) {
        console.error('점수 제출 오류:', error);
        throw error;
    }
}
