//import { studentsList, showToast, openCustomModal } from './app.js';
//import { VOCABULARY_DATA } from './data/vocabulary.js';

function initAdminModule() {
  document.getElementById('admin-tab-users').onclick = () => switchAdminTab('users');
  document.getElementById('admin-tab-analytics').onclick = () => switchAdminTab('analytics');
  document.getElementById('btn-admin-logout').onclick = () => location.reload();
  document.getElementById('form-add-student').onsubmit = handleAddSingleStudent;
  document.getElementById('btn-trigger-csv-upload').onclick = () => document.getElementById('csv-file-input').click();
  document.getElementById('csv-file-input').onchange = handleCsvFileUpload;
  document.getElementById('btn-download-csv-template').onclick = downloadCsvTemplate;
  document.getElementById('btn-export-performance-csv').onclick = exportPerformanceCsv;
  document.getElementById('btn-clear-all-students').onclick = () => {
    openCustomModal("確定清空全班？", "將刪除所有學生資料。", () => {
      studentsList.length = 0;
      localStorage.setItem('g6_portal_students', JSON.stringify([]));
      renderAdminTables();
    });
  };
  document.getElementById('close-detail-modal-btn').onclick = closeStudentDetailModal;
  document.getElementById('close-detail-modal-footer-btn').onclick = closeStudentDetailModal;
}

function switchAdminTab(tab) {
  if (tab === 'users') {
    document.getElementById('admin-panel-users').classList.remove('hidden');
    document.getElementById('admin-panel-analytics').classList.add('hidden');
  } else {
    document.getElementById('admin-panel-users').classList.add('hidden');
    document.getElementById('admin-panel-analytics').classList.remove('hidden');
  }
  renderAdminTables();
}

function renderAdminTables() {
  const tbodyUsers = document.getElementById('admin-students-tbody');
  tbodyUsers.innerHTML = '';
  document.getElementById('admin-user-count').textContent = studentsList.length;

  studentsList.forEach(student => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-bold text-brand-600">${student.seatNo}</td>
      <td class="p-3 font-bold text-slate-800">${student.name}</td>
      <td class="p-3 text-slate-400 text-[11px]">${student.created || '2026-07-01'}</td>
      <td class="p-3 text-right">
        <button class="px-2 py-1 bg-rose-50 text-rose-600 font-bold rounded-lg text-[11px]">刪除</button>
      </td>
    `;
    tr.querySelector('button').onclick = () => {
      openCustomModal("刪除帳號？", `刪除 ${student.name}？`, () => {
        const idx = studentsList.findIndex(s => s.seatNo === student.seatNo);
        if (idx !== -1) studentsList.splice(idx, 1);
        localStorage.setItem('g6_portal_students', JSON.stringify(studentsList));
        renderAdminTables();
      });
    };
    tbodyUsers.appendChild(tr);
  });

  const tbodyPerf = document.getElementById('admin-performance-tbody');
  tbodyPerf.innerHTML = '';

  studentsList.forEach(student => {
    const seatNo = student.seatNo;
    const completed = new Set(JSON.parse(localStorage.getItem(`g6_vocab_completed_${seatNo}`)) || []);
    const learnedWordIds = new Set(JSON.parse(localStorage.getItem(`g6_learned_ids_${seatNo}`)) || []);
    const starred = new Set(JSON.parse(localStorage.getItem(`g6_vocab_starred_${seatNo}`)) || []);
    const quizHistory = JSON.parse(localStorage.getItem(`g6_vocab_quiz_history_${seatNo}`)) || [];

    const learnedCount = learnedWordIds.size;
    const percent = ((learnedCount / 2000) * 100).toFixed(1);

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/60 cursor-pointer";
    tr.onclick = () => openStudentDetailModal(student, completed, learnedCount, starred, quizHistory);
    tr.innerHTML = `
      <td class="p-3 font-mono font-bold text-brand-600">${student.seatNo}</td>
      <td class="p-3 font-bold text-slate-800">${student.name}</td>
      <td class="p-3">${completed.has(new Date().toISOString().split('T')[0]) ? '已完成' : '未完成'}</td>
      <td class="p-3 font-bold">${completed.size} 天</td>
      <td class="p-3 font-bold text-indigo-600">${learnedCount} / 2000 字 (${percent}%)</td>
      <td class="p-3 font-bold">${quizHistory.length} 次</td>
      <td class="p-3 font-bold text-emerald-600">85 分</td>
      <td class="p-3 font-bold text-purple-600">${starred.size} 個</td>
      <td class="p-3 text-right text-slate-400 font-bold">詳情 ></td>
    `;
    tbodyPerf.appendChild(tr);
  });
}

function openStudentDetailModal(student, completed, learnedCount, starred, quizHistory) {
  document.getElementById('modal-student-name').textContent = `${student.name} 的學習歷程`;
  document.getElementById('detail-stat-completed').textContent = `${completed.size} 天`;
  document.getElementById('detail-stat-learned-count').textContent = `${learnedCount} 字`;
  document.getElementById('detail-stat-quizzes').textContent = `${quizHistory.length} 次`;
  document.getElementById('detail-stat-starred').textContent = `${starred.size} 個`;
  document.getElementById('student-detail-modal').classList.remove('hidden');
}

function closeStudentDetailModal() {
  document.getElementById('student-detail-modal').classList.add('hidden');
}

function handleAddSingleStudent(e) {
  e.preventDefault();
  const name = document.getElementById('add-student-name').value.trim();
  const seatNo = document.getElementById('add-student-seat').value.trim();
  studentsList.push({ name, seatNo, created: new Date().toISOString().split('T')[0] });
  localStorage.setItem('g6_portal_students', JSON.stringify(studentsList));
  renderAdminTables();
  showToast("新增成功！", "fa-circle-check");
}

function handleCsvFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const lines = evt.target.result.split(/\r\n|\n/);
    lines.forEach((line, index) => {
      const parts = line.split(',');
      if (parts.length >= 2 && index > 0) {
        const name = parts[0].trim();
        const seatNo = parts[1].trim();
        if (seatNo.length === 5) studentsList.push({ name, seatNo, created: new Date().toISOString().split('T')[0] });
      }
    });
    localStorage.setItem('g6_portal_students', JSON.stringify(studentsList));
    renderAdminTables();
    showToast("CSV 匯入成功！", "fa-file-csv");
  };
  reader.readAsText(file, 'UTF-8');
}

function downloadCsvTemplate() {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF姓名,座號\n張小明,60101\n李小華,60102";
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "學生帳號匯入範本.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPerformanceCsv() {
  let csvText = "\uFEFF座號,姓名,累積打卡,2000字進度\n";
  studentsList.forEach(s => {
    const learnedWordIds = new Set(JSON.parse(localStorage.getItem(`g6_learned_ids_${s.seatNo}`)) || []);
    csvText += `${s.seatNo},${s.name},0,${learnedWordIds.size}\n`;
  });
  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvText);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "學習成效報表.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}