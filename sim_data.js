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
        onTurn: (ctx) => { },
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
        stateDisplay: {
            "skill4_spirit_stacks": "[전의]"
        },
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
            const s = ctx.simState;

            // [패시브2] 전의 소모 로직
            if (ctx.isUlt) {
                // 도장이 없을 때만 전의 소모
                if (!ctx.stats.stamp) {
                    if (s.skill4_spirit_stacks > 0) {
                        ctx.log({ name: "전의 소모", icon: "icon/passive2.webp" }, `[전의] ${s.skill4_spirit_stacks}중첩 소모`);
                        s.skill4_spirit_stacks = 0;
                    }
                } else {
                    // 도장이 있을 때 (9중첩 보너스 안내 로그 정도는 추가 가능)
                    if (s.skill4_spirit_stacks >= 9) {
                        ctx.log({ name: "절대 왕자 파워밤", icon: "images/sigilwebp/sigil_tayangsuyi.webp", customTag: "도장" }, "[전의] 9중첩 효과 적용");
                    }
                }
            }
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
        onTurn: (ctx) => { }, // 엔진이 p.skill4_buff (onTurn) 자동 처리
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
    "codeb": {
        commonControls: [],
        initialState: {
            skill2_timer: 0,
            skill5_timer: 0,
            hp_recovery_total: 0
        },
        onAttack: (ctx) => {
            // 1. 필살기인 경우 디버프 부여는 sim_params(skill2_debuff)에서 엔진이 자동 처리함

            // 2. 패시브3(월영의 잠행) 추가타 여부만 체크하여 큐에 삽입
            // (실제 데미지 발생 후 onAfterHit에 의해 디버프 데미지가 연쇄적으로 터짐)
            return { extraHits: [] };
        },
        onAfterHit: (ctx) => {
            const p = simParams.codeb;
            // 황혼 연사 디버프가 있을 때만 반응
            if (ctx.checkCondition("hasBuff:skill2")) {
                ctx.extraHits.push(p.skill8_hit);
            }
        },
        onAfterAction: (ctx) => {
            // [패시브2] 흡수 석궁 (HP 회복)
            if (ctx.damageOccurred && ctx.currentTDmg > 0) {
                const recoveryRate = ctx.getVal(3, 'max') / 100;
                const recoveryAmount = ctx.currentTDmg * recoveryRate;
                ctx.simState.hp_recovery_total = (ctx.simState.hp_recovery_total || 0) + recoveryAmount;
            }
            return { extraHits: [] };
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
            const p = simParams.baade;
            const hasScar = (ctx.simState.scar_stacks || 0) > 0;

            if (!ctx.isUlt) {
                // [보통공격] 각흔 대상 평타 시 트리거 발동
                if (hasScar) {
                    ctx.checkBuffTriggers("attack_on_scar");
                }
                return { extraHits: [] };
            } else {
                // [필살기] 상태를 확인하여 부여 혹은 소모(데미지 포함) 중 하나만 예약
                const extraHits = [];

                if (hasScar) {
                    extraHits.push(p.skill2_scar_consume); // 이 안에 도장 데미지 로직이 포함됨
                } else {
                    extraHits.push(p.skill2_scar_apply);
                }

                return { extraHits };
            }
        },

        // 2. 행동 종료 후
        onAfterAction: (ctx) => {
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
        onTurn: (ctx) => { },
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

            // [추가] 흑구/백구 발동 체크를 행동의 맨 마지막으로 이동
            extraHits.push(p.black_dog, p.white_dog);

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
        stateDisplay: {
            "fury_stacks": "용의 분노",
            "fear_timer": "용족의 위압"
        },
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
            // [도장] 필살기 시 위압 수급 로직은 순서 보장을 위해 sim_params로 이관
            return { extraHits: [] };
        },

        onAfterAction: (ctx) => {
            return { extraHits: [] };
        },

        getLiveBonuses: (ctx) => {
            const bonuses = { "뎀증": 0 };
            const p = simParams.tyrantino;

            // [패시브7] 승리의 Lowball: 적에게 뎀감 효과 있을 시 뎀증
            if (ctx.isUlt || ctx.simState.dmg_reduce_timer > 0) {
                bonuses["뎀증"] += ctx.getVal(6, '뎀증');
            }

            return bonuses;
        }
    },
    "tamrang": {
        commonControls: [],
        customControls: [
            { id: "is_sleep_immune", type: "toggle", label: "수면 면역", initial: false, description: "적에게 수면 면역이 있어 수면 및 도장 디버프가 적용되지 않습니다." }
        ],
        initialState: {
            sleep_timer: 0,
            skill4_timer: [], // 패시브2
            skill7_timer: 0,  // 패시브5 (전체)
            skill8_timer: 0,  // 도장 (전체)
            consume_next: false
        },

        onAttack: (ctx) => {
            const extraHits = [];

            // [수정] 수면 및 도장 디버프 수동 적용 (단일 확률 시행)
            if (ctx.isUlt && !ctx.customValues.is_sleep_immune && ctx.customValues.self_sleep_active) {
                const p = simParams.tamrang;
                const skill = ctx.charData.skills[1];
                const sLv = ctx.stats.skills?.s2 || 1;
                const startRate = p.sleep_status.startRate || skill.startRate || 0.73;
                const rate = Math.min(1, (startRate + (sLv - 1) * 0.04));
                const finalProb = (p.sleep_status.prob || 0.4) * rate;

                if (Math.random() < finalProb) {
                    ctx.applyBuff({ ...p.sleep_status, prob: 1.0 });
                    if (ctx.stats.stamp) {
                        ctx.applyBuff({ ...p.skill8_vuln, prob: 1.0 });
                    }
                }
            }

            return { extraHits };
        },

        // [추가] 데미지 발생 즉시 수면 해제 로직
        onStepEnd: (ctx) => {
            if (ctx.damageOccurred && ctx.customValues.self_sleep_active) {
                if (ctx.simState.sleep_timer > 0 || ctx.simState.skill8_timer > 0) {
                    ctx.simState.sleep_timer = 0;
                    ctx.simState.skill8_timer = 0;
                    ctx.log("수면/도장디버프", "consume");
                }
            }
        },

        onAfterAction: (ctx) => {
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
                bonuses["뎀증디버프"] += ctx.getVal(7, '뎀증디버프');
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
        customControls: [
            { id: "self_extra_dmg_active", type: "toggle", label: "추가데미지 본인적용", initial: false, description: "체크 시 본인이 보통공격할 때 필살기(패란의 영감) 추가타를 파티원 기여분 포함하여 계산에 포함합니다." }
        ],
        initialState: {
            skill2_timer: 0,
            skill5_timer: [] // 피격 시 뎀증 (최대 2중첩)
        },
        onAttack: (ctx) => {
            return { extraHits: [] };
        },
        onAfterAction: (ctx) => {
            const extraHits = [];
            // [수정] onAfterAction으로 이동: 필살기 턴에는 버프 부여 후 실행
            // 조건: 
            // 1. 자가적용 체크됨
            // 2. 버프가 있음 (방금 필살기로 켰거나 유지 중)
            // 3. 아군 필살기 턴이 아님 (아군이 평타를 쳐야 함)

            // 주의: 필살기 턴(isUlt)이면 onAttack 단계에서 skill2_timer가 갱신되지 않았을 수 있으므로
            // onAfterAction 시점에서는 이미 갱신된 상태임.
            // 다만 본인이 필살기를 쓴 턴이면 onAttack의 엔진 자동 추가타(본인분)는 없으므로 여기서 아군 4인분만 챙기면 됨.
            // 본인이 평타를 쓴 턴이면 엔진이 본인 1타는 처리했으므로 여기서 아군 4인분만 챙기면 됨.
            // 결론: 항상 아군 4인분만 loop 돌리면 됨.

            if (ctx.customValues.self_extra_dmg_active && ctx.simState.skill2_timer > 0 && !ctx.isAllyUltTurn) {
                const isWangStamped = !!(ctx.stats.stamp);
                const hitCoef = ctx.getVal(1, '추가공격', isWangStamped);

                for (let i = 0; i < 4; i++) {
                    extraHits.push({
                        name: `멍: 패란의 영감 (아군 #${i + 1})`,
                        skillId: "wang_skill2",
                        val: hitCoef,
                        type: "추가공격",
                        customTag: "필살기",
                        icon: "icon/attack(strong).webp"
                    });

                    if (isWangStamped && Math.random() < 0.5) {
                        extraHits.push({
                            name: `멍: [도장] 패란의 영감 (아군 #${i + 1})`,
                            skillId: "wang_skill2",
                            val: hitCoef,
                            type: "추가공격",
                            customTag: "도장",
                            icon: "images/sigilwebp/sigil_wang.webp"
                        });
                    }
                }
            }
            return { extraHits };
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
        stateDisplay: {
            "blood_mark_timer": "호혈표지"
        },
        customControls: [
            { id: "enemy_hp_percent", type: "input", label: "적 HP(%)", min: 1, max: 100, initial: 100, hasAuto: true, autoId: "enemy_hp_auto" }
        ],
        initialState: {
            blood_mark_timer: [],      // 호혈표지 (배열)
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
                if (ctx.stats.stamp && ctx.simState.blood_mark_timer.length >= 2) {
                    ctx.setTimer("skill8_buff_timer", 1);
                }

                // 2. 패시브5 (피의 공명) 추가타: 호혈표지 2중첩 이상 OR 적 HP 25% 미만
                if (ctx.simState.blood_mark_timer.length >= 2 || enemyHp < 25) {
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
        commonControls: ["orem_hit_count"],
        customControls: [
            { id: "self_extra_dmg_active", type: "toggle", label: "추가데미지 본인적용", initial: false, description: "체크 시 본인이 배리어를 보유한 상태에서 공격할 경우 도장 패시브(25% 추가타)를 파티원 기여분 포함하여 계산에 포함합니다." }
        ],
        initialState: {
            shield_timer: 0,
            skill4_timer: 0
        },
        onAttack: (ctx) => {
            return { extraHits: [] };
        },
        onAfterAction: (ctx) => {
            const extraHits = [];
            if (!ctx.customValues.self_extra_dmg_active || !ctx.stats.stamp) return { extraHits };

            // [수정] onAfterAction으로 이동하여 필살기 로그 이후에 출력되도록 함
            // 이미 onAttack의 sim_params에서 shield_timer가 갱신되었으므로 수동 설정 불필요

            // 2. 배리어 상태 체크 및 추가타 생성
            if (ctx.simState.shield_timer > 0) {
                const oremExtraCoef = 25; // 도장 효과 25%
                const loopCount = 4; // 필살/보통공격 관계없이 아군 4인분으로 고정

                for (let i = 0; i < loopCount; i++) {
                    extraHits.push({
                        name: `오렘: 현측 방어 전개 (아군 #${i + 1})`,
                        skillId: "orem_skill8",
                        val: oremExtraCoef,
                        type: "추가공격",
                        customTag: "도장",
                        icon: "images/sigilwebp/sigil_orem.webp"
                    });
                }
            }
            return { extraHits };
        },
        onEnemyHit: (ctx) => {
            const extraHits = [];
            // 배리어가 있을 때만 반사 데미지 발생
            if (ctx.simState.shield_timer > 0) {
                const hitCount = parseInt(ctx.customValues.orem_hit_count || 0);
                if (hitCount > 0) {
                    const reflectCoef = ctx.getVal(6, '추가데미지'); // 50%
                    for (let i = 0; i < hitCount; i++) {
                        extraHits.push({
                            name: `오렘: 충격 역류 (반사 #${i + 1})`,
                            skillId: "orem_skill7",
                            val: reflectCoef,
                            type: "추가공격",
                            customTag: "패시브5",
                            icon: "icon/passive5.webp"
                        });
                    }
                }
            }
            return { extraHits };
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
        stateDisplay: {
            "skill4_stacks": "[체력응축]"
        },
        commonControls: [],
        initialState: {
            skill4_stacks: 0, // 명칭 변경
            skill1_timer: 0,
            skill2_timer: 0,
            skill5_timer: 0
        },
        onTurn: (ctx) => {
            // 1+3n턴(1턴 제외)은 아군 필살기 턴이므로 보통공격 트리거 미발생
            const isAllyUltTurn = (ctx.t > 1 && (ctx.t - 1) % 3 === 0);

            if (!isAllyUltTurn) {
                const allyCount = 4;
                for (let i = 0; i < allyCount; i++) {
                    ctx.checkStackTriggers("ally_attack");
                }
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
            const baseAtk = ctx.baseStats ? ctx.baseStats["공격력"] : 0;

            // 1. [스킬1] 보통공격 후 고정공증 (30%)
            if (ctx.simState.skill1_timer > 0) {
                // 기초공격력의 n% 만큼 가산
                const rate = ctx.getVal(0, 'max');
                bonuses["고정공증"] += baseAtk * (rate / 100);
            }

            // 2. [스킬2] 필살기 후 고정공증 (15%) 및 트리거뎀증 (30%)
            if (ctx.simState.skill2_timer > 0) {
                // 기초공격력의 n% 만큼 가산 (calc[0])
                const rate = ctx.getVal(1, 0);
                bonuses["고정공증"] += baseAtk * (rate / 100);

                // 발동 스킬 효과 증가 (calc[1])
                bonuses["트리거뎀증"] += ctx.getVal(1, 1);
            }

            // 3. [스킬5] 확률형 트리거뎀증 (24%)
            if (ctx.simState.skill5_timer > 0) {
                bonuses["트리거뎀증"] += ctx.getVal(4, '트리거뎀증'); // buffEffects 참조
            }

            return bonuses;
        }
    },
    "famido": {
        stateDisplay: {
            "tactical_stacks": "[전술 판독]"
        },
        customControls: [
            { id: "pos3_fixed", type: "toggle", label: "포지션 3 고정", initial: true, description: "체크 시 포지션 3에 있는 것으로 간주하여 매 턴 [전술 판독] 스택을 획득합니다." },
            { id: "ally_hit_prob", type: "input", label: "아군 피격 확률(%)", min: 0, max: 100, initial: 40, description: "매 턴 아군 4명이 각각 공격받을 확률입니다." }
        ],
        initialState: {
            tactical_stacks: 0,
            skill2_timer: 0,
            skill2_fixed_timer: 0,
            skill4_timer: 0,
            skill5_timer: [],
            skill4_boost_timer: 0
        },
        onTurn: (ctx) => {
            // 1. [포지션3 체크] 체크박스가 켜져 있을 때만 매턴 전술 판독 1스택 획득
            if (ctx.customValues.pos3_fixed) {
                ctx.gainStack({ id: "tactical_stacks", originalId: "famido_skill4", maxStacks: 3, label: "[전술 판독] 획득", customTag: "패시브2" });
            }
        },
        onEnemyHit: (ctx) => {
            // 아군 4명 피격 시뮬레이션 (5스킬 스택 수급)
            // 본인 피격 여부와 상관없이 엔진 예외처리에 의해 매턴 실행됨
            const hitProb = (ctx.customValues.ally_hit_prob || 0) / 100;
            for (let i = 0; i < 4; i++) {
                if (Math.random() < hitProb) {
                    ctx.checkBuffTriggers("ally_hit");
                }
            }
        },
        onAfterAction: (ctx) => {
            // ... (필요 시 다른 로직 추가)
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "기초공증": 0, "고정공증": 0 };

            // 1. 기초공증 합산 (스택형: 스킬 2, 4, 5) - 스킬 6(15%)은 엔진이 자동 합산
            if (ctx.simState.skill2_timer > 0) bonuses["기초공증"] += ctx.getVal(1, 0);
            if (ctx.simState.skill4_timer > 0) bonuses["기초공증"] += ctx.getVal(3, 0);

            const s5Stacks = (ctx.simState.skill5_timer || []).length;
            if (s5Stacks > 0) bonuses["기초공증"] += s5Stacks * ctx.getVal(4, '기초공증');

            // 2. 현재 기초공격력 계산 (가산 버프의 기준점)
            const br = Number(ctx.stats.s1) || 0;
            const totalBaseAtkRate = 100 + (br >= 50 ? 15 : 0) + bonuses["기초공증"];
            const currentBaseAtk = ctx.baseStats["공격력"] * (totalBaseAtkRate / 100);

            // 3. 고정공증 합산 (필살기 도장 + 4스킬 전술 판독)
            // [필살기 도장] 전용 타이머(skill2_fixed_timer)를 체크하여 후적용 보장
            if (ctx.stats.stamp && ctx.simState.skill2_fixed_timer > 0) {
                bonuses["고정공증"] += currentBaseAtk * (ctx.getVal(1, 2) / 100);
            }
            // [4스킬 전술 판독]
            if (ctx.simState.skill4_boost_timer > 0) {
                bonuses["고정공증"] += currentBaseAtk * (ctx.getVal(3, 1) / 100);
            }

            return bonuses;
        }
    },
    "rikano": {
        getLiveBonuses: (ctx) => {
            const bonuses = { "공증": 0, "뎀증디버프": 0, "필살기뎀증": 0 };

            // 1. 공증/필살기뎀증
            // 스킬 3(18%)과 스킬 4(13.8%)는 엔진이 defaultBuffSkills를 통해 자동으로 합산하므로 수동 추가 제외

            // 2. 뎀증디버프 합산 (중첩 가능)
            if (ctx.simState.skill1_timer > 0) bonuses["뎀증디버프"] += ctx.getVal(0, 0);
            if (ctx.simState.skill2_timer > 0) bonuses["뎀증디버프"] += ctx.getVal(1, 0, !!ctx.stats.stamp);
            if (ctx.simState.skill8_timer > 0) bonuses["뎀증디버프"] += ctx.getVal(7, 0);

            return bonuses;
        }
    },
    "duncan": {
        initialState: {
            skill8_stacks: 0,
            skill2_timer: 0,
            skill4_timer: 0,
            skill9_timer: 0,
            skill5_timer: 0
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "공증": 0, "뎀증": 0, "평타뎀증": 0 };

            // 1. 공증 합산
            // [스킬2] 필살기 사용 시 공증 (30%)
            if (ctx.simState.skill2_timer > 0) bonuses["공증"] += ctx.getVal(1, 0);
            // [스킬4] 보통공격 시 확정 공증 (16%)
            if (ctx.simState.skill4_timer > 0) bonuses["공증"] += ctx.getVal(3, 0);
            // [스킬9] 보통공격 시 확률 공증 (32%)
            if (ctx.simState.skill9_timer > 0) bonuses["공증"] += ctx.getVal(8, 0);

            // 2. 뎀증 합산 (마도 집중)
            // [스킬8] 스택 2 이상 시 뎀증 150%
            if (ctx.simState.skill8_stacks >= 2) bonuses["뎀증"] += ctx.getVal(7, 0);

            // 3. 평타뎀증 합산
            // [스킬7] 상시 평타뎀증 (45%)
            // (엔진이 자동 합산하므로 여기서는 빈 객체 유지 또는 다른 조건 필요 시 사용)

            return bonuses;
        }
    },
    "rutenix": {
        customControls: [
            { id: "self_buff_mode", type: "toggle", label: "필살버프 자가 적용", initial: false, description: "체크 시 필살기의 공격력 흡수 버프를 본인이 받습니다." }
        ],
        commonControls: ["hit_prob"],
        initialState: {
            skill2_timer: 0,
            skill4_timer: [],
            skill5_timer: 0,
            skill7_timer: []
        },
        onTurn: (ctx) => {
            // 아군 4명 기준으로 트리거 발생 (1+3n턴 제외)
            const isAllyUltTurn = (ctx.t > 1 && (ctx.t - 1) % 3 === 0);
            if (!isAllyUltTurn) {
                const allyCount = 4;
                for (let i = 0; i < allyCount; i++) {
                    ctx.checkBuffTriggers("ally_attack");
                }
            }
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "기초공증": 0, "고정공증": 0 };

            // 1. 기초공증 합산 (스택형: 스킬 4, 5, 7)
            // [스킬4] 보통공격 시 15% (최대 2중첩)
            const s4Stacks = (ctx.simState.skill4_timer || []).length;
            if (s4Stacks > 0) bonuses["기초공증"] += s4Stacks * ctx.getVal(3, 1);

            // [스킬5] 피격 시 30% (1중첩)
            if (ctx.simState.skill5_timer > 0) bonuses["기초공증"] += ctx.getVal(4, '기초공증');

            // [스킬7] 아군 보통공격 시 12% (최대 4중첩)
            const s7Stacks = (ctx.simState.skill7_timer || []).length;
            if (s7Stacks > 0) bonuses["기초공증"] += s7Stacks * ctx.getVal(6, '기초공증');

            // 2. 상시 기초공증 (패시브4: 스킬6) - 4성(50단계) 해금 체크
            const br = Number(ctx.stats.s1) || 0;
            let passiveBaseAtkRate = 0;
            if (br >= 50) {
                passiveBaseAtkRate = ctx.getVal(5, '기초공증');
            }

            // 3. [스킬2] 필살기 고정공증 계산 (자가 수급 모드일 때만)
            if (ctx.customValues.self_buff_mode && ctx.simState.skill2_timer > 0) {
                // 현재의 '진짜 기초공격력' 계산 (기본값 + 상시 패시브 + 실시간 스택)
                const totalBaseAtkRate = 100 + passiveBaseAtkRate + bonuses["기초공증"];
                const currentBaseAtk = ctx.baseStats["공격력"] * (totalBaseAtkRate / 100);

                // 도장 여부에 따른 배율 가져오기 (45% vs 90%)
                const isStamped = !!ctx.stats.stamp;
                const boostRate = ctx.getVal(1, 0, isStamped);
                bonuses["고정공증"] += currentBaseAtk * (boostRate / 100);
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
        // 2. 피격
        onEnemyHit: (ctx) => {
            // [자동화] 반격 로직은 sim_params 설정을 통해 엔진이 자동으로 처리합니다.
            return { extraHits: [] };
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
    },
    "beernox": {
        stateDisplay: {
            "skill7_stacks": "[타임 체크]"
        },
        customControls: [
            { id: "wood_party_active", type: "toggle", label: "나무속성 파티원 3인", initial: false, description: "체크 시 나무속성 아군 3인 이상 조건을 만족한 것으로 간주하여 데미지가 15% 증가합니다." }
        ],
        initialState: {
            skill7_stacks: 0,
            skill1_timer: 0,
            skill2_timer: 0,
            skill2_stamp_timer: 0
        },
        onTurn: (ctx) => {
            // [수정] 2턴부터 타임 체크 스택 획득
            if (ctx.t > 1 && ctx.simState.skill7_stacks < 15) {
                ctx.gainStack({ id: "skill7_stacks", originalId: "beernox_skill7", maxStacks: 15, label: "[타임 체크] 획득", customTag: "패시브5" });
            }
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "기초공증": 0, "고정공증": 0, "뎀증": 0 };

            // 1. [패시브3] 나무속성 파티원 조건 체크
            if (ctx.customValues.wood_party_active) {
                bonuses["뎀증"] += ctx.getVal(3, '뎀증'); // 스킬4 뎀증 15%
            }

            // 2. 기초공증 합산 (매턴 쌓이는 타임 체크 스택)
            const timeStacks = Number(ctx.simState.skill7_stacks) || 0;
            bonuses["기초공증"] += timeStacks * ctx.getVal(6, '기초공증');

            // 2. 현재 기초공격력 계산 (가산 수치의 기준점)
            // 기본 100% + 스킬6(15%) + 타임체크 스택
            const br = Number(ctx.stats.s1) || 0;
            const totalBaseAtkRate = 100 + (br >= 50 ? 15 : 0) + bonuses["기초공증"];
            const currentBaseAtk = ctx.baseStats["공격력"] * (totalBaseAtkRate / 100);

            // 3. 고정공증 합산 (스킬 1, 2)
            if (ctx.simState.skill1_timer > 0) {
                bonuses["고정공증"] += currentBaseAtk * (ctx.getVal(0, 0) / 100);
            }
            if (ctx.simState.skill2_timer > 0) {
                bonuses["고정공증"] += currentBaseAtk * (ctx.getVal(1, 0) / 100);
            }
            // [도장] 2배 효과 (추가 60% 가산)
            if (ctx.simState.skill2_stamp_timer > 0) {
                bonuses["고정공증"] += currentBaseAtk * (ctx.getVal(1, 0) / 100);
            }

            return bonuses;
        }
    },
    "choiyuhee": {
        commonControls: ["normal_hit_prob"],
        stateDisplay: {
            "poison_timer": "[중독]",
            "poison_aoe_timer": "[광역중독]"
        },
        initialState: {
            poison_timer: [],
            poison_aoe_timer: []
        },
        onAttack: (ctx) => {
            const s = ctx.simState;

            // 1. 필살기 시 중독 부여 및 공격력 스냅샷 (중첩 방식)
            if (ctx.isUlt) {
                // 단일 중독 인스턴스 추가 (필살기 출처 명시)
                ctx.addTimer("poison_timer", 3, { atk: ctx.getAtk(false), from: "ult" });
                ctx.log({ name: "견습・사신현정검", icon: "icon/attack(strong).webp", customTag: "필살기" }, "[중독] 부여 (3턴)");

                if (ctx.stats.stamp) {
                    ctx.addTimer("poison_aoe_timer", 3, { atk: ctx.getAtk(true) });
                    ctx.log({ name: "견습・사신현정검", icon: "icon/attack(strong).webp", customTag: "도장" }, "[광역 중독] 부여 (3턴)");
                }
            }

            // 2. 평타 시 추가타 (패시브2: skill4)
            if (!ctx.isUlt && !ctx.isDefend) {
                const hasP = (s.poison_timer && s.poison_timer.length > 0);
                const hasAP = (s.poison_aoe_timer && s.poison_aoe_timer.length > 0);

                if (hasP || hasAP) {
                    const br = parseInt(ctx.stats.s1 || 0);
                    if (br >= 15) {
                        const damageVal = ctx.getVal(3, "추가공격", !!ctx.stats.stamp);
                        if (damageVal > 0) {
                            return {
                                extraHits: [{
                                    name: "공포의 바람 속격", val: damageVal, isMulti: false, customTag: "패시브2", icon: "icon/passive2.webp"
                                }]
                            };
                        }
                    }
                }
            }
            return { extraHits: [] };
        },
        onTurn: (ctx) => { return { extraHits: [] }; },
        onCalculateDamage: (ctx) => { return { extraHits: [] }; },
        onEnemyHit: (ctx) => {
            // [패시브3] 독설 반격 (방어 중 피격 시 50% 확률로 중독 부여)
            if (ctx.isDefend && ctx.isHit && Math.random() < 0.5) {
                // 패시브3 출처 명시
                ctx.addTimer("poison_timer", 3, { atk: ctx.getAtk(false), from: "p3" });
                ctx.log({ name: "독설 반격", icon: "icon/passive5.webp", customTag: "패시브3" }, "[중독] 부여 (3턴)");
            }
            return { extraHits: [] };
        }, onAfterAction: (ctx) => {              // [!] 추가 행동(Replay) 중에는 독 데미지 생성을 건너뜀 (중복 방지)
            if (ctx.currentReplayTag) return { extraHits: [] };

            const hits = [];
            const s = ctx.simState;
            const isS = !!ctx.stats.stamp;
            const s8Idx = ctx.getSkillIdx("choiyuhee_skill8");

            // 턴 종료 시 각 중독 인스턴스별로 데미지 발생
            if (Array.isArray(s.poison_timer)) {
                s.poison_timer.forEach((p, i) => {
                    const instanceAtk = p.atk || 0;
                    if (instanceAtk > 0) {
                        const isP3 = (p.from === "p3");
                        hits.push({
                            name: isP3 ? "독설 반격 [중독]" : `견습・사신현정검 [중독 #${i + 1}]`,
                            val: isP3 ? ctx.getVal(4, 0, isS) : ctx.getVal(s8Idx, 0, isS),
                            baseAtk: instanceAtk,
                            type: "도트공격",
                            icon: isP3 ? "icon/passive5.webp" : "icon/attack(strong).webp",
                            customTag: isP3 ? "패시브3" : "필살기"
                        });
                    }
                });
            }
            if (Array.isArray(s.poison_aoe_timer)) {
                const s9Idx = ctx.getSkillIdx("choiyuhee_skill9");
                if (s9Idx !== -1) {
                    s.poison_aoe_timer.forEach((p, i) => {
                        const instanceAtk = p.atk || 0;
                        if (instanceAtk > 0) {
                            hits.push({
                                name: `견습・사신현정검 [광역 중독 #${i + 1}]`,
                                val: ctx.getVal(s9Idx, 0, isS),
                                baseAtk: instanceAtk,
                                isMulti: true,
                                type: "도트공격",
                                icon: "images/sigilwebp/sigil_choiyuhee.webp",
                                customTag: "도장"
                            });
                        }
                    });
                }
            }
            return { extraHits: hits };
        }, getLiveBonuses: (ctx) => {
            return {}; // 엔진 자동 합산에 맡김
        }
    },
    "dallawan": {
        stateDisplay: {
            "skill2_timer": "[목장주 명령]",
            "skill2_stamp_timer": "[도장:효과활성]",
            "skill2_stamp_dmg_timer": "[도장:데미지증가]"
        },
        customControls: [
            { id: "recovery_rate", type: "input", label: "직접회복(%)", initial: 0, description: "매 턴 직접회복이 발생할 확률입니다." },
            { id: "ult_turn_full_heal", type: "toggle", label: "필살턴 전체힐 사용", initial: false, description: "필살기 사용 턴에 아군 전체힐이 발생한다고 가정합니다." }
        ],
        initialState: {
            skill2_timer: 0,
            skill2_stamp_timer: 0,
            skill2_stamp_dmg_timer: 0
        },
        onAttack: (ctx) => {
            const s = ctx.simState;
            const currentBaseAtk = ctx.getAtk(true);

            // 1. 필살기 사용 시 (가산 버프 부여 및 도장 대기 상태 활성화)
            if (ctx.isUlt) {
                s.skill2_timer = 1;
                const addVal = Math.floor(currentBaseAtk * (ctx.getVal(1, 0) / 100));
                ctx.log({ name: "목장주 명령", icon: "icon/attack(strong).webp", customTag: "필살기" }, `버프 부여 (+${addVal.toLocaleString()} 가산)`, null, 1);

                // [도장] 필살 발동 후 2턴 내 회복 시 뎀증 부여 효과 활성화
                if (ctx.stats.stamp) {
                    s.skill2_stamp_timer = 2;
                    ctx.log({ name: "목장주 명령", icon: "images/sigilwebp/sigil_dallawan.webp", customTag: "도장" }, "목장주 명령 부여 (2턴)");
                }
            }

            // [추가] 필살턴 전체힐 사용 체크박스 처리
            let didRecoveryOccur = false;
            if (ctx.isUlt && ctx.customValues.ult_turn_full_heal) {
                didRecoveryOccur = true; // 필살턴에 전체힐 발생 (강제)
            } else {
                const recProb = (ctx.customValues.recovery_rate || 0) / 100;
                if (recProb > 0 && Math.random() < recProb) {
                    didRecoveryOccur = true; // 일반 턴에 회복 발생 (확률)
                }
            }

            // 2. 도장 효과: 회복 발생 시에만 체크
            if (ctx.stats.stamp && didRecoveryOccur) {
                // [도장 스킬2] 대기 상태가 켜져 있을 때만 확률 체크
                if (s.skill2_stamp_timer > 0) {
                    if (Math.random() < 0.5) {
                        s.skill2_stamp_dmg_timer = 1;
                        ctx.log({ name: "목장주 명령", icon: "images/sigilwebp/sigil_dallawan.webp", customTag: "도장" }, "목장주 명령 발동 (1턴)");
                    }
                }
            }

            return { extraHits: [] };
        },
        onTurn: (ctx) => {
            const s = ctx.simState;
            // 타이머 수동 감소 (효과 활성 기간 관리)
            if (s.skill2_stamp_timer > 0) s.skill2_stamp_timer--;
            return { extraHits: [] };
        },
        onCalculateDamage: (ctx) => { return { extraHits: [] }; },
        onEnemyHit: (ctx) => { return { extraHits: [] }; },
        onAfterAction: (ctx) => { return { extraHits: [] }; },
        getLiveBonuses: (ctx) => {
            const bonuses = { "고정공증": 0, "뎀증": 0 };
            const s = ctx.simState;

            if (s.skill2_timer > 0) bonuses["고정공증"] += ctx.baseStats["공격력"] * (ctx.getVal(1, 0) / 100);

            // 도장 효과 (실제 뎀증 버프가 있을 때만 적용)
            if (s.skill2_stamp_dmg_timer > 0) {
                bonuses["뎀증"] += ctx.getVal(8, '뎀증');
            }

            return bonuses;
        }
    },
    "yuzhan": {
        stateDisplay: {
            "gunpowder_stacks": "[화약]"
        },
        commonControls: ["ally_warrior_debuffer_count"],
        initialState: {
            gunpowder_stacks: 0,
            skill5_timer: 0
        },
        onTurn: (ctx) => {
            // [도장 패시브] 아군 전사/방해 캐릭터의 보통공격 시 50% 확률로 화약 스택 획득
            if (!ctx.isAllyUltTurn && ctx.stats.stamp) {
                const allyCount = ctx.customValues.ally_warrior_debuffer_count || 0;
                for (let i = 0; i < allyCount; i++) {
                    if (Math.random() < 0.5) {
                        ctx.gainStack({ id: "gunpowder_stacks", originalId: "yuzhan_skill8", maxStacks: 3, label: "[화약] 1스택 획득", customTag: "도장" });
                    }
                }
            }
        },
        onAttack: (ctx) => {
            const s = ctx.simState;
            const extraHits = [];

            if (ctx.isDefend) return { extraHits }; // 방어 시에는 아무것도 하지 않음

            if (!ctx.isUlt) {
                // [평타] 현재 스택 수에 비례한 추가 데미지 (부여 전 스택 기준)
                const currentStacks = s.gunpowder_stacks || 0;
                if (currentStacks > 0) {
                    extraHits.push({
                        name: "불꽃과 농포 여화",
                        skillId: "yuzhan_skill4",
                        val: currentStacks * ctx.getVal(3, '추가공격'),
                        type: "추가공격",
                        customTag: "패시브2",
                        icon: "icon/passive2.webp"
                    });
                }

                // [평타] 데미지 발생 후 화약 1스택 부여
                ctx.gainStack({ id: "gunpowder_stacks", originalId: "yuzhan_skill4", maxStacks: 3, label: "[화약] 1스택 부여", customTag: "패시브2" });
            } else {
                // [필살기] 도장 활성화 시 스택 비례 추가 데미지 (스택당 30%)
                if (ctx.stats.stamp) {
                    const currentStacks = s.gunpowder_stacks || 0;
                    if (currentStacks > 0) {
                        extraHits.push({
                            name: "폭죽 대난사",
                            skillId: "yuzhan_skill8",
                            val: currentStacks * 30, // 스택당 30%
                            isMulti: true,
                            type: "추가공격",
                            customTag: "도장",
                            icon: "images/sigilwebp/sigil_yuzhan.webp"
                        });
                    }
                }
                // [필살기] 스택 모두 소모
                if (s.gunpowder_stacks > 0) {
                    ctx.log(ctx.getSkillIdx("yuzhan_skill2"), `${s.gunpowder_stacks}스택 소모`, null, null, false, "화약 소모");
                    s.gunpowder_stacks = 0;
                }
            }
            return { extraHits };
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "뎀증": 0, "트리거뎀증": 0 };

            // [패시브3] 방어 시 트리거뎀증
            if (ctx.simState.skill5_timer > 0) {
                bonuses["트리거뎀증"] += ctx.getVal(4, '트리거뎀증');
            }

            // [패시브5] 화약 3스택 시 뎀증
            if (ctx.simState.gunpowder_stacks >= 3) {
                bonuses["뎀증"] += ctx.getVal(6, '뎀증');
            }

            return bonuses;
        }
    },
    "suichong": {
        stateDisplay: {
            "seoin_stacks": "[서인]",
            "chumal_timer": "[추말]"
        },
        initialState: {
            seoin_stacks: 0,
            skill5_timer: [],
            skill1_timer: 0,
            skill2_timer: 0,
            chumal_timer: 0,
            skill8_timer: 0
        },
        onTurn: (ctx) => {
            // [패시브2] 매 턴 경과 시 [서인] 1스택 획득 (1턴 제외)
            if (ctx.t > 1) {
                ctx.gainStack({ id: "seoin_stacks", originalId: "suichong_skill4", maxStacks: 4, label: "[서인] 1스택 획득", customTag: "패시브2" });
            }
        },
        onAttack: (ctx) => {
            const s = ctx.simState;
            const extraHits = [];

            if (ctx.isDefend) return { extraHits };

            // 1. [추말] 효과 (평타 시, 순서 5)
            if (s.chumal_timer > 0 && !ctx.isUlt) {
                const chumalCoef = ctx.getVal(6, 0);
                if (chumalCoef > 0) {
                    extraHits.push({
                        name: "세월의 흐름 (추말)",
                        skillId: "suichong_skill7",
                        val: chumalCoef,
                        type: "추가공격",
                        customTag: "패시브5",
                        icon: "icon/passive5.webp",
                        order: 5
                    });
                }
            }

            // 2. 패시브 2 기초 추가데미지 (순서 10)
            if (!ctx.isUlt) {
                extraHits.push({
                    name: "사악함을 제압하는 길상",
                    skillId: "suichong_skill11",
                    val: ctx.getVal(10, '추가공격'),
                    type: "추가공격",
                    customTag: "패시브2",
                    icon: "icon/passive2.webp",
                    order: 10
                });
            } else {
                extraHits.push({
                    name: "사악함을 제압하는 길상",
                    skillId: "suichong_skill10",
                    val: ctx.getVal(9, '추가공격'),
                    type: "추가공격",
                    customTag: "패시브2",
                    icon: "icon/passive2.webp",
                    order: 10
                });

                // 3. 서인 중첩 추가데미지 (순서 20)
                const stacks = s.seoin_stacks || 0;
                if (stacks >= 3) {
                    const count = (stacks === 4) ? 2 : 1;
                    for (let i = 0; i < count; i++) {
                        extraHits.push({
                            name: `사악함을 제압하는 길상 [서인 #${i + 1}]`,
                            skillId: "suichong_skill4",
                            val: ctx.getVal(3, '추가공격'),
                            type: "추가공격",
                            customTag: "패시브2",
                            icon: "icon/passive2.webp",
                            order: 20
                        });
                    }
                }

                // 4. 서인 효과 제거 (순서 30)
                if (stacks > 0) {
                    extraHits.push({
                        type: "action",
                        order: 30,
                        action: () => {
                            ctx.log(ctx.getSkillIdx("suichong_skill2"), `${stacks}스택 소모`, null, null, false, "서인 소모");
                            s.seoin_stacks = 0;
                        }
                    });
                }

                // 5. 패시브 3 방어 버프 해제 (순서 40)
                if (Array.isArray(s.skill5_timer) && s.skill5_timer.length > 0) {
                    extraHits.push({
                        type: "action",
                        order: 40,
                        action: () => {
                            ctx.log(ctx.getSkillIdx("suichong_skill5"), `데미지 증가 버프 초기화`, null, null, false, "석숭의 비늘 소모");
                            s.skill5_timer = [];
                        }
                    });
                }
            }

            // 6. 도장 패시브 발동 체크 (순서 50)
            // 평타 시에는 스택이 유지되어 발동 가능, 필살기 시에는 상단(순서 30)에서 0이 되어 차단됨
            extraHits.push({
                type: "action",
                order: 50,
                action: () => {
                    if (ctx.stats.stamp && s.seoin_stacks >= 1) {
                        const p = simParams.suichong;
                        const triggerCount = (s.seoin_stacks >= 2) ? 2 : 1;
                        for (let i = 0; i < triggerCount; i++) {
                            if (Math.random() < 0.5) {
                                ctx.applyBuff({ ...p.skill8_buff, prob: 1.0 });
                            }
                        }
                    }
                }
            });

            return { extraHits };

            return { extraHits };
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "공증": 0, "뎀증": 0 };
            const s = ctx.simState;

            if (s.skill1_timer > 0) bonuses["공증"] += ctx.getVal(0, '공증');
            if (s.skill2_timer > 0) bonuses["공증"] += ctx.getVal(1, '공증');

            const s8Stacks = Array.isArray(s.skill8_timer) ? s.skill8_timer.length : (s.skill8_timer > 0 ? 1 : 0);
            if (s8Stacks > 0) {
                bonuses["공증"] += s8Stacks * ctx.getVal(ctx.getSkillIdx("suichong_skill8"), '공증');
            }

            const defStacks = Array.isArray(s.skill5_timer) ? s.skill5_timer.length : 0;
            if (defStacks > 0) {
                bonuses["뎀증"] += defStacks * ctx.getVal(4, '뎀증');
            }

            return bonuses;
        }
    },
};