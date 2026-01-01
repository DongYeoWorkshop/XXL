// simulator-common.js

/**
 * 시뮬레이터 전역에서 재사용 가능한 공통 컨트롤 정의
 */
export const commonControls = {
    "hp_100_prob": {
        id: "hp_100_prob",
        type: "input",
        label: "HP 100% 유지율(%)",
        min: 0,
        max: 100,
        initial: 100,
        description: "매 턴 HP가 100%로 유지될 확률입니다."
    },
    "hit_prob": {
        id: "hit_prob",
        type: "input",
        label: "턴당 피격 확률(%)",
        min: 0,
        max: 100,
        initial: 30,
        description: "캐릭터가 적에게 공격받을 확률입니다."
    },
    "normal_hit_prob": {
        id: "normal_hit_prob",
        type: "input",
        label: "보통공격 피격 확률(%)",
        min: 0,
        max: 100,
        initial: 30,
        description: "캐릭터가 적의 보통공격에 피격될 확률입니다."
    },
    "ally_ult_count": {
        id: "ally_ult_count",
        type: "counter",
        label: "아군 필살 횟수",
        min: 0,
        max: 3,
        initial: 0,
        description: "아군이 필살기를 사용하는 횟수입니다.",
        // 이 설정이 작동하는 기본 주기 (1+3n, 1턴 제외)
        isTurn: (t) => t > 1 && (t - 1) % 3 === 0
    },
    "ally_warrior_debuffer_count": {
        id: "ally_warrior_debuffer_count",
        type: "counter",
        label: "아군 전사/방해 수",
        min: 0,
        max: 4,
        initial: 2,
        description: "파티 내 전사 및 방해 포지션 아군의 수입니다."
    },
    "is_paralysis_immune": {
        id: "is_paralysis_immune",
        type: "toggle",
        label: "대상 마비 면역 여부",
        initial: true,
        description: "공격 대상이 마비 효과에 면역인지 여부입니다."
    }
};

/**
 * 캐릭터 데이터에 정의된 commonControls 키 배열을 실제 컨트롤 객체 배열로 변환
 */
export function getCharacterCommonControls(keys) {
    if (!keys || !Array.isArray(keys)) return [];
    return keys.map(key => commonControls[key]).filter(Boolean);
}
