// simulator-ui.js
import { constants } from './state.js';

/**
 * 캐릭터 선택 화면 HTML 생성
 */
export function getCharacterSelectorHtml(validChars, disabledIds, charData) {
    return `
        <div style="text-align: center; padding: 20px 0;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px;">
                <h3 style="margin: 0; color: #333;">분석할 캐릭터를 선택하세요</h3>
            </div>
            <div class="sim-char-grid">
                ${validChars.map(id => {
                    const isDisabled = disabledIds.includes(id);
                    const style = isDisabled ? 'filter: grayscale(100%); opacity: 0.5; pointer-events: none; cursor: default;' : '';
                    return `<div class="sim-char-pick-item" data-id="${id}" style="${style}"><img src="images/${id}.webp"><div class="sim-char-name">${charData[id].title}</div></div>`;
                }).join('')}
            </div>
        </div>`;
}

/**
 * 시뮬레이터 메인 레이아웃 HTML 생성
 */
export function getSimulatorLayoutHtml(charId, data, stats, brText, hasMulti, savedTurns, savedIters, useHitProb = false) {
    return `
        <div style="margin-bottom:10px; display: flex; justify-content: space-between; align-items: center;">
            <button id="sim-back-to-list" style="background:#f0f0f0;border:1px solid #ddd;color:#666;cursor:pointer;font-size:0.8em;font-weight:bold;padding:5px 12px;border-radius:4px;">← 캐릭터 목록</button>
            <div id="sim-info-icon" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #999; color: #999; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fff; font-weight: bold; margin-right: 5px;">i</div>
        </div>
        <div class="sim-main-container">
            <div class="sim-pane-settings">
                <div style="position: relative; display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:12px;background:#fff;border:1px solid #eee0d0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;">
                    <img src="images/${charId}.webp" class="sim-char-profile-img" style="width:55px;height:55px;border-radius:10px;object-fit:cover;border:2px solid #6f42c1;background:black;object-position:top;flex-shrink:0;cursor:pointer;" title="캐릭터 상세 정보로 이동">
                    <div style="flex-grow:1;display:flex;align-items:center;justify-content:space-between;min-width:0;">
                        <div style="min-width:0;flex:1;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <h3 style="margin:0;font-size:1.1em;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.title}</h3>
                                ${stats.stamp ? `<div style="background:black;border-radius:4px;padding:2px;display:flex;align-items:center;border:1px solid #444;flex-shrink:0;"><img src="images/sigilwebp/sigil_${charId}.webp" style="width:18px;height:18px;object-fit:contain;"></div>` : ''}
                            </div>
                            <div style="font-size:0.75em;color:#888;margin-top:2px;">Lv.${stats.lv || 1} / ${brText} / 적합도 ${stats.s2 || 0}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                            ${hasMulti ? `
                                <div style="display:flex;flex-direction:column;align-items:center;scale:0.9;flex-shrink:0;">
                                    <div style="font-size:0.65em;color:#888;margin-bottom:2px;">대상 수</div>
                                    <button id="sim-target-btn" style="width:30px;height:30px;border-radius:50%;border:1px solid #6f42c1;background:#fff;color:#6f42c1;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${localStorage.getItem(`sim_last_target_${charId}`)||1}</button>
                                </div>` : ''}
                            <div id="sim-attribute-picker-container"></div>
                        </div>
                    </div>
                </div>
                <div id="sim-custom-controls" style="display:none;background:#fff;border:1px solid #ddd;border-radius:12px;padding:15px;margin-bottom:15px;"><div id="sim-custom-list" style="display:flex;flex-wrap:wrap;gap:10px;"></div></div>

                <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;margin-bottom:15px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                        <div style="display:flex; align-items: center; gap:8px;">
                            <label style="font-size:0.85em;font-weight:bold;color:#555;">진행 턴 수</label>
                            <div style="font-size:1.1em; font-weight:900; color:#6f42c1;"><span id="sim-turns-val">${savedTurns}</span>턴</div>
                        </div>
                        <button id="sim-edit-actions-btn" style="background:#f0f0f0;border:1px solid #ccc;border-radius:4px;font-size:0.75em;padding:4px 10px;cursor:pointer;">⚙️ 행동 수정</button>
                    </div>
                    <div id="sim-turns-slider-container" style="margin: 10px 0 25px 0; padding: 5px 0;">
                        <input type="range" id="sim-turns" min="1" max="30" value="${savedTurns}" step="1" list="sim-turns-ticks" style="width:100%; cursor:pointer; accent-color: #6f42c1;">
                        <datalist id="sim-turns-ticks"><option value="1"></option><option value="5"></option><option value="10"></option><option value="15"></option><option value="20"></option><option value="25"></option><option value="30"></option></datalist>
                    </div>

                    <div id="sim-action-editor" style="display:none;background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:15px;max-height:280px;overflow-y:auto;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                            <span style="font-weight:bold;color:#6f42c1;font-size:0.8em;">⚙️ 행동 직접 지정</span>
                            <button id="sim-reset-pattern-btn" style="background:#fff;border:1px solid #dc3545;color:#dc3545;cursor:pointer;font-size:0.75em;font-weight:bold;padding:2px 8px;border-radius:4px;">초기화</button>
                        </div>
                        <div id="sim-action-list" style="display:flex;flex-direction:column;gap:5px;"></div>
                    </div>
                    <label style="display:block;font-size:0.85em;font-weight:bold;color:#555;margin-bottom:8px;">시뮬레이션 횟수</label>
                    <select id="sim-iterations" style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;font-weight:bold;">
                        <option value="30" ${savedIters==="30"?'selected':''}>30회</option>
                        <option value="100" ${savedIters==="100"?'selected':''}>100회</option>
                        <option value="500" ${savedIters==="500"?'selected':''}>500회</option>
                        <option value="1000" ${savedIters==="1000"?'selected':''}>1000회</option>
                    </select>
                </div>
                <button id="run-simulation-btn" style="width:100%;padding:16px;background:#6f42c1;color:white;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:1.1em;">분석 시작 <span style="display:inline-block; filter: grayscale(100%) brightness(5);">⚡</span></button>
            </div>
            <div class="sim-pane-display">
                <div id="simulation-result-area" style="display:none;">
                    <div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h4 style="margin:0;color:#333;">분석 리포트</h4>
                            <div style="display:flex; gap:5px;">
                                <button id="btn-show-dist" style="background:#6f42c1; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;">분포도</button>
                                <button id="btn-show-dmg" style="background:#f0f0f0; color:#666; border:1px solid #ccc; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;">딜 그래프</button>
                            </div>
                        </div>
                        <div id="sim-graph-area" style="display:flex; height:220px; margin-bottom:60px; padding-right:15px; padding-left:0px; position:relative;">
                            <div id="sim-y-axis" style="width: 25px; position: relative; font-size: 0.7em; color: #bbb; text-align: right; border-right: 1px solid #eee; height: 100%;"></div>
                            <div style="flex: 1; display: flex; flex-direction: column; position: relative; height: 100%;">
                                <div id="sim-grid-lines" style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 0;"></div>
                                <div id="sim-dist-graph" style="flex: 1; display: flex; align-items: flex-end; gap: 1px; border-bottom: 1px solid #eee; position: relative; z-index: 1; height: 100%;"></div>
                                <div id="sim-line-graph" style="display:none; flex: 1; position:relative; border-bottom: 1px solid #eee; z-index: 1; overflow: visible; height: 100%;"></div>
                                <div id="sim-x-axis" style="height: 0px; position: relative; width: 100%;"></div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; box-sizing: border-box;">
                            <div style="background:#f8f9fa; padding: 10px 5px; border-radius:10px; text-align:center;">
                                <div style="font-size:0.65em; color:#888; margin-bottom:2px;">최소</div>
                                <div id="sim-min-dmg" style="font-weight:bold; color:#333; font-size:0.9em;">0</div>
                            </div>
                            <div style="background:#6f42c1; padding: 10px 5px; border-radius:10px; text-align:center; box-shadow: 0 4px 10px rgba(111, 66, 193, 0.2);">
                                <div style="font-size:0.65em; color:rgba(255,255,255,0.9); margin-bottom:2px; font-weight:bold;">평균</div>
                                <div id="sim-avg-dmg" style="font-weight:900; color:white; font-size:1.1em;">0</div>
                            </div>
                            <div style="background:#f8f9fa; padding: 10px 5px; border-radius:10px; text-align:center;">
                                <div style="font-size:0.65em; color:#888; margin-bottom:2px;">최대</div>
                                <div id="sim-max-dmg" style="font-weight:bold; color:#333; font-size:0.9em;">0</div>
                            </div>
                        </div>
                    </div>
                    <div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                        <h4 style="margin:0 0 15px 0; color:#333;">분석 로그 <span id="sim-total-dmg-header" style="font-size:0.8em; color:#6f42c1; margin-left:10px; font-weight:bold;"></span></h4>
                        <div id="sim-log" style="max-height:400px; overflow-y:auto; font-family:'Cascadia Code', 'Courier New', monospace; font-size:0.85em; line-height:1.6; color:#4af626; padding:15px; background:#1a1a1a; border-radius:8px; border:1px solid #333; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);"></div>
                        <div id="sim-result-actions"></div>
                    </div>
                </div>
                <div id="sim-empty-msg" style="text-align:center; padding:60px 0; color:#aaa; background:#fff; border:1px solid #eee; border-radius:12px;">
                    <img src="icon/main.png" style="width:48px; opacity:0.2; margin-bottom:15px;">
                    <p style="font-size:0.9em;">분석 실행 버튼을 눌러 시뮬레이션을 시작하세요</p>
                </div>
            </div>
        </div>`;
}

/**
 * 상세 로그 분석 모달 팝업 생성
 */
export function showDetailedLogModal(resultToSave) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'width: 95%; max-width: 800px; max-height: 85%; background: #fff; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;';
    
    let combinedLogsHtml = '';
    for (let t = 1; t <= resultToSave.turnData.length; t++) {
        const turnDetails = (resultToSave.closestDetailedLogs || []).filter(d => d.t === t);
        const buffs = resultToSave.closestStateLogs ? resultToSave.closestStateLogs[t-1] : [];
        const turnInfo = resultToSave.closestTurnInfoLogs ? resultToSave.closestTurnInfoLogs[t-1] : {};
        
        let turnLabelExtra = '';
        if (turnInfo.enemyHp !== undefined) {
            turnLabelExtra = `<span style="font-size:0.7em; color:#dc3545; font-weight:normal; margin-left:5px;">(적 HP: ${turnInfo.enemyHp}%)</span>`;
        }

        const buffListHtml = buffs.length > 0 ? buffs.map(b => `
            <div style="display:flex; align-items:center; gap:3px; background:#fff; border:1px solid #ddd; padding:1px 5px; border-radius:4px; font-size: 0.9em;">
                <img src="${b.icon}" style="width:12px; height:12px; object-fit:contain;">
                <span>${b.name} / ${b.duration}</span>
            </div>`).join('') : '<span style="color:#ccc;">-</span>';

        combinedLogsHtml += `
            <div style="padding: 12px 15px; border-bottom: 1px solid #eee; ${t % 2 === 0 ? 'background: #fcfcfc;' : ''}">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #6f42c1; font-size: 1.1em; min-width: 40px; white-space:nowrap;">${t}턴${turnLabelExtra}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; font-size: 0.75em; color: #666;">${buffListHtml}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 5px; border-left: 2px solid #f0f0f0;">
                    ${turnDetails.map(d => {
                        if (!d.msg) return ''; // 빈 메시지면 아무것도 렌더링 안 함
                        let color = '#333', bgColor = 'transparent';
                        let msg = d.msg;
                        let iconHtml = '';

                        // ICON: 접두사가 있는 경우 이미지로 변환
                        if (msg.startsWith('ICON:')) {
                            const parts = msg.split('|');
                            const iconPath = parts[0].replace('ICON:', '');
                            msg = parts[1];
                            iconHtml = `<img src="${iconPath}" style="width:16px; height:16px; border-radius:3px; margin-right:6px; object-fit:cover; border:1px solid #ddd; background:black;">`;
                        } else {
                            // 기본 이모티콘 유지
                            let prefix = '•';
                            if (d.type === 'hit') { color = '#28a745'; prefix = '⚔️'; }
                            else if (d.type === 'extra') { color = '#fd7e14'; prefix = '✨'; }
                            
                            // 방어일 경우 불필요한 도트 제거
                            if (msg === '[방어]') prefix = '';
                            
                            iconHtml = prefix ? `<span style="margin-right: 5px;">${prefix}</span>` : '';
                        }

                        const statsInfo = d.statMsg ? `<span style="font-size: 0.9em; color: #666; margin-left: auto; padding-left: 15px; font-family: 'Cascadia Code', monospace; font-weight: bold;">${d.statMsg}</span>` : '';
                        
                        if (d.type === 'action' || msg.includes('피격 발생')) {
                            let actionColor = '#666', actionBorder = '#ccc';
                            const lowerMsg = msg.toLowerCase();
                            
                            if (lowerMsg.includes('보통')) { actionColor = '#2e7d32'; actionBorder = '#a5d6a7'; }
                            else if (lowerMsg.includes('필살')) { actionColor = '#c62828'; actionBorder = '#ef9a9a'; }
                            else if (lowerMsg.includes('방어')) { actionColor = '#1565c0'; actionBorder = '#90caf9'; }
                            else if (lowerMsg.includes('피격 발생')) { actionColor = '#6f42c1'; actionBorder = '#c3a6ff'; } // 보라색 추가
                            
                            return `<div style="display: flex; align-items: center; font-size: 0.85em; color: ${actionColor}; padding: 4px 12px; border-left: 4px solid ${actionBorder}; margin: 6px 0; font-weight: bold; background: transparent;">
                                ${iconHtml}<span style="flex-shrink: 0;">${msg}</span>${statsInfo}
                            </div>`;
                        }
                        return `<div style="display: flex; align-items: center; font-size: 0.85em; color: ${color}; padding: 3px 8px; border-radius: 4px; line-height: 1.4;">${iconHtml}<span>${msg}</span>${statsInfo}</div>`;
                    }).join('')}
                </div>
            </div>`;
    }

    const helpText = "Coef: 총 계수 / Atk: 최종공격력 / Dmg: 공통뎀증 / N-Dmg: 평타뎀증 / U-Dmg: 필살뎀증 / T-Dmg: 발동뎀증 / Vul: 받뎀증 / A-Vul: 속성받뎀증";
    content.innerHTML = `
        <div style="padding: 15px; background: #6f42c1; color: #fff; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
            <span>시뮬레이션 상세 데이터 분석</span>
            <div style="display:flex; align-items:center; gap:12px;">
                <div id="modal-info-icon" style="width:20px; height:20px; border-radius:50%; border:1px solid #fff; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px;">i</div>
                <button id="modal-close" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
        </div>
        <div style="flex: 1; overflow-y: auto; background: #fff;">${combinedLogsHtml}</div>
        <div style="padding: 12px; text-align: center; font-size: 0.8em; color: #999; border-top: 1px solid #eee; background: #f9f9f9;">
            이 로그는 평균값에 가장 가까운 실행 회차의 상세 데이터입니다.
        </div>`;

    modal.appendChild(content);
    document.body.appendChild(modal);
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
    content.querySelector('#modal-close').onclick = () => modal.remove();
    
    // [추가] 모달 내부 정보 아이콘 클릭 이벤트
    const infoIcon = content.querySelector('#modal-info-icon');
    if (infoIcon) {
        infoIcon.onclick = (e) => {
            e.stopPropagation();
            import('./ui.js').then(ui => {
                const control = ui.showSimpleTooltip(infoIcon, helpText);
                setTimeout(() => control.remove(), 3000);
            });
        };
    }
}
