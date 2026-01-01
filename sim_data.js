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
                        return ctx.log(3, "Buff", null, 1, true);
                    }
                },
                step2: (ctx) => {
                    // 별개의 두 번째 50% 확률: 데미지 발생 (80%)
                    if (Math.random() < 0.5) return ctx.getVal(3, '추가공격');
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
                            return ctx.log(7, "Buff", null, 1, true);
                        }
                    },
                    step2: (ctx) => {
                        // 별개의 두 번째 50% 확률: 데미지 발생 (스킬 2의 세 번째 계수 40%)
                        if (Math.random() < 0.5) {
                            const skill2 = ctx.charData.skills[1];
                            const s2Lv = parseInt(ctx.stats.skills?.s2 || 1);
                            const rate = (typeof getSkillMultiplier === 'function' ? getSkillMultiplier(s2Lv, skill2.startRate || 0.6) : 1);
                            return (skill2.calc[2].max || 40) * rate;
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
    useHitProb: false, // 피격 관련 트리거 없음
    tooltipDesc: "아군은 매 턴 일반 공격을 1회씩 수행하며, 설정된 수만큼 필살기를 사용한다고 가정합니다.",
    customControls: [
      { id: "ally_warrior_debuffer_count", type: "counter", label: "아군 전사/방해 수", min: 0, max: 4, initial: 2 },
      { id: "ally_ult_count", type: "counter", label: "아군 필살 횟수", min: 0, max: 3, initial: 0 }
    ],
    // 1. 턴 시작 (모든 상태 초기화 및 관리)
    onTurn: (ctx) => {
        // [스킬 5] 방어 버프 타이머 관리
        if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;

        // [스킬 4] 아군 일반 공격에 의한 전의 획득 시뮬레이션
        const allyCount = ctx.customValues.ally_warrior_debuffer_count || 0;
        const prob = ctx.getVal(3, 'max') / 100; 
        
        let gained = 0;
        for (let i = 0; i < allyCount; i++) {
            if (Math.random() < prob) gained++;
        }
        if (gained > 0) {
            ctx.simState.battleSpirit = Math.min(9, (ctx.simState.battleSpirit || 0) + gained);
            ctx.debugLogs.push(ctx.log("아군공격", `전의 ${gained}단계 획득`));
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
        // [스킬 5] 방어 시 2턴 지속 버프 부여
        if (ctx.isDefend) {
            ctx.simState.skill5_timer = 2;
            extraHits.push({ 
                skillId: "tayangsuyi_skill5", 
                step1: ctx.log(4, "Buff", null, 2, true) 
            });
        }
        // [스킬 2] 필살기 사용 후 전의 소모 (도장 없을 때만)
        if (ctx.isUlt && !ctx.stats.stamp) {
            ctx.simState.battleSpirit = 0;
            extraHits.push({
                skillId: "tayangsuyi_skill2",
                step1: ctx.log(1, "전의 모두 소모", null, null, true)
            });
        }
        return { extraHits };
    },
    // 4. 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "평타뎀증": 0, "필살기뎀증": 0, "기초공증": 0, "기초HP증가": 0 };
        
        // [스킬 3] 공격강화 IV
        bonuses["공증"] += ctx.getVal(2, '공증');

        // [스킬 6] 기초 스탯 증가
        bonuses["기초공증"] += ctx.getVal(5, '기초공증');
        bonuses["기초HP증가"] += ctx.getVal(5, '기초HP증가');

        // [스킬 4] 전의 단계별 필살기 뎀증 (1단계당 6%)
        const spiritStacks = ctx.simState.battleSpirit || 0;
        const spiritBonusPerStack = 6; 
        bonuses["필살기뎀증"] += spiritStacks * spiritBonusPerStack;

        // [스킬 7] 아군 필살기 연동 (1회당 15%)
        const isAllyUltTurn = (ctx.t > 1 && (ctx.t - 1) % 3 === 0);
        if (isAllyUltTurn) {
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            bonuses["필살기뎀증"] += allyUltCount * ctx.getVal(6, '필살기뎀증');
        }

        // [스킬 5] 방어 후 보통공격 뎀증 (120%)
        if (!ctx.isUlt && ctx.simState.skill5_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        // [스킬 8] 도장 효과: 전의 9단계 시 데미지 20% 증가
        if (ctx.stats.stamp && spiritStacks === 9) {
            bonuses["뎀증"] += 20; 
        }

        return bonuses;
    }
  }
};