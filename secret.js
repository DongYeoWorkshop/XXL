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

// [추가] 클라우드 데이터 공유 (저장/불러오기) 기능
export function initCloudSharing() {
    // 제공해주신 웹 앱 URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVY5XzPD-1Ab44Rbd_CCYwT0fn49irDmuNT6JmZ4G3MECdGZoxvDFU1-IZBHmInvPw8A/exec";

    const saveBtn = document.getElementById('cloud-save-btn');
    const loadBtn = document.getElementById('cloud-load-btn');
    const loadInput = document.getElementById('cloud-load-id');

    // 1. 서버에 저장하기 (ID 발급)
    if (saveBtn) {
        saveBtn.onclick = async () => {
            if (!confirm("현재 기기의 모든 데이터를 서버에 저장하시겠습니까?")) return;

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>⏳</span> 저장 중...';

            try {
                // 8자리 랜덤 숫자 ID 생성 (10000000 ~ 99999999)
                const randomId = Math.floor(10000000 + Math.random() * 90000000);
                
                // 로컬 스토리지의 주요 데이터 수집
                const dataToSave = {
                    stats: JSON.parse(localStorage.getItem('dyst_stats') || '{}'),
                    snapshots: JSON.parse(localStorage.getItem('dyst_snapshots') || '[]'),
                    reports: JSON.parse(localStorage.getItem('dyst_user_reports') || '[]'),
                    config: {
                        sheetUrl: localStorage.getItem('dyst_google_sheet_url') || '',
                        memo: localStorage.getItem('dyst_admin_memo') || ''
                    },
                    meta: {
                        version: '1.2.1', // state.js 버전 참조
                        date: new Date().toLocaleString()
                    }
                };

                // 전송
                // fetch는 CORS 문제로 인해 mode: 'no-cors'를 쓰면 응답을 못 받으므로,
                // Apps Script를 'text/plain' 등으로 응답하게 하거나, 
                // 여기서는 간단히 'no-cors'로 보내고 성공 가정(또는 jsonp 방식 등)을 써야 하는데,
                // 보통 Apps Script Web App은 리다이렉트를 하므로 fetch가 기본적으로는 응답 내용을 못 읽습니다.
                // 하지만 POST로 보내고 에러가 안 나면 성공으로 간주하거나,
                // form 태그를 동적으로 생성해서 target을 iframe으로 보내는 꼼수를 쓰기도 합니다.
                
                // 여기서는 가장 표준적인 fetch + CORS (Apps Script가 JSON 반환 시) 시도
                // * Apps Script 배포 시 "액세스 권한: 모든 사용자"여야 CORS 에러 없이 응답 수신 가능 *
                
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        id: randomId,
                        data: dataToSave
                    })
                    // Content-Type 헤더를 넣으면 CORS 프리플라이트 요청이 발생하여 실패할 수 있음.
                    // Apps Script는 text/plain으로 보내면 잘 받음.
                });

                const json = await response.json();
                
                if (json.result === 'success') {
                    prompt("데이터 저장이 완료되었습니다!\n아래 ID를 복사하여 다른 기기에서 불러오세요.", randomId);
                } else {
                    alert("저장 실패: " + (json.message || "알 수 없는 오류"));
                }

            } catch (err) {
                console.error(err);
                alert("통신 중 오류가 발생했습니다. (콘솔 확인)");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>📤</span> 서버에 저장 (ID 발급)';
            }
        };
    }

    // 2. 서버에서 불러오기
    if (loadBtn && loadInput) {
        loadBtn.onclick = async () => {
            const id = loadInput.value.replace(/[^0-9]/g, ''); // 숫자만 남김
            if (id.length < 8) return alert("올바른 8자리 ID를 입력해주세요.");

            if (!confirm("데이터를 불러오면 현재 기기의 기존 데이터는 덮어씌워집니다.\n계속하시겠습니까?")) return;

            loadBtn.disabled = true;
            loadBtn.textContent = '불러오는 중...';

            try {
                // GET 요청으로 데이터 조회
                const response = await fetch(`${SCRIPT_URL}?id=${id}`);
                const json = await response.json();

                if (json.result === 'success') {
                    const data = json.data;
                    
                    // 데이터 복원
                    if (data.stats) localStorage.setItem('dyst_stats', JSON.stringify(data.stats));
                    if (data.snapshots) localStorage.setItem('dyst_snapshots', JSON.stringify(data.snapshots));
                    if (data.reports) localStorage.setItem('dyst_user_reports', JSON.stringify(data.reports));
                    if (data.config) {
                        if (data.config.sheetUrl) localStorage.setItem('dyst_google_sheet_url', data.config.sheetUrl);
                        if (data.config.memo) localStorage.setItem('dyst_admin_memo', data.config.memo);
                    }

                    alert("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.");
                    location.reload();
                } else {
                    alert("불러오기 실패: " + (json.message || "데이터를 찾을 수 없습니다."));
                }

            } catch (err) {
                console.error(err);
                alert("통신 중 오류가 발생했습니다.");
            } finally {
                loadBtn.disabled = false;
                loadBtn.textContent = '불러오기';
            }
        };
    }
}
