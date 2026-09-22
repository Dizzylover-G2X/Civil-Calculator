export function initConsolidationModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_' + id) ?? defaultVal;

    container.innerHTML = `
        <h3>1. 설계자료 입력 (압밀침하량 검토)</h3>
        
        <!-- 하중 및 기초 조건 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 하중 및 기초 조건 (2:1 응력분산법 적용)</div>
        <div class="input-grid" style="margin-bottom: 15px;">
            <div class="input-group">
                <label>기초 작용 하중 &Delta;q (kN/m²)</label>
                <input type="number" id="con_dq" value="${getVal('con_dq', '150.00')}" step="1">
            </div>
            <div class="input-group">
                <label>기초 폭 B (m)</label>
                <input type="number" id="con_B" value="${getVal('con_B', '2.00')}" step="0.1">
            </div>
            <div class="input-group">
                <label>기초 길이 L (m)</label>
                <input type="number" id="con_L" value="${getVal('con_L', '3.00')}" step="0.1">
            </div>
            <div class="input-group">
                <label>점토층 두께 H (m)</label>
                <input type="number" id="con_H" value="${getVal('con_H', '4.00')}" step="0.1">
            </div>
            <div class="input-group" style="grid-column: span 2; background-color: #fcf3cf; border-color: #f1c40f;">
                <label style="color: #d4ac0d;">기초 저면에서 점토층 중앙까지의 깊이 z (m)</label>
                <input type="number" id="con_z" value="${getVal('con_z', '2.50')}" step="0.1">
            </div>
        </div>

        <!-- 점토층 물성치 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2980b9; font-size: 0.95em;">■ 점토층 물성치</div>
        <div class="input-grid" style="background-color: #ebf5fb; padding: 12px; border-radius: 6px; border: 1px solid #aed6f1; margin-bottom: 15px;">
            <div class="input-group" style="background-color: #fff;">
                <label style="color: #2980b9;">초기 간극비 e₀</label>
                <input type="number" id="con_e0" value="${getVal('con_e0', '0.85')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label style="color: #2980b9;">압축지수 C_c</label>
                <input type="number" id="con_Cc" value="${getVal('con_Cc', '0.35')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label style="color: #2980b9;">팽창(재압축)지수 C_s</label>
                <input type="number" id="con_Cs" value="${getVal('con_Cs', '0.06')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label>초기 유효상재하중 P₀ (kN/m²)</label>
                <input type="number" id="con_P0" value="${getVal('con_P0', '80.00')}" step="1">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label>선행압밀하중 P_c (kN/m²)</label>
                <input type="number" id="con_Pc" value="${getVal('con_Pc', '120.00')}" step="1">
            </div>
        </div>

        <button class="action-btn" id="calc-consolidation-btn">압밀침하량 산정하기</button>
        <div id="consolidation-result" class="result-box"></div>
    `;

    // 입력값 변경 시 LocalStorage에 자동 저장
    const inputs = container.querySelectorAll('.input-grid input');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id;
            localStorage.setItem('geo_' + key, this.value);
        });
        input.addEventListener('blur', function() {
            let val = parseFloat(this.value);
            if (!isNaN(val)) {
                this.value = val.toFixed(2);
                localStorage.setItem('geo_' + this.id, this.value);
            }
        });
    });

    container.querySelector('#calc-consolidation-btn').addEventListener('click', calculateConsolidation);
}

function calculateConsolidation() {
    const frac = (num, den) => `<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">${num}</span><span style="padding:1px 4px;">${den}</span></span>`;

    const dq = parseFloat(document.getElementById('con_dq').value);
    const B = parseFloat(document.getElementById('con_B').value);
    const L = parseFloat(document.getElementById('con_L').value);
    const H = parseFloat(document.getElementById('con_H').value);
    const z = parseFloat(document.getElementById('con_z').value);
    
    const e0 = parseFloat(document.getElementById('con_e0').value);
    const Cc = parseFloat(document.getElementById('con_Cc').value);
    const Cs = parseFloat(document.getElementById('con_Cs').value);
    const P0 = parseFloat(document.getElementById('con_P0').value);
    const Pc = parseFloat(document.getElementById('con_Pc').value);

    // 1. 점토층 중앙의 지중응력 증가량 산정 (2:1 응력분산법)
    const dP = (dq * B * L) / ((B + z) * (L + z));
    const P1 = P0 + dP; // 최종 응력

    let Sc = 0;
    let state = "";
    let formulaHTML = "";
    let calcStepsHTML = "";

    // 2. 압밀 상태 판별 및 침하량 계산
    if (P0 >= Pc) {
        // 정규압밀 (Normally Consolidated)
        state = "정규압밀 (N.C, P₀ &ge; P_c)";
        Sc = (Cc * H / (1 + e0)) * Math.log10(P1 / P0);
        
        formulaHTML = `<strong>S<sub>c</sub> = [ ${frac('C_c &cdot; H', '1 + e₀')} ] &times; log<sub>10</sub>( ${frac('P₀ + &Delta;P', 'P₀')} )</strong>`;
        calcStepsHTML = `
            = [ ${frac(`${Cc.toFixed(3)} &times; ${H.toFixed(2)}`, `1 + ${e0.toFixed(2)}`)} ] &times; log<sub>10</sub>( ${frac(`${P0.toFixed(2)} +${dP.toFixed(2)}`, `${P0.toFixed(2)}`)} )<br>
            = ${(Cc * H / (1 + e0)).toFixed(4)} &times; log<sub>10</sub>(${ (P1 / P0).toFixed(4) })
        `;
    } else {
        // 과압밀 (Over Consolidated)
        if (P1 <= Pc) {
            // 과압밀 Case 1
            state = "과압밀 Case 1 (O.C, P₀ + &Delta;P &le; P_c)";
            Sc = (Cs * H / (1 + e0)) * Math.log10(P1 / P0);
            
            formulaHTML = `<strong>S<sub>c</sub> = [ ${frac('C_s &cdot; H', '1 + e₀')} ] &times; log<sub>10</sub>( ${frac('P₀ + &Delta;P', 'P₀')} )</strong>`;
            calcStepsHTML = `
                = [ ${frac(`${Cs.toFixed(3)} &times; ${H.toFixed(2)}`, `1 + ${e0.toFixed(2)}`)} ] &times; log<sub>10</sub>( ${frac(`${P0.toFixed(2)} +${dP.toFixed(2)}`, `${P0.toFixed(2)}`)} )<br>
                = ${(Cs * H / (1 + e0)).toFixed(4)} &times; log<sub>10</sub>(${ (P1 / P0).toFixed(4) })
            `;
        } else {
            // 과압밀 Case 2
            state = "과압밀 Case 2 (O.C, P₀ &lt; P_c &lt; P₀ + &Delta;P)";
            const Sc1 = (Cs * H / (1 + e0)) * Math.log10(Pc / P0);
            const Sc2 = (Cc * H / (1 + e0)) * Math.log10(P1 / Pc);
            Sc = Sc1 + Sc2;
            
            formulaHTML = `<strong>S<sub>c</sub> = [ ${frac('C_s &cdot; H', '1 + e₀')} ] &times; log<sub>10</sub>( ${frac('P_c', 'P₀')} ) + [ ${frac('C_c &cdot; H', '1 + e₀')} ] &times; log<sub>10</sub>( ${frac('P₀ + &Delta;P', 'P_c')} )</strong>`;
            calcStepsHTML = `
                = [ ${frac(`${Cs.toFixed(3)} &times; ${H.toFixed(2)}`, `1 + ${e0.toFixed(2)}`)} ] &times; log<sub>10</sub>( ${frac(`${Pc.toFixed(2)}`, `${P0.toFixed(2)}`)} ) + [ ${frac(`${Cc.toFixed(3)} &times; ${H.toFixed(2)}`, `1 + ${e0.toFixed(2)}`)} ] &times; log<sub>10</sub>( ${frac(`${P1.toFixed(2)}`, `${Pc.toFixed(2)}`)} )<br>
                = [ ${(Cs * H / (1 + e0)).toFixed(4)} &times; ${(Math.log10(Pc/P0)).toFixed(4)} ] + [ ${(Cc * H / (1 + e0)).toFixed(4)} &times; ${(Math.log10(P1/Pc)).toFixed(4)} ]<br>
                = ${Sc1.toFixed(4)} m + ${Sc2.toFixed(4)} m
            `;
        }
    }

    const Sc_mm = Sc * 1000;

    const resultDiv = document.getElementById('consolidation-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[1차 압밀침하량 산정 요약 결과]</div>
        <div class="table-container">
            <table class="summary-table">
                <tr>
                    <th>압밀 상태 판별</th>
                    <th>총 응력 증가량 (P₀ + &Delta;P)</th>
                    <th>발생 압밀침하량 (S_c)</th>
                </tr>
                <tr>
                    <td style="font-weight:bold; color:#2980b9;">${state}</td>
                    <td>${P1.toFixed(2)} kN/m²</td>
                    <td style="font-weight:bold; color:#8e44ad; font-size: 1.1em;">${Sc_mm.toFixed(2)} mm</td>
                </tr>
            </table>
        </div>

        <div class="section-title">■ 상세 산정 과정</div>
        
        <div class="calc-step" style="margin-bottom: 12px;">
            <strong>1. 점토층 중앙의 지중응력 증가량 (&Delta;P) 산정 (2:1 응력분산법)</strong><br>
            &nbsp;&nbsp;&nbsp;&nbsp;&Delta;P = ${frac('q &times; B &times; L', '(B + z)(L + z)')}<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&Delta;P = ${frac(`${dq.toFixed(2)} &times; ${B.toFixed(2)} &times; ${L.toFixed(2)}`, `(${B.toFixed(2)} +${z.toFixed(2)}) &times; (${L.toFixed(2)} +${z.toFixed(2)})`)} = <strong>${dP.toFixed(2)} kN/m²</strong>
        </div>

        <div class="calc-step" style="margin-bottom: 12px;">
            <strong>2. 응력 조건 비교 및 압밀 상태 결정</strong><br>
            &nbsp;&nbsp;&nbsp;&nbsp;• 초기 유효상재하중 (P₀) = ${P0.toFixed(2)} kN/m²<br>
            &nbsp;&nbsp;&nbsp;&nbsp;• 선행압밀하중 (P_c) = ${Pc.toFixed(2)} kN/m²<br>
            &nbsp;&nbsp;&nbsp;&nbsp;• 하중 재하 후 총 응력 (P₀ + &Delta;P) = ${P0.toFixed(2)} + ${dP.toFixed(2)} = ${P1.toFixed(2)} kN/m²<br>
            &nbsp;&nbsp;&nbsp;&nbsp;▶ 판별 결과 : <span style="color:#2980b9; font-weight:bold;">${state}</span>
        </div>

        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px;">
            <strong>3. 최종 1차 압밀침하량 (S_c) 산정식</strong><br><br>
            &nbsp;&nbsp;&nbsp;&nbsp;${formulaHTML}<br><br>
            &nbsp;&nbsp;&nbsp;&nbsp;${calcStepsHTML}<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${Sc.toFixed(4)} m (<span style="color:#8e44ad;">${Sc_mm.toFixed(2)} mm</span>)</strong>
        </div>
    `;
}
