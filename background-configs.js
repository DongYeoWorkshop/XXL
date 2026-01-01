// background-configs.js
// 캐릭터별 배경 이미지의 모바일/태블릿/PC 세부 위치 및 크기 설정

export const backgroundConfigs = {
    // 기본값
    "default": {
        mobile:  { align: "center", xPos: "0px", yPos: "0px", size: "950px auto" },
        tablet:  { align: "center", xPos: "0px", yPos: "0px", size: "800px auto" },
        pc:      { align: "center", xPos: "0px", yPos: "0px", size: "1000px auto" }
    },

    // 리카노 설정 (오른쪽 정렬)
    "rikano": {
        mobile:  { align: "right", xPos: "-150px", yPos: "00px" },
        tablet:  { align: "right", xPos: "-100px", yPos: "50px", size: "900px auto" },
        pc:      { align: "right", xPos: "-100px", yPos: "0px" }
    },

    // 파미도 설정 (오른쪽 정렬)
    "famido": {
        mobile:  { align: "right", xPos: "-350px", yPos: "100px" },
        tablet:  { align: "right", xPos: "-300px", yPos: "150px", size: "900px auto" },
        pc:      { align: "right", xPos: "-250px", yPos: "00px" }
    }
};