// sim_v2.js - 직접 실행 기반의 신규 캐릭터 시뮬데이터 (v2)
import { simParams } from './sim_params.js';

export const simDataV2 = {
    "suichong": {
        title: "세숭",
        initialState: {
            seoin_stacks: 0,
            chumal_timer: 0,
            skill5_timer: [],
            skill1_timer: 0,
            skill2_timer: 0,
            skill8_timer: 0
        },
        onTurn: (ctx) => {
            const s = ctx.simState;
            // 2턴부터 매 턴 시작 시 [서인] 1스택 획득
            if (ctx.t > 1) {
                ctx.gainStack({ 
                    id: "seoin_stacks", 
                    originalId: "suichong_skill4", 
                    maxStacks: 4, 
                    label: "[서인] 1스택 획득", 
                    customTag: "패시브2" 
                });
            }
        },
        onAttack: (ctx) => {
            const s = ctx.simState;

            if (ctx.isDefend) {
                // 1. [패시브3] 석숭의 비늘 (방어 시 5턴 간 뎀증, 최대 2중첩)
                ctx.applyBuff({
                    originalId: "suichong_skill5",
                    timerKey: "skill5_timer",
                    maxStacks: 2,
                    duration: 5,
                    label: "발동"
                });
                return;
            }

            // 1. [추말] 효과 (평타 시)
            if (s.chumal_timer > 0 && !ctx.isUlt) {
                const chumalCoef = ctx.getVal(6, 0);
                if (chumalCoef > 0) {
                    ctx.execHit({
                        name: "세월의 흐름 (추말)",
                        skillId: "suichong_skill7",
                        val: chumalCoef,
                        type: "추가공격",
                        customTag: "패시브5",
                        icon: "icon/passive5.webp"
                    });
                }
            }

            if (!ctx.isUlt) {
                // 2-1. [스킬1] 트렌드의 광휘 (2턴 간 공증)
                ctx.applyBuff({
                    originalId: "suichong_skill1",
                    timerKey: "skill1_timer",
                    duration: 2,
                    label: "발동"
                });

                // 2-2. 패시브 2 기초 추가데미지 발생
                ctx.execHit({
                    name: "사악함을 제압하는 길상",
                    skillId: "suichong_skill11",
                    val: ctx.getVal(10, '추가공격'),
                    type: "추가공격",
                    customTag: "패시브2",
                    icon: "icon/passive2.webp"
                });
            } else {
                // 2-1. [스킬2] 세월을 비추는 황금빛 (1턴 간 공증)
                ctx.applyBuff({
                    originalId: "suichong_skill2",
                    timerKey: "skill2_timer",
                    duration: 1,
                    label: "발동"
                });

                // 2-2. 패시브 2 기초 추가데미지 발생
                ctx.execHit({
                    name: "사악함을 제압하는 길상",
                    skillId: "suichong_skill10",
                    val: ctx.getVal(9, '추가공격'),
                    type: "추가공격",
                    customTag: "패시브2",
                    icon: "icon/passive2.webp"
                });

                // 3. 서인 중첩 추가데미지 발생
                const stacks = s.seoin_stacks || 0;
                if (stacks >= 3) {
                    const count = (stacks === 4) ? 2 : 1;
                    for (let i = 0; i < count; i++) {
                        ctx.execHit({
                            name: `사악함을 제압하는 길상 [서인 #${i + 1}]`,
                            skillId: "suichong_skill4",
                            val: ctx.getVal(3, '추가공격'),
                            type: "추가공격",
                            customTag: "패시브2",
                            icon: "icon/passive2.webp"
                        });
                    }
                }

                // 4. 서인 효과 제거 (소모 로그 출력 및 실제 데이터 초기화)
                if (s.seoin_stacks > 0) {
                    ctx.log(ctx.getSkillIdx("suichong_skill2"), `${s.seoin_stacks}스택 소모`, null, null, false, "서인 소모");
                    s.seoin_stacks = 0;
                }

                // 5. 패시브 3 방어 버프 해제
                if (Array.isArray(s.skill5_timer) && s.skill5_timer.length > 0) {
                    ctx.log(ctx.getSkillIdx("suichong_skill5"), `데미지 증가 버프 초기화`, null, null, false, "석숭의 비늘 소모");
                    s.skill5_timer = [];
                }

                // 6. 필살기 시 [추말] 부여 (2턴)
                ctx.applyBuff({
                    originalId: "suichong_skill7",
                    timerKey: "chumal_timer",
                    duration: 2,
                    label: "[추말] 부여"
                });
            }

            // 7. 도장 패시브 발동 체크 (행동 시)
            // 필살기 시에는 위에서 스택을 이미 0으로 만들었으므로 발동하지 않음 (의도된 서순)
            if (ctx.stats.stamp && s.seoin_stacks >= 1) {
                const triggerCount = (s.seoin_stacks >= 2) ? 2 : 1;
                for (let i = 0; i < triggerCount; i++) {
                    if (Math.random() < 0.5) {
                        ctx.applyBuff({
                            originalId: "suichong_skill8",
                            timerKey: "skill8_timer",
                            maxStacks: 2,
                            duration: 2,
                            label: "공격력 증가 부여",
                            customTag: "도장"
                        });
                    }
                }
            }
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
    "souran": {
        title: "소란",
        customControls: [
            { id: "skill5_ally_active", label: "허물 매미 교전 (방어 시 아군 공격 연계 보정)", type: "toggle", initial: false }
        ],
        initialState: {
            hae_stacks: 0,
            skill7_timer: 0,
            ran_gi_aura: 0,
            skill5_buff_timer: 0
        },
        onTurn: (ctx) => {
            // [!] 모든 로직을 행동 직후 서순 처리를 위해 onAttack(extraHits)으로 이동함
        },
        onAttack: (ctx) => {
            const s = ctx.simState;
            const hits = [];

            // 1번째: 행동 직후 1번 (행동 시 [해일의 송곳니] 2스택 기본 획득 - 공격/방어 공통)
            hits.push({
                type: "action", order: 10,
                action: () => {
                    const nextStacks = Math.min(16, (s.hae_stacks || 0) + 2);
                    ctx.gainStack({ id: "hae_stacks", originalId: "souran_skill4", val: 2, maxStacks: 16, label: `[해일의 송곳니] 획득 (${nextStacks}/16)` });
                }
            });

            if (ctx.isDefend) {
                // [패시브3] 허물 매미 교전 - 기운이 있고 체크박스 활성 시 방어하면 즉시 발동 (3성/30단 해금)
                if (parseInt(ctx.stats.s1 || 0) >= 30 && s.ran_gi_aura > 0 && ctx.customValues.skill5_ally_active) {
                    s.ran_gi_aura = 0;
                    ctx.applyBuff({ originalId: "souran_skill8", timerKey: "skill5_buff_timer", duration: 2, label: "매미 허물 교전", icon: "icon/passive5.webp" });
                    const nextStacks = Math.min(16, (s.hae_stacks || 0) + 5);
                    ctx.gainStack({ id: "hae_stacks", originalId: "souran_skill5", val: 5, maxStacks: 16, label: `[해일의 송곳니] 획득(아군 연계) (${nextStacks}/16)` });
                    ctx.log(ctx.getSkillIdx("souran_skill5"), "아군 연계 발동", null, null, false, "패시브3");
                }
                return { extraHits: hits };
            }

            // 2번째: 스킬4 보통공격 50% 확률 추가데미지 / 해일의 송곳니 중첩 수에 따른 추가데미지(필살기)
            hits.push({
                type: "action", order: 20,
                action: () => {
                    if (!ctx.isUlt) {
                        // 보통공격 추가타
                        if (Math.random() < 0.5) {
                            ctx.execHit({
                                name: "순영 연속물어뜯기",
                                skillId: "souran_skill4",
                                val: ctx.getVal(3, '추가공격'),
                                type: "추가공격",
                                customTag: "패시브2",
                                icon: "icon/passive2.webp"
                            });
                            const nextStacks = Math.min(16, (s.hae_stacks || 0) + 2);
                            ctx.gainStack({ id: "hae_stacks", originalId: "souran_skill4", val: 2, maxStacks: 16, label: `[해일의 송곳니] 획득 (${nextStacks}/16)` });
                        }
                    } else {
                        // 필살기 중첩 추가타 (소모 전 현재 스택 기준)
                        const stacks = s.hae_stacks || 0;
                        for (let i = 0; i < stacks; i++) {
                            ctx.execHit({
                                name: `순영 연속물어뜯기 [송곳니 #${i + 1}]`,
                                skillId: "souran_skill10",
                                val: 13.05,
                                type: "추가공격",
                                customTag: "송곳니",
                                icon: "icon/passive2.webp"
                            });
                        }
                    }
                }
            });

            // 3번째: 해일의 송곳니 효과 제거 (필살기 시)
            if (ctx.isUlt) {
                hits.push({
                    type: "action", order: 30,
                    action: () => {
                        if (s.hae_stacks > 0) {
                            ctx.log({ name: "송곳니 소모", icon: "icon/passive2.webp" }, `[해일의 송곳니] ${s.hae_stacks}중첩 모두 소모`, null, null, false, "패시브2");
                            s.hae_stacks = 0;
                        }
                    }
                });
            }

            // 4번째: 란의 기운 발동
            if (ctx.isUlt) {
                hits.push({
                    type: "action", order: 40,
                    action: () => {
                        s.ran_gi_aura = 1;
                        ctx.log(ctx.getSkillIdx("souran_skill5"), "란의 기운 발동", null, null, false, "패시브3");
                    }
                });
            }

            // 5번째: 스킬7의 해일의 송곳니 5스택 (5성/75단 해금)
            if (ctx.isUlt && parseInt(ctx.stats.s1 || 0) >= 75) {
                hits.push({
                    type: "action", order: 50,
                    action: () => {
                        const nextStacks = Math.min(16, (s.hae_stacks || 0) + 5);
                        ctx.gainStack({ id: "hae_stacks", originalId: "souran_skill7", val: 5, maxStacks: 16, label: `[해일의 송곳니] 획득(필살기) (${nextStacks}/16)` });
                    }
                });
            }

            // 6번째: 스킬7의 50% 확률 발동스킬효과 증가 (5성/75단 해금)
            if (parseInt(ctx.stats.s1 || 0) >= 75) {
                hits.push({
                    type: "action", order: 60,
                    action: () => {
                        if (Math.random() < 0.5) {
                            ctx.applyBuff({
                                originalId: "souran_skill7",
                                timerKey: "skill7_timer",
                                duration: 3,
                                label: "전장의 여운",
                                icon: "icon/passive5.webp"
                            });
                        }
                    }
                });
            }

            // 7번째: 해일의 송곳니 5중첩 이상일 시 보통공격시 50% 확률 추가타
            hits.push({
                type: "action", order: 70,
                action: () => {
                    if (!ctx.isUlt && ctx.stats.stamp && s.hae_stacks >= 5) {
                        if (Math.random() < 0.5) {
                            ctx.execHit({
                                name: "폭풍아 연속난무참(패시브)",
                                skillId: "souran_skill9",
                                val: ctx.getVal(8, '추가공격'),
                                type: "추가공격",
                                customTag: "도장",
                                icon: "images/sigilwebp/sigil_souran.webp"
                            });
                            const nextStacks = Math.min(16, (s.hae_stacks || 0) + 2);
                            ctx.gainStack({ id: "hae_stacks", originalId: "souran_skill2", val: 2, maxStacks: 16, customTag: "도장", label: `[해일의 송곳니] 획득 (${nextStacks}/16)` });
                        }
                    }
                }
            });

            return { extraHits: hits };
        },
        getLiveBonuses: (ctx) => {
            const bonuses = { "트리거뎀증": 0 };
            const s = ctx.simState;

            if (s.skill7_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(6, '트리거뎀증');
            if (s.skill5_buff_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(7, '트리거뎀증');

            return bonuses;
        }
    }
};
