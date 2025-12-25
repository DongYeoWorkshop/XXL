// secret.js
import { showToast } from './ui.js';

export function initSecretModule() {
    let clickCount = 0;
    let clickTimer = null;
    
    // 새로운 관리자 암호 해시값입니다.
    const adminPasswordHash = "57f5f58cbd1ad9058009611f8c2dc6e86157d6c6867fa4d2e706aaebe273b6e2"; 

    const titleEl = document.getElementById('sticky-header-title');
    const secretPage = document.getElementById('secret-admin-page');
    const secretCloseBtn = document.getElementById('secret-close-btn');
    const adminMemo = document.getElementById('admin-memo');
    const saveMemoBtn = document.getElementById('save-memo-btn');
    const sheetViewInput = document.getElementById('sheet-view-url');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const reportsList = document.getElementById('received-reports-list');

    // 제보 관련 요소
    const reportModal = document.getElementById('report-modal');
    const reportOpenBtn = document.getElementById('report-open-btn');
    const reportCloseBtn = document.getElementById('report-close-btn');
    const reportSubmitBtn = document.getElementById('report-submit-btn');
    const reportText = document.getElementById('report-text');
    const charCount = document.getElementById('char-count');

    // 1. 비밀 페이지 진입 (제목 5번 클릭)
    if (titleEl) {
        titleEl.addEventListener('click', async () => {
            clickCount++;
            clearTimeout(clickTimer);
            
            // 0.8초 안에 다음 클릭이 없으면 카운트 초기화 (빠른 연타 필요)
            clickTimer = setTimeout(() => { clickCount = 0; }, 800);

            if (clickCount >= 5) {
                clickCount = 0;
                clearTimeout(clickTimer); // 성공 시 타이머 완전 제거
                const pw = prompt("관리자 암호를 입력하세요.");
                if (pw === null) return;

                // 입력받은 암호를 해시로 변환하여 비교
                const hashedInput = await hashPassword(pw);
                if (hashedInput === adminPasswordHash) {
                    openSecretPage();
                } else {
                    alert("암호가 틀렸습니다.");
                }
            }
        });
    }

    // SHA-256 해시 생성 함수
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function openSecretPage() {
        secretPage.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // 메모 및 설정 불러오기
        adminMemo.value = localStorage.getItem('dyst_admin_memo') || '';
        sheetViewInput.value = localStorage.getItem('dyst_google_sheet_url') || '';

        // 제보 내역 불러오기 (로컬 기기 기록)
        renderLocalReports();
    }

    secretCloseBtn.onclick = () => {
        secretPage.style.display = 'none';
        document.body.style.overflow = '';
    };

    // 2. 설정 및 메모 저장 로직
    saveConfigBtn.onclick = () => {
        let url = sheetViewInput.value.trim();
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
            sheetViewInput.value = url;
        }
        localStorage.setItem('dyst_google_sheet_url', url);
        showToast("설정이 저장되었습니다.");
        renderLocalReports(); // 링크 갱신
    };

    saveMemoBtn.onclick = () => {
        localStorage.setItem('dyst_admin_memo', adminMemo.value);
        showToast("메모가 저장되었습니다.");
    };

    // 3. 제보하기 로직
    const openReportModal = () => {
        reportModal.style.display = 'flex';
        reportText.value = '';
        if (charCount) charCount.textContent = '0 / 200';
    };

    if (reportOpenBtn) reportOpenBtn.onclick = openReportModal;
    
    // 초기 화면의 제보 칸 클릭 이벤트 추가
    const landingReportBtn = document.getElementById('landing-report-btn');
    if (landingReportBtn) landingReportBtn.onclick = openReportModal;

    // 실시간 글자 수 체크
    if (reportText && charCount) {
        reportText.oninput = () => {
            const len = reportText.value.length;
            charCount.textContent = `${len} / 200`;
            charCount.style.color = len >= 200 ? '#dc3545' : '#888';
        };
    }

    reportCloseBtn.onclick = () => {
        reportModal.style.display = 'none';
    };

    reportSubmitBtn.onclick = () => {
        const text = reportText.value.trim();
        if (!text) return alert("내용을 입력해주세요.");

        // [구글 시트 전송]
        sendToGoogleSheet(text);

        // 로컬 기록도 병행 (관리자 확인용)
        const reports = JSON.parse(localStorage.getItem('dyst_user_reports') || '[]');
        reports.unshift({ date: new Date().toLocaleString(), content: text });
        localStorage.setItem('dyst_user_reports', JSON.stringify(reports.slice(0, 50)));

        alert("제보가 성공적으로 전송되었습니다. 감사합니다!");
        reportModal.style.display = 'none';
    };

    function renderLocalReports() {
        const reports = JSON.parse(localStorage.getItem('dyst_user_reports') || '[]');
        const sheetUrl = localStorage.getItem('dyst_google_sheet_url') || '';
        
        let html = `
            <div style="margin-bottom:15px; padding:10px; background:#2a2a2a; border-radius:4px; border:1px solid #444;">
                <p style="margin:0 0 10px 0; font-size:0.85em; color:#aaa;">실시간 제보는 구글 시트에서 관리됩니다.</p>
                <button id="open-sheet-btn" style="background:none; border:none; color:#ffa500; font-weight:bold; cursor:pointer; padding:0; font-size:1em; text-decoration:underline;">📊 구글 시트 바로가기</button>
            </div>
        `;

        if (reports.length === 0) {
            html += '<p style="color:#666; text-align:center;">이 기기에서 보낸 제보가 없습니다.</p>';
        } else {
            html += reports.map(r => `
                <div style="background:#0d1117; padding:10px; border-radius:4px; margin-bottom:8px; border-left:3px solid #ffa500;">
                    <div style="font-size:0.75em; color:#888; margin-bottom:5px;">${r.date}</div>
                    <div style="white-space:pre-wrap; line-height:1.4;">${r.content}</div>
                </div>
            `).join('');
        }
        if (reportsList) reportsList.innerHTML = html;

        // 버튼 클릭 이벤트 연결
        const openBtn = document.getElementById('open-sheet-btn');
        if (openBtn) {
            openBtn.onclick = () => {
                const url = localStorage.getItem('dyst_google_sheet_url');
                if (url) {
                    window.open(url, '_blank');
                } else {
                    alert("설정 페이지에서 구글 시트 주소를 먼저 저장해 주세요.");
                }
            };
        }
    }

    // [구글 시트 전송 함수]
    function sendToGoogleSheet(message) {
        const scriptUrl = "https://script.google.com/macros/s/AKfycbylIIRa4S2awrK9weUMRitrz6NI6r6mMpsnobvyZgcm9aZgSQhnNZlj4rNzvyotAe21dw/exec"; 
        if (scriptUrl.includes("여기에")) return;

        fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // CORS 정책 우회
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: new Date().toLocaleString(),
                content: message,
                charId: window.state?.currentId || 'unknown'
            })
        });
    }
}
