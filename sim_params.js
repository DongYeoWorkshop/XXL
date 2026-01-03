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
      condition: "isUlt",
      label: "버프 발동"
    },
    skill4_hit: { 
      type: "hit",
      originalId: "shinrirang_skill4",
      phase: "onAttack",
      order: 2,
      prob: 0.5,
      valKey: "추가공격",
      condition: "isUlt",
      label: "내기혼신・늑대"
    },

    // [패시브3] 늑대 이빨의 반격
    skill5_buff: { 
      type: "buff",
      originalId: "shinrirang_skill5",
      phase: "onEnemyHit",
      order: 1,
      maxStacks: 2,
      duration: 2,
      skipTrigger: true, 
      triggers: ["being_hit"],
      label: "버프 발동"
    },
    skill5_counter: { 
      type: "hit",
      originalId: "shinrirang_skill5",
      phase: "onEnemyHit",
      order: 2,
      valKey: "추가공격",
      triggers: ["being_hit"],
      label: "반격 연환각"
    },

    // [패시브5] 굶주린 늑대의 투지 (스택)
    skill7: { 
      type: "stack",
      id: "skill7_stacks",
      originalId: "shinrirang_skill7",
      phase: "onAttack", // 공격 시 자동 적립
      condition: "!isDefend", // 방어 제외
      triggers: ["being_hit"], // 피격(반격) 시에도 적립
      order: 1,
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
      condition: ["isUlt", "isStamp"],
      label: "버프 발동"
    },
    skill8_hit: { 
      type: "hit",
      originalId: "shinrirang_skill8",
      phase: "onAttack",
      order: 4,
      prob: 0.5,
      valIdx: 0,
      condition: ["isUlt", "isStamp"],
      label: "1800도 회전 발차기"
    }
  },
  "tayangsuyi": {
    normalTrigger: "tayangsuyi_skill1",
    ultTrigger: "tayangsuyi_skill2",

    skill4_spirit: {
      type: "stack",
      id: "skill4_spirit_stacks", 
      originalId: "tayangsuyi_skill4",
      customTag: "전의",
      maxStacks: 9,
      bonusPerStack: 6, 
      triggers: ["ally_attack"], 
      label: "획득",
      prob: 0.5,
      scaleProb: true,
      startRate: 0.64
    },
    skill4_spirit_consume: {
      type: "action", 
      id: "skill4_spirit_stacks", 
      phase: "onAfterAction",
      condition: ["isUlt", "!isStamp"], 
      action: "all_consume",
      label: "전의"
    },
    skill5_buff: {
      type: "buff",
      originalId: "tayangsuyi_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      order: 1,
      duration: 2,
      condition: "isDefend",
      label: "발동"
    },
    skill7_buff: {
      type: "buff",
      originalId: "tayangsuyi_skill7",
      timerKey: "skill7_timer",
      maxStacks: 3,
      duration: 1,
      triggers: ["ally_ult"], 
      label: "발동"
    },
    skill8_stamp: {
      originalId: "tayangsuyi_skill8",
      condition: ["isStamp", "hasStack:skill4_spirit:9"],
      bonus: 20,
      label: "도장 효과"
    }
  },
  "choiyuhyun": {
    normalTrigger: "choiyuhyun_skill1",
    ultTrigger: "choiyuhyun_skill2",

    skill4_buff: {
      type: "buff",
      originalId: "choiyuhyun_skill4",
      phase: "onTurn",
      order: 1,
      duration: 1,
      probSource: "hp_100_prob",
      label: "HP 100% 유지"
    },
    skill5_buff: {
      type: "buff",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend",
      label: "추가데미지 준비"
    },
    skill5_hit: {
      type: "hit",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 1,
      condition: ["!isDefend", "hasBuff:skill5"], 
      valKey: "max",
      label: "신화성신환"
    },
    skill7_hit_5: {
      type: "hit",
      skillId: "choiyuhyun_skill7",
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
      skillId: "choiyuhyun_skill7",
      originalId: "choiyuhyun_skill7",
      phase: "onAttack",
      order: 3,
      condition: ["isUlt", "targetCount:1"], 
      val: 75.0, 
      label: "검추백형"
    }
  },
  "baade": {
    normalTrigger: "baade_skill1",
    ultTrigger: "baade_skill2",
    
    skill7_buff: {
      type: "buff",
      originalId: "baade_skill7",
      timerKey: "skill7_timer",
      maxStacks: 1, 
      duration: 2,
      triggers: ["attack_on_scar"], 
      label: "발동"
    },
    skill8_stamp_hit: {
      type: "hit",
      originalId: "baade_skill8",
      phase: "onAttack",
      order: 2,
      condition: ["isUlt", "isStamp", "hasStack:scar_stacks:1"], 
      valKey: "추가공격",
      label: "쇄강 파공격 (도장)"
    }
  },
  "khafka": {
    normalTrigger: "khafka_skill1",
    ultTrigger: "khafka_skill2",

    skill4_buff: {
      type: "buff",
      originalId: "khafka_skill4",
      timerKey: "skill4_timer",
      phase: "onAttack",
      order: 1,
      prob: 0.5,
      duration: 2,
      condition: "!isDefend",
      customTag: "밧줄",
      label: "부여"
    },
    skill5_buff: {
      type: "buff",
      originalId: "khafka_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend",
      customTag: "밧줄",
      label: "발동"
    },
    skill7_buff: {
      type: "buff",
      originalId: "khafka_skill7",
      timerKey: "skill7_timer",
      phase: "onAttack",
      order: 3,
      duration: 1,
      condition: "isUlt",
      customTag: "밧줄",
      label: "발동"
    }
  },
    "anuberus": {
      normalTrigger: "anuberus_skill1",
      ultTrigger: "anuberus_skill2",
  
      // [패시브2] 속성 디버프 (개들이 공격할 때 트리거)
      skill4_vuln: {
        type: "buff",
        originalId: "anuberus_skill4",
        timerKey: "skill4_timer",
        maxStacks: 4,
        duration: 3,
        triggers: ["dog_attack"],
        customTag: "속성디버프",
        label: "부여",
        order: 1
      },
      // [패시브3] 지옥의 사냥개 스택 (개들이 공격할 때 트리거)
      skill5_stack: {
        type: "buff",
        originalId: "anuberus_skill5",
        timerKey: "skill5_timer",
        maxStacks: 4,
        duration: 3,
        triggers: ["dog_attack"],
        customTag: "사냥개",
        label: "부여",
        order: 2
      },
          // [도장] 협공 추가타 (개들이 공격할 때 트리거)
          skill8_hit: {
            type: "hit",
            originalId: "anuberus_stamp_passive",
            triggers: ["dog_attack"],
            condition: "isStamp",
            valKey: "추가공격", // 고정값 30 제거, 동적 참조로 변경
            label: "니히히~ 우리도 왔다!",
            order: 3
          },      // [패시브2] 흑구 깨우기 (행동 완료 시점)
      black_dog: {
        type: "buff",
        originalId: "anuberus_skill4",
        timerKey: "skill4_black_timer",
        phase: "onAfterAction",
        order: 1,
        prob: 0.5,
        scaleProb: true,
        duration: 2,
        customTag: "흑구",
        label: "깨우기"
      },
      // [패시브2] 백구 깨우기 (행동 완료 시점)
      white_dog: {
        type: "buff",
        originalId: "anuberus_skill4",
        timerKey: "skill4_white_timer",
        phase: "onAfterAction",
        order: 2,
        prob: 0.5,
        scaleProb: true,
        duration: 2,
              customTag: "백구",
              label: "깨우기"
            }
          },
          "kumoyama": {
            normalTrigger: "kumoyama_skill1",
            ultTrigger: "kumoyama_skill2",
        
            // [패시브2] 만상 순환의 자세 (공격 시 50% 확률)
            skill4_buff: {
              type: "buff",
              originalId: "kumoyama_skill4",
              timerKey: "skill4_timer",
              phase: "onAttack",
              order: 1,
              prob: 0.5,
              duration: 2,
              label: "발동"
            },
            // [패시브3] 발도 견벽의 자세 (피격 시 50% 확률)
            skill5_buff: {
              type: "buff",
              originalId: "kumoyama_skill5",
              timerKey: "skill5_timer",
              triggers: ["being_hit"],
              order: 1,
              prob: 0.5,
              duration: 2,
              label: "발동"
            },
            // [패시브5] 수파리・신성 (필살기 시 확정)
            skill7_buff: {
              type: "buff",
              originalId: "kumoyama_skill7",
              timerKey: "skill7_timer",
              phase: "onAttack",
              order: 2,
              condition: "isUlt",
              duration: 1,
              label: "발동"
            },
            // [필살기] 조롱 반격 데미지
                skill2_counter: {
                  type: "hit",
                  originalId: "kumoyama_skill2",
                  valKey: "추가공격",
                  label: "열풍요란 (반격)"
                }
              },
  "locke": {
    normalTrigger: "locke_skill1",
    ultTrigger: "locke_skill2",

    // [패시브3] 분노의 해류 (피격 시 뎀증)
    skill5_buff: {
      type: "buff",
      originalId: "locke_skill5",
      timerKey: "skill5_timer",
      maxStacks: 3,
      duration: 2,
      triggers: ["being_hit"],
      label: "발동",
      order: 1
    },
    // [패시브5] 피의 공명 (조건부 추가타)
    skill7_hit: {
      type: "hit",
      originalId: "locke_skill7",
      valKey: "추가공격",
      label: "피의 공명",
      order: 1
    },
    // [도장] 호혈표지 획득 (평타 시)
    skill8_stamp_stack: {
      type: "buff", 
      originalId: "locke_skill8",
      timerKey: "skill8_timer", // _timer로 끝나야 시간이 줄어듦
      phase: "onAttack",
      condition: ["isNormal", "isStamp", "enemy_hp_50"],
      maxStacks: 2,
      duration: 5,
      label: "획득",
      order: 1
    },
    // [도장] 광야 포격 돌진 (필살기 전용 버프)
    skill8_stamp_buff: {
      type: "buff",
      originalId: "locke_skill8",
      timerKey: "skill8_buff_timer", // 명칭 구분
      phase: "onCalculateDamage", 
      duration: 1, 
      condition: ["isUlt", "isStamp", "hasStack:skill8_timer:2"], // 변경된 스택 이름 참조
      label: "도장 효과",
      order: 1
    }
  },
  "tyrantino": {
    // [패시브4] 용족의 분노 (피격 시 스택)
    fury_stack: {
      type: "stack",
      id: "fury_stacks",
      originalId: "tyrantino_skill4",
      customTag: "용의 분노",      
      maxStacks: 3,
      triggers: ["being_hit"],
      label: "획득",
      order: 1
    },
    // [패시브4] 용족의 분노 (3스택 시 추가타)
    skill4_hit: {
      type: "hit",
      originalId: "tyrantino_skill4",
      triggers: [], 
      phase: "onAttack", 
      condition: ["isUlt", "hasStack:fury_stacks:3"],
      customTag: "용의 분노",      
      isMulti: true, 
      valKey: "추가공격",
      label: "용족의 분노",
      order: 1
    },
    // [패시브4] 용족의 분노 소모
    fury_consume: {
      type: "action",
      stateKey: "fury_stacks", 
      phase: "onAttack",
      order: 2,
      condition: ["isUlt", "hasStack:fury_stacks:3"],
      action: "all_consume",
      label: "용족의 분노"
    },
    // [패시브5] 용의 역린
    skill5_hit: {
      type: "hit",
      originalId: "tyrantino_skill5",
      triggers: [], 
      phase: "onAttack", 
      condition: "hasStack:fear_timer:3", 
      isMulti: true, 
      valKey: "추가공격",
      label: "용의 역린",
      order: 1 
    },
    // [도장] 용족의 위압 부여 (피격 시)
    fear_hit_stack: {
      originalId: "tyrantino_skill2",
      timerKey: "fear_timer",
      triggers: ["being_hit"],
      condition: "isStamp",
      customTag: "용족의 위압", 
      step1: (ctx) => {
        ctx.addTimer("fear_timer", 1, {}, 5);
        // 실제 데이터는 1턴이지만 로그에는 예외적으로 2턴으로 표시
        ctx.log({ name: "용족의 위압", icon: "images/sigilwebp/sigil_tyrantino.webp" }, "apply", null, 2, false, "도장");
        return null;
      },
      order: 2
    },
    // [필살기] 적 데미지 감소 부여 (공격 전)
    dmg_reduce_buff: {
      type: "buff",
      originalId: "tyrantino_skill2",
      timerKey: "dmg_reduce_timer",
      phase: "onCalculateDamage",
      condition: "isUlt",
      duration: 2,
      label: "데미지 감소",
      order: 1
    },
    // [도장] 필살기 시 위압 3중첩 부여 (공격 후)
    fear_ult_stack: {
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      step1: (ctx) => {
        for (let i = 0; i < 3; i++) {
            ctx.addTimer("fear_timer", 2, {}, 5); 
        }
        // 객체로 전달하여 아이콘과 이름 동시 해결
        ctx.log({ name: "용족의 위압 (3중첩)", icon: "images/sigilwebp/sigil_tyrantino.webp" }, "apply", null, 2, false, "도장");
        return null; 
      },
      order: 10 
    },
    // [패시브7] 승리의 Lowball
    skill7_buff: {
      originalId: "tyrantino_skill7",
      timerKey: "dmg_reduce_timer", 
      targetLimit: 1, 
      label: "승리의 Lowball"
    }
  },
  "wang": {
    // [도장] 패란의 영감 버프 (필살기 시 3턴)
    skill2_buff: {
      type: "buff",
      originalId: "wang_skill2",
      timerKey: "skill2_timer",
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      duration: 3,
      label: "부여",
      order: 1
    },
    // [도장] 패란의 영감 추가타 (영감 상태에서 평타 시 확정)
    skill2_hit: {
      type: "hit",
      originalId: "wang_skill2",
      customTag: "필살기",
      triggers: [], // 트리거 중복 차단
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:skill2"],
      valKey: "추가공격",
      label: "패란의 영감",
      order: 2
    },
    // [도장] 패란의 영감 확률 추가타 (영감 상태 + 도장 + 50% 확률)
    skill2_hit_extra: {
      type: "hit",
      originalId: "wang_skill2",
      triggers: [], // 트리거 중복 차단
      phase: "onAttack",
      customTag: "도장",
      condition: ["isNormal", "hasBuff:skill2", "isStamp"],
      prob: 0.5,
      valKey: "추가공격",
      icon: "images/sigilwebp/sigil_wang.webp", 
      label: "패란의 영감",
      order: 3
    },
    // [패시브3] 영감 공명 (피격 시 아군 전체 뎀증)
    skill5_buff: {
      type: "buff",
      originalId: "wang_skill5",
      timerKey: "skill5_timer",
      maxStacks: 2,
      duration: 2,
      triggers: ["being_hit"],
      label: "발동",
      order: 1
    }
  },
  "tamrang": {
    normalTrigger: "tamrang_skill1",
    ultTrigger: "tamrang_skill2",

    // [패시브2] 복숭아꽃 개화 (50% 확률 단일 받뎀증)
    skill4_vuln: {
      type: "buff",
      originalId: "tamrang_skill4",
      timerKey: "skill4_timer",
      maxStacks: 10,
      phase: "onAttack",
      prob: 0.5,
      duration: 2,
      label: "부여",
      order: 1
    },
    // [패시브5] 홍란천희 (필살기 시 전체 받뎀증)
    skill7_vuln: {
      type: "buff",
      originalId: "tamrang_skill7",
      timerKey: "skill7_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 1,
      label: "부여",
      order: 2
    },
    // [도장] 선향욕기 (필살기 시 전체 강력 받뎀증 75%)
    skill8_vuln: {
      type: "buff",
      originalId: "tamrang_skill8",
      timerKey: "skill8_timer",
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      duration: 2, // 1에서 2로 수정
      label: "부여",
      order: 3
    },
    // [필살기] 수면 상태 타이머
    sleep_status: {
      type: "buff",
      originalId: "tamrang_skill2",
      timerKey: "sleep_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 2,
      label: "수면 부여",
      order: 4
    }
  },
  "goldenryder": {
    normalTrigger: "goldenryder_skill1",
    ultTrigger: "goldenryder_skill2",

    // [패시브2] 공격 시 33% 확률로 열화질보 획득
    stride_p2: {
      type: "buff",
      originalId: "goldenryder_skill4",
      timerKey: "blazing_stride_timer",
      maxStacks: 6,
      phase: "onAttack",
      prob: 0.33,
      duration: 2,
      customTag: "열화질보",
      label: "획득",
      order: 5
    },
    // [도장] 공격 시 33% 확률로 열화질보 획득
    stride_stamp: {
      type: "buff",
      originalId: "goldenryder_skill2",
      timerKey: "blazing_stride_timer",
      maxStacks: 6,
      phase: "onAttack",
      condition: "isStamp",
      prob: 0.33,
      duration: 2,
      customTag: "열화질보",
      label: "획득",
      order: 6
    },
    // [패시브5] 공격 시 33% 확률로 열화질보 획득 (75단)
    stride_p5: {
      type: "buff",
      originalId: "goldenryder_skill7",
      timerKey: "blazing_stride_timer",
      maxStacks: 6,
      phase: "onAttack",
      condition: "isUnlocked:6", 
      prob: 0.33,
      duration: 2,
      customTag: "열화질보",
      label: "획득",
      order: 7
    },
    // [패시브3] 피격 시 열화질보 확정 획득
    stride_hit: {
      originalId: "goldenryder_skill5",
      timerKey: "blazing_stride_timer",
      maxStacks: 6,
      triggers: ["being_hit"],
      customTag: "열화질보",
      step1: (ctx) => {
        // 실제 데이터는 2턴(1+1)이 되도록 1 전달
        ctx.addTimer("blazing_stride_timer", 1, {}, 6);
        // 로그에는 2턴으로 표시
        ctx.log(4, "apply", null, 2, false, "열화질보");
        return null;
      },
      order: 1
    },
    // [패시브3] 피격 시 뎀증 부여
    skill5_buff: {
      type: "buff",
      originalId: "goldenryder_skill5",
      timerKey: "skill5_timer",
      triggers: ["being_hit"],
      duration: 1, // 데이터 2턴(1+1)을 위해 1로 수정
      label: "뎀증 부여",
      order: 2
    },
    // 필살기 및 패시브5 버프 타이머
    skill2_timer: {
      type: "buff",
      originalId: "goldenryder_skill2",
      timerKey: "skill2_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 3,
      label: "버프 활성화",
      order: 1
    },
    skill7_timer: {
      type: "buff",
      originalId: "goldenryder_skill7",
      timerKey: "skill7_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 3,
      label: "버프 활성화",
      order: 2
    },
    // [필살기 버프] 보통공격 시 추가타
    skill2_hit: {
      originalId: "goldenryder_skill2",
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:skill2"],
      customTag: "필살기", // 명시적 분류 지정
      step1: (ctx) => {
        const coef = ctx.getVal(1, '추가공격', ctx.stats.stamp);
        return { val: coef, name: "봐, 1등은 간단하지?" };
      },
      order: 10
    },
    // [패시브5 버프] 보통공격 시 추가타
    skill7_hit: {
      type: "hit",
      originalId: "goldenryder_skill7",
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:skill7"],
      customTag: "패시브5", // 명시적 분류 지정
      valKey: "추가공격",
      label: "뜨겁게 달려!",
      order: 11
    }
  },
  "orem": {
    normalTrigger: "orem_skill1",
    ultTrigger: "orem_skill2",

    // [필살기] 현측 방어 전개 (배리어 부여)
    skill2_shield: {
      type: "buff",
      originalId: "orem_skill2",
      timerKey: "shield_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 2,
      label: "배리어 부여",
      order: 1
    },
    // [패시브2] 전함 명령:엄수 (50% 확률 배리어 강화)
    skill4_buff: {
      type: "buff",
      originalId: "orem_skill4",
      timerKey: "skill4_timer",
      phase: "onAttack",
      condition: "isNormal",
      prob: 0.5,
      duration: 3,
      label: "배리어 강화",
      order: 2
    },
    // [도장] 배리어 공격 추가타 (배리어 보유 중 공격 시)
    skill8_hit: {
      type: "hit",
      originalId: "orem_skill8",
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:shield", "isStamp"],
      valKey: "추가공격",
      label: "현측 방어 전개 (추가타)",
      order: 3
    },
    // [패시브5] 충격 역류 (배리어 보유 중 피격 시)
    skill7_hit: {
      type: "hit",
      originalId: "orem_skill7",
      triggers: ["being_hit"],
      condition: "hasBuff:shield",
      valKey: "추가공격",
      label: "충격 역류",
      order: 1
    }
  },
  "jetblack": {
    normalTrigger: "jetblack_skill1",
    ultTrigger: "jetblack_skill2",

    // [스킬1] 출발 신호 (1턴 고정공증 타이머)
    skill1_buff: {
      type: "buff",
      originalId: "jetblack_skill1",
      timerKey: "skill1_timer",
      phase: "onAttack",
      condition: "isNormal",
      duration: 1,
      label: "부여",
      order: 1
    },
    // [필살기] 고요한 호흡 (3턴 버프 타이머)
    skill2_buff: {
      type: "buff",
      originalId: "jetblack_skill2",
      timerKey: "skill2_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 3,
      label: "부여",
      order: 1
    },
    // [패시브2] 체력응축 스택 (자가 획득)
    skill4_stack_self: {
      type: "stack",
      id: "skill4_stacks", 
      originalId: "jetblack_skill4",
      phase: "onAttack",
      condition: "!isDefend",
      maxStacks: 6,
      label: "획득",
      order: 2
    },
    // [도장] 체력응축 스택 (아군 공격 시 획득)
    skill4_stack_ally: {
      type: "stack",
      id: "skill4_stacks", 
      originalId: "jetblack_skill8", // 스킬8(도장)로 변경하여 자동 분류 적용
      triggers: ["ally_attack"],
      condition: "isStamp",
      prob: 0.33,
      maxStacks: 6,
      label: "아군 지원 획득",
      order: 1
    },
    // [패시브2] 체력응축 6스택 필살기 추가타
    skill4_hit: {
      type: "hit",
      originalId: "jetblack_skill4",
      phase: "onAttack",
      condition: ["isUlt", "hasStack:skill4:6"],
      valKey: "추가공격",
      label: "매서운 질주의 길",
      order: 10 // 스택 적립(order 2) 이후에 판정
    },
    // [패시브2] 체력응축 스택 소모
    skill4_consume: {
      type: "action",
      stateKey: "skill4_stacks",
      phase: "onAttack",
      condition: ["isUlt", "hasStack:skill4:6"],
      action: "all_consume",
      label: "체력응축",
      order: 11 
    },
    // [패시브5] 전력 응원 (보통공격 시 상시 추가타)
    skill7_hit: {
      type: "hit",
      originalId: "jetblack_skill7",
      phase: "onAttack",
      condition: "isNormal",
      valKey: "추가공격",
      label: "전력 응원",
      order: 1
    },
    // [패시브3] 마음의 물결 (확률 트리거뎀증)
    skill5_buff: {
      type: "buff",
      originalId: "jetblack_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      condition: "isNormal",
      prob: 0.5,
      duration: 2,
      label: "발동",
      order: 3
    }
  }
};