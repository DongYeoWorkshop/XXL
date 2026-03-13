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
      label: "발동"
    },
    skill4_hit: { 
      type: "hit",
      originalId: "shinrirang_skill4",
      phase: "onAttack",
      order: 2,
      prob: 0.5,
      valKey: "추가공격",
      customTag:"패시브2",
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
      label: "발동"
    },
    skill5_counter: { 
      type: "hit",
      originalId: "shinrirang_skill5",
      phase: "onEnemyHit",
      order: 2,
      valKey: "추가공격",
      triggers: ["being_hit"],
      customTag:"패시브3",
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
      label: "획득"
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
      label: "발동"
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
      maxStacks: 9,
      bonusPerStack: 6, 
      triggers: ["ally_attack"], 
      label: "[전의] 획득",
      prob: 0.5,
      scaleProb: true,
      startRate: 0.64
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
      label: "발동"
    },
    skill5_buff: {
      type: "buff",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend",
      label: "발동"
    },
    skill5_hit: {
      type: "hit",
      originalId: "choiyuhyun_skill5",
      phase: "onAttack",
      order: 1,
      condition: ["!isDefend", "hasBuff:skill5"], 
      valKey: "max",
      label: "신화성신환",
      customTag: "패시브3"
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
      label: "검추백형",
      customTag: "패시브5"
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
      label: "검추백형",
      customTag: "패시브5"
    }
  },
  "codeb": {
    normalTrigger: "codeb_skill1",
    ultTrigger: "codeb_skill2",

    // [패시브3] 월영의 잠행 (유현과 동일 메커니즘)
    skill5_buff: {
      type: "buff",
      originalId: "codeb_skill5",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend",
      label: "발동"
    },
    skill5_hit: {
      type: "hit",
      originalId: "codeb_skill5",
      phase: "onAttack",
      order: 1,
      condition: ["!isDefend", "hasBuff:skill5"], 
      valKey: "max",
      label: "월영의 잠행",
      customTag: "패시브3"
    },

    // [필살기] 황혼 연사 디버프 부여 (매 피격 데미지)
    skill2_debuff: {
      type: "buff",
      originalId: "codeb_skill2",
      timerKey: "skill2_timer",
      duration: 1,
      durationSource: "stamp:2", 
      phase: "onCalculateDamage",
      order: 0,
      condition: "isUlt",
      label: "디버프 부여"
    },

    // [패시브7 -> 도장 효과] 황혼 연사 고정 데미지 (매 피격마다)
    skill8_hit: {
      type: "hit",
      originalId: "codeb_skill8",
      order: 10,
      valKey: "기초공격",
      hitType: "기초공격", // [중요] 공격 타입 명시
      label: "황혼 연사",
      customTag: "필살기"
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
      order: 10, // 메인 필살기보다 뒤에 나오도록 설정
      condition: ["isUlt", "isStamp", "hasStack:scar_stacks:1"], 
      valKey: "추가공격",
      label: "쇄강 파공격",
      customTag: "도장"      
    },
    // [필살기] 각흔 부여 (아누비로스 스타일)
    skill2_scar_apply: {
      type: "action",
      order: 99,
      step1: (c) => {
          c.simState.scar_stacks = 1;
          c.log({ name: "쇄강파 공격 [각흔]", icon: "icon/attack(strong).webp" }, "apply", null, null, false, "필살기");
          return null;
      }
    },
    // [필살기] 각흔 소모 (도장 데미지 통합형)
    skill2_scar_consume: {
      type: "action",
      order: 99,
      step1: (c) => {
          let hitData = null;
          // [추가] 각흔 소모 시 도장이 있다면 데미지 데이터 준비
          if (c.stats.stamp) {
              hitData = {
                  type: "추가공격",
                  val: c.getVal(c.getSkillIdx("baade_skill8"), "추가공격"),
                  name: "쇄강 파공격",
                  customTag: "도장",
                  icon: "images/sigilwebp/sigil_baade.webp"
              };
          }
          
          c.simState.scar_stacks = 0;
          c.log({ name: "쇄강파 공격 [각흔]", icon: "icon/attack(strong).webp" }, "consume", null, null, false, "필살기");
          
          return hitData; // 도장 데미지가 있으면 반환하여 즉시 실행
      }
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
      customTag: "패시브2",
      label: "디버프 부여"
    },
    skill5_buff: {
      type: "buff",
      originalId: "khafka_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      order: 2,
      duration: 2,
      condition: "isDefend",
      customTag: "패시브3",
      label: "디버프 부여"
    },
    skill7_buff: {
      type: "buff",
      originalId: "khafka_skill7",
      timerKey: "skill7_timer",
      phase: "onAttack",
      order: 3,
      duration: 1,
      condition: "isUlt",
      customTag: "패시브5",
      label: "디버프 부여"
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
        label: "디버프 부여",
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
            customTag: "도장",            
            order: 3
          },      // [패시브2] 흑구 깨우기 (공격 단계 최하단)
      black_dog: {
        type: "buff",
        originalId: "anuberus_skill4",
        timerKey: "skill4_black_timer",
        // phase 제거
        order: 98,
        prob: 0.5,
        scaleProb: true,
        duration: 2,
        customTag: "흑구",
        label: "[흑구] 발동"
      },
      // [패시브2] 백구 깨우기 (공격 단계 최하단)
      white_dog: {
        type: "buff",
        originalId: "anuberus_skill4",
        timerKey: "skill4_white_timer",
        // phase 제거
        order: 99,
        prob: 0.5,
        scaleProb: true,
        duration: 2,
              customTag: "백구",
              label: "[백구] 발동"
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
                  triggers: ["being_hit"],
                  condition: "hasBuff:skill2_taunt",
                  originalId: "kumoyama_skill2",
                  step1: (ctx) => {
                    const isM = !!ctx.stats.stamp;
                    const coef = ctx.getVal(1, '추가공격', isM);
                    return { val: coef, isMulti: isM, name: "열풍요란", customTag: "필살기" };
                  },
                  order: 10
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
      customTag: "패시브5",  
      order: 1
    },
    // [도장] 호혈표지 획득 (평타 시)
    skill8_stamp_stack: {
      type: "buff", 
      originalId: "locke_skill8",
      timerKey: "blood_mark_timer", 
      phase: "onAttack",
      condition: ["isNormal", "isStamp", "enemy_hp_50"],
      maxStacks: 2,
      duration: 5,
      label: "[호혈표지] 획득",
      customTag: "도장",        
      order: 1
    },
    // [도장] 광야 포격 돌진 (필살기 전용 버프)
    skill8_stamp_buff: {
      type: "buff",
      originalId: "locke_skill8",
      timerKey: "skill8_buff_timer", 
      phase: "onCalculateDamage", 
      duration: 1, 
      condition: ["isUlt", "isStamp", "hasStack:blood_mark_timer:2"], 
      label: "발동",
      customTag: "도장",
      skipLog: true, // 로그 숨김 추가
      order: 1
    }
  },
  "tyrantino": {
    // [패시브4] 용족의 분노 (피격 시 스택)
    fury_stack: {
      type: "stack",
      id: "fury_stacks",
      originalId: "tyrantino_skill4",
      customTag: "패시브2",      
      maxStacks: 3,
      triggers: ["being_hit"],
      label: "[용의 분노] 획득",
      order: 1
    },
    // [패시브4] 용족의 분노 (3스택 시 추가타)
    skill4_hit: {
      type: "hit",
      originalId: "tyrantino_skill4",
      triggers: [], 
      phase: "onAttack", 
      condition: ["isUlt", "hasStack:fury_stacks:3"],
      customTag: "패시브2",      
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
      label: "용족의 분노 [용의 분노]",
      customTag: "패시브2",
      icon: "icon/passive2.webp"
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
      customTag: "패시브5",
      order: 3
    },
    // [도장] 필살기 위압 부여 및 로그 (순서 조정용)
    fear_ult_log: {
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      step1: (ctx) => {
        // 실제 스택 수급
        for (let i = 0; i < 3; i++) {
            ctx.addTimer("fear_timer", 2, {}, 5); 
        }
        // [수정] 스킬 이름과 겹치지 않게 메시지만 전달
        ctx.log(ctx.getSkillIdx("tyrantino_skill2"), "[용족의 위압] 3중첩 부여", null, null, false, "도장");
        return null;
      },
      order: 99
    },
    // [도장] 용족의 위압 부여 (피격 시)
    fear_hit_buff: {
      type: "buff",
      originalId: "tyrantino_skill2",
      timerKey: "fear_timer",
      triggers: ["being_hit"],
      condition: "isStamp",
      duration: 1, // 2턴 유지를 위해 1로 설정 (+1 보정)
      maxStacks: 5,
      label: "[용족의 위압] 부여",
      skipDurLog: true,
      customTag: "도장",
      icon: "images/sigilwebp/sigil_tyrantino.webp",
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
      label: "디버프 부여",
      order: 1
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
      label: "버프 부여",
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
      label: "버프 부여",
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
      maxStacks: 1,
      phase: "onAttack",
      prob: 0.5,
      duration: 2,
      label: "디버프 부여",
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
      label: "디버프 부여",
      order: 2
    },
    // [도장] 선향욕기 (필살기 시 전체 강력 받뎀증 75%)
    skill8_vuln: {
      type: "buff",
      originalId: "tamrang_skill8",
      timerKey: "skill8_timer",
      // phase 제거 (수동 발동)
      prob: 0.4,
      scaleProb: true,
      startRate: 0.73,
      duration: 2,
      label: "디버프 부여",
      order: 3
    },
    // [필살기] 수면 상태 타이머
    sleep_status: {
      type: "buff",
      originalId: "tamrang_skill2",
      timerKey: "sleep_timer",
      // phase 제거 (수동 발동)
      prob: 0.4,
      scaleProb: true,
      startRate: 0.73,
      duration: 2,
      label: "[수면] 부여",
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
      label: "[열화질보] 획득",
      skipDurLog: true,
      customTag: "패시브2",
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
      label: "[열화질보] 획득", // 사용자 커스텀 라벨 유지
      skipDurLog: true,
      customTag: "도장",
      icon: "images/sigilwebp/sigil_goldenryder.webp",
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
      label: "불타오른다——! [열화질보] 획득",
      skipDurLog: true,
      customTag: "패시브5",
      order: 7
    },
    // [패시브3] 피격 시 열화질보 확정 획득
    skill5_stack: {
      type: "buff",
      originalId: "goldenryder_skill5",
      timerKey: "blazing_stride_timer",
      triggers: ["being_hit"],
      duration: 1,
      maxStacks: 6,
      label: "[열화질보] 획득",
      skipDurLog: true,
      customTag: "패시브3",
      order: 1
    },
    // [패시브3] 피격 시 뎀증 부여
    skill5_buff: {
      type: "buff",
      originalId: "goldenryder_skill5",
      timerKey: "skill5_timer",
      triggers: ["being_hit"],
      duration: 1,
      label: "발동 (2턴)",
      skipDurLog: true,
      customTag: "패시브3",
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
      label: "발동",
      order: 1
    },
    skill7_timer: {
      type: "buff",
      originalId: "goldenryder_skill7",
      timerKey: "skill7_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 3,
      label: "발동",
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
      label: "[배리어] 부여",
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
      label: "발동",
      order: 2
    },
    // [도장] 배리어 공격 추가타 (배리어 보유 중 공격 시)
    skill8_hit: {
      type: "hit",
      originalId: "orem_skill8",
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:shield", "isStamp"],
      valKey: "추가공격",
      label: "현측 방어 전개",
      customTag: "도장",        
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
      customTag: "패시브5",        
      order: 1
    }
  },
  "famido": {
    normalTrigger: "famido_skill1",
    ultTrigger: "famido_skill2",

    // [스킬2] 필살기 사용 시 기초공증 (2턴)
    skill2_buff: {
      type: "buff",
      originalId: "famido_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage",
      condition: "isUlt",
      duration: 2,
      label: "발동",
      valKey: 0,
      order: 1
    },
    // [필살기 도장] 공격력 가산 (2턴)
    skill2_fixed_buff: {
      type: "buff",
      originalId: "famido_skill8", 
      timerKey: "skill2_fixed_timer",
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      duration: 2,
      label: "공격력 가산", 
      valKey: 0, 
      showAtkBoost: true,
      order: 5
    },
    // [스킬4] 방어 시 기초공증 (2턴)
    skill4_buff: {
      type: "buff",
      originalId: "famido_skill4",
      timerKey: "skill4_timer",
      phase: "onAttack",
      condition: "isDefend",
      duration: 2,
      label: "발동",
      valKey: 0,
      order: 1
    },
        // [스킬4] 전술 판독 3스택 이상 시 가산 버프 부여 (공격 시 소모)
        skill4_fixed_buff: {
          type: "buff",
          originalId: "famido_skill4",
          timerKey: "skill4_boost_timer",
          phase: "onAttack",
          condition: ["!isDefend", "hasStack:tactical_stacks:3"],
          duration: 2,
          label: "공격력 가산", // '버프 부여'에서 변경
          valKey: 1, // calc[1]
          showAtkBoost: true,
          customTag: "패시브2",
          order: 6
        },
        skill4_consume: {
          type: "action",
          stateKey: "tactical_stacks",
          phase: "onAttack",
          condition: ["!isDefend", "hasStack:tactical_stacks:3"],
          action: "all_consume",
          label: "롱 패스 준비 [전술 판독]",
          customTag: "패시브2",
          icon: "icon/passive2.webp",
          order: 7
        },    // [스킬5] 아군 피격 시 기초공증 (최대 4중첩)
    skill5_buff: {
      type: "buff",
      originalId: "famido_skill5",
      timerKey: "skill5_timer",
      triggers: ["ally_hit"],
      duration: 2,
      maxStacks: 4,
      label: "발동",
      order: 1
    }
  },
  "rikano": {
    normalTrigger: "rikano_skill1",
    ultTrigger: "rikano_skill2",

    // [스킬1] 보통공격 받뎀증 디버프 (2턴)
    skill1_debuff: {
      type: "buff",
      originalId: "rikano_skill1",
      timerKey: "skill1_timer",
      phase: "onCalculateDamage",
      condition: "isNormal",
      duration: 2,
      label: "디버프 부여",
      order: 1
    },
    // [스킬2] 필살기 받뎀증 디버프 (2턴)
    skill2_debuff: {
      type: "buff",
      originalId: "rikano_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage",
      condition: "isUlt",
      duration: 2,
      label: "디버프 부여",
      order: 1
    },
    // [스킬8] 필살기 사용 시 추가 받뎀증 (1턴)
    skill8_debuff: {
      type: "buff",
      originalId: "rikano_skill8",
      timerKey: "skill8_timer",
      phase: "onAttack",
      condition: "isUlt",
      duration: 1,
      label: "디버프 부여",
      order: 5
    },
    // [스킬5] 필살기 추가타 1
    skill5_hit1: {
      type: "hit",
      originalId: "rikano_skill5",
      phase: "onAttack",
      condition: "isUlt",
      hitType: "필살공격",
      valIdx: 0,
      label: "매력 발산",
      customTag:"패시브3",      
      order: 10
    },
    // [스킬5] 필살기 추가타 2
    skill5_hit2: {
      type: "hit",
      originalId: "rikano_skill5",
      phase: "onAttack",
      condition: "isUlt",
      hitType: "필살공격",
      valIdx: 0,
      label: "매력 발산",
      customTag:"패시브3",      
      order: 11
    }
  },
  "duncan": {
    normalTrigger: "duncan_skill1",
    ultTrigger: "duncan_skill2",

    // [스킬2] 필살기 공증 (1턴)
    skill2_buff: {
      type: "buff",
      originalId: "duncan_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage",
      condition: "isUlt",
      duration: 1,
      label: "버프 부여",
      order: 2
    },
    // [도장] 필살기 사용 시 [마도 집중] 획득
    skill8_gain: {
      type: "stack",
      id: "skill8_stacks",
      originalId: "duncan_skill8",
      phase: "onAttack",
      condition: ["isUlt", "isStamp"],
      maxStacks: 2,
      customTag:"도장",
      label: "[마도 집중] 획득",
      order: 90 // 공격 처리 후에 획득하도록 뒤로 미룸
    },
    // [도장] 공격 시 [마도 집중] 소모
    skill8_consume: {
      type: "action",
      stateKey: "skill8_stacks",
      phase: "onAttack",
      condition: ["!isDefend", "hasStack:skill8:2"],
      action: "all_consume",
      label: "지팡이보다 먹힌다구! [마도 집중]",
      customTag:"도장",
      order: 1 // 공격 시작 시점에 이미 2스택이면 바로 소모 처리 (하지만 버프는 이번 공격까지 유지됨)
    },
    // [스킬4] 보통공격 시 확정 공증 (2턴)
    skill4_buff: {
      type: "buff",
      originalId: "duncan_skill4",
      timerKey: "skill4_timer",
      phase: "onAttack",
      condition: "isNormal",
      duration: 2,
      label: "버프 부여",
      order: 2
    },
    // [스킬9] 보통공격 시 확률 공증 (2턴)
    skill9_buff: {
      type: "buff",
      originalId: "duncan_skill9",
      timerKey: "skill9_timer",
      phase: "onAttack",
      condition: "isNormal",
      prob: 0.5,
      duration: 2,
      label: "버프 부여",
      order: 3
    },
    // [스킬5] 방어 시 보통공격 데미지 부여
    skill5_buff: {
      type: "buff",
      originalId: "duncan_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      condition: "isDefend",
      duration: 2,
      label: "발동",
      order: 1
    },
    // [스킬5] 방어 버프 상태 시 보통공격 추가타
    skill5_hit: {
      type: "hit",
      originalId: "duncan_skill5",
      phase: "onAttack",
      condition: ["isNormal", "hasBuff:skill5"],
      hitType: "보통공격", // 추가타지만 보통공격 판정 (평타뎀증 적용)
      valKey: 0,
      label: "저격 전의 정적",
      order: 0
    },
  },
  "rutenix": {
    normalTrigger: "rutenix_skill1",
    ultTrigger: "rutenix_skill2",

    // [스킬2] 앵커 혼란 (고정공증 부여)
    skill2_buff: {
      type: "buff",
      originalId: "rutenix_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage",
      condition: ["isUlt", "self_buff_mode"],
      duration: 1, // 아군 부여는 1턴임
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      order: 2
    },
    // [스킬4] 보통공격 시 기초공증 (최대 2중첩)
    skill4_buff: {
      type: "buff",
      originalId: "rutenix_skill4",
      timerKey: "skill4_timer",
      phase: "onAttack",
      condition: "isNormal",
      prob: 0.5,
      duration: 3,
      maxStacks: 2,
      label: "발동",
      order: 1
    },
    // [스킬5] 피격 시 기초공증 (1중첩)
    skill5_buff: {
      type: "buff",
      originalId: "rutenix_skill5",
      timerKey: "skill5_timer",
      triggers: ["being_hit"],
      duration: 1,
      label: "발동",
      order: 1
    },
    // [스킬7] 아군 보통공격 시 기초공증 (최대 4중첩)
    skill7_buff: {
      type: "buff",
      originalId: "rutenix_skill7",
      timerKey: "skill7_timer",
      triggers: ["ally_attack"],
      prob: 0.5,
      duration: 2,
      maxStacks: 4,
      label: "발동",
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
      phase: "onCalculateDamage", // 공격 전 미리 적용
      condition: "isNormal",
      duration: 1,
      label: "버프 부여",
      valKey: "max",
      showAtkBoost: true,
      order: 1
    },
    // [필살기] 고요한 호흡 (3턴 버프 타이머)
    skill2_buff: {
      type: "buff",
      originalId: "jetblack_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage", // 공격 전 미리 적용
      condition: "isUlt",
      duration: 3,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      order: 1
    },
    // [패시브2] 체력응축 스택 (자가 획득)
    skill4_stack_self: {
      type: "stack",
      id: "skill4_stacks", 
      originalId: "jetblack_skill4",
      phase: "onAttack",
      condition: "isNormal",
      maxStacks: 6,
      label: "[체력응축] 획득",
      customTag: "패시브2",
      order: 4
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
      label: "[체력응축] 획득",
      customTag: "도장",
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
      customTag: "패시브2",
      order: 10 
    },
    // [패시브2] 체력응축 스택 소모
    skill4_consume: {
      type: "action",
      stateKey: "skill4_stacks",
      phase: "onAttack",
      condition: ["isUlt", "hasStack:skill4:6"],
      action: "all_consume",
      label: "매서운 질주의 길 [체력응축]",
      customTag: "패시브2",
      icon: "icon/passive2.webp",
      order: 11 
    },
    // [패시브5] 전력 응원 (보통공격 시 상시 추가타)
    skill7_hit: {
      type: "hit",
      originalId: "jetblack_skill7",
      phase: "onAttack",
      condition: "isNormal",
      valKey: "추가공격",
      customTag:"패시브5",      
      label: "전력 응원",
      order: 3
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
      label: "버프 부여",
      order: 2
    }
  },
  "beernox": {
    normalTrigger: "beernox_skill1",
    ultTrigger: "beernox_skill2",

    // [스킬1] 보통공격 시 고정공증 부여 (1턴)
    skill1_buff: {
      type: "buff",
      originalId: "beernox_skill1",
      timerKey: "skill1_timer",
      phase: "onCalculateDamage", // 공격 전 미리 적용
      condition: "isNormal",
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      order: 1
    },
    // [필살기] 임박 상품 쟁탈전 (1턴)
    skill2_buff: {
      type: "buff",
      originalId: "beernox_skill2",
      timerKey: "skill2_timer",
      phase: "onCalculateDamage", // 공격 전 미리 적용
      condition: "isUlt",
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      order: 1
    },
    // [도장] 필살기 확률 2배 효과 (추가 가산으로 구현)
    skill2_stamp_buff: {
      type: "buff",
      originalId: "beernox_skill2", // 스탬프 패시브 대신 실제 수치가 있는 스킬2를 참조
      timerKey: "skill2_stamp_timer",
      phase: "onCalculateDamage", // 공격 전 미리 적용
      condition: ["isUlt", "isStamp"],
      prob: 0.33,
      duration: 1,
      label: "필살기 2배 발동!",
      icon: "images/sigilwebp/sigil_beernox.webp", // 도장 이미지 추가
      valKey: 0,
      showAtkBoost: true,
      customTag: "도장",
      order: 2
    }
  },
  "bossren": {
    // [스킬1] 지정 조련 (평타 시 고정공증 1턴)
    skill1_buff: {
      type: "buff",
      originalId: "bossren_skill1",
      timerKey: "skill1_timer",
      condition: "!isDefend", // [수정] 필살기 시에도 발동
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      customTag: "보통공격",
      order: 1
    },
    // [패시브2] 순종 교육 (공격 시 고정공증 1턴)
    skill4_buff: {
      type: "buff",
      originalId: "bossren_skill4",
      timerKey: "skill4_timer",
      condition: "!isDefend", // [수정] 필살기 시에도 발동
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      customTag: "패시브2",
      order: 2
    },
    // [패시브5] 최고의 보상 (평타 시 뎀증 1턴)
    skill7_buff: {
      type: "buff",
      originalId: "bossren_skill7",
      timerKey: "skill7_timer",
      condition: "!isDefend",
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      customTag: "패시브5",
      order: 3
    },
    // [패시브2-확률] 순종 교육 추가 가산 (50% 확률)
    skill8_buff: {
      type: "buff",
      originalId: "bossren_skill8",
      timerKey: "skill8_timer",
      condition: "!isDefend",
      prob: 0.5,
      duration: 1,
      label: "버프 부여",
      valKey: 0,
      showAtkBoost: true,
      customTag: "패시브2",
      order: 4
    }
  },
  "yuzhan": {
    normalTrigger: "yuzhan_skill1",
    ultTrigger: "yuzhan_skill2",

    // [패시브3] 화약 장전 (방어 시 2턴 간 트리거뎀증)
    skill5_buff: {
      type: "buff",
      originalId: "yuzhan_skill5",
      timerKey: "skill5_timer",
      phase: "onAttack",
      order: 1,
      duration: 2,
      condition: "isDefend",
      label: "발동"
    },
    // [패시브5] 최고의 불꽃 (화약 3스택 시 뎀증)
    skill7_buff: {
      originalId: "yuzhan_skill7",
      label: "최고의 불꽃"
    }
  },
};