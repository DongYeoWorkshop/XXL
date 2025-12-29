// 캐릭터들의 정보창고
export const charData = {
  "hero": {
    title: "딜비교 계산기",
    desc: "제작중인 기능입니다.",
    stats: { "상태": "개발중", "버전": "v0.1" }
  },
  "tayangsuyi": {
    title: "다양수이",
    desc: "다양수이에 대한 설명입니다.",
    base: { "공격력": 504, "HP": 2475 },
 
    info: { "속성": 0, "포지션": "전사" },
    customControls: [
      { id: "battle_spirit", type: "counter", label: "전의", min: 0, max: 9, initial: 0, scope: "view" }
    ],
    defaultBuffSkills: ["tayangsuyi_skill8","tayangsuyi_skill3","tayangsuyi_skill4","tayangsuyi_skill5", "tayangsuyi_skill6", "tayangsuyi_skill7"],
    skills: [
      { id: "tayangsuyi_skill1", excludeFromBuffSearch: true, decimalPlaces: 2, name: "본좌가 더 붙어주지!", icon: "icon/attack.webp", desc: "적에게 공격력 {0}%의 데미지를 줌", calc: [{ max: 100 }], damageDeal: [{ type: "보통공격", val: { max: 100 } }] },
      { id: "tayangsuyi_skill2", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        name: "절대 왕자 파워밤", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 적에게 공격력의 {0}% 데미지를 준 후, 가진 [전의] 스택을 모두 소모", 
        stampDesc: "(쿨타임 : 3턴) \n 적에게 공격력의 {0}% 데미지를 줌\n* 도장 패시브 : [전의]가 9중첩일 시 데미지 20% 증가", 
        calc: [{ max: 220, stampMax: 220 }], 
        damageDeal: [{ type: "필살공격", 
        val: { max: 220, stampMax: 220 } }] 
      },
      { id: "tayangsuyi_skill3", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "공증": { max: 30 } }, 
        buffDesc: "공격력 {0}% 증가", 
        name: "공격강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "자신의 공격력 {0}% 증가", 
        calc: [{ max: 30 }] 
      },
      { id: "tayangsuyi_skill4", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 0, 
        buffEffects: { "필살기뎀증": 6 }, 
        buffDesc: "[전의] 필살기 데미지 증가 {1}%", 
        customLink: { id: "battle_spirit", multiply: true }, // [추가] 전의 스택만큼 곱연산
        name: "화산섬 전투의 춤", 
        icon: "icon/passive2.webp", 
        desc: "자신을 제외한 전사, 방해 포지션에 해당하는 아군이 보통공격 시 {0}% 확률로 다양수이에게 [전의]부여 \n* [전의] : 필살기 데미지 {1}% 증가 (최대 9중첩)", calc: [{ max: 50 }, { fixed: 6 }], startRate: 0.64 },
      { id: "tayangsuyi_skill5", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "평타뎀증": { max: 120 } }, buffDesc: "방어 시 보통공격 데미지 {0}% 증가", hasToggle: true, toggleType: "isAppliedStamped", name: "워밍업 함성", icon: "icon/passive5.webp", desc: "방어 시 2턴 간 보통공격의 데미지 {0}% 증가", calc: [{ max: 120 }] },
      { id: "tayangsuyi_skill6", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "기초공증": { max: 15 }, "기초HP증가": { max: 15 } }, buffDesc: "기초공격력/HP {0}% 증가", name: "고강도 훈련 성과", icon: "icon/passive5.webp", desc: "자신의 기초 공격력, 기초 HP {0}% 증가", calc: [{ max: 15 }] },
      { id: "tayangsuyi_skill7", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "필살기뎀증": { max: 15 } }, buffDesc: "아군이 필살기 사용 시 필살기의 데미지 {0}% 증가 (최대 3중첩)", hasCounter: true, counterRange: { min: 0, max: 3 }, name: "전의의 궐기", icon: "icon/passive5.webp", desc: "자신을 제외한 아군이 필살기를 사용 할 때마다 1턴 간 다양수이의 필살기 데미지 {0}% 증가 (최대 3중첩)", calc: [{ max: 15 }] },
      {
        id: "tayangsuyi_skill8",
        name: "절대 왕자 파워밤(도장)",
        decimalPlaces: 2,
        stampBuffEffects: { "뎀증": { fixed: 20 } }, 
        buffDesc: "[전의] 9중첩일 시 데미지 20% 증가",       
        icon: "images/sigilwebp/sigil_tayangsuyi.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        syncLevelWith: "tayangsuyi_skill2",
        customLink: { id: "battle_spirit", condition: "eq", value: 9 }
      }    
    ]
  },
  "choiyuhyun": {
    title: "최유현",
    base: { "공격력": 520, "HP": 2403 },
 
    info: { "속성": 2, "포지션": "전사" },
    defaultBuffSkills: ["choiyuhyun_skill8","choiyuhyun_skill3","choiyuhyun_skill4", "choiyuhyun_skill6"],
    skills: [
      { id: "choiyuhyun_skill1", excludeFromBuffSearch: true, isMultiTarget: true, decimalPlaces: 0, buffEffects: { "공증": 0 }, name: "사인파사참", icon: "icon/attack.webp", desc: "적 전체에게 공격력 {0}%의 데미지를 줌", calc: [{ max: 50 }], damageDeal: [{ type: "보통공격", val: { max: 50 } }] },
      { id: "choiyuhyun_skill2", 
        excludeFromBuffSearch: true, 
        isMultiTarget: true, 
        hasStampEffect: true, 
        decimalPlaces: 2, 
        name: "사신현정검", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 대상에게 {0}% 의 데미지를 준 후, 다시 적 전체에게 {1}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 대상에게 {0}% 의 데미지를 준 후, 다시 적 전체에게 {1}%의 데미지를 줌\n* 도장 패시브 : 필드의 적의 수가 5명 이상일 시 데미지 {2}% 증가", 
        calc: [{ max: 100, stampMax: 100 }, { max: 50, stampMax: 50 }, { max: 0, stampMax: 20 }] , 
        damageDeal: [{ type: "필살공격", val: { max: 100 }, isSingleTarget: true }, { type: "필살공격", val: { max: 50 } }] 
      },
      { id: "choiyuhyun_skill3", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "공증": { max: 30 } }, buffDesc: "공격력 {0}% 증가", name: "공격강화Ⅳ", icon: "icon/passive2.webp", desc: "자신의 공격력 {0}% 증가", calc: [{ max: 30 }] },
      { id: "choiyuhyun_skill4", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "뎀증": { max: 25 } }, buffDesc: "HP가 100%일 경우 데미지 {0}% 증가", hasToggle: true, toggleType: "isAppliedStamped", name: "일죽별운", icon: "icon/passive2.webp", desc: "자신의 HP가 100%일 경우 데미지 {0}% 증가", calc: [{ max: 25 }] },  
      { id: "choiyuhyun_skill5", excludeFromBuffSearch: true, decimalPlaces: 2, name: "신화성신환", icon: "icon/passive5.webp", desc: "방어 시 2턴 간 유현의 공격에 {0}%의 추가데미지가 발생", calc: [{ max: 100 }], damageDeal: [{ type: "추가공격", val: { max: 100 } }] },
      { id: "choiyuhyun_skill6", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "기초공증": { max: 15 }, "기초HP증가": { max: 15 } }, buffDesc: "기초공격력/HP {0}% 증가", name: "고강도 훈련 성과", icon: "icon/passive5.webp", desc: "자신의 기초 공격력, 기초 HP {0}% 증가", calc: [{ max: 15 }] },
      { id: "choiyuhyun_skill7", excludeFromBuffSearch: true, decimalPlaces: 2, hasCounter: true, counterRange: { min: 0, max: 5 }, name: "검추백형", icon: "icon/passive5.webp", desc: "필살기 사용 시 현재 적의 수가 5이상일 경우 적 전체에게 {0}%의 추가 데미지를 주며, 적의 수가 1인 경우 대상에게 {1}%의 추가 데미지를 줌", calc: [{ max: 37.5 }, { max: 75 }] , damageDeal: [{ type: "추가공격", val: { max: 37.5 }, isMultiTarget: true }, { type: "추가공격", val: { max: 75 } }], counterDamageMap: { "1": 1, "5": 0 } },
      {
        id: "choiyuhyun_skill8",
        name: "사신현정검(도장)",
        decimalPlaces: 2, 
        buffEffects: { "뎀증": { max: 20 } },
        hasToggle: true,
        toggleType: "isAppliedStamped",
        buffDesc: "적의 수가 5명 이상일 시 데미지 {0}% 증가",      
        icon: "images/sigilwebp/sigil_choiyuhyun.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        syncLevelWith: "choiyuhyun_skill2",
        calc: [{ stampMax: 20 }]         
      }      
    ]
  },
  "khafka": {
    title: "카푸카",
    base: { "공격력": 525, "HP": 2380 },
 
    info: { "속성": 2, "포지션": "방해" },
    defaultBuffSkills: ["khafka_skill3", "khafka_skill4", "khafka_skill4_cond", "khafka_skill5", "khafka_skill6",  "khafka_skill8"], 
    skills: [
      { 
        id: "khafka_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "밧줄 조작 제압", 
        icon: "icon/attack.webp", 
        desc: "목표물에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
            {
              id: "khafka_skill2",
              excludeFromBuffSearch: true,
              hasStampEffect: true,
              decimalPlaces: 2,
              name: "쾌감의 구속", 
              icon: "icon/attack(strong).webp", 
              desc: "(쿨타임 : 4턴) \n 목표물에게 공격력 {0}%의 데미지를 주며, {1}% 확률로 마비 효과 부여", 
              stampDesc: "(쿨타임 : 4턴) \n 목표물에게 공격력 {0}%의 데미지를 주며, {1}% 확률로 마비 효과 부여",
              calc: [
                  { max: 209.7, stampMax: 279.6 },
                  { max: 80, stampMax: 100, startRate: 0.6625, stampStartRate: 0.73 }
              ],
              damageDeal: [{ type: "필살공격", val: { max: 209.7, stampMax: 279.6 } }],
              startRate: 0.6 
            },
            {
        id: "khafka_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 12, attributeMax: 18, targetAttribute: 2 } }, // 나무속성(2) 18%
        buffDesc: "공격력 {0}% 증가", 
        name: "나무속성 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력을 {0}% 증가시키며, 영향을 받은 아군이 나무속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "khafka_skill4",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "뎀증디버프": { max: 16 } }, 
        buffDesc: "받는 데미지 {0}% 증가 디버프 부여", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        name: "긴박 공감",
        icon: "icon/passive2.webp",
        desc: "카푸카가 공격할 때 50%의 확률로 대상에게 2턴 간 받는 데미지 {0}% 증가 디버프를 부여하며, 또한 필살기 사용 시 대상이 [마비]면역이 있을 경우, 필살기 데미지 {1}% 증가",
        calc: [{ max: 16 }, { max: 33.75 }]
      },
      { id: "khafka_skill5", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증디버프": { max: 16 } }, 
        buffDesc: "받는 데미지 {0}% 증가 디버프 부여", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        name: "밧줄 낙인", 
        icon: "icon/passive5.webp", 
        desc: "방어 시 포커스된 대상에게 2턴 간 받는 데미지 {0}% 증가 디버프 부여", 
        calc: [{ max: 16 }] 
      },
      {
        id: "khafka_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
            {
        id: "khafka_skill7",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        BuffEffects: { "뎀증디버프": { max: 15 } }, 
        buffDesc: "받는 데미지 {0}% 증가 디버프 부여", 
        hasToggle: true, 
        toggleType: "isAppliedStamped",
        name: "급습 밧줄", 
        icon: "icon/passive5.webp", 
        desc: "필살기 발동 시 대상에게 1턴 간 받는 데미지 {0}% 증가 디버프 부여", 
        calc: [{ max: 15 }] 
      },
            { id: "khafka_skill8",
        name: "긴박 공감[마비]", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        ignoreBreakthrough: true,
        syncLevelWith: "khafka_skill4",
        buffEffects: { "필살기뎀증": { max: 33.75 } }, 
        buffDesc: "[마비]면역 대상으로 필살기 데미지 {0}% 증가", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        icon: "icon/passive2.webp", 
        desc: "자신이 지정한 목표물에게 마비 면역 효과가 있을 경우, 필살기 발동 시 자신 필살기 효과 {0}% 증가 발동", 
        calc: [{ max: 33.75 }]
      }
    ]
  },
  "baade": {
    title: "바드",
    desc: "바드에 대한 설명입니다.",
    base: { "공격력": 546, "HP": 2288 },
 
    info: { "속성": 0, "포지션": "전사" },
    defaultBuffSkills: ["baade_skill3","baade_skill4","baade_skill5", "baade_skill6", "baade_skill7"],
    skills: [
      { id: "baade_skill1", excludeFromBuffSearch: true, decimalPlaces: 2, name: "연료 분사 십자 곡괭이", icon: "icon/attack.webp", desc: "적에게 공격력 {0}%의 데미지를 줌", calc: [{ max: 100 }], damageDeal: [{ type: "보통공격", val: { max: 100 } }] },
      { id: "baade_skill2", 
        excludeFromBuffSearch: true, 
        hasStampEffect: true, 
        decimalPlaces: 2, 
        name: "쇄강 파공격", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 2턴) \n 적에게 공격력의 {0}% 데미지를 준 후, 대상에게 [각흔]이 없을 경우 [각흔]을 부여함", 
        stampDesc: "(쿨타임 : 2턴) \n 적에게 공격력의 {0}% 데미지를 주며, 대상이 [각흔]이 없을 경우 [각흔]을 부여하지만, [각흔]을 보유하고 있을 경우 {1}%의 추가 데미지를 줌", 
        calc: [{ max: 167 }, { max: 174.75 }], 
        damageDeal: [{ type: "필살공격", val: { max: 167 } }] 
      },
      { id: "baade_skill3", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "공증": { max: 30 } }, buffDesc: "공격력 {0}% 증가", name: "공격강화Ⅳ", icon: "icon/passive2.webp", desc: "자신의 공격력 {0}% 증가", calc: [{ max: 30 }] },
      { id: "baade_skill4", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "필살기뎀증": {max: 45} }, 
        buffDesc: "[각흔] 필살기 데미지 증가 {0}%", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        name: "그리움의 사랑 자장가", 
        icon: "icon/passive2.webp", 
        desc: "대상이 [각흔]을 보유하고 있을 경우 바드의 필살기 데미지가 {0}% 증가하며, [각흔]을 보유한 적을 필살기로 타격 시 [각흔] 해제", 
        calc: [{ max: 45 }] },
      { id: "baade_skill5", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "평타뎀증": { max: 60 } }, buffDesc: "[각흔] 보통공격 데미지 {0}% 증가", hasToggle: true, toggleType: "isAppliedStamped", name: "광맥 직감", icon: "icon/passive5.webp", desc: "대상이 [각흔]을 보유하고 있을 경우 바드의 보통공격 데미지 {0}% 증가", calc: [{ max: 60 }] },
      { id: "baade_skill6", excludeFromBuffSearch: true, decimalPlaces: 2, buffEffects: { "기초공증": { max: 15 }, "기초HP증가": { max: 15 } }, buffDesc: "기초공격력/HP {0}% 증가", name: "고강도 훈련 성과", icon: "icon/passive5.webp", desc: "자신의 기초 공격력, 기초 HP {0}% 증가", calc: [{ max: 15 }] },
      { id: "baade_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "필살기뎀증": { max: 45 } }, 
        hasToggle: true, 
        toggleType: "isAppliedStamped",         
        buffDesc: "[각흔] 필살기 데미지 {0}% 증가", 
        name: "집중 분쇄", 
        icon: "icon/passive5.webp", 
        desc: "[각흔]을 보유한 적을 보통공격으로 타격 시 2턴 간 바드의 필살기 데미지 {0}% 증가", 
        calc: [{ max: 45 }] },
            { id: "baade_stamp_passive", name: "각흔 추가타", icon: "images/sigilwebp/sigil_baade.webp", excludeFromBuffSearch: true, isUltExtra: true, damageDeal: [{ type: "추가공격", val: { max: 174.75 } }] }
          ]
        },
  "anuberus": {
    title: "아누비로스",
    base: { "공격력": 592, "HP": 2791 },
 
    info: { "속성": 4, "포지션": "방해" },
    defaultBuffSkills: ["anuberus_skill3","anuberus_skill4", "anuberus_skill6", "anuberus_skill7"],
    skills: [
       { 
        id: "anuberus_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "삼위일체・봉 회오리", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }] // 보통공격 분류 및 계수 추가
      },
      {
        id: "anuberus_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "니히히~ 우리도 왔다!", 
        hasToggle: true, // 토글 버튼 필요
        toggleType: "isAppliedStamped", // 어떤 속성을 토글할지 명시
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 1, 3, 5의 위치한 대상에게 공격력 {0}%의 데미지를 주며, 대상이 없을 시 다른 위치의 적 공격", 
        stampDesc: "(쿨타임 : 3턴) \n 1, 3, 5의 위치한 대상에게 공격력 {0}%의 데미지를 주며, 대상이 없을 시 다른 위치의 적 공격\n* 도장 패시브 : [흑구]와 [백구]가 발동상태인 경우, 아누비로스의 공격마다 {1}% 추가 데미지가 각각 발생",
        calc: [{ max: 80 }, { max: 30 }],
        damageDeal: [
            { type: "필살공격", val: { max: 240 } }
        ]
      },
      {
        id: "anuberus_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 12, attributeMax: 18, targetAttribute: 4 } }, // 어둠속성(4) 18%
        buffDesc: "공격력 {0}% 증가",
        name: "어둠속성 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력을 {0}% 증가시키며, 영향을 받은 아군이 어둠속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
            {
              id: "anuberus_skill4",
              excludeFromBuffSearch: false,
              decimalPlaces: 2,
              buffEffects: { "속성디버프":{ max: 7.5, targetAttribute: 4 } }, // 어둠속성(4) 전용
        buffDesc: "받는 어둠속성 데미지 증가 디버프 {1}% (최대 4중첩)", // 버프창 설명 추가
        hasCounter: true, // 카운터 버튼 필요
        counterRange: { min: 0, max: 4 }, // 0~6 로테이션
        name: "망자 관리부・풍기과",
        icon: "icon/passive2.webp",
        desc: " 매 행동시 각각 {0}% 확률로 2턴 간 [흑구]와[백구]를 깨우며, [흑구]와 [백구]가 발동상태인 경우, 각각 적을 공격하면 적에게 받는 어둠속성 데미지 {1}% 증가 디버프 부여 (3턴 최대 4중첩)",
        calc: [{ max: 50 }, { max: 7.5 }],
        startRate: 0.64 // 화산섬 전투의 춤 스킬 레벨별 계수 시작값 (Lv1: 0.64 ~ Lv10: 1.0)
      },
      {
        id: "anuberus_skill5",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "유령의 심장 심판", 
        icon: "icon/passive5.webp", 
        desc: "[흑구] 혹은 [백구] 가 있는 상태에서 적을 공격 시 대상에게 [지옥의 사냥개]를 각각 부여하며, (3턴 지속/최대 4중첩) 필살기 사용 시 적이 가진 [지옥의 사냥개]의 중첩 수만큼 {0}% 추가데미지 발생", 
        calc: [{ max: 50 }],
        damageDeal: [{ type: "추가공격", val: { max: 50 } }]
      },
      {
        id: "anuberus_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "anuberus_skill7",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
              buffEffects: { "필살기뎀증": { max: 15 } }, 
        buffDesc: "필살기 데미지 {0}% 증가 (최대 2중첩)", // 버프창 설명 추가
        hasCounter: true, // 카운터 버튼 필요
        counterRange: { min: 0, max: 2 }, // 최대 3중첩
        name: "무음모드・해제", 
        icon: "icon/passive5.webp", 
        desc: "[흑구], [백구]가 발동상태인 경우, 각각 아누비로스의 필살기 효과 {0}% 증가", 
        calc: [{ max: 27 }] 
      },
      {
        id: "anuberus_stamp_passive",
        name: "니히히~ 우리도 왔다!(도장)",
        icon: "images/sigilwebp/sigil_anuberus.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        damageDeal: [{ type: "추가공격", val: { max: 30 } }]
      }
    ]
  },
  "kumoyama": {
    title: "쿠모야마",
    desc: "쿠모야마에 대한 설명입니다.",
    base: { "공격력": 440, "HP": 2835 },
 
    info: { "속성": 2, "포지션": "수호" },
    defaultBuffSkills: ["kumoyama_skill3","kumoyama_skill4","kumoyama_skill5","kumoyama_skill6", "kumoyama_skill7"],
    skills: [
       { 
        id: "kumoyama_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "일섬참", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }] 
      },
            { id: "kumoyama_skill2", 
              excludeFromBuffSearch: true, 
              isMultiTarget: false, 
              hasStampEffect: true, 
              decimalPlaces: 2, 
              name: "열풍요란", 
              icon: "icon/attack(strong).webp", 
              desc: "(쿨타임 : 3턴) \n 자신에게 1턴 간 적을 도발하는 [조롱]효과를 부여하여 자신이 받는 데미지를 {0}% 감소시키며 공격 받을 때마다 대상에게 공격력 {1}%의 데미지를 줌, 또한 아군 전체에게 공격력의 {2}%의 힐과 2턴 지속의 공격력의 {3}% 배리어 부여", 
              stampDesc: "(쿨타임 : 3턴) \n 자신에게 1턴 간 적을 도발하는 [조롱]효과를 부여하여 자신이 받는 데미지를 {0}% 감소시키며 공격 받을 때마다 적 전체에게 공격력 {1}%의 데미지를 줌, 또한 아군 전체에게 공격력의 {2}%의 힐과 2턴 지속의 공격력의 {3}% 배리어 부여", 
              calc: [{ max: 30, stampMax: 30 }, { max: 60, stampMax: 60 }, { max: 37.5, stampMax: 75 },{ max: 12.5, stampMax: 25 }] , 
              damageDeal: [
                  { 
                      type: "추가공격", 
                      val: { max: 60, stampMax: 60 },
                      isSingleTarget: true,
                      stampIsMultiTarget: true
                  }
              ],
              // [추가] 힐과 배리어 데이터
              healDeal: [{ type: "필살회복", val: { max: 37.5, stampMax: 75 } }],
              barrierDeal: [{ type: "필살배리어", val: { max: 12.5, stampMax: 25 } }]
            },
      {
        id: "kumoyama_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "HP증가": { max: 12, attributeMax: 18, targetAttribute: 2 } }, // 나무속성(2) 18%
        buffDesc: "최대HP {0}% 증가", 
        name: "나무속성 생명 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 최대HP를 {0}% 증가시키며, 영향을 받은 아군이 나무속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "kumoyama_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "뎀증": { max: 16 } }, 
        buffDesc: "데미지 {0}% 증가", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        name: "만상 순환의 자세",
        icon: "icon/passive2.webp",
        desc: "쿠모야마가 공격할 때 50%의 확률로 2턴 간 데미지 {0}% 증가 및 1턴 간 자신이 받는 데미지 {1}% 감소",
        calc: [{ max: 16 }, { max: 16 }]
      },
      {
        id: "kumoyama_skill5",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "뎀증": { max: 16 } }, 
        buffDesc: "데미지 {0}% 증가", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        name: "발도 견벽의 자세",
        icon: "icon/passive5.webp",
        desc: "쿠모야마가 공격 받을 때 50%의 확률로 2턴 간 데미지 {0}% 증가 및 1턴 간 자신이 받는 데미지 {1}% 감소",
        calc: [{ max: 16 }, { max: 16 }]
      },
      { 
        id: "kumoyama_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { 
        id: "kumoyama_skill7",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        isUltBooster: true,
        buffDesc: "필살기 사용 시 데미지 {0}% 증가",
        name: "수파리・신성", 
        icon: "icon/passive5.webp", 
        desc: "필살기 사용 시 1턴 간 데미지 {0}% 증가", 
        calc: [{ max: 40 }] 
      }
    ]
  },
  "beernox": {
    title: "비어녹스",
    desc: "비어녹스에 대한 설명입니다.",
    base: { "공격력": 470, "HP": 2652 },
 
    info: { "속성": 2, "포지션": "보조" },
    defaultBuffSkills: ["beernox_skill1","beernox_skill2", "beernox_skill3", "beernox_skill4", "beernox_skill6","beernox_skill7","beernox_stamp_passive"], 
    skills: [
      { 
        id: "beernox_skill1",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        name: "노동 부하", 
        icon: "icon/attack.webp", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        ratioEffects: { "고정공증": { from: "기초공격력", max: 30 } },
        buffDesc: "비어녹스의 기초공격력의 {0}%만큼 공격력 가산",
        desc: "아군 전체에게 비어녹스의 기초공격력의 {0}%만큼 공격력 가산", 
        calc: [{ max: 30 }]
      },
      {
        id: "beernox_skill2",
        excludeFromBuffSearch: false,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "임박 상품 쟁탈전", 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        icon: "icon/attack(strong).webp", 
        ratioEffects: { "고정공증": { from: "기초공격력", max: 60 } },
        buffDesc: "비어녹스의 기초공격력의 {0}%만큼 공격력 가산",
        desc: "(쿨타임 : 3턴) \n 아군 전체에게 비어녹스의 기초공격력의 {0}%만큼 공격력 가산", 
        stampDesc: "(쿨타임 : 3턴) \n 아군 전체에게 비어녹스의 기초공격력의 {0}%만큼 공격력을 가산시키며, 33% 확률로 필살기 버프가 2배로 발동", 
        calc: [{ max: 60}],
      }, 
      {
        id: "beernox_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 15 } },
        buffDesc: "공격력 {0}% 증가", 
        name: "전체 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력 {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "beernox_skill4",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "뎀증": { max: 15 } }, 
        buffDesc: "나무속성이 3인 이상일 시 데미지 {0}% 증가", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        name: "특별 시급 두 배",
        icon: "icon/passive2.webp",
        desc: "파티에 나무속성의 아군이 3명 이상일 경우 아군 전체에게 데미지 {0}%증가 부여",
        calc: [{ max: 15 }]
      },
      { id: "beernox_skill5", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffEffects: { "회복증가": { max: 30 } }, // stampBuffEffects에서 buffEffects로 이동
        buffDesc: "HP비율이 가장 낮은 아군에게 회복량 {0}% 증가", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        name: "알바 열풍", 
        icon: "icon/passive5.webp", 
        desc: "보통공격 시 HP비율이 가장 낮은 아군에게 회복량 {0}% 증가 부여", 
        calc: [{ max: 30 }] 
      },
      {
        id: "beernox_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", 
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "beernox_skill7",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 2 } }, 
        buffDesc: "매턴 기초공격력 {0}% 증가 (최대 15중첩)", 
        hasCounter: true, 
        counterRange: { min: 0, max: 15 }, 
        name: "타임 체크", 
        icon: "icon/passive5.webp", 
        desc: "매턴 기초공격력 {0}% 증가 (최대 15중첩)", 
        calc: [{ max: 2 }] 
      },
      {
        id: "beernox_stamp_passive",
        name: "임박 상품 쟁탈전(도장)",
        decimalPlaces: 2,
        ratioEffects: { "고정공증": { from: "기초공격력", max: 60 } },  
        hasToggle: true,
        toggleType: "isAppliedStamped",          
        buffDesc: "비어녹스의 기초공격력의 {0}%만큼 공격력 가산",         
        icon: "images/sigilwebp/sigil_beernox.webp",
        excludeFromBuffSearch: false,
        isUltExtra: true,
        syncLevelWith: "beernox_skill2",
        toggleDependency: "beernox_skill2"
      }
    ]
  },
    "kyrian": {
    title: "기리안",
    desc: "기리안에 대한 설명입니다.",
    base: { "공격력": 545, "HP": 2291 },
 
    info: { "속성": 2, "포지션": "힐러" },
    defaultBuffSkills: ["kyrian_skill3","kyrian_skill6"],
    skills: [
       { 
        id: "kyrian_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "성스러운 반복송", 
        icon: "icon/attack.webp", 
        desc: "HP비율이 가장 적은 아군을 공격력의 {0}%만큼 회복", 
        calc: [{ max: 150 }],
        healDeal: [{ type: "보통회복", val: { max: 150 } }],
      },
            { id: "kyrian_skill2", 
              excludeFromBuffSearch: true, 
              hasStampEffect: true, 
              decimalPlaces: 2, 
              name: "자비의 성광 찬가", 
              icon: "icon/attack(strong).webp", 
              desc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 또한 2턴 간 공격력의 {1}%만큼 배리어 부여", 
              stampDesc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 또한 2턴 간 공격력의 {1}%만큼 배리어 부여, 필살기 발동 시 {2}% 확률로 행동불능의 아군을 부활", 
              calc: [{ max: 75}, { max: 25}, { max: 0, stampMax: 50, startRate: 0.64}], 
              healDeal: [{ type: "필살회복", val: { max: 75} }],
              barrierDeal: [{ type: "필살배리어", val: { max: 25} }]
            },
      {
        id: "kyrian_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "HP증가": { max: 15 } },
        buffDesc: "HP {0}% 증가", 
        name: "전체 생명 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 최대HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "kyrian_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "성광 수호",
        icon: "icon/passive2.webp",
        desc: "기리안의 보통공격 발동 시 보통공격의 대상에게 2턴 간 공격력의 {0}% 배리어 부여",
        calc: [{ max: 50 }],
        barrierDeal: [{ type: "추가배리어", val: { max: 50} }]
      },
      {
        id: "kyrian_skill5",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "성광 수호",
        icon: "icon/passive5.webp",
        desc: "기리안이 방어 시 아군 전체에게 2턴 간 공격력의 {0}% 배리어 부여",
        calc: [{ max: 25 }],
        barrierDeal: [{ type: "추가배리어", val: { max: 25} }]
      },
      { 
        id: "kyrian_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { 
        id: "kyrian_skill7",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "영광 찬가", 
        icon: "icon/passive5.webp", 
        desc: "필살기 사용 시 아군 전체에게 2턴 간 공격력의 {0}% 배리어 부여",
        calc: [{ max: 25 }],
        barrierDeal: [{ type: "추가배리어", val: { max: 25} }] 
      }
    ]
  },
    "meng": {
    title: "맹씨",
    base: { "공격력": 550, "HP": 2268 },
 
    info: { "속성": 1, "포지션": "힐러" },
    defaultBuffSkills: ["meng_skill3","meng_skill6","meng_skill7"],
    skills: [
       { 
        id: "meng_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "한잔 하면서 얘기?", 
        icon: "icon/attack.webp", 
        desc: "HP비율이 가장 적은 아군을 공격력의 {0}%만큼 회복", 
        calc: [{ max: 150 }],
        healDeal: [{ type: "보통회복", val: { max: 150 } }]
      },
            { id: "meng_skill2", 
              excludeFromBuffSearch: true, 
              hasStampEffect: true, 
              decimalPlaces: 2, 
              name: "내세의 빛", 
              icon: "icon/attack(strong).webp", 
              desc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 또한 3턴 간 공격력의 {1}%의 지속회복 부여", 
              stampDesc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 또한 3턴 간 공격력의 {1}%의 지속회복 부여, 또한 아군이 피격 시 1회에 한해 공격력의 {2}%만큼 회복", 
              calc: [{ max: 75}, { max: 25}, { max: 0, stampMax: 93.75}], 
              healDeal: [
                  { type: "필살회복", val: { max: 75 } },
                  { type: "지속회복", val: { max: 25 } },
                  { type: "추가회복", val: { max: 0, stampMax: 93.75 } }
              ]
            },
      {
        id: "meng_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "HP증가": { max: 15 } },
        buffDesc: "HP {0}% 증가", 
        name: "전체 생명 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 최대HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "meng_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "취심신왕",
        icon: "icon/passive2.webp",
        desc: "맹씨의 보통공격 발동 시 보통공격의 대상에게 3턴 간 공격력의 {0}%의 지속회복 부여",
        calc: [{ max: 50 }],
        healDeal: [{ type: "지속회복", val: { max: 50 } }]      
      },
      {
        id: "meng_skill5",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "고통의 망각주",
        icon: "icon/passive5.webp",
        desc: "맹씨의 보통공격마다 [할인 쿠폰]을 1스택을 쌓으며, 스택 수가 3중첩이상일 때 방어 사용 시 스택을 모두 소모해 아군 전체에게 공격력의 {0}%만큼 회복",
        calc: [{ max: 75 }],
        healDeal: [{ type: "추가회복", val: { max: 75 } }]      
      },
      { 
        id: "meng_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { 
        id: "meng_skill7",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "회복증가": { max: 5 } }, 
        buffDesc: "받는 회복량 {0}% 증가(최대 3중첩)",
        hasCounter: true, 
        counterRange: { min: 0, max: 3 },         
        name: "삼생의 맹세", 
        icon: "icon/passive5.webp", 
        desc: "자신을 포함한 아군이 공격 받을 경우 공격받은 아군에게 2턴 간 받는 회복량 {0}% 증가 버프를 부여(최대 3중첩)",
        calc: [{ max: 5 }]
      }
    ]
  },  
  "locke": {
    title: "카 라트",
    base: { "공격력": 540, "HP": 2310 },
 
    info: { "속성": 1, "포지션": "전사" },
    defaultBuffSkills: ["locke_skill8","locke_skill3", "locke_skill4", "locke_skill5", "locke_skill6"],
    skills: [
       { 
        id: "locke_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "사냥 출격", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "locke_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "광야 포격 돌진", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 대상에게 공격력 {0}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 대상에게 공격력 {0}%의 데미지를 줌 \n* 도장 패시브 : HP가 50% 이상인 적을 보통공격 시 [호혈표지](3턴 지속)를 획득하며, [호혈표지]가 2중첩 이상일 경우 필살기 데미지 {1}% 증가",
        calc: [{ max: 200},{ max: 33.75}],
        damageDeal: [
            { type: "필살공격", val: { max: 200 } }
        ]
      },
      {
        id: "locke_skill3",
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "공증": { max: 30 } }, 
        buffDesc: "공격력 {0}% 증가", 
        name: "공격강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "자신의 공격력 {0}% 증가", 
        calc: [{ max: 30 }] 
      },
      {
        id: "locke_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "뎀증":{ max: 15 } },
        buffDesc: "상대 HP구간에 따른 데미지 증가 {0}%(최대 4중첩)", // 버프창 설명 추가
        hasCounter: true, // 카운터 버튼 필요
        counterRange: { min: 0, max: 4 },
        name: "상어 사냥 추격",
        icon: "icon/passive2.webp",
        desc: "공격대상의 HP가 75%, 50%, 25%미만일 경우 각 구간마다 데미지가 {0}%씩 증가(최대 45%)",
        calc: [{ max: 15}]
      },
      { id: "locke_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증": {max:5} }, 
        buffDesc: "피격 시 데미지 {0}% 증가(최대 3중첩)", 
        hasCounter: true, // 카운터 버튼 필요
        counterRange: { min: 0, max: 3 },
        name: "분노의 해류", 
        icon: "icon/passive2.webp", 
        desc: "카라트가 피격 시 2턴 간 카라트의 데미지 {0}% 증가(최대 3중첩)", 
        calc: [{ max: 5 }],
      },
      {
        id: "locke_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "locke_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        name: "피의 공명", 
        icon: "icon/passive5.webp", 
        desc: "[호혈표지]가 2중첩 이상이거나 공격대상의 HP가 25% 미만일 경우, 필살기 사용 시 공격력의 {0}% 추가데미지를 줌", 
        calc: [{ max: 100 }], 
        damageDeal: [{ type: "추가공격", val: { max: 100 } }] 
      },
      {
        id: "locke_skill8",
        name: "광야 포격 돌진(도장)",
        decimalPlaces: 2,
        stampBuffEffects: { "필살기뎀증": { max: 33.75 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "[호혈표지] 2중첩 이상인 경우 필살기 데미지 {0}% 증가",       
        icon: "images/sigilwebp/sigil_locke.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        syncLevelWith: "locke_skill2",
        calc: [{ max: 33.75}]          
      }    
    ]
  },  
  "orem": {
    title: "오렘",
    base: { "공격력": 444, "HP": 2808 },
 
    info: { "속성": 1, "포지션": "수호" },
    defaultBuffSkills: ["orem_skill3", "orem_skill4", "orem_skill6"],
    skills: [
       { 
        id: "orem_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "규율의 검", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "orem_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "현측 방어 전개", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 자신의 최대 HP의 {0}% 만큼 아군 전체에게 2턴 지속 [배리어] 부여", 
        stampDesc: "(쿨타임 : 3턴) \n 자신의 최대 HP의 {0}% 만큼 아군 전체에게 2턴 지속의 [배리어] 부여 \n* 도장 패시브 : 각 아군이 [배리어]를 보유한 상태에서 적을 공격 할 경우 대상에게 공격자의 공격력 {1}% 만큼의 추가데미지를 줌",
        calc: [{ max: 20},{ max: 25}],
        barrierDeal: [
            { type: "HP필살배리어", val: { max: 20 } }
        ]
      },
      {
        id: "orem_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "HP증가": { max: 12, attributeMax: 18, targetAttribute: 1 } }, // 어둠속성(4) 18%
        buffDesc: "최대 HP {0}% 증가",
        name: "물속성 생명 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 최대 HP를 {0}% 증가시키며, 영향을 받은 아군이 물속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "orem_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffDesc: "배리어 효과 {0}% 증가(최대 2중첩)", // 버프창 설명 추가
        buffEffects: { "배리어증가": { max: 16}},        
        hasCounter: true, // 카운터 버튼 필요
        counterRange: { min: 0, max: 2 },
        name: "전함 명령:엄수",
        icon: "icon/passive2.webp",
        desc: "보통공격 시 50% 확률로 3턴 간 자신에게 배리어 효과 {0}% 증가 버프 부여(최대 2중첩)",
        calc: [{ max: 16}]
      },
      { id: "orem_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        name: "방어 장갑:가시", 
        icon: "icon/passive2.webp", 
        desc: "필살기 발동 시 50% 확률로 1턴 간 아군에게 받는 필살기 데미지 {0}% 감소 부여", 
        calc: [{ max: 15 }],
      },
      {
        id: "orem_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가",
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "orem_skill7", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2,    
        buffEffects: { "추가데미지": { max: 50 } },                     
        buffDesc: "[배리어]가 있는 상태에서 피격 시 {0}% 추가 데미지",              
        name: "충격 역류", 
        icon: "icon/passive5.webp", 
        desc: "각 아군이 [배리어]를 보유한 상태에서 피격당할 경우 대상에게 피격자의 공격력 {0}% 만큼의 추가데미지를 줌 \n*단 피격 후 [배리어]가 사라지면 발동되지 않음", 
        calc: [{ max: 50 }], 
        damageDeal: [{ type: "추가공격", val: { max: 50 } }] 
      },
      {
        id: "orem_skill8",
        name: "현측 방어 전개(도장)",
        decimalPlaces: 2, 
        stampBuffEffects: { "추가데미지": { max: 25 } },             
        buffDesc: "[배리어]가 있는 상태에서 공격 시 {0}% 추가 데미지",       
        icon: "images/sigilwebp/sigil_orem.webp",
        excludeFromBuffSearch: false,
        isUltExtra: true,
        syncLevelWith: "orem_skill2",
        calc: [{ max: 25}],   
        damageDeal: [{ type: "추가공격", val: { max: 25 } }]                
      }    
    ]
  },    
    "leo": {
    title: "레오",
    base: { "공격력": 556, "HP": 2246 },
 
    info: { "속성": 0, "포지션": "힐러" },
    defaultBuffSkills: ["leo_skill3","leo_skill5","leo_skill6","leo_skill7"],
    skills: [
       { 
        id: "leo_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "도령님의 위풍당당", 
        icon: "icon/attack.webp", 
        desc: "HP비율이 가장 적은 아군을 공격력의 {0}%만큼 회복시키며 2턴 간 매턴 공격력의 {1}%의 지속회복", 
        calc: [{ max: 49.5 },{ max: 50.25 }],
        healDeal: [{ type: "보통회복", val: { max: 49.5 } },{ type: "지속회복", val: { max: 50.25 } }]
      },
            { id: "leo_skill2", 
              excludeFromBuffSearch: true, 
              hasStampEffect: true, 
              decimalPlaces: 2, 
              name: "모두! 파티 시작이야!", 
              icon: "icon/attack(strong).webp", 
              desc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 2턴 간 공격력의 {1}%의 지속회복", 
              stampDesc: "(쿨타임 : 3턴) \n 아군 전체를 대상으로 공격력의 {0}%만큼 회복시키며 3턴 간 공격력의 {1}%의 지속회복 부여, \n* 도장 패시브 : 각 아군이 지속회복을 보유하고 있을 경우 대상 아군이 받는 데미지 {2}% 감소", 
              calc: [{ max: 49.5}, { max: 50.25}, { max: 7.5}], 
              healDeal: [{ type: "필살회복", val: { max: 49.5 } },{ type: "지속회복", val: { max: 50.25 } }]
            },
      {
        id: "leo_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "HP증가": { max: 15 } },
        buffDesc: "HP {0}% 증가", 
        name: "전체 생명 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 최대HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "leo_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "파티꾼 레오",
        icon: "icon/passive2.webp",
        desc: "레오의 보통공격 발동 시 보통공격의 대상에게 2턴 간 공격력의 {0}%의 지속회복을 부여하며, 또한 같은 대상에게 2턴 간 받는 데미지 {1}% 감소를 부여",
        calc: [{ max: 37.5 },{ max: 5 }],
        healDeal: [{ type: "지속회복", val: { max: 37.5 } }]      
      },
      {
        id: "leo_skill5",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "지속회복증가": { max: 15 } },
        buffDesc: "지속회복 효과 {0}% 증가",        
        hasToggle: true,
        toggleType: "isAppliedStamped",         
        name: "Rose de Léon",
        icon: "icon/passive5.webp",
        desc: "레오가 방어 시 아군 전체에게 2턴 간 받는 지속회복 효과 {0}% 증가를 부여",
        calc: [{ max: 15 }]
      },
      { 
        id: "leo_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가",
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { 
        id: "leo_skill7",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 24 } },
        buffDesc: "공격력 {0}% 증가",        
        hasToggle: true,
        toggleType: "isAppliedStamped",           
        name: "시선을 받는 중심", 
        icon: "icon/passive5.webp", 
        desc: "보통공격 시 50% 확률로 3턴 간 공격력 {0}% 증가",
        calc: [{ max: 24 }]
      }
    ]
  },    
  "tyrantino": {
    title: "타란디오",
    base: { "공격력": 510, "HP": 2450 },
 
    info: { "속성": 1, "포지션": "방해" },
    defaultBuffSkills: ["tyrantino_skill3", "tyrantino_skill6","tyrantino_skill7"],
    skills: [
       { 
        id: "tyrantino_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "광란의 발톱", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "tyrantino_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "전율의 용의 위압", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 적의 데미지를 {0}% 감소시킨 후, 대상에게 공격력 {1}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 적의 데미지를 {0}% 감소시킨 후, 대상에게 공격력 {1}%의 데미지를 줌 \n* 도장 패시브 : 타란디오가 필살기 사용 시 적 전체에게 [용족의 위압]을 3중첩 부여하며 또는 피격 시 적 전체에게 [용족의 위압]을 1중첩 부여 / [용족의 위압] : 공격력 3% 감소 (2턴 지속 / 최대 5중첩)",
        calc: [{ max: 30},{ max: 160}],
        damageDeal: [{ type: "필살공격", val: { max: 160 } }]
      },
      {
        id: "tyrantino_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 12, attributeMax: 18, targetAttribute: 1 } }, 
        buffDesc: "공격력 {0}% 증가",
        name: "물속성 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력을 {0}% 증가시키며, 영향을 받은 아군이 물속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "tyrantino_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        isMultiTarget: true,         
        name: "용족의 분노",
        icon: "icon/passive2.webp",
        desc: "타란디오가 피격 시 자신에게 [용의 분노]를 1스택 부여하며(최대 3스택), [용의 분노]가 3중첩 일 때 필살기 사용 시 스택을 모두 소모해 적 전체에게 공격력 {0}의 데미지를 줌",
        calc: [{ max: 187.5}],
        damageDeal: [{ type: "추가공격", val: { max: 187.5 } }]
      },
      { id: "tyrantino_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        name: "용의 역린", 
        icon: "icon/passive2.webp", 
        desc: "공격대상의 [용족의 위압] 3중첩 이상일 경우 공격할 때 적 전체에게 공격력의 {0}% 데미지를 줌", 
        calc: [{ max: 75 }],
        damageDeal: [{ type: "추가공격", val: { max: 75 } }]        
      },
      {
        id: "tyrantino_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가",
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "tyrantino_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,    
        buffEffects: { "뎀증": { max: 30 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",                                    
        buffDesc: "대상에게 데미지 감소 효과가 있을 경우 데미지 {0}% 증가",              
        name: "승리의 Lowball", 
        icon: "icon/passive5.webp", 
        desc: "공격대상에게 데미지 감소 효과가 있을 경우 타란디오의 데미지 {0}% 증가", 
        calc: [{ max: 30 }]
      }
    ]
  },
  "wang": {
    title: "멍",
    base: { "공격력": 475, "HP": 2626 },
 
    info: { "속성": 2, "포지션": "보조" },
    defaultBuffSkills: ["wang_skill3", "wang_skill4","wang_skill5","wang_skill6","wang_skill7"],
    skills: [
       { 
        id: "wang_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "위더 사냥꾼", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "wang_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        stampBuffEffects: { "추가데미지": { max: 20 } },             
        buffDesc: "보통공격 시 {0}% 추가 데미지",              
        name: "패란의 영감", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 3턴 간 각 아군이 보통공격으로 적을 공격할 경우 대상에게 공격자의 공격력 {0}% 만큼의 추가데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 3턴 간 각 아군이 보통공격으로 적을 공격할 경우 대상에게 공격자의 공격력 {0}% 만큼의 추가데미지를 주며, 각 보통공격마다 50% 확률로 추가데미지가 1회 더 발동",
        calc: [{ max: 20}],   
        damageDeal: [{ type: "추가공격", val: { max: 20 } }] 
      },
      {
        id: "wang_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 15 } },
        buffDesc: "공격력 {0}% 증가",
        name: "전체 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력 {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "wang_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffDesc: "보통공격 데미지 {0}% 증가",
        buffEffects: { "평타뎀증": { max: 30}},        
        name: "혼란스러운 물감",
        icon: "icon/passive2.webp",
        desc: "아군 전체의 보통공격 데미지 {0}% 증가",
        calc: [{ max: 30}]
      },
      { id: "wang_skill5", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffDesc: "멍이 피격 시 데미지 {0}% 증가(최대 2중첩)",
        buffEffects: { "뎀증": { max: 5}},                
        hasCounter: true,
        counterRange: { min: 0, max: 2 },  
        name: "영감 공명", 
        icon: "icon/passive2.webp", 
        desc: "멍이 피격 시 2턴 간 아군 전체의 데미지 5% 증가(최대 2중첩)", 
        calc: [{ max: 5 }]
      },
      {
        id: "wang_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가",
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "wang_skill7", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2,    
        buffEffects: { "공증": { max: 11.25 } },                     
        buffDesc: "공격력 {0}% 증가",              
        name: "솟구치는 창작욕", 
        icon: "icon/passive5.webp", 
        desc: "아군 전체의 공격력 {0}% 증가, 또한 1턴째에 멍의 필살기 쿨타임 초기화", 
        calc: [{ max: 11.25 }]
      }
    ]
  }, 
  "shinrirang": {
    title: "신리랑",
    base: { "공격력": 525, "HP": 2379 },
 
    info: { "속성": 1, "포지션": "전사" },
    defaultBuffSkills: ["shinrirang_skill8","shinrirang_skill3", "shinrirang_skill4", "shinrirang_skill5", "shinrirang_skill6","shinrirang_skill7"],
    skills: [
       { 
        id: "shinrirang_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "비성락", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "shinrirang_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "1800도 회전 발차기", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 대상에게 공격력 {0}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 대상에게 공격력 {0}%의 데미지를 줌 \n* 도장 패시브 : 필살기 사용 시 50% 확률로 1턴 간 자신의 추가데미지의 데미지 {1}% 증가하며, 또한 별개의 50% 확률로 대상에게 {2}%의 데미지를 줌 (모든 도장패시브의 효과는 패시브2 이후에 발동)", //이거 젯블 트리거뎀증이랑 똑같은 건지 확인 해야함 
        calc: [{ max: 200},{ max: 30},{ max: 40}],
        damageDeal: [
            { type: "필살공격", val: { max: 200 } }
        ]
      },
      {
        id: "shinrirang_skill3",
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "공증": { max: 30 } }, 
        buffDesc: "공격력 {0}% 증가", 
        name: "공격강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "자신의 공격력 {0}% 증가", 
        calc: [{ max: 30 }] 
      },
      {
        id: "shinrirang_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "트리거뎀증": { max: 60 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "추가데미지의 데미지 {0}% 증가",  
        name: "내기혼신・늑대",
        icon: "icon/passive2.webp",
        desc: "필살기 사용 시 50% 확률로 1턴 간 자신의 추가데미지의 데미지 {0}% 증가하며, 또한 별개의 50% 확률로 대상에게 {1}%의 데미지를 줌",
        calc: [{ max: 60},{ max: 80}],         
        damageDeal: [{ type: "추가공격", val: { max: 80 } }]   
      },
      { id: "shinrirang_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증": { max: 25 } }, 
        hasCounter: true, 
        counterRange: { min: 0, max: 2 }, 
        buffDesc: "보통공격 피격 시 데미지 {1}% 증가(최대 2중첩)",  
        name: "반격 연환각", 
        icon: "icon/passive2.webp", 
        desc: "신리랑이 보통공격으로 피격 시 대상에게 {0}%의 데미지를 주며, 2턴 간 데미지 {1}% 증가(최대 2중첩)", 
        calc: [{ max: 100 },{ max: 25 }],
      },
      {
        id: "shinrirang_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "shinrirang_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "공증": { max: 3 } }, 
        hasCounter: true, 
        counterRange: { min: 0, max: 10 },   
        buffDesc: "매 공격마다 공격력 {0}% 증가(최대 10중첩)",                
        name: "풍월의 혼", 
        icon: "icon/passive5.webp", 
        desc: "공격 할 때마다 공격력 {0}% 증가(최대 10중첩)", 
        calc: [{ max: 3 }]
      },
      {
        id: "shinrirang_skill8",
        name: "1800도 회전 발차기(도장)",
        decimalPlaces: 2,
        stampBuffEffects: { "트리거뎀증": { max: 30 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "추가데미지의 데미지 {0}% 증가",       
        icon: "images/sigilwebp/sigil_shinrirang.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        syncLevelWith: "shinrirang_skill2",
        calc: [{ max: 30}],         
        damageDeal: [{ type: "추가공격", val: { max: 40 } }]       
      }    
    ]
  },   
  "tamrang": {
    title: "탐랑",
    base: { "공격력": 515, "HP": 2427 },
 
    info: { "속성": 0, "포지션": "방해" },
    defaultBuffSkills: ["tamrang_skill8","tamrang_skill3", "tamrang_skill4", "tamrang_skill5", "tamrang_skill6","tamrang_skill7"],
    skills: [
       { 
        id: "tamrang_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "낙함흉성", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "tamrang_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "선향욕기", 
        isMultiTarget: true,         
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 적 전체에게 공격력 {0}%의 데미지를 주며 {1}% 확률로 수면 상태 부여", 
        stampDesc: "(쿨타임 : 3턴) \n 적 전체에게 공격력 {0}%의 데미지를 준 후 {1}% 확률로 수면 상태와 2턴 지속의 받는 데미지 75% 증가를 부여(대상이 데미지를 받은 후 즉시 받는 데미지 증가 효과 해제)",
        calc: [{ max: 80},{ max: 40 ,startRate: 0.73}],
        damageDeal: [
            { type: "필살공격", val: { max: 80 } }
        ]
      },
      {
        id: "tamrang_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 12, attributeMax: 18, targetAttribute: 4 } },
        buffDesc: "공격력 {0}% 증가",
        name: "불속성 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력을 {0}% 증가시키며, 영향을 받은 아군이 불속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "tamrang_skill4",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "뎀증디버프": { max: 16 } }, 
        buffDesc: "받는 데미지 {0}% 증가 디버프 부여", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        name: "복숭아꽃 개화",
        icon: "icon/passive2.webp",
        desc: "공격할 시 50%의 확률로 대상에게 2턴 간 받는 데미지 {0}% 증가 디버프를 부여",
        calc: [{ max: 16 }]
      },
      { id: "tamrang_skill5", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증": { max: 36 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "수면 상태 대상 공격의 데미지 {0}% 증가",  
        name: "반격 연환각", 
        icon: "icon/passive2.webp", 
        desc: "각 아군이 수면 상태의 대상 공격 시 아군의 공격 데미지 {0}% 증가", 
        calc: [{ max: 36 }],
      },
      {
        id: "tamrang_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "tamrang_skill7", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증디버프": { max: 16 } }, 
        buffDesc: "받는 데미지 {0}% 증가 디버프 부여", 
        hasToggle: true,
        toggleType: "isAppliedStamped",              
        name: "홍란천희", 
        icon: "icon/passive5.webp", 
        desc: "필살기 발동 시 1턴 간 적 전체에게 받는 데미지 {0}% 증가 부여", 
        calc: [{ max: 16 }]
      },
      {
        id: "tamrang_skill8",
        name: "선향욕기(도장)",
        decimalPlaces: 2,
        stampBuffEffects: { "뎀증": { fixed: 75 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "데미지 {0}% 증가(1회용)",       
        icon: "images/sigilwebp/sigil_tamrang.webp",
        excludeFromBuffSearch: false,
        isUltExtra: true,
        syncLevelWith: "tamrang_skill2",
        calc: [{ fixed: 75}]   
      }    
    ]
  },                
  "goldenryder": {
    title: "골든라이더",
    base: { "공격력": 514, "HP": 2427 },
 
    info: { "속성": 0, "포지션": "전사" },
    customControls: [
      { id: "blazing_stride", type: "counter", label: "열화질보", min: 0, max: 6, initial: 0 } ],  
    defaultBuffSkills: ["goldenryder_skill8","goldenryder_skill3", "goldenryder_skill4", "goldenryder_skill5", "goldenryder_skill6"],
    skills: [
       { 
        id: "goldenryder_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "나를 잘 따라와!", 
        icon: "icon/attack.webp", 
        desc: "대상에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "goldenryder_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        stampBuffEffects: { "평타뎀증": { max: 50 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "보통공격 데미지 {0}% 증가",        
        name: "봐, 1등은 간단하지?", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 3턴 간 자신의 보통공격 데미지가 {0}% 증가하며 자신의 보통공격에 공격력의 {1}% 추가데미지 부여", 
        stampDesc: "(쿨타임 : 3턴) \n 3턴 간 자신의 보통공격 데미지가 {0}% 증가하며 자신의 보통공격에 공격력의 {1}% 추가데미지 부여 \n* 도장 패시브 : 골든라이더가 공격할 시 33% 확률로 자신에게 2턴 지속의 [열화질보] 효과 1중첩 부여",
        calc: [{ max: 50 },{ max: 50, stampMax:100}],
        damageDeal: [{ type: "추가공격", val: { max: 50 , stampMax:100} }]
      },
      {
        id: "goldenryder_skill3",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 30 } },
        buffDesc: "공격력 {0}% 증가",
        name: "공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "공격력 {0}% 증가", 
        calc: [{ max: 30 }] 
      },
      {
        id: "goldenryder_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "평타뎀증": { max: 10 } }, 
        buffDesc: "[열화질보] 보통공격 데미지 {0}% 증가", 
        customLink: { id: "blazing_stride", multiply: true },
        name: "이제 전력을 다할 거야!",
        icon: "icon/passive2.webp",
        desc: "전투시작 시 자신에게 2턴 지속의 [열화질보] 6중첩을 부여하며, 골든라이더가 공격할 시 33% 확률로 자신에게 2턴 지속 [열화질보] 효과 1중첩 부여 \n* [열화질보] : 보통공격 데미지 {0}% 증가(최대 6중첩)",
        calc: [{ max: 10 }]
      },
      { id: "goldenryder_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "뎀증": { max: 20 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "피격 시 데미지 {0}% 증가",  
        name: "불타오른다——!", 
        icon: "icon/passive2.webp", 
        desc: "피격 시 자신에게 2턴 지속의 [열화질보] 1중첩을 부여하며 2턴 간 데미지 {0}% 증가", 
        calc: [{ max: 20 }]
      },
      {
        id: "goldenryder_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "goldenryder_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,           
        name: "뜨겁게 달려!", 
        icon: "icon/passive5.webp", 
        desc: "필살기 발동 시 3턴 간 자신의 보통공격에 {0}%의 추가데미지 부여 또한 골든라이더가 공격할 시 33% 확률로 자신에게 2턴 지속 [열화질보] 효과 1중첩 부여", 
        calc: [{ max: 50 }],
        damageDeal: [{ type: "추가공격", val: { max: 50} }]        
      }
    ]
  },
  "jetblack": {
    title: "제트블랙",
    base: { "공격력": 494, "HP": 2524 },
 
    info: { "속성": 1, "포지션": "보조" },  
    defaultBuffSkills: ["jetblack_skill1","jetblack_skill2","jetblack_skill3", "jetblack_skill5", "jetblack_skill6"],
    skills: [
      { 
        id: "jetblack_skill1",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        name: "출발 신호", 
        icon: "icon/attack.webp", 
        hasToggle: true,
        toggleType: "isAppliedStamped",
        ratioEffects: { "고정공증": { from: "기초공격력", max: 30 } },
        buffDesc: "제트블랙의 기초공격력 {0}%만큼 공격력 가산",
        desc: "아군 전체에게 제트블랙의 기초공격력 {0}%만큼 공격력 가산", 
        calc: [{ max: 30 }]
      },
      {
        id: "jetblack_skill2",
        excludeFromBuffSearch: false,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "고요한 호흡", 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        icon: "icon/attack(strong).webp", 
        ratioEffects: { "고정공증": { from: "기초공격력", max: 15 } },
        buffDesc: "제트블랙의 기초공격력의 {0}%만큼 공격력 가산",
        desc: "(쿨타임 : 3턴) \n 아군 전체에게 3턴 간 제트블랙의 기초공격력 {0}%만큼 공격력 가산시키며 발동 스킬 효과 {1}% 증가", 
        stampDesc: "(쿨타임 : 3턴) \n 아군 전체에게 3턴 간 제트블랙의 기초공격력 {0}%만큼 공격력 가산시키며 발동 스킬 효과 {1}% 증가 \n* 도장 패시브 : 자신을 제외한 각 아군이 보통공격 시 33%의 확률로 제트블랙에게 [체력응축] 1스택 부여", 
        calc: [{ max: 15},{ max: 30}]
      }, 
      {
        id: "jetblack_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 15 } },
        buffDesc: "공격력 {0}% 증가",
        name: "전체 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력 {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "jetblack_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "매서운 질주의 길",
        icon: "icon/passive2.webp",
        desc: "제트블랙이 보통공격 시 자신에게 [체력응축] 1스택 부여(최대 6스택), [체력응축]이 6스택일 경우 필살기 발동 시 스택을 모두 소모해 대상에게 공격력 {0}%의 데미지를 줌",
        calc: [{ max: 200 }],
        damageDeal: [{ type: "추가공격", val: { max: 200} }]            
      },
      { id: "jetblack_skill5", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        buffEffects: { "트리거뎀증": { max: 24 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "발동스킬의 효과 {0}% 증가",  
        name: "마음의 물결을 멈추다", 
        icon: "icon/passive2.webp", 
        desc: "제트블랙이 보통공격 시 50% 확률로 2턴 간 아군 전체의 발동스킬 효과 {0}% 증가", 
        calc: [{ max: 24 }]
      },
      {
        id: "jetblack_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", // 버프창 설명 추가
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "jetblack_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,           
        name: "전력 응원", 
        icon: "icon/passive5.webp", 
        desc: "자신의 보통공격에 공격력 {0}%의 추가데미지를 부여", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "추가공격", val: { max: 100} }]        
      }
    ]
  },        
  "rutenix": {
    title: "루테닉스",
    base: { "공격력": 495, "HP": 2525 },
 
    info: { "속성": 2, "포지션": "방해" },  
    defaultBuffSkills: ["rutenix_skill2","rutenix_skill3", "rutenix_skill4","rutenix_skill5", "rutenix_skill6","rutenix_skill7"],
    skills: [
      { 
        id: "rutenix_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "상업 기회 발견", 
        icon: "icon/attack.webp", 
        desc: "목표물에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "rutenix_skill2",
        excludeFromBuffSearch: false,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "앵커 혼란", 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        icon: "icon/attack(strong).webp", 
        ratioEffects: { "고정공증": { from: "기초공격력", max: 45 , stampMax:90} },
        buffDesc: "루테닉스 기초공격력의 {0}%만큼 공격력 가산",
        desc: "(쿨타임 : 3턴) \n 2턴 간 루테닉스의 기초공격력의 {0}%만큼 대상의 공격력을 흡수해 포지션 5의 아군에게 1턴 간 부여 그리고 흡수했던 대상에게 공격력 {1}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 2턴 간 루테닉스의 기초공격력의 {0}%만큼 대상의 공격력을 흡수해 포지션 5의 아군에게 1턴 간 부여 그리고 흡수했던 대상에게 공격력 {1}%의 데미지를 줌", 
        calc: [{ max: 45,stampMax:90},{ max: 125}],
        damageDeal: [{ type: "필살공격", val: { max: 125 } }]        
      }, 
      {
        id: "rutenix_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 12, attributeMax: 18, targetAttribute: 2 } }, // 나무속성(2) 18%
        buffDesc: "공격력 {0}% 증가", 
        name: "나무속성 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력을 {0}% 증가시키며, 영향을 받은 아군이 나무속성일 경우 추가로 {1}% 증가", 
        calc: [{ max: 12 }, { max: 6 }] 
      },
      {
        id: "rutenix_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15} },
        hasCounter: true, 
        counterRange: { min: 0, max: 2 },      
        buffDesc: "보통공격 시 50% 확률로 기초공격력 {0}% 증가(최대 2중첩)",         
        name: "매직 큐브의 봉인벽",
        icon: "icon/passive2.webp",
        desc: "보통공격 시 2턴 간 적 전체에게 공격력 {0}% 감소를 부여하며, 50% 확률로 3턴 간 루테닉스의 기초공격력 {1}% 증가(최대 2중첩)",
        calc: [{ max: 7.5 }, { max: 15 }]      
      },
      { id: "rutenix_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "기초공증": { max: 30 } }, 
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "피격 시 기초공격력 {0}% 증가",  
        name: "큐브 레이저 필드", 
        icon: "icon/passive2.webp", 
        desc: "루테닉스가 피격 시 자신의 기초공격력 {0}% 증가", 
        calc: [{ max: 30 }]
      },
      {
        id: "rutenix_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", 
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "rutenix_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 12} },
        hasCounter: true, 
        counterRange: { min: 0, max: 4 },           
        buffDesc: "아군이 보통공격 시 50% 확률로 기초공격력 {0}% 증가(최대 4중첩)",          
        name: "분해 분석", 
        icon: "icon/passive5.webp", 
        desc: "자신을 제외한 각 아군이 보통공격 시 50% 확률로 2턴 간 루테닉스의 기초공격력 {0}% 증가(최대 4중첩)", 
        calc: [{ max: 12 }] 
      }
    ]
  },      
  "duncan": {
    title: "던컨 찰스",
    base: { "공격력": 499, "HP": 2500 },
    info: { "속성": 0, "포지션": "보조" },
    defaultBuffSkills: ["duncan_skill3", "duncan_skill4", "duncan_skill6","duncan_skill7","duncan_skill8","duncan_skill9"],
    skills: [
       { 
        id: "duncan_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "마탄 심문법", 
        icon: "icon/attack.webp", 
        desc: "포지션 2, 3, 4에 있는 적에게 공격력 {0}%의 데미지를 주며 대상이 없을 시 다른 위치의 적 공격", 
        calc: [{ max: 120 , startRate: 0.64}],
        damageDeal: [{ type: "보통공격", val: { max: 120,startRate:0.64 } }]
      },
      {
        id: "duncan_skill2",
        excludeFromBuffSearch: false,
        hasStampEffect: true,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 30,startRate:0.64} },
        buffDesc: "공격력 {0}% 증가", 
        hasToggle: true,
        toggleType: "isAppliedStamped",                    
        name: "지팡이보다 먹힌다구!", 
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 1턴 간 아군 전체의 공격력을 {0}% 증가시킨 후 포지션 2, 3, 4에 있는 적에게 공격력 {1}%의 데미지를 주며 대상이 없을 시 다른 위치의 적 공격", 
        stampDesc: "(쿨타임 : 3턴) \n 1턴 간 아군 전체의 공격력을 {0}% 증가시킨 후 포지션 2, 3, 4에 있는 적에게 공격력 {1}%의 데미지를 주며 대상이 없을 시 다른 위치의 적 공격 \n* 도장 패시브 : 필살기 발동 시 [마도 집중]을 1스택 쌓으며(최대 2스택) [마도 집중]이 2스택일 경우 자신의 데미지가 {2}% 증가함 (이 효과는 공격 시 해제)",
        calc: [{ max: 30,startRate:0.64},{ max: 40 , startRate:0.64},{ max: 150 , startRate:0.64}],
        damageDeal: [{ type: "필살공격", val: { max: 120,startRate:0.64 } }]
      },
      {
        id: "duncan_skill3",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 15 } },
        buffDesc: "공격력 {0}% 증가", 
        name: "전체 공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "아군 전체의 공격력 {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      {
        id: "duncan_skill4",
        excludeFromBuffSearch: false,
        decimalPlaces: 2,
        buffDesc: "던컨이 보통공격 시 공격력 {0}% 증가", // 버프창 설명 추가
        buffEffects: { "공증": { max: 16, startRate:0.64}},        
        hasToggle: true,
        toggleType: "isAppliedStamped",            
        name: "마탄 충기법",
        icon: "icon/passive2.webp",
        desc: "보통공격 시 2턴 간 아군 전체의 공격력이 {0}% 증가하며 50% 확률로 공격력 {1}% 추가 증가",
        calc: [{ max: 16, startRate:0.64},{ max: 32, startRate:0.64}]
      },
      { id: "duncan_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        name: "저격 전의 정적", 
        icon: "icon/passive2.webp", 
        desc: "방어 시 2턴 간 자신의 보통공격에 공격력 {0}%의 보통공격 데미지를 부여", 
        calc: [{ max: 120, startRate:0.55}],
        damageDeal: [{ type: "보통공격", val: { max: 120,startRate:0.55 } }]        
      },
      {
        id: "duncan_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가",
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "duncan_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,    
        buffEffects: { "평타뎀증": { max: 45 } },                     
        buffDesc: "보통공격 데미지 {0}% 증가",              
        name: "쏠수록, 자연히 맞는다", 
        icon: "icon/passive5.webp", 
        desc: "던컨의 보통공격 데미지 {0}% 증가", 
        calc: [{ max: 45 }]
      },
      {
        id: "duncan_skill8",
        name: "지팡이보다 먹힌다구!(도장)",
        decimalPlaces: 2, 
        stampBuffEffects: { "뎀증": { max: 150, startRate:0.64 } },           
        hasToggle: true,
        toggleType: "isAppliedStamped",             
        buffDesc: "[마도집중] 스택이 2이상 일 경우 데미지 {0}% 증가",       
        icon: "images/sigilwebp/sigil_duncan.webp",
        excludeFromBuffSearch: true,
        isUltExtra: true,
        syncLevelWith: "duncan_skill2",
        calc: [{ max: 150, startRate:0.64 }]        
      }, 
      {
        id: "duncan_skill9",
        name: "마탄 충기법[확률효과]", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        ignoreBreakthrough: true,
        syncLevelWith: "duncan_skill4",
        buffEffects: { "공증": { max: 32 , startRate:0.64 } }, 
        buffDesc: "던컨이 보통공격 시 50% 확률로 공격력 {0}% 증가", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        icon: "icon/passive2.webp",
        calc: [{ max: 32 , startRate:0.64 }]
      }    
    ]
  },    
  "famido": {
    title: "파미도",
    base: { "공격력": 556, "HP": 2245 },
 
    info: { "속성": 2, "포지션": "전사" },  
    defaultBuffSkills: ["famido_skill2","famido_skill3", "famido_skill4","famido_skill5", "famido_skill6","famido_skill7","famido_skill8","famido_skill9"],
    skills: [
      { 
        id: "famido_skill1",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        name: "빠른 숏 패스", 
        icon: "icon/attack.webp", 
        desc: "목표물에게 공격력 {0}%의 데미지를 줌", 
        calc: [{ max: 100 }],
        damageDeal: [{ type: "보통공격", val: { max: 100 } }]
      },
      {
        id: "famido_skill2",
        excludeFromBuffSearch: true,
        hasStampEffect: true,
        decimalPlaces: 2,
        name: "절대 에이스의 포효", 
        buffEffects: { "기초공증": { max: 30} },
        buffDesc: "필살기 사용 시 기초공격력 {0}% 증가",        
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        icon: "icon/attack(strong).webp", 
        desc: "(쿨타임 : 3턴) \n 자신의 기초 공격력을 {0}% 증가시킨 후 대상 적에게 {1}%의 데미지를 줌", 
        stampDesc: "(쿨타임 : 3턴) \n 2턴 간 자신의 기초 공격력을 {0}% 증가시킨 후 대상 적에게 {1}%의 데미지를 줌 그리고 전사와 방해 포지션 아군에게 2턴 간 파미도 기초공격력의 {2}%만큼 공격력 가산", 
        calc: [{ max: 30},{ max: 135, startRate:0.64,stampMax:150, startRate:0.64},{ max: 15}],
        damageDeal: [{ type: "필살공격", val: { max: 135, startRate:0.64 ,stampMax:150, startRate:0.64 } }]        
      }, 
      {
        id: "famido_skill3",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "공증": { max: 30 } },
        buffDesc: "공격력 {0}% 증가",
        name: "공격 강화Ⅳ", 
        icon: "icon/passive2.webp", 
        desc: "공격력 {0}% 증가", 
        calc: [{ max: 30 }] 
      },
      {
        id: "famido_skill4",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 30} },
        hasToggle: true,
        toggleType: "isAppliedStamped",        
        buffDesc: "방어 시 기초공격력 {0}% 증가",         
        name: "롱 패스 준비",
        icon: "icon/passive2.webp",
        desc: "방어 시 2턴 간 기초공격력이 {0}% 증가하며, 파미도가 포지션 3에 있을 시 매턴 자신에게 [전술 판독] 1스택 부여(최대 3스택) 또한 [전술 판독]이 3스택 이상일 때 공격 시 스택을 모두 소모해 아군 전체에게 2턴 간 파미도의 기초공격력 {1}%만큼 공격력 가산",
        calc: [{ max: 30 }, { max: 30 }]      
      },
      { id: "famido_skill5", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2, 
        buffEffects: { "기초공증": { max: 7.5 } }, 
        hasCounter: true, 
        counterRange: { min: 0, max: 4 },      
        buffDesc: "아군 피격 시 기초공격력 {0}% 증가(최대 4중첩)",  
        name: "쿼터백 지휘선", 
        icon: "icon/passive2.webp", 
        desc: "자신을 제외한 아군이 피격 시 2턴 간 파미도의 기초공격력 {0}% 증가(최대 4중첩)", 
        calc: [{ max: 7.5 }]
      },
      {
        id: "famido_skill6",
        excludeFromBuffSearch: true,
        decimalPlaces: 2,
        buffEffects: { "기초공증": { max: 15 },  "기초HP증가": { max: 15 } }, 
        buffDesc: "기초공격력/HP {0}% 증가", 
        name: "고강도 훈련 성과", 
        icon: "icon/passive5.webp", 
        desc: "자신의 기초 공격력, 기초 HP {0}% 증가", 
        calc: [{ max: 15 }] 
      },
      { id: "famido_skill7", 
        excludeFromBuffSearch: true, 
        decimalPlaces: 2,
        buffEffects: { "뎀증": { max: 20} },
        buffDesc: "데미지 {0}% 증가",          
        name: "명령・전술 킥오프", 
        icon: "icon/passive5.webp", 
        desc: "파미도의 데미지 {0}% 증가, 공격 시 대상에게 1턴 간 [전술 호령]을 부여하며  파미도를 제외한 아군이 [전술 호령]을 가진 적을 공격 할 시 해당 아군의 공격 데미지 {1}% 증가", 
        calc: [{ max: 20 },{ max: 15 }] 
      },
      {
        id: "famido_skill8",
        name: "절대 에이스의 포효(도장)", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        ignoreBreakthrough: true,
        syncLevelWith: "famido_skill2",
        ratioEffects: { "고정공증": { from: "기초공격력", max: 15 } },
        buffDesc: "파미도의 기초공격력 {0}%만큼 공격력 가산(전사, 방해 포지션)", 
        isUltExtra: true,     
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        icon: "images/sigilwebp/sigil_famido.webp",
        calc: [{ max: 15 }]
      },          
      {
        id: "famido_skill9",
        name: "롱 패스 준비[전술 판독]", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        syncLevelWith: "famido_skill4",
        ratioEffects: { "고정공증": { from: "기초공격력", max: 30 } },
        buffDesc: "[전술 판독] 파미도의 기초공격력 {0}%만큼 공격력 가산", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        icon: "icon/passive2.webp",
        calc: [{ max: 30 }]
      },
      {
        id: "famido_skill10",
        name: "명령・전술 킥오프(파티버프)", 
        excludeFromBuffSearch: false, 
        decimalPlaces: 2, 
        syncLevelWith: "famido_skill7",
        buffEffects: { "뎀증": { max: 15} },
        buffDesc: "[전술 호령] 데미지 {0}% 증가", 
        hasToggle: true, 
        toggleType: "isAppliedStamped", 
        icon: "icon/passive2.webp",
        calc: [{ max: 15 }]
      }                        
    ]
  },            
  "test_dummy": {
    title: "커스텀 버프 (테스트용)",
    desc: "직접 수치를 입력하여 테스트할 수 있는 캐릭터입니다.",
    base: { "공격력": 100, "HP": 100 },
    growth: { "공격력": 1.0, "HP": 1.0 },
    info: { "속성": 0, "포지션": "보조" },
    skills: [
      { id: "custom_stat_1", name: "데미지 증가", isCustomInput: true, buffEffects: { "뎀증": 0 }, icon: "icon/main.png", desc: "데미지 증가" },
      { id: "custom_stat_2", name: "평타데미지 증가", isCustomInput: true, buffEffects: { "평타뎀증": 0 }, icon: "icon/main.png", desc: "평타데미지 증가" },
      { id: "custom_stat_3", name: "필살기데미지 증가", isCustomInput: true, buffEffects: { "필살기뎀증": 0 }, icon: "icon/main.png", desc: "필살기데미지 증가" },
      { id: "custom_stat_4", name: "트리거뎀증 증가", isCustomInput: true, buffEffects: { "트리거뎀증": 0 }, icon: "icon/main.png", desc: "트리거데미지 증가" },
      { id: "custom_stat_5", name: "받는 데미지 증가 디버프", isCustomInput: true, buffEffects: { "뎀증디버프": 0 }, icon: "icon/main.png", desc: "데미지 증가 디버프" },
      { id: "custom_stat_6", name: "받는 속성데미지 증가 디버프", isCustomInput: true, buffEffects: { "속성디버프": 0 }, icon: "icon/main.png", desc: "속성데미지 증가 디버프" },
      { id: "custom_stat_7", name: "공격력 증가", isCustomInput: true, buffEffects: { "공증": 0 }, icon: "icon/main.png", desc: "공격력 증가" },
      { id: "custom_stat_8", name: "고정공격력 증가", isCustomInput: true, buffEffects: { "고정공증": 0 }, icon: "icon/main.png", desc: "추가 고정공격력" },
      { id: "custom_stat_9", name: "기초공격력 증가", isCustomInput: true, buffEffects: { "기초공증": 0 }, icon: "icon/main.png", desc: "기초공격력 증가" },
      { id: "custom_stat_10", name: "HP 증가", isCustomInput: true, buffEffects: { "HP증가": 0 }, icon: "icon/main.png", desc: "HP 증가" },
      { id: "custom_stat_11", name: "기초HP 증가", isCustomInput: true, buffEffects: { "기초HP증가": 0 }, icon: "icon/main.png", desc: "기초HP 증가" },
      { id: "custom_stat_12", name: "회복증가", isCustomInput: true, buffEffects: { "회복증가": 0 }, icon: "icon/main.png", desc: "회복 증가" }
    ]
  }
};