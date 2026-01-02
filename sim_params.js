// sim_params.js
export const simParams = {
  "shinrirang": {
    normalTrigger: "shinrirang_skill1",
    ultTrigger: "shinrirang_skill2",

    // [패시브2] 내기혼신·늑대
    skill4_buff: { 
      type: "buff",
      originalId: "shinrirang_skill4",
      phase: "onAttack",
      order: 1,
      prob: 0.5,
      duration: 1,
      condition: "isUlt", // 필살기 시에만
      label: "버프 발동"
    },
    skill4_hit: { 
      type: "hit",
      originalId: "shinrirang_skill4",
      phase: "onAttack",
      order: 2,
      prob: 0.5,
      valKey: "추가공격",
      condition: "isUlt", // 필살기 시에만
      label: "내기혼신・늑대"
    },

    // [패시브3] 늑대 이빨의 반격
    skill5_buff: { 
      type: "buff",
      originalId: "shinrirang_skill5",
      order: 1, // 순서는 여기서 결정됨
      maxStacks: 2,
      duration: 2,
      skipTrigger: true, 
      triggers: ["being_hit"],
      label: "버프 발동"
    },
    skill5_counter: { 
      type: "hit",
      originalId: "shinrirang_skill5",
      order: 2, // 순서는 여기서 결정됨
      valKey: "추가공격",
      triggers: ["being_hit"],
      label: "반격 연환각"
    },

    // [패시브5] 굶주린 늑대의 투지 (스택)
    skill7: { 
      originalId: "shinrirang_skill7",
      id: "skill7",
      type: "stack",
      phase: "onAttack",
      order: 1,
      triggers: ["shinrirang_skill1", "shinrirang_skill2", "shinrirang_skill5"], 
      maxStacks: 10,
      label: "발동"
    },

    // [도장] 내기혼신·늑대 (강화)
    skill8_buff: { 
      type: "buff",
      originalId: "shinrirang_skill8",
      phase: "onAttack",
      order: 3,
      prob: 0.5,
      duration: 1,
      condition: ["isUlt", "isStamp"], // 필살기 AND 도장
      label: "버프 발동"
    },
    skill8_hit: { 
      type: "hit",
      originalId: "shinrirang_skill8",
      phase: "onAttack",
      order: 4,
      prob: 0.5,
      valIdx: 0,
      condition: ["isUlt", "isStamp"], // 필살기 AND 도장
      label: "1800도 회전 발차기"
    }
  },
  "tayangsuyi": {
    normalTrigger: "tayangsuyi_skill1",
    ultTrigger: "tayangsuyi_skill2",

    // [패시브2] 화산섬 전투의 춤 (전의 스택)
    skill4_spirit: {
      type: "stack",
      id: "skill4_spirit", // 이제 엔진이 skill4_spirit_stacks 로 자동 관리
      originalId: "tayangsuyi_skill4",
      customTag: "전의",
      maxStacks: 9,
      bonusPerStack: 6, 
      triggers: ["ally_attack"], 
      label: "획득"
    },
    // [필살기] 전의 소모 (도장 없을 때)
    skill4_spirit_consume: {
      type: "action", 
      id: "skill4_spirit", // 키값 일치 (엔진이 skill4_spirit_stacks 를 소모함)
      phase: "onAfterAction",
      condition: ["isUlt", "!isStamp"], 
      action: "all_consume",
      label: "전의"
    },

    // [패시브3] 워밍업 함성
    skill5_buff: {
      type: "buff",
      originalId: "tayangsuyi_skill5",
      phase: "onAttack", // 행동 단계에서 체크
      order: 1,
      duration: 2,
      condition: "isDefend", // 오직 방어 시에만 발동
      label: "발동"
    },

    // [패시브5] 전의의 궐기
    skill7_buff: {
      type: "buff",
      originalId: "tayangsuyi_skill7",
      maxStacks: 3,
      duration: 1,
      triggers: ["ally_ult"], 
      label: "발동"
    },

    // [도장] 절대 왕자 파워밤 (9중첩 보너스)
    skill8_stamp: {
      originalId: "tayangsuyi_skill8",
      condition: ["isStamp", "hasStack:skill4_spirit:9"], // 도장 AND 전의 9중첩
      bonus: 20,
      label: "도장 효과"
    }
  },
  "choiyuhyun": {
    normalTrigger: "choiyuhyun_skill1",
    ultTrigger: "choiyuhyun_skill2",

    // [테스트] 필살기 시 1명에게만 걸리는 임시 디버프
    test_debuff: {
      type: "buff",
      originalId: "choiyuhyun_skill2",
      timerKey: "skill2_timer", 
      testVal: 30, 
      phase: "onCalculateDamage", // setup에서 onCalculateDamage로 수정
      order: 1,
      condition: "isUlt",
      targetLimit: 1,
      duration: 1,
      label: "약점 포착"
    },

    // [패시브2] 일죽별운 (HP 100% 유지 확률 연동)
    skill4_buff: {
      type: "buff",
      originalId: "choiyuhyun_skill4",
      phase: "onTurn",
      order: 1,
      duration: 1,
      probSource: "hp_100_prob", // UI의 입력박스 값을 확률로 사용
      label: "HP 100% 유지"
    },

    // [패시브4] 신화성신환 (방어 시 버프 준비)
    skill5_buff: {
      type: "buff",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend", // 방어 중일 때만 엔진이 자동 실행
      label: "추가데미지 준비"
    },
    // [패시브4] 신화성신환 (공격 시 추가타)
    skill5_hit: {
      type: "hit",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 1,
      condition: ["!isDefend", "hasBuff:skill5"], 
      valKey: "max",
      label: "신화성신환"
    },

    // [패시브5] 검추백형 (5인용)
    skill7_hit_5: {
      type: "hit",
      originalId: "choiyuhyun_skill7",
      phase: "onAttack",
      order: 3,
      condition: ["isUlt", "targetCount:5"], 
      isMulti: true,
      valIdx: 0, 
      label: "검추백형"
    },
    // [패시브5] 검추백형 (1인용)
    skill7_hit_1: {
      type: "hit",
      originalId: "choiyuhyun_skill7",
      phase: "onAttack",
      order: 3,
      condition: ["isUlt", "targetCount:1"], 
      val: 75.0, 
      label: "검추백형"
    }
  }
};