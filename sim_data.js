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
            const prob = ctx.getVal(3, 'max') / 100;
            
            for (let i = 0; i < allyCount; i++) {
                if (Math.random() < prob) {
                    ctx.checkStackTriggers("ally_attack");
                }
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
        const spiritStacks = ctx.simState.skill4_spirit_stacks || 0;
        bonuses["필살기뎀증"] += spiritStacks * p.skill4_spirit.bonusPerStack;

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
        const p = simParams.choiyuhyun;
        const bonuses = { "뎀증": 0, "뎀증디버프": 0 };
        
        // 1. [패시브2] HP 100% 시 데미지 증가
        if (ctx.simState.skill4_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(3, '뎀증');
        }

        // 2. [도장] 적 5명 이상 시 데미지 증가
        if (ctx.stats.stamp && ctx.targetCount >= 5) {
            bonuses["뎀증"] += ctx.getVal(7, '뎀증', true);
        }

        // 3. [테스트] 임시 디버프 정산 (수동 가중치 적용)
        const debuffParam = p.test_debuff;
        const dbTimer = ctx.simState[debuffParam.timerKey || 'skill2_timer'];
        if (dbTimer && (Array.isArray(dbTimer) ? dbTimer.length > 0 : dbTimer > 0)) {
            const baseVal = debuffParam.testVal || ctx.getVal(ctx.getSkillIdx(debuffParam.originalId), '뎀증디버프');
            // 수동으로 비중 계산 (N/M)
            const weight = debuffParam.targetLimit ? (debuffParam.targetLimit / ctx.targetCount) : 1;
            bonuses["뎀증디버프"] += baseVal * weight;
        }

        return bonuses;
    }
  },
  "baade": {
    commonControls: [],
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },

    onAttack: (ctx) => {
        const extraHits = [];
        const hasScar = ctx.simState.scar;

        if (!ctx.isUlt) {
            // [패시브5] 집중 분쇄: 각흔 대상 평타 시 필살기 버프
            if (hasScar) {
                ctx.setTimer("skill7_timer", 2);
                ctx.log(6, "발동", null, 2);
            }
        } else {
            // 필살기: 각흔 유무에 따라 동작 분기
            if (hasScar) {
                // [도장] 쇄강 파공격: 각흔 상태에서 필살기 시 추가데미지
                if (ctx.stats.stamp) {
                    extraHits.push({
                        skillId: "baade_stamp_passive",
                        coef: 174.75 // 도장 추가타 계수
                    });
                }
                // 각흔 소모
                ctx.simState.scar = false;
                ctx.log("scar", "consume");
            } else {
                // 각흔 부여
                ctx.simState.scar = true;
                ctx.log("scar", "apply");
            }
        }
        return { extraHits };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "평타뎀증": 0, "필살기뎀증": 0 };
        const hasScar = ctx.simState.scar;

        if (hasScar) {
            // [패시브2] 그리움의 사랑 자장가: 필살기 뎀증
            bonuses["필살기뎀증"] += ctx.getVal(3, '필살기뎀증');
            // [패시브4] 광맥 직감: 평타 뎀증
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        // [패시브5] 집중 분쇄: 평타로 쌓은 필살기 뎀증
        if (ctx.simState.skill7_timer > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "khafka": {
    commonControls: ["is_paralysis_immune"],
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        const extraHits = [];
        // 방어 시에는 공격 패시브(긴박 공감 등)가 발동하지 않음
        if (ctx.isDefend) return { extraHits };

        if (!ctx.simState.skill4_vuln_timer) ctx.simState.skill4_vuln_timer = [];

        // [패시브2] 긴박 공감: 공격 시 50% 확률로 받뎀증 (2턴)
        if (Math.random() < 0.5) {
            ctx.addTimer("skill4_vuln_timer", 2, { val: ctx.getVal(3, '뎀증디버프'), name: "긴박공감" });
            ctx.log(3, "apply", 50, 2);
        }

        // [패시브5] 급습 밧줄: 필살기 발동 시 받뎀증 (1턴)
        if (ctx.isUlt) {
            ctx.addTimer("skill4_vuln_timer", 1, { val: ctx.getVal(6, '뎀증디버프'), name: "급습밧줄" });
            ctx.log(6, "apply", null, 1);
        }

        return { extraHits };
    },
    onAfterAction: (ctx) => {
        // [패시브4] 밧줄 낙인: 방어 시 받뎀증 16% (2턴)
        if (ctx.isDefend) {
            ctx.addTimer("skill4_vuln_timer", 2, { val: ctx.getVal(4, '뎀증디버프')});
            ctx.log(4, "발동", null, 2);
        }
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증디버프": 0, "필살기뎀증": 0 };

        // 활성화된 모든 받뎀증 합산
        if (ctx.simState.skill4_vuln_timer) {
            ctx.simState.skill4_vuln_timer.forEach(v => {
                bonuses["뎀증디버프"] += v.val;
            });
        }

        // [특수] 긴박 공감[마비]: 마비 면역 대상 필살기 뎀증
        if (ctx.isUlt && ctx.customValues.is_paralysis_immune) {
            bonuses["필살기뎀증"] += ctx.getVal(7, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "anuberus": {
    commonControls: [],
    initialState: {
        skill4_black_dog_timer: 0,
        skill4_white_dog_timer: 0,
        skill5_hound_stack_timer: [],
        skill4_vuln_timer: []
    },
    // 1. 턴 시작 (타이머 감소는 엔진이 자동 처리)
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        if (ctx.isDefend) return { extraHits: [] };

        const activeDogs = (ctx.simState.skill4_black_dog_timer > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog_timer > 0 ? 1 : 0);

        return {
            extraHits: [
                // 1. [S5 데미지] 필살기 시 기존 스택 비례 추가타
                (ctx.isUlt && ctx.simState.skill5_hound_stack_timer?.length > 0) && {
                    skillId: "anuberus_skill5",
                    stack: ctx.simState.skill5_hound_stack_timer.length,
                    coef: ctx.simState.skill5_hound_stack_timer.reduce((sum, h) => sum + h.val, 0)
                },

                // 2. [버프 갱신 그룹] 개 수만큼 버프를 먼저 모두 갱신합니다 (버프1 -> 버프2)
                activeDogs > 0 && Array.from({ length: activeDogs }, () => ({
                    skillId: "anuberus_skill4",
                    step1: (ctx) => {
                        // 패시브3 스택 적립 (최대 4중첩)
                        ctx.addTimer("skill5_hound_stack_timer", 3, { val: ctx.getVal(4, 'max') }, 4);
                        // 패시브2 디버프 부여 (최대 4중첩)
                        ctx.addTimer("skill4_vuln_timer", 3, { val: ctx.getVal(3, '속성디버프') }, 4);
                        return ctx.log(3, "apply", null, 3, true);
                    }
                })),

                // 3. [도장 데미지 그룹] 모든 버프가 걸린 후 데미지를 입힙니다 (도장1 -> 도장2)
                (activeDogs > 0 && ctx.stats.stamp) && Array.from({ length: activeDogs }, (_, i) => ({
                    skillId: "anuberus_stamp_passive",
                    name: `니히히~ 우리도 왔다!`,
                    coef: ctx.getVal(7, '추가공격')
                })),

                // 4. 상태 판정 (흑구/백구 깨우기) - 마지막 단계
                {
                    step1: (ctx) => {
                        const prob = ctx.getVal(3, 'max');
                        const res = [];
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_black_dog_timer", 2); res.push(ctx.log("[흑구]", "발동", prob.toFixed(0), 2, true)); }
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_white_dog_timer", 2); res.push(ctx.log("[백구]", "발동", prob.toFixed(0), 2, true)); }
                        return res;
                    }
                }
            ]
        };
    },
    onAfterAction: (ctx) => {
        // 방어 시에도 개들을 깨울 확률 존재
        if (ctx.isDefend) {
            const prob = ctx.getVal(3, 'max');
            if (Math.random() * 100 < prob) { 
                ctx.setTimer("skill4_black_dog_timer", 2); 
                ctx.log("[흑구]", "발동", prob.toFixed(0), 2); 
            }
            if (Math.random() * 100 < prob) { 
                ctx.setTimer("skill4_white_dog_timer", 2); 
                ctx.log("[백구]", "발동", prob.toFixed(0), 2); 
            }
        }
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "속성디버프": 0, "필살기뎀증": 0, "공증": 0 };

        // 활성화된 어둠속성 디버프 합산
        if (ctx.simState.skill4_vuln_timer) {
            ctx.simState.skill4_vuln_timer.forEach(v => {
                bonuses["속성디버프"] += v.val;
            });
        }

        // [패시브6] 무음모드 해제: 깨어있는 개 한 마리당 필살기 뎀증 (각 27%)
        const activeDogs = (ctx.simState.skill4_black_dog_timer > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog_timer > 0 ? 1 : 0);
        if (activeDogs > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증') * activeDogs;
        }

        return bonuses;
    }
  },
  "goldenryder": {
    commonControls: ["hit_prob"],
    tooltipDesc: "",
    initialState: {
        blazing_stride_timer: [3, 3, 3, 3, 3, 3], // 턴 시작 시 1 깎여서 2턴 남은 상태로 시작
        skill2_buff_timer: 0, // 필살기 버프 (3턴)
        skill5_buff_timer: 0, // 피격 뎀증 (2턴)
        skill7_buff_timer: 0  // 패시브7 버프 (3턴)
    },
    
    // 1. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        const br = parseInt(ctx.stats.s1 || 0);
        
        // [열화질보 주사위 굴리기 - 최대 3회]
        const rollStride = (skillIdx) => {
            if (Math.random() < 0.33) {
                // 엔진의 스마트 addTimer 사용 (최대 6중첩 명시)
                ctx.addTimer("blazing_stride_timer", 2, {}, 6);
                // 로그는 이제 항상 찍힘
                ctx.log(skillIdx, "gain", 33, 2);
            }
        };

        // (1) 패시브 2 (skill4): 항상 굴림
        rollStride(3);

        // (2) 필살기 도장 효과: 도장이 켜져 있으면 굴림
        if (ctx.stats.stamp) {
            rollStride(1); 
        }

        // (3) 패시브 5 (skill7): 5성(75단) 해금 시 굴림
        if (ctx.isUnlocked(6)) {
            rollStride(6);
        }

        if (ctx.isUlt) {
            // [필살기] 3턴간 평타 뎀증 및 추뎀 부여
            ctx.setTimer("skill2_buff_timer", 3);
            ctx.log(1, "apply", null, 3);

            // [패시브7] 3턴간 평타 추뎀 부여
            ctx.setTimer("skill7_buff_timer", 3);
            ctx.log(6, "apply", null, 3);
        } else {
            // [보통공격 시 추가타들]
            // 1. 필살기 추뎀 (skill2)
            if (ctx.simState.skill2_buff_timer > 0) {
                // 도장 ON이면 100%, 아니면 50% (getVal의 3번째 인자로 도장 여부 전달)
                const coefVal = ctx.getVal(1, '추가공격', ctx.stats.stamp);
                extraHits.push({
                    skillId: "goldenryder_skill2",
                    coef: coefVal
                });
            }
            // 2. 패시브7 추뎀 (skill7)
            if (ctx.simState.skill7_buff_timer > 0) {
                extraHits.push({
                    skillId: "goldenryder_skill7",
                    coef: ctx.getVal(6, '추가공격')
                });
            }
        }

        return { extraHits };
    },

    // 2. 피격 (열화질보 획득 및 뎀증)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        // [패시브3] 3성(30단) 이상일 때만 피격 시너지 작동
        if (ctx.isUnlocked(4)) {
            // 엔진의 스마트 addTimer 사용 (최대 6중첩)
            ctx.addTimer("blazing_stride_timer", 1, {}, 6);
            ctx.log("[패시브3] [열화질보]", "gain", null, 2);

            // 2턴 간 뎀증
            ctx.setTimer("skill5_buff_timer", 1); 
            ctx.log(4, "apply", null, 2);
        }

        return { extraHits };
    },

    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "평타뎀증": 0 };
        
        // 열화질보 중첩당 평타 뎀증 (패시브4)
        const strideCount = ctx.simState.blazing_stride_timer.length;
        if (strideCount > 0) {
            bonuses["평타뎀증"] += strideCount * ctx.getVal(3, '평타뎀증');
        }

        // 필살기 버프 평타 뎀증 (skill2)
        if (!ctx.isUlt && ctx.simState.skill2_buff_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(1, '평타뎀증', true); // 도장 효과 반영
        }

        // 패시브5 피격 뎀증
        if (ctx.simState.skill5_buff_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        }

        return bonuses;
    }
  },
  "tyrantino": {
    commonControls: ["hit_prob"],
    tooltipDesc: "",
    initialState: {
        fury_stacks: 0,
        fear_timer: [], // 용족의 위압 (적 디버프, 2턴 지속, 최대 5중첩)
        dmg_reduce_timer: 0 // 데미지 감소 (적 디버프, 2턴 지속)
    },
    
    // 1. 공격 준비 (데미지 계산 전)
    onCalculateDamage: (ctx) => {
        if (ctx.isUlt) {
            // [필살기] 적 데미지 감소 부여 (2턴) -> 공격 전(setup 단계)에 부여
            ctx.setTimer("dmg_reduce_timer", 2);
            ctx.log("dmg_reduce_timer", "apply", null, 2);
        }
        return { extraHits: [] };
    },

    // 2. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        
        // [패시브5] 용의 역린: 적 위압 3중첩 이상 시 추가타
        if (ctx.simState.fear_timer.length >= 3) {
            extraHits.push({
                skillId: "tyrantino_skill5",
                coef: ctx.getVal(4, 'max'),
                isMulti: true // 다인 공격 설정 추가
            });
        }

        if (ctx.isUlt) {
            // [패시브4] 용족의 분노: 분노 3스택 시 필살기 추가타 (전체공격)
            if (ctx.simState.fury_stacks >= 3) {
                extraHits.push({
                    skillId: "tyrantino_skill4",
                    coef: ctx.getVal(3, 'max'),
                    isMulti: true
                });
                // 스택 소모
                ctx.simState.fury_stacks = 0;
                ctx.log("fury_stacks", "all_consume");
            }

            // [도장] 전율의 용의 위압: 필살기 시 위압 3중첩 부여 (2턴 지속)
            if (ctx.stats.stamp) {
                // 스마트 addTimer (최대 5중첩) 사용
                for(let i=0; i<3; i++) ctx.addTimer("fear_timer", 2, {}, 5);
                ctx.log("fear_timer", "apply", null, 2);
            }
        }

        return { extraHits };
    },

    // 3. 피격 (분노 적립 / 위압 부여)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        
        // [패시브4] 용족의 분노: 피격 시 분노 1스택 (최대 3)
        if (ctx.simState.fury_stacks < 3) {
            ctx.simState.fury_stacks++;
            ctx.log("fury_stacks", "gain");
        }

        // [도장] 전율의 용의 위압: 피격 시 위압 1중첩 부여 (최대 5)
        if (ctx.stats.stamp) {
            ctx.addTimer("fear_timer", 1, {}, 5); // 엔진 보정(+1)으로 최종 2턴 됨
            ctx.log("fear_timer", "apply", null, 2);
        }

        return { extraHits };
    },

    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };
        
        // [패시브7] 승리의 Lowball: 적에게 뎀감 효과(dmg_reduce_timer) 있을 시 뎀증
        if (ctx.simState.dmg_reduce_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(6, '뎀증');
        }

        return bonuses;
    }
  },
  "tamrang": {
    commonControls: [],
    tooltipDesc: "",
    customControls: [
        { id: "self_sleep_active", type: "toggle", label: "수면버프 자가적용", initial: false, description: "체크 시 아군이 소비하지 않은 디버프를 본인이 다음 턴에 직접 사용합니다." }
    ],
    initialState: {
        sleep_timer: 0,
        skill4_vuln_timer: [], // 패시브2 받뎀증
        skill7_vuln_timer: 0,  // 패시브7 받뎀증
        skill8_vuln_timer: 0   // 도장 1회용 75% 받뎀증 (턴제로 변경)
    },
    
    // 1. 턴 시작
    onTurn: (ctx) => {
        // 자동 처리
    },

    // 2. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        
        // [패시브2] 복숭아꽃 개화: 공격 시 50% 확률로 받뎀증 (2턴)
        if (Math.random() < 0.5) {
            ctx.addTimer("skill4_vuln_timer", 2, { val: ctx.getVal(3, '뎀증디버프') });
            ctx.log(3, "apply", 50, 2);
        }

        // 1회성 디버프(수면 뎀증, 도장 75%)는 공격 후에 소모됨 (자가적용 ON일 때만 여기까지 도달)
        if (!ctx.isUlt && ctx.simState.sleep_timer > 0 && ctx.customValues.self_sleep_active) {
            // 이번 공격에 혜택을 받고 (getLiveBonuses에서 처리), 공격 후 제거를 위해 flag 설정
            ctx.simState.consume_next = true;
        }

        return { extraHits };
    },

    // 3. 공격 종료 후 (디버프 부여 또는 소모)
    onAfterAction: (ctx) => {
        if (ctx.isUlt) {
            // [필살기] 공격 후에 디버프 부여 (파티원들을 위해)
            ctx.setTimer("sleep_timer", 2);
            ctx.log("sleep_status_timer", "apply", null, 2);

            ctx.setTimer("skill7_vuln_timer", 1);
            ctx.log(6, "apply", null, 1);

            if (ctx.stats.stamp) {
                ctx.simState.skill8_vuln_timer = 2; // 2턴 부여
                ctx.log(7, "apply", null, "1회 / 2");
            }

            // [추가] 자가적용 OFF 시 즉시 아군이 소비한 것으로 처리
            if (!ctx.customValues.self_sleep_active) {
                ctx.simState.sleep_timer = 0;
                ctx.simState.skill8_vuln_timer = 0; // 타이머 0으로 종료
                ctx.log("-아군의 디버프 소비-");
            }
        }

        // 자가적용으로 본인이 직접 쓴 경우 소모
        if (ctx.simState.consume_next) {
            ctx.simState.sleep_timer = 0;
            ctx.simState.skill8_vuln_timer = 0; // 타이머 0으로 종료
            ctx.simState.consume_next = false;
            ctx.log("sleep_status_timer", "consume");
        }
        return { extraHits: [] };
    },

    // 4. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "뎀증디버프": 0 };
        
        // [패시브4] 반격 연환각: 수면 상태 대상 공격 시 뎀증
        if (ctx.simState.sleep_timer > 0) {
            bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        }

        // 패시브2 받뎀증 합산
        if (ctx.simState.skill4_vuln_timer) {
            ctx.simState.skill4_vuln_timer.forEach(v => {
                bonuses["뎀증디버프"] += v.val;
            });
        }

        // 패시브7 받뎀증 합산
        if (ctx.simState.skill7_vuln_timer > 0) {
            bonuses["뎀증디버프"] += ctx.getVal(6, '뎀증디버프');
        }

        // 도장 1회용 받뎀증 (75%)
        if (ctx.simState.skill8_vuln_timer > 0) {
            bonuses["뎀증디버프"] += 75;
        }

        return bonuses;
    }
  },
  "wang": {
    commonControls: ["hit_prob"],
    tooltipDesc: "",
    initialState: {
        skill5_timer: [], // 피격 시 뎀증 (최대 2중첩)
        skill2_buff_timer: 0 // 패란의 영감 (3턴)
    },
    
    // 1. 공격
    onAttack: (ctx) => {
        const extraHits = [];

        // [도장] 패란의 영감: 필살기 사용 시 3턴 버프 부여
        if (ctx.isUlt && ctx.stats.stamp) {
            ctx.setTimer("skill2_buff_timer", 3);
            ctx.log(1, "Buff", null, 3); // 1번 인덱스(skill2)를 가리킴
        }

        // [도장] 패란의 영감 추가타: 버프 중 평타 시 발동
        if (!ctx.isUlt && ctx.simState.skill2_buff_timer > 0) {
            // 기본 1회
            extraHits.push({
                skillId: "wang_skill2",
                name: "패란의 영감",
                coef: ctx.getVal(1, '추가공격')
            });
            
            // 50% 확률로 1회 더
            if (Math.random() < 0.5) {
                extraHits.push({
                    skillId: "wang_skill2",
                    name: "패란의 영감",
                    coef: ctx.getVal(1, '추가공격'),
                    chance: 50
                });
            }
        }

        return { extraHits };
    },

    // 2. 피격 (반격/버프)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        // [패시브5] 영감 공명: 피격 시 2턴 간 뎀증 (최대 2중첩)
        // 스마트 addTimer (최대 2중첩) 사용
        ctx.addTimer("skill5_timer", 2, {}, 2);
        ctx.log(4, "apply", null, 2);
        return { extraHits };
    },

    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };
        // [패시브5] 영감 공명 수치 반영
        if (ctx.simState.skill5_timer) {
            bonuses["뎀증"] += ctx.simState.skill5_timer.length * ctx.getVal(4, '뎀증');
        }
        return bonuses;
    }
  },
  "locke": {
    commonControls: ["hit_prob"],
    tooltipDesc: "자동 체크 시 적군의 HP는 1턴에 100%로 시작해 마지막 턴에 0%가 되게 설정하며, 턴 내에서는 파티원이 먼저 행동한다 가정합니다.", // 여기에 캐릭터별 설명을 직접 입력하세요.
    customControls: [
        { 
            id: "enemy_hp_percent", 
            type: "input", 
            label: "적 HP(%)", 
            min: 1, 
            max: 100, 
            initial: 100, 
            description: "적의 현재 체력 퍼센트입니다. (체크 시 턴에 따라 자동 감소)",
            hasAuto: true,
            autoId: "enemy_hp_auto"
        }
    ],
    initialState: {
        blood_mark_timer: [], // 5턴 지속 관리를 위해 배열로 변경
        skill5_timer: []
    },
    
    // 1. 턴 시작
    onTurn: (ctx) => {
        // blood_mark_timer는 엔진에서 자동 감소 및 제거됨
    },

    // 2. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        const enemyHp = ctx.customValues.enemy_hp_percent;

        // [패시브] 광야 포격 돌진 (평타): HP 50% 이상 적 공격 시 호혈표지 획득
        if (!ctx.isUlt) {
            if (enemyHp >= 50) {
                if (ctx.simState.blood_mark_timer.length < 2) {
                    ctx.addTimer("blood_mark_timer", 5);
                } else {
                    // 이미 2스택이면 가장 오래된 스택의 시간을 5턴으로 갱신
                    ctx.simState.blood_mark_timer[0] = 5;
                }
                ctx.log("blood_mark_timer", "gain", null, 5);
            }
        } 
        // [필살기] 광야 포격 돌진 (필살)
        else {
            // [패시브7] 피의 공명: 호혈표지 2중첩 이상 OR 적 HP 25% 미만 시 추가타
            if ((ctx.simState.blood_mark_timer.length >= 2) || (enemyHp < 25)) {
                extraHits.push({
                    skillId: "locke_skill7",

                    coef: ctx.getVal(6, 'max')
                });
            }
        }

        return { extraHits };
    },

    // 3. 피격 (반격/버프)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        // [패시브5] 분노의 해류: 피격 시 2턴 간 뎀증 (최대 3중첩)
        if (ctx.simState.skill5_timer.length < 3) {
             ctx.addTimer("skill5_timer", 2);
             ctx.log(4, "발동", null, 2);
        }
        return { extraHits };
    },

    // 4. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "필살기뎀증": 0 };
        const enemyHp = ctx.customValues.enemy_hp_percent;

        // [패시브4] 상어 사냥 추격: 적 HP 구간별 뎀증
        let huntStacks = 0;
        if (enemyHp < 75) huntStacks++;
        if (enemyHp < 50) huntStacks++;
        if (enemyHp < 25) huntStacks++;
        
        if (huntStacks > 0) {
            bonuses["뎀증"] += huntStacks * ctx.getVal(3, '뎀증');
        }

        // [패시브5] 분노의 해류: 피격 시 뎀증 (최대 3중첩)
        if (ctx.simState.skill5_timer) {
            bonuses["뎀증"] += ctx.simState.skill5_timer.length * ctx.getVal(4, '뎀증');
        }

        // [도장] 광야 포격 돌진: 호혈표지 2중첩 이상 시 필살기 뎀증
        if (ctx.stats.stamp && ctx.simState.blood_mark_timer.length >= 2) {
            bonuses["필살기뎀증"] += ctx.getVal(7, '필살기뎀증', true);
        }

        return bonuses;
    }
  },
  "orem": {
    commonControls: ["hit_prob"],
    tooltipDesc: "",
    initialState: {
        shield_timer: 0,
        skill4_timer: 0
    },
    
    // 1. 공격
    onAttack: (ctx) => {
        const extraHits = [];
        
        // [패시브4] 전함 명령:엄수 - 보통공격 시 50% 확률로 배리어 효과 증가
        if (!ctx.isUlt && Math.random() < 0.5) {
            ctx.setTimer("skill4_timer", 3);
            ctx.log(3, "발동", 50, 3);
        }

        // [도장] 현측 방어 전개 (추가타) - 배리어 보유 중 공격 시 발생
        // (필살기 턴에는 아직 배리어가 없으므로 발동하지 않음)
        if (ctx.simState.shield_timer > 0 && ctx.stats.stamp) {
            extraHits.push({
                skillId: "orem_skill8",
                coef: ctx.getVal(7, '추가공격')
            });
        }

        // 필살기 사용 시 배리어 부여 (2턴) -> 추가타 판정 후에 부여
        if (ctx.isUlt) {
            ctx.setTimer("shield_timer", 2);
            ctx.log("shield_timer", "apply", null, 2);
        }

        return { extraHits };
    },

    // 2. 피격 (반격)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        // [패시브7] 충격 역류 - 배리어 보유 중 피격 시 추가데미지 발생
        if (ctx.simState.shield_timer > 0) {
            extraHits.push({
                skillId: "orem_skill7",
                coef: ctx.getVal(6, '추가공격')
            });
        }
        return { extraHits };
    },


    // 3. 실시간 보너스
    getLiveBonuses: (ctx) => {
        const bonuses = { "배리어증가": 0 };
        // [패시브4] 배리어 효과 증가 수치 반영
        if (ctx.simState.skill4_timer > 0) {
            bonuses["배리어증가"] += ctx.getVal(3, '배리어증가');
        }
        return bonuses;
    }
  },
  "kumoyama": {
    commonControls: ["hit_prob"],
    // [수정] 등록된 범용 키 'taunt' 반환
    isTaunted: (ctx) => ctx.simState.skill2_taunt_timer > 0 ? "taunt" : false,
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        const extraHits = [];
        
        // [패시브4] 만상 순환의 자세: 공격(보통/필살) 시 50% 확률로 데미지 증가
        if (Math.random() < 0.5) {
            ctx.setTimer("skill4_buff_timer", 2);
            ctx.log(3, "발동", 50, 2);
        }

        if (ctx.isUlt) {
            // [필살기] 조롱 상태 부여 (당해 턴 적 공격을 받아내기 위해 1턴 설정)
            ctx.setTimer("skill2_taunt_timer", 1);
            ctx.log("taunt", "activate");

            // [패시브7] 수파리·신성: 필살기 사용 시 1턴 간 데미지 증가
            ctx.setTimer("skill7_timer", 1);
            ctx.log(6, "발동", null, 1);
        }

        return { extraHits };
    },
    onEnemyHit: (ctx) => {
        const extraHits = [];

        // 1. [필살기 반격] 조롱 상태일 때 피격 시 반격 발생
        if (ctx.simState.skill2_taunt_timer > 0) {
            const isStamped = ctx.stats.stamp;
            extraHits.push({
                skillId: "kumoyama_skill2",
                name: isStamped ? "열풍요란 (반격)" : "열풍요란 (반격)",
                type: "추가공격",
                isMulti: isStamped,
                coef: ctx.getVal(1, '추가공격')
            });
        }

        // 2. [패시브5] 발도 견벽의 자세: 반격 직후 50% 확률로 데미지 증가 판정
        extraHits.push({
            skillId: "kumoyama_skill5",
            step1: (ctx) => {
                if (Math.random() < 0.5) {
                    ctx.setTimer("skill5_buff_timer", 2);
                    // [수정] 엔진이 로그를 쌓도록 skipPush(true) 설정
                    return ctx.log(4, "발동", 50, 2, true);
                }
            }
        });

        return { extraHits };
    },
    onAfterAction: (ctx) => {
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };

        // 패시브4 만상
        if (ctx.simState.skill4_buff_timer > 0) bonuses["뎀증"] += ctx.getVal(3, '뎀증');
        // 패시브5 발도
        if (ctx.simState.skill5_buff_timer > 0) bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        
        // 패시브7 수파리 (히든 수치 40% 직접 반영)
        if (ctx.simState.skill7_timer > 0) {
            const sLv = parseInt(ctx.stats.skills?.s7 || 1);
            const rate = getSkillMultiplier(sLv, 0.6);
            bonuses["뎀증"] += 40 * rate;
        }

        return bonuses;
    }
  }
};