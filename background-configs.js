// background-configs.js
// 캐릭터별 배경 이미지의 모바일/태블릿/PC 세부 위치 및 크기 설정

export const backgroundConfigs = {
    // 기본값
    "default": {
        mobile:  { xPos: "center", yPos: "0px", size: "cover" },
        tablet:  { xPos: "center", yPos: "0px", size: "cover" }, // 601px ~ 1099px
        pc:      { xPos: "80%",   yPos: "0px", size: "70%" }  // 1100px 이상
    },

    // 리카노 설정 예시
    "rikano": {
        mobile:  { xPos: "60%", yPos: "-40px", size: "cover" },
        tablet:  { xPos: "center", yPos: "-40px", size: "cover" },
        pc:      { xPos: "80%",   yPos: "-130px", size: "70%" }
    },

    // 파미도 설정 예시
    "famido": {
        mobile:  { xPos: "30%", yPos: "0px", size: "cover" },
        tablet:  { xPos: "-90%",   yPos: "0px", size: "cover" },
        pc:      { xPos: "120%",   yPos: "-110px", size: "70%" }
    }
};
