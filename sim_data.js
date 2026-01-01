// sim_data.js
export const simCharData = {
  "shinrirang": {
    commonControls: ["hit_prob"],
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
    commonControls: ["ally_warrior_debuffer_count", "ally_ult_count"],
    // 1. 턴 시작 (타이머 관리 및 전의 수급)
    onTurn: (ctx) => {
        if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;

        if (!ctx.isAllyUltTurn) {
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
        } else {
            // 아군 필살기 턴일 때 스킬 7 로그 출력 (횟수 포함)
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            if (allyUltCount > 0) {
                ctx.log(6, `${allyUltCount}회 발동`, null, 1); 
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

        if (ctx.isAllyUltTurn) {
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
  },
  "choiyuhyun": {
    commonControls: ["hp_100_prob"],
        onTurn: (ctx) => {
            if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;
    
            // 매 턴 시작 시 확률에 따라 HP 100% 유지 여부 결정
            const prob = ctx.customValues.hp_100_prob ?? 100;
            // 성공 시 1(턴), 실패 시 0을 대입하여 UI에 '1턴'으로 표시되게 함
            ctx.simState.skill4_active = (Math.random() * 100 < prob) ? 1 : 0;
    
            if (ctx.simState.skill4_active > 0 && prob < 100) {
                // 유지율이 100% 미만일 때 성공한 경우에만 로그 출력 (가독성)
                ctx.log(3, "발동", null, 1);
            }
        },
        onAttack: (ctx) => {
            const extraHits = [];
            const enemyCount = ctx.targetCount; // 공통 대상 수 버튼 값 사용
    
            // [패시브4] 신화성신환: 방어 후 공격 시 추가데미지 발생
            if (ctx.simState.skill5_timer > 0) {
                extraHits.push({
                    skillId: "choiyuhyun_skill5",
                    name: "신화성신환",
                    coef: ctx.getVal(4, 'max')
                });
            }
    
            // [패시브5] 검추백형: 필살기 사용 시 적 수에 따른 추가데미지
            if (ctx.isUlt) {
                if (enemyCount >= 5) {
                    extraHits.push({
                        skillId: "choiyuhyun_skill7",
                        name: "검추백형(5인)",
                        coef: ctx.getVal(6, 'max'),
                        isMulti: true
                    });
                } else if (enemyCount === 1) {
                    extraHits.push({
                        skillId: "choiyuhyun_skill7",
                        name: "검추백형(단일)",
                        coef: ctx.getVal(6, 'max') * 2 // 적이 1명일 때 75% (37.5 * 2)
                    });
                }
            }
    
            return { extraHits };
        },
        onAfterAction: (ctx) => {
            // [패시브4] 방어 시 2턴 간 추가데미지 상태 부여
            if (ctx.isDefend) {
                ctx.simState.skill5_timer = 2;
                ctx.log(4, "Buff", null, 2);
            }
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "뎀증": 0 };
            const enemyCount = ctx.targetCount; // 공통 대상 수 버튼 값 사용
    
            // [패시브2] 일죽별운: HP 100% 시 데미지 증가
            if (ctx.simState.skill4_active > 0) {
                bonuses["뎀증"] += ctx.getVal(3, '뎀증');
            }
    
            // [도장] 사신현정검: 적의 수가 5명 이상일 시 데미지 증가
            if (ctx.stats.stamp && enemyCount >= 5) {
                bonuses["뎀증"] += ctx.getVal(7, '뎀증', true);
            }
    
            return bonuses;
        }
  }
};