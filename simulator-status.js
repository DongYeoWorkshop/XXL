// simulator-status.js

/**
 * 시뮬레이터에서 사용하는 주요 상태이상/특수 상태 정의
 */
export const statusRegistry = {
    // 1. 각흔 (바드 전용)
    "scar": {
        name: "[각흔]",
        icon: "icon/compe.PNG",
        type: "status"
    },
    
    // 2. 수면 (탐랑 전용)
    "sleep_status_timer": {
        name: "[수면]",
        icon: "icon/compe.PNG",
        type: "cc"
    },

    // 3. 전의 (다양수이 전용)
    "skill4_spirit": {
        name: "[전의]",
        icon: "icon/compe.PNG",
        type: "stack",
        unit: "중첩"
    },

    // 4. 조롱 (탱커 공용)
    "taunt": {
        name: "[조롱]",
        icon: "icon/compe.PNG",
        type: "status"
    }
};

/**
 * 상태 키와 확률을 받아 표준화된 피격 메시지를 생성합니다.
 */
export function formatStatusMessage(key, prob) {
    const info = getStatusInfo(key);
    const label = info ? info.name : (typeof key === 'string' ? key : "특수 상태");
    return `${label} 피격 발생 (${prob}%)`;
}

/**
 * 상태 키와 행동(부여, 소모 등)을 받아 표준화된 메시지를 생성합니다.
 */
export function formatStatusAction(key, action) {
    const info = getStatusInfo(key);
    const label = info ? info.name : (typeof key === 'string' ? key : "특수 상태");
    const actions = {
        "apply": "부여",
        "consume": "소모",
        "all_consume": "모두 소모",
        "activate": "발동",
        "gain": "수급"
    };
    return `${label} ${actions[action] || action}`;
}

/**
 * 상태 키를 받아 등록된 정보를 반환하는 헬퍼
 */
export function getStatusInfo(key) {
    // 정확한 매칭 확인
    if (statusRegistry[key]) return statusRegistry[key];
    
    // 키 포함 여부 확인 (예: skill4_spirit_stack 등 변형 대응)
    for (const [regKey, info] of Object.entries(statusRegistry)) {
        if (key.includes(regKey)) return info;
    }
    
    return null;
}
