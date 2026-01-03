// sim_data.js
import { getSkillMultiplier } from './formatter.js';
import { simParams } from './sim_params.js';

export const simCharData = {
    "shinrirang": {
      commonControls: ["normal_hit_prob"],
      initialState: {
          skill7_stacks: 0,
          skill4_timer: 0,
          skill8_timer: 0,
          skill5_timer: []
      },
      onTurn: (ctx) => {},
      onCalculateDamage: (ctx) => {
          return { extraHits: [] };
      },
      onAttack: (ctx) => {
          // [자동화] 모든 스킬(4, 8번)은 sim_params 설정을 통해 엔진이 자동으로 처리합니다.
          return { extraHits: [] };
      },
      onEnemyHit: (ctx) => {
          // [자동화] 스킬 5번(반격)은 sim_params 설정을 통해 엔진이 자동으로 처리합니다.
          return { extraHits: [] };
      },
      getLiveBonuses: (ctx) => {
        const p = simParams.shinrirang;
        const bonuses = { "뎀증": 0, "공증": 0, "트리거뎀증": 0 };
        bonuses["공증"] += (ctx.simState.skill7_stacks || 0) * ctx.getVal(6, '공증');
        bonuses["뎀증"] += (ctx.simState.skill5_timer || []).length * ctx.getVal(4, '뎀증');

        if (ctx.simState.skill4_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(3, '트리거뎀증');
        if (ctx.simState.skill8_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(7, '트리거뎀증', true);

        return bonuses;
    }
  },
  "tayangsuyi": {
    commonControls: ["ally_warrior_debuffer_count", "ally_ult_count"],
    initialState: {
        skill4_spirit_stacks: 0,
        skill5_timer: 0,
        skill7_timer: []
    },

    onTurn: (ctx) => {
        const p = simParams.tayangsuyi;
        // [패시브2] 아군 캐릭터 수만큼 전의 획득 이벤트 발생
        if (!ctx.isAllyUltTurn) {
            const allyCount = ctx.customValues.ally_warrior_debuffer_count || 0;
            
            // 엔진이 sim_params 설정을 보고 확률 체크를 하므로, 여기서는 횟수만큼 트리거만 실행
            for (let i = 0; i < allyCount; i++) {
                ctx.checkStackTriggers("ally_attack");
            }
        } 
        // [패시브5] 아군 필살기 횟수만큼 궐기 버프 이벤트 발생
        else {
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            for (let i = 0; i < allyUltCount; i++) {
                ctx.checkBuffTriggers("ally_ult");
            }
        }
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    onAttack: (ctx) => {
        return { extraHits: [] };
    },
    onEnemyHit: (ctx) => {
        return { extraHits: [] };
    },
    onAfterAction: (ctx) => {
        // [자동화] 워밍업 함성 및 전의 소모는 sim_params 설정을 통해 엔진이 자동으로 처리합니다.
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const p = simParams.tayangsuyi;
        const bonuses = { "뎀증": 0, "공증": 0, "평타뎀증": 0, "필살기뎀증": 0 };
        
        // [패시브2] 전의 중첩당 필살기 뎀증
        const spiritStacks = Number(ctx.simState.skill4_spirit_stacks) || 0;
        const bonusPerStack = (p && p.skill4_spirit && p.skill4_spirit.bonusPerStack) ? p.skill4_spirit.bonusPerStack : 6;
        bonuses["필살기뎀증"] += spiritStacks * bonusPerStack;

        // [패시브5] 궐기 중첩당 필살기 뎀증 (1턴 지속 중첩 버프)
        const gweolgiTimer = ctx.simState.skill7_timer;
        const gweolgiStacks = Array.isArray(gweolgiTimer) ? gweolgiTimer.length : (gweolgiTimer > 0 ? 1 : 0);
        bonuses["필살기뎀증"] += gweolgiStacks * ctx.getVal(6, '필살기뎀증');

        // [패시브3] 워밍업 함성 (평타 뎀증)
        if (!ctx.isUlt && ctx.simState.skill5_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        // [도장] 9중첩 보너스 (데이터 기반 조건 체크)
        if (ctx.checkCondition(p.skill8_stamp.condition)) {
            bonuses["뎀증"] += p.skill8_stamp.bonus; 
        }

        return bonuses;
    }
  },
  "choiyuhyun": {
    commonControls: ["hp_100_prob"],
    onTurn: (ctx) => {}, // 엔진이 p.skill4_buff (onTurn) 자동 처리
    onCalculateDamage: (ctx) => {
        return { extraHits: [] }; // 엔진이 p.test_debuff (setup) 자동 처리
    },
    onAttack: (ctx) => {
        return { extraHits: [] }; // 엔진이 p.skill5_hit, p.skill5_buff, p.skill7_hit 등을 자동 처리
    },
    onEnemyHit: (ctx) => {
        return { extraHits: [] };
    },
    onAfterAction: (ctx) => {
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };
        
        // 1. [패시브2] HP 100% 시 데미지 증가
        if (ctx.simState.skill4_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(3, '뎀증');
        }

        // 2. [도장] 적 5명 이상 시 데미지 증가
        if (ctx.stats.stamp && ctx.targetCount >= 5) {
            bonuses["뎀증"] += ctx.getVal(7, '뎀증', true);
        }

        return bonuses;
    }
  },
  "baade": {
    commonControls: [],
    initialState: {
        scar_stacks: 0, // params 연동을 위해 스택(숫자)으로 관리
        skill7_timer: 0
    },
    // 1. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        const hasScar = ctx.simState.scar_stacks > 0;

        if (!ctx.isUlt) {
            // [보통공격] 각흔 대상 평타 시 트리거 발동
            if (hasScar) {
                ctx.checkBuffTriggers("attack_on_scar");
            }
        }
        // 필살기 시 각흔 상태 변경은 추가타 판정을 위해 onAfterAction으로 지연시킴
        return { extraHits };
    },
    
    // 2. 행동 종료 후 (상태 갱신)
    onAfterAction: (ctx) => {
        if (ctx.isUlt) {
            const hasScar = ctx.simState.scar_stacks > 0;
            if (hasScar) {
                // 각흔 소모 (패시브4 조건: 필살기로 타격 시 해제)
                ctx.simState.scar_stacks = 0;
                ctx.log("각흔", "consume");
            } else {
                // 각흔 부여
                ctx.simState.scar_stacks = 1;
                ctx.log("각흔", "apply");
            }
        }
        return { extraHits: [] };
    },

    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "평타뎀증": 0, "필살기뎀증": 0 };
        const hasScar = ctx.simState.scar_stacks > 0;

        if (hasScar) {
            // [패시브2] 그리움의 사랑 자장가: 각흔 대상 필살기 뎀증
            bonuses["필살기뎀증"] += ctx.getVal(3, '필살기뎀증');
            // [패시브4] 광맥 직감: 각흔 대상 평타 뎀증
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        // [패시브5] 집중 분쇄: 버프 상태일 때 필살기 뎀증
        if (ctx.simState.skill7_timer > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "khafka": {
    commonControls: ["is_paralysis_immune"],
    onTurn: (ctx) => {}, 
    onAttack: (ctx) => {
        return { extraHits: [] }; 
    },
    onAfterAction: (ctx) => {
        return { extraHits: [] }; 
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증디버프": 0, "필살기뎀증": 0 };

        // [패시브2] 긴박 공감
        if (ctx.simState.skill4_timer > 0) {
            bonuses["뎀증디버프"] += ctx.getVal(3, '뎀증디버프');
        }
        // [패시브3] 밧줄 낙인
        if (ctx.simState.skill5_timer > 0) {
            bonuses["뎀증디버프"] += ctx.getVal(4, '뎀증디버프');
        }
        // [패시브5] 급습 밧줄
        if (ctx.simState.skill7_timer > 0) {
            bonuses["뎀증디버프"] += ctx.getVal(6, '뎀증디버프');
        }

        // [도장/특수] 긴박 공감[마비]: 마비 면역 대상 필살기 뎀증
        if (ctx.isUlt && ctx.customValues.is_paralysis_immune) {
            bonuses["필살기뎀증"] += ctx.getVal(7, '필살기뎀증', true);
        }

        return bonuses;
    }
  },
  "anuberus": {
    commonControls: [],
    initialState: {
        skill4_black_timer: 0,
        skill4_white_timer: 0,
        skill4_timer: [], // 속성디버프
        skill5_timer: []  // 사냥개 스택
    },
    // 1. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        if (ctx.isDefend) return { extraHits };
        const p = simParams.anuberus;

        // [순서 1] 필살기 시 '기존' 사냥개 스택 비례 추가타 (패시브3)
        const currentStacks = ctx.simState.skill5_timer.length;
        if (ctx.isUlt && currentStacks > 0) {
            extraHits.push({
                skillId: "anuberus_skill5",
                name: "유령의 심장 심판",
                coef: currentStacks * ctx.getVal(4, '추가공격'),
                order: 1 // 가장 먼저 실행
            });
        }

        // [순서 2] 개의 협공 (공격 시점에 개가 이미 깨어있는지 체크)
        const isBlackAwake = ctx.simState.skill4_black_timer > 0;
        const isWhiteAwake = ctx.simState.skill4_white_timer > 0;

        // 깨어있는 개마다 파라미터 설정을 extraHits에 담아 반환
        if (isBlackAwake) {
            extraHits.push(p.skill4_vuln, p.skill5_stack);
            if (ctx.stats.stamp) extraHits.push(p.skill8_hit);
        }
        if (isWhiteAwake) {
            extraHits.push(p.skill4_vuln, p.skill5_stack);
            if (ctx.stats.stamp) extraHits.push(p.skill8_hit);
        }

        return { extraHits };
    },
    
    // 2. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "속성디버프": 0, "필살기뎀증": 0 };

        // [패시브2] 속성디버프 합산
        if (ctx.simState.skill4_timer.length > 0) {
            bonuses["속성디버프"] += ctx.simState.skill4_timer.length * ctx.getVal(3, '속성디버프');
        }

        // [패시브6] 무음모드 해제: 깨어있는 개 수에 비례한 필살기 뎀증
        const activeDogs = (ctx.simState.skill4_black_timer > 0 ? 1 : 0) + (ctx.simState.skill4_white_timer > 0 ? 1 : 0);
        if (activeDogs > 0) {
            bonuses["필살기뎀증"] += activeDogs * ctx.getVal(6, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "goldenryder": {
    commonControls: ["hit_prob"],
    initialState: {
        // [수정] 2턴까지 유지되도록 초기값을 3으로 설정
        blazing_stride_timer: [3, 3, 3, 3, 3, 3], 
        skill2_timer: 0,
        skill5_timer: 0,
        skill7_timer: 0
    },
    
    onAttack: (ctx) => {
        // 모든 추가타 로직은 sim_params.js에서 자동 처리됨
        return { extraHits: [] };
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "평타뎀증": 0 };
        
        // 1. 열화질보 중첩당 평타 뎀증 (중첩당 10%)
        const strideCount = ctx.simState.blazing_stride_timer.length;
        bonuses["평타뎀증"] += strideCount * ctx.getVal(3, '평타뎀증');

        // 2. 필살기 버프 자체 평타 뎀증 (50%)
        if (!ctx.isUlt && ctx.simState.skill2_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(1, '평타뎀증', true);
        }

        // 3. 피격 뎀증 (20%)
        if (ctx.simState.skill5_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        }

        return bonuses;
    }
  },
  "tyrantino": {
    commonControls: ["hit_prob"],
    initialState: {
        fury_stacks: 0,      // 이름 복구
        fear_timer: [],      // 이름 복구
        dmg_reduce_timer: 0  // 이름 복구
    },
    
    // 1. 공격 준비 (데미지 계산 전)
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },

    // 2. 공격
    onAttack: (ctx) => {
        // 모든 추가타 로직은 sim_params.js에서 자동 처리됨
        return { extraHits: [] };
    },

    onAfterAction: (ctx) => {
        return { extraHits: [] };
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };
        const p = simParams.tyrantino;
        
        // [패시브7] 승리의 Lowball: 적에게 뎀감 효과 있을 시 뎀증
        // 1명에게만 유효한 효과이므로 getWeightedVal을 통해 가중치(1/N) 적용
        if (ctx.isUlt || ctx.simState.dmg_reduce_timer > 0) {
            bonuses["뎀증"] += ctx.getWeightedVal(p.skill7_buff, '뎀증');
        }

        return bonuses;
    }
  },
  "tamrang": {
    commonControls: [],
    customControls: [
        { id: "self_sleep_active", type: "toggle", label: "수면버프 자가적용", initial: false, description: "체크 시 아군이 소비하지 않은 디버프를 본인이 다음 턴에 직접 사용합니다." }
    ],
    initialState: {
        sleep_timer: 0,
        skill4_timer: [], // 패시브2
        skill7_timer: 0,  // 패시브5 (전체)
        skill8_timer: 0,  // 도장 (전체)
        consume_next: false
    },
    
    onAttack: (ctx) => {
        // [특수] 자가적용 시 수면 소모 예약
        if (!ctx.isUlt && ctx.simState.sleep_timer > 0 && ctx.customValues.self_sleep_active) {
            ctx.simState.consume_next = true;
        }
        return { extraHits: [] };
    },

    onAfterAction: (ctx) => {
        // [특수] 자가적용 로직 유지
        if (ctx.isUlt) {
            if (!ctx.customValues.self_sleep_active) {
                // 자가적용 안하면 즉시 아군이 쓴걸로 침
                ctx.simState.sleep_timer = 0;
                ctx.simState.skill8_timer = 0;
                ctx.log("-아군의 디버프 소비-");
            }
        }
        if (ctx.simState.consume_next) {
            ctx.simState.sleep_timer = 0;
            ctx.simState.skill8_timer = 0;
            ctx.simState.consume_next = false;
            ctx.log("수면/도장디버프", "consume");
        }
        return { extraHits: [] };
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "뎀증디버프": 0 };
        const p = simParams.tamrang;

        // 1. 패시브2 (단일 받뎀증) -> 가중치 적용
        if (ctx.simState.skill4_timer.length > 0) {
            bonuses["뎀증디버프"] += ctx.getWeightedVal(p.skill4_vuln, '뎀증디버프');
        }

        // 2. 패시브5 & 도장 (전체 받뎀증) -> getVal로 100% 적용
        if (ctx.simState.skill7_timer > 0) {
            bonuses["뎀증디버프"] += ctx.getVal(6, '뎀증디버프');
        }
        if (ctx.simState.skill8_timer > 0) {
            bonuses["뎀증디버프"] += 75; // 도장 75% 고정값
        }

        // 3. 패시브4 (수면 대상 뎀증) -> 가중치 적용
        if (ctx.simState.sleep_timer > 0) {
            const baseVal = ctx.getVal(4, '뎀증');
            bonuses["뎀증"] += baseVal * (1 / ctx.targetCount);
        }

        return bonuses;
    }
  },
  "wang": {
    commonControls: ["hit_prob"],
    initialState: {
        skill2_timer: 0,
        skill5_timer: [] // 피격 시 뎀증 (최대 2중첩)
    },
    onAttack: (ctx) => {
        // 모든 추가타 로직은 sim_params.js에서 자동 처리됨
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };
        // [패시브3] 피격 시 뎀증 합산
        if (ctx.simState.skill5_timer.length > 0) {
            bonuses["뎀증"] += ctx.simState.skill5_timer.length * ctx.getVal(4, '뎀증');
        }
        return bonuses;
    }
  },
  "locke": {
    commonControls: ["hit_prob"],
    tooltipDesc: "자동 체크 시 적군의 HP는 1턴에 100%로 시작해 마지막 턴에 0%가 되게 설정하며, 턴 내에서는 파티원이 먼저 행동한다 가정합니다.",
    customControls: [
        { id: "enemy_hp_percent", type: "input", label: "적 HP(%)", min: 1, max: 100, initial: 100, hasAuto: true, autoId: "enemy_hp_auto" }
    ],
    initialState: {
        skill8_timer: [],      // 호혈표지 (배열)
        skill5_timer: [],     
        skill8_buff_timer: 0   // 필살기 버프 (숫자)
    },
    
    onAttack: (ctx) => {
        const extraHits = [];
        const p = simParams.locke;
        const enemyHp = ctx.customValues.enemy_hp_percent;

        if (ctx.isUlt) {
            // [필살기]
            // 1. 도장 조건 체크: 호혈표지 2중첩 이상 시 필살기 버프
            if (ctx.stats.stamp && ctx.simState.skill8_timer.length >= 2) {
                ctx.setTimer("skill8_buff_timer", 1);
            }

            // 2. 패시브5 (피의 공명) 추가타: 호혈표지 2중첩 이상 OR 적 HP 25% 미만
            if (ctx.simState.skill8_timer.length >= 2 || enemyHp < 25) {
                extraHits.push(p.skill7_hit);
            }
        }

        return { extraHits };
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "필살기뎀증": 0 };
        const p = simParams.locke;
        const enemyHp = ctx.customValues.enemy_hp_percent;

        // [패시브2] 상어 사냥 추격: 적 HP 구간별 뎀증
        let huntStacks = 0;
        if (enemyHp < 75) huntStacks++;
        if (enemyHp < 50) huntStacks++;
        if (enemyHp < 25) huntStacks++;
        
        if (huntStacks > 0) {
            const baseVal = ctx.getVal(3, '뎀증');
            bonuses["뎀증"] += (baseVal * huntStacks) * (1 / ctx.targetCount);
        }

        // [패시브3] 분노의 해류: 피격 시 뎀증 (최대 3중첩)
        if (ctx.simState.skill5_timer.length > 0) {
            bonuses["뎀증"] += ctx.simState.skill5_timer.length * ctx.getVal(4, '뎀증');
        }

        // [도장] 필살기 뎀증
        if (ctx.simState.skill8_buff_timer > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(7, '필살기뎀증', true);
        }

        return bonuses;
    }
  },
  "orem": {
    commonControls: ["hit_prob"],
    initialState: {
        shield_timer: 0,
        skill4_timer: 0
    },
    onAttack: (ctx) => {
        // 모든 추가타 로직은 sim_params.js에서 자동 처리됨
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "배리어증가": 0 };
        // [패시브2] 배리어 강화 효과 합산
        if (ctx.simState.skill4_timer > 0) {
            bonuses["배리어증가"] += ctx.getVal(3, '배리어증가');
        }
        return bonuses;
    }
  },
  "jetblack": {
    commonControls: ["ally_warrior_debuffer_count"],
    initialState: {
        skill4_stacks: 0, // 명칭 변경
        skill1_timer: 0,
        skill2_timer: 0,
        skill5_timer: 0
    },
    onTurn: (ctx) => {
        // [다양수이 방식] 아군 전사/방해 수만큼 트리거 발생
        const allyCount = ctx.customValues.ally_warrior_debuffer_count || 0;
        for (let i = 0; i < allyCount; i++) {
            ctx.checkStackTriggers("ally_attack");
        }
    },
    onAttack: (ctx) => {
        // 모든 로직이 sim_params.js로 이관됨
        return { extraHits: [] };
    },
    onAfterAction: (ctx) => {
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "고정공증": 0, "트리거뎀증": 0 };
        
        // 1. [스킬1] 보통공격 후 고정공증 (30%)
        if (ctx.simState.skill1_timer > 0) {
            bonuses["고정공증"] += ctx.getVal(0, '고정공증');
        }

        // 2. [스킬2] 필살기 후 고정공증 (15%) 및 트리거뎀증 (30%)
        if (ctx.simState.skill2_timer > 0) {
            bonuses["고정공증"] += ctx.getVal(1, '고정공증');
            bonuses["트리거뎀증"] += ctx.getVal(1, '트리거뎀증');
        }

        // 3. [스킬5] 확률형 트리거뎀증 (24%)
        if (ctx.simState.skill5_timer > 0) {
            bonuses["트리거뎀증"] += ctx.getVal(4, '트리거뎀증');
        }

        return bonuses;
    }
  },
  "kumoyama": {
    commonControls: ["hit_prob"],
    // [범용] 조롱 상태 여부 반환 (엔진 피격 로직 연동)
    isTaunted: (ctx) => ctx.simState.skill2_taunt_timer > 0 ? "taunt" : false,
    
    initialState: {
        skill2_taunt_timer: 0,
        skill4_timer: 0,
        skill5_timer: 0,
        skill7_timer: 0
    },
    // 1. 공격
    onAttack: (ctx) => {
        if (ctx.isUlt) {
            // 필살기 사용 시 조롱 상태 부여 (1턴)
            ctx.setTimer("skill2_taunt_timer", 1);
            ctx.log("taunt", "activate");
        }
        return { extraHits: [] };
    },
    // 2. 피격 (반격 처리)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        const p = simParams.kumoyama;

        // 조롱 상태일 때만 반격 발생
        if (ctx.simState.skill2_taunt_timer > 0) {
            // 도장 활성화 시 반격이 광역으로 변함 (isMulti 설정 주입)
            extraHits.push({ 
                ...p.skill2_counter, 
                isMulti: ctx.stats.stamp 
            });
        }
        return { extraHits };
    },
    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };

        // [패시브2] 만상
        if (ctx.simState.skill4_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(3, '뎀증');
        }
        // [패시브3] 발도
        if (ctx.simState.skill5_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        }
        // [패시브5] 수파리
        if (ctx.simState.skill7_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(6, 'max'); // calc[0] 값 가져옴
        }

        return bonuses;
    }
  }
};