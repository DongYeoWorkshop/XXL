// records.js
import { state } from './state.js';
import { showToast } from './ui.js';
import { saveSnapshots } from './storage.js';

/**
 * 현재 데미지를 기록 목록에 추가합니다.
 */
export function recordCurrentDamage(skill, detailDisplay, skillIdx, currentId, saveCurrentStats) {
    const damageText = detailDisplay.querySelector('.skill-detail-damage-val')?.textContent;
    const damageColor = detailDisplay.querySelector('.skill-detail-damage-val')?.style.color || 'black';

    // [수정] 라벨이 없어도 숫자 형식이면 기록 가능하도록 변경
    if (damageText && damageText.trim() !== '') {
        // [추가] 다단 히트( / 로 구분된 경우) 합산 로직
        let finalSum = 0;
        const parts = damageText.split(' / ');
        parts.forEach(p => {
            const val = parseInt(p.replace('데미지: ', '').replace('가산: ', '').replace(/,/g, '').trim()) || 0;
            finalSum += val;
        });

        const damageVal = finalSum.toLocaleString();
        if (!state.damageRecords[currentId]) state.damageRecords[currentId] = [];
        
        // [수정] 스킬 슬롯 기반 타입 라벨링 (보통공격, 필살기, 패시브N, 도장)
        let typeLabelTxt = "기타";
        
        if (skill.isExternal) {
            // 외부 버프는 데미지 타입 그대로 사용 (예: 추가공격)
            if (skill.damageDeal && skill.damageDeal.length > 0) typeLabelTxt = skill.damageDeal[0].type;
            else typeLabelTxt = "외부";
        } else {
            if (skillIdx === 0) typeLabelTxt = "보통공격";
            else if (skillIdx === 1) typeLabelTxt = "필살기";
            else if (skillIdx >= 2 && skillIdx <= 6) typeLabelTxt = `패시브${skillIdx - 1}`;
            else if (skillIdx === 7 || skill.isUltExtra) typeLabelTxt = "도장";
            else {
                // 예외 케이스: 데미지 타입 사용
                if (skill.damageDeal && skill.damageDeal.length > 0) typeLabelTxt = skill.damageDeal[0].type;
                else if (skill.ratioEffects && skill.ratioEffects["고정공증"]) typeLabelTxt = "공격력 가산";
                else if (skill.healDeal) typeLabelTxt = "회복";
                else if (skill.barrierDeal) typeLabelTxt = "배리어";
            }
        }

        const records = state.damageRecords[currentId];
        const lastRecord = records[records.length - 1];
        
        if (lastRecord && lastRecord.type === typeLabelTxt && lastRecord.name === skill.name && lastRecord.damage === damageVal) {
            lastRecord.count = (lastRecord.count || 1) + 1;
        } else {
            records.push({ type: typeLabelTxt, name: skill.name, damage: damageVal, color: damageColor, count: 1 });
        }

        if (records.length > 20) records.shift();
        renderDamageRecords(currentId, detailDisplay.parentElement, saveCurrentStats);
        saveCurrentStats();
    }
}

/**
 * 새로운 턴 구분선을 추가합니다.
 */
export function startNextTurn(charId, parentContainer, saveCurrentStats) {
    if (!state.damageRecords[charId]) state.damageRecords[charId] = [];
    const records = state.damageRecords[charId];
    
    // 현재 마지막 턴 번호 확인
    let lastTurn = 1;
    for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].isTurnSeparator) {
            lastTurn = records[i].turnNumber;
            break;
        }
    }
    
    const nextTurn = lastTurn + 1;
    
    records.push({ isTurnSeparator: true, turnNumber: nextTurn });
    
    if (records.length > 30) records.shift();
    renderDamageRecords(charId, parentContainer, saveCurrentStats);
    saveCurrentStats();
}

/**
 * 기록된 데미지 목록을 화면에 렌더링합니다.
 */
export function renderDamageRecords(charId, parentContainer, saveCurrentStats) {
    if (!state.damageRecords[charId]) state.damageRecords[charId] = [];
    const records = state.damageRecords[charId];

    // [추가] 초기 데이터가 없거나 첫 항목이 구분선이 아니면 1턴 구분선 추가
    if (records.length === 0 || !records[0].isTurnSeparator) {
        records.unshift({ isTurnSeparator: true, turnNumber: 1 });
    }

    const iconList = parentContainer.querySelector('.detail-icon-list');
    if (!iconList) return;

    let container = parentContainer.querySelector('.damage-record-container');

    if (!container) {
        container = document.createElement('div');
        container.className = 'damage-record-container';
        iconList.parentElement.parentNode.insertBefore(container, iconList.parentElement.nextSibling);
    }

    container.innerHTML = '';
    updateTotalDamage(container, charId, saveCurrentStats);

    // 실제 데미지 기록(구분선 제외)이 있는지 확인
    const hasData = records.some(r => !r.isTurnSeparator);

            records.forEach((rec, idx) => {
            if (rec.isTurnSeparator) {
                // 턴 구분선 렌더링 (--- 1턴 ---)
                const separator = document.createElement('div');
                separator.className = 'turn-separator';
                
                const lineLeft = document.createElement('div');
                lineLeft.className = 'turn-line';
                
                const label = document.createElement('span');
                label.className = 'turn-label';
                label.textContent = `${rec.turnNumber}턴`;
                
                const lineRight = document.createElement('div');
                lineRight.className = 'turn-line';
                
                separator.appendChild(lineLeft);
                separator.appendChild(label);
                separator.appendChild(lineRight);
                
            separator.onclick = () => {
                if (rec.turnNumber === 1) return; // 1턴은 삭제 불가
                
                // [수정] 마지막 턴인지 확인 (이후에 다른 턴 구분선이 없어야 함)
                const hasLaterTurn = records.slice(idx + 1).some(r => r.isTurnSeparator);
                if (hasLaterTurn) {
                    showToast('마지막 턴부터 순서대로 지울 수 있습니다.');
                    return;
                }
                
                // 현재 구분선부터 끝까지 삭제 (해당 턴 전체 삭제)
                state.damageRecords[charId].splice(idx);
                renderDamageRecords(charId, parentContainer, saveCurrentStats);
                saveCurrentStats();
            };
            
            container.appendChild(separator);

            // 1턴 헤더 바로 아래에 아무런 추가 항목(데미지나 다음 턴)이 없을 때만 안내 문구 표시
            if (rec.turnNumber === 1 && records.length === 1) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = `text-align: center; color: #999; padding: 10px; font-size: 0.85em;`;
                emptyMsg.textContent = '기록된 데미지가 없습니다. + 버튼을 눌러 추가하세요.';
                container.appendChild(emptyMsg);
            }
            return;
        }

        const item = document.createElement('div');
        item.className = 'record-item';
        
        // [수정] 중첩된 데미지 계산
        const rawDmg = parseInt(rec.damage.replace(/,/g, '')) || 0;
        const totalDmg = rawDmg * (rec.count || 1);
        const displayDmg = totalDmg.toLocaleString();

        const typeLabel = rec.type ? `<span class="record-type-tag">[${rec.type}]</span>` : '';
        const countLabel = (rec.count > 1) ? `<span class="record-count">x${rec.count}</span>` : '';
        
        item.innerHTML = `
            <div class="record-item-left">
                ${typeLabel}
                <span class="record-name">${rec.name}</span>
                ${countLabel}
            </div>
            <span class="record-val" style="color:${rec.color};">${displayDmg}</span>
        `;
        item.onclick = () => {
            // [수정] 현재 항목이 마지막 턴에 속해있는지 확인
            const hasLaterTurn = records.slice(idx + 1).some(r => r.isTurnSeparator);
            if (hasLaterTurn) {
                showToast('현재 진행 중인 턴의 기록만 지울 수 있습니다.');
                return;
            }
            state.damageRecords[charId].splice(idx, 1);
            renderDamageRecords(charId, parentContainer, saveCurrentStats);
            saveCurrentStats();
        };
        container.appendChild(item);
    });}

function updateTotalDamage(container, charId, saveCurrentStats) {
    const records = state.damageRecords[charId] || [];
    const total = records.reduce((sum, rec) => {
        if (rec.isTurnSeparator) return sum;
        return sum + (parseInt(rec.damage.replace(/,/g, '')) || 0) * (rec.count || 1);
    }, 0);
    
    // [추가] 상단 아이콘 목록 확인
    const iconList = container.parentElement.querySelector('.detail-icon-list');
    const hasIcons = iconList && iconList.querySelectorAll('img').length > 0;

    const div = document.createElement('div');
    div.className = 'total-damage-display';
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'record-btn-group';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'record-btn record-btn-clear';
    clearBtn.textContent = '전체 삭제';
    clearBtn.onclick = () => {
        state.damageRecords[charId] = [];
        renderDamageRecords(charId, container.parentElement, saveCurrentStats);
        saveCurrentStats();
    };

    const nextTurnBtn = document.createElement('button');
    nextTurnBtn.textContent = '다음턴';
    nextTurnBtn.className = 'record-btn record-btn-next';
    nextTurnBtn.onclick = () => {
        startNextTurn(charId, container.parentElement.parentElement, saveCurrentStats);
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '저장';
    saveBtn.className = 'record-btn record-btn-save';
    saveBtn.onclick = () => {
                    const total = records.reduce((sum, rec) => {
                        if (rec.isTurnSeparator) return sum;
                        return sum + (parseInt(rec.damage.replace(/,/g, '')) || 0) * (rec.count || 1);
                    }, 0);
                    
                    // [수정] 스냅샷 추가 로직 (스펙 정보 포함)
                    const lvVal = parseInt(document.getElementById('level-slider').value) || 1;
                    const brVal = parseInt(document.getElementById('extra1-slider').value) || 0;
                    const fitVal = parseInt(document.getElementById('extra2-slider').value) || 0;

                    const newSnapshot = {
                        id: Date.now().toString(), // 고유 ID
                        charId: charId,
                        totalDamage: total,
                        records: JSON.parse(JSON.stringify(records)), // 깊은 복사
                        stats: { lv: lvVal, s1: brVal, s2: fitVal }, // 스펙 저장
                        timestamp: new Date().toISOString()
                    };
                    
                    if (!state.comparisonSnapshots) state.comparisonSnapshots = [];
                    state.comparisonSnapshots.push(newSnapshot);
                    
                    saveSnapshots(state.comparisonSnapshots);
                    showToast('현재 기록이 비교탭에 추가되었습니다.');
                };    // [추가] 아이콘이 없으면 버튼 비활성화
    if (!hasIcons) {
        [clearBtn, nextTurnBtn, saveBtn].forEach(btn => {
            btn.disabled = true;
        });
    }

    btnGroup.appendChild(clearBtn);
    btnGroup.appendChild(nextTurnBtn);
    btnGroup.appendChild(saveBtn);
    
    const totalText = document.createElement('div');
    totalText.innerHTML = `<span class="total-damage-label">총 데미지:</span> <span class="total-damage-text">${total.toLocaleString()}</span>`;

    div.appendChild(btnGroup);
    div.appendChild(totalText);
    container.prepend(div);
}
