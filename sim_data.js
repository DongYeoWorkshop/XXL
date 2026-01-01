// sim_data.js
export const simCharData = {
  "shinrirang": {
    // ... (기존 신리랑 코드 유지) ...
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
            // 디버그 로그에 직접 추가
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
                step1: ctx.log(4, "Buff", null, 2, true) // step 시스템으로 로그 출력
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