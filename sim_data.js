// sim_data.js
export const simCharData = {
  "shinrirang": {
    useHitProb: true,
    // 1. 턴 시작 (타이머 청소)
    onTurn: (ctx) => {
        if (!ctx.simState.skill5_timers) ctx.simState.skill5_timers = [];
        ctx.simState.skill5_timers = ctx.simState.skill5_timers.map(v => v - 1).filter(v => v > 0);
        
        // 1턴 버프들은 매 턴 시작 시 0으로 초기화 (확실한 만료 보장)
        ctx.simState.skill4_timer = 0;
        ctx.simState.skill8_timer = 0;
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    // 2. 공격 직후 서순 (메인 공격 후)
    onAttack: (ctx) => {
        const extraHits = [];

        // [스킬 7] 매 공격마다 스택 적립 (최대 10)
        ctx.simState.atk_stacks = Math.min(10, (ctx.simState.atk_stacks || 0) + 1);

        if (ctx.isUlt) {
            // [스킬 4] 패시브 2 판정 (독립 확률)
            extraHits.push({
                skillId: "shinrirang_skill4",
                step1: (ctx) => {
                    // 첫 번째 50% 확률: 버프 발동
                    if (Math.random() < 0.5) {
                        ctx.simState.skill4_timer = 1;
                        return ctx.log(3, "Buff", 50, 1, true);
                    }
                },
                step2: (ctx) => {
                    // 별개의 두 번째 50% 확률: 데미지 발생 (80%)
                    if (Math.random() < 0.5) return { val: ctx.getVal(3, '추가공격'), chance: 50 };
                }
            });

            // [스킬 8] 도장 판정 (독립 확률)
            if (ctx.stats.stamp) {
                extraHits.push({
                    skillId: "shinrirang_skill8",
                    step1: (ctx) => {
                        // 첫 번째 50% 확률: 도장 버프 발동 (30%)
                        if (Math.random() < 0.5) {
                            ctx.simState.skill8_timer = 1;
                            return ctx.log(7, "Buff", 50, 1, true);
                        }
                    },
                    step2: (ctx) => {
                        // 별개의 두 번째 50% 확률: 데미지 발생 (스킬 2의 세 번째 계수 40%)
                        if (Math.random() < 0.5) {
                            const skill2 = ctx.charData.skills[1];
                            const s2Lv = parseInt(ctx.stats.skills?.s2 || 1);
                            const rate = (typeof getSkillMultiplier === 'function' ? getSkillMultiplier(s2Lv, skill2.startRate || 0.6) : 1);
                            return { val: (skill2.calc[2].max || 40) * rate, chance: 50 };
                        }
                    }
                });
            }
        }
        return { extraHits };
    },
    // 3. 피격 직후 서순
    onEnemyHit: (ctx) => {
        const extraHits = [];
        extraHits.push({
            skillId: "shinrirang_skill5",
            isHitAction: true,
            step1: (ctx) => {
                if (!ctx.simState.skill5_timers) ctx.simState.skill5_timers = [];
                // 최대 2중첩 제한 적용
                if (ctx.simState.skill5_timers.length < 2) {
                    ctx.simState.skill5_timers.push(3);
                    return ctx.log(4, "Buff", null, 2, true);
                }
            },
            step2: ctx.getVal(4, '추가공격'), // 반격 계수 (100%)
            step3: (ctx) => {
                // 반격도 공격이므로 풍월의 혼 스택 적립
                ctx.simState.atk_stacks = Math.min(10, (ctx.simState.atk_stacks || 0) + 1);
            }
        });
        return { extraHits };
    },
    // 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "트리거뎀증": 0 };
        bonuses["공증"] += (ctx.simState.atk_stacks || 0) * ctx.getVal(6, '공증');
        bonuses["뎀증"] += (ctx.simState.skill5_timers || []).length * ctx.getVal(4, '뎀증');

        if (ctx.simState.skill4_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(3, '트리거뎀증');
        if (ctx.simState.skill8_timer > 0) {
            // 도장 패시브의 트리거 뎀증 수치 (30%)
            bonuses["트리거뎀증"] += ctx.getVal(7, '트리거뎀증', true);
        }

        return bonuses;
    }
  },
  "tayangsuyi": {
    useHitProb: false,
    tooltipDesc: "아군은 매 턴 일반 공격을 1회씩 수행하며, 설정된 수만큼 필살기를 사용한다고 가정합니다.",
    customControls: [
      { id: "ally_warrior_debuffer_count", type: "counter", label: "아군 전사/방해 수", min: 0, max: 4, initial: 2 },
      { id: "ally_ult_count", type: "counter", label: "아군 필살 횟수", min: 0, max: 3, initial: 0 }
    ],
    // 1. 턴 시작 (타이머 관리 및 전의 수급)
    // 1. 턴 시작 (타이머 관리 및 전의 수급)
    onTurn: (ctx) => {
        if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;

        const isAllyUltTurn = ctx.t > 1 && (ctx.t - 1) % 3 === 0;
        if (!isAllyUltTurn) {
            const allyCount = ctx.customValues.ally_warrior_debuffer_count;
            const rawProb = ctx.getVal(3, 'max');
            const prob = rawProb / 100;
            
            let gained = 0;
            for (let i = 0; i < allyCount; i++) {
                if (Math.random() < prob) gained++;
            }
            if (allyCount > 0 && gained > 0) {
                ctx.simState.battleSpirit = Math.min(9, (ctx.simState.battleSpirit || 0) + gained);
                ctx.log("[전의]", `${gained}회 발동 (${rawProb.toFixed(0)}%)`);
            }
        }
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    // 2. 공격 서순
    onAttack: (ctx) => {
        return { extraHits: [] };
    },
    onEnemyHit: (ctx) => {
        return { extraHits: [] };
    },
    // 3. 행동 종료 후 (방어 체크 및 전의 소모)
    onAfterAction: (ctx) => {
        const extraHits = [];
        if (ctx.isDefend) {
            ctx.simState.skill5_timer = 2;
            extraHits.push({
                skillId: "tayangsuyi_skill5", 
                step1: (ctx) => ctx.log(4, "Buff", null, 2, true) 
            });
        }
        if (ctx.isUlt && !ctx.stats.stamp) {
            ctx.simState.battleSpirit = 0;
            ctx.log("[전의]", "모두 소모");
        }
        return { extraHits };
    },
    // 4. 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "평타뎀증": 0, "필살기뎀증": 0, "기초공증": 0, "기초HP증가": 0 };
        const spiritStacks = ctx.simState.battleSpirit || 0;
        const spiritBonusPerStack = 6; 
        bonuses["필살기뎀증"] += spiritStacks * spiritBonusPerStack;

        const isAllyUltTurn = ctx.t > 1 && (ctx.t - 1) % 3 === 0;
        if (isAllyUltTurn) {
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            bonuses["필살기뎀증"] += allyUltCount * ctx.getVal(6, '필살기뎀증');
        }

        if (!ctx.isUlt && ctx.simState.skill5_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        if (ctx.stats.stamp && spiritStacks === 9) {
            bonuses["뎀증"] += 20; 
        }

        return bonuses;
    }
  }
};