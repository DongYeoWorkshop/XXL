// storage.js

const STORAGE_KEY = 'dyst_stats';
const VERSION_KEY = 'dyst_app_version';

// 로컬 스토리지에서 전체 데이터 불러오기
export function loadAllStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("데이터 로드 중 오류 발생", e);
    return {};
  }
}

// 특정 캐릭터의 스탯 저장하기
export function saveCharacterStats(charId, charStats) {
  if (!charId) return;
  
  const allStats = loadAllStats();
  allStats[charId] = charStats;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStats));
  } catch (e) {
    console.error("데이터 저장 중 오류 발생", e);
  }
}

export function saveSnapshots(snapshots) {
    try {
        localStorage.setItem('dyst_snapshots', JSON.stringify(snapshots));
    } catch (e) {
        console.error("스냅샷 저장 실패", e);
    }
}

export function loadSnapshots() {
    try {
        const data = localStorage.getItem('dyst_snapshots');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}
