//import { studentsList, showToast, openCustomModal } from './app.js';
//import { VOCABULARY_DATA } from './data/vocabulary.js';

let adminAnalytics = [];
let adminWordsPage = 1;
let adminWordsTotal = 0;
const ADMIN_WORDS_PAGE_SIZE = 25;

function initAdminModule() {
  document.getElementById('admin-tab-users').onclick = () => switchAdminTab('users');
  document.getElementById('admin-tab-analytics').onclick = () => switchAdminTab('analytics');
  document.getElementById('admin-tab-words').onclick = () => switchAdminTab('words');
  document.getElementById('btn-admin-logout').onclick = () => {
    sessionStorage.removeItem('g6_portal_user');
    location.reload();
  };
  document.getElementById('form-add-student').onsubmit = handleAddSingleStudent;
  document.getElementById('btn-trigger-csv-upload').onclick = () => document.getElementById('csv-file-input').click();
  document.getElementById('csv-file-input').onchange = handleCsvFileUpload;
  document.getElementById('btn-download-csv-template').onclick = downloadCsvTemplate;
  document.getElementById('btn-export-performance-csv').onclick = exportPerformanceCsv;
  document.getElementById('btn-clear-all-students').onclick = () => {
    openCustomModal("確定清空全班？", "將刪除所有學生資料。", () => {
      clearAllStudents();
    });
  };
  document.getElementById('close-detail-modal-btn').onclick = closeStudentDetailModal;
  document.getElementById('close-detail-modal-footer-btn').onclick = closeStudentDetailModal;
  document.getElementById('form-add-word').onsubmit = handleAddWord;
  document.getElementById('word-search').oninput = debounce(() => { adminWordsPage = 1; loadAdminWords(); }, 300);
  document.getElementById('word-filter-level').onchange = () => { adminWordsPage = 1; loadAdminWords(); };
  document.getElementById('word-filter-enabled').onchange = () => { adminWordsPage = 1; loadAdminWords(); };
  document.getElementById('word-prev-page').onclick = () => { if (adminWordsPage > 1) { adminWordsPage--; loadAdminWords(); } };
  document.getElementById('word-next-page').onclick = () => {
    if (adminWordsPage * ADMIN_WORDS_PAGE_SIZE < adminWordsTotal) { adminWordsPage++; loadAdminWords(); }
  };
}

function switchAdminTab(tab) {
  for (const name of ['users', 'analytics', 'words']) {
    document.getElementById(`admin-panel-${name}`).classList.toggle('hidden', name !== tab);
    const button = document.getElementById(`admin-tab-${name}`);
    button.classList.toggle('bg-amber-500', name === tab);
    button.classList.toggle('text-white', name === tab);
    button.classList.toggle('shadow-md', name === tab);
    button.classList.toggle('text-slate-500', name !== tab);
  }
  if (tab === 'words') loadAdminWords();
  else renderAdminTables();
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

async function renderAdminTables() {
  try {
    const response = await apiFetch('/admin/analytics');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '無法載入資料');
    adminAnalytics = (result.data || []).filter(row => String(row.seat_no || '').trim() !== '');
    studentsList = adminAnalytics.map(row => ({ name: row.name, seatNo: row.seat_no }));
  } catch (error) {
    showToast(error.message || '管理資料載入失敗', 'fa-triangle-exclamation');
    return;
  }

  const tbodyUsers = document.getElementById('admin-students-tbody');
  tbodyUsers.innerHTML = '';
  document.getElementById('admin-user-count').textContent = studentsList.length;

  studentsList.forEach(student => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-bold text-brand-600">${escapeHtml(student.seatNo)}</td>
      <td class="p-3 font-bold text-slate-800">${escapeHtml(student.name)}</td>
      <td class="p-3 text-slate-400 text-[11px]">MariaDB</td>
      <td class="p-3 text-right">
        <button class="px-2 py-1 bg-rose-50 text-rose-600 font-bold rounded-lg text-[11px]">刪除</button>
      </td>
    `;
    tr.querySelector('button').onclick = () => {
      openCustomModal("刪除帳號？", `刪除 ${student.name}？`, () => {
        deleteStudent(student.seatNo);
      });
    };
    tbodyUsers.appendChild(tr);
  });

  const tbodyPerf = document.getElementById('admin-performance-tbody');
  tbodyPerf.innerHTML = '';

  adminAnalytics.forEach(student => {
    const learnedCount = Number(student.learned_count || 0);
    const percent = ((learnedCount / 2000) * 100).toFixed(1);

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/60 cursor-pointer";
    tr.onclick = () => openStudentDetailModal(student);
    tr.innerHTML = `
      <td class="p-3 font-mono font-bold text-brand-600">${escapeHtml(student.seat_no)}</td>
      <td class="p-3 font-bold text-slate-800">${escapeHtml(student.name)}</td>
      <td class="p-3">${Number(student.total_days) > 0 ? '有紀錄' : '尚無紀錄'}</td>
      <td class="p-3 font-bold">${Number(student.total_days || 0)} 天</td>
      <td class="p-3 font-bold text-indigo-600">${learnedCount} / 2000 字 (${percent}%)</td>
      <td class="p-3 font-bold">${Number(student.total_quizzes || 0)} 次</td>
      <td class="p-3 font-bold text-emerald-600">${student.avg_score == null ? '-' : Number(student.avg_score).toFixed(1)} 分</td>
      <td class="p-3 font-bold text-purple-600">${Number(student.starred_count || 0)} 個</td>
      <td class="p-3 text-right text-slate-400 font-bold">詳情 ></td>
    `;
    tbodyPerf.appendChild(tr);
  });
}

function openStudentDetailModal(student) {
  document.getElementById('modal-student-name').textContent = `${student.name} 的學習歷程`;
  document.getElementById('detail-stat-completed').textContent = `${Number(student.total_days || 0)} 天`;
  document.getElementById('detail-stat-learned-count').textContent = `${Number(student.learned_count || 0)} 字`;
  document.getElementById('detail-stat-quizzes').textContent = `英文 ${Number(student.total_quizzes || 0)} 次／數學 ${Number(student.math_quizzes || 0)} 次`;
  document.getElementById('detail-stat-starred').textContent = `${Number(student.starred_count || 0)} 個`;
  document.getElementById('student-detail-modal').classList.remove('hidden');
}

function closeStudentDetailModal() {
  document.getElementById('student-detail-modal').classList.add('hidden');
}

async function handleAddSingleStudent(e) {
  e.preventDefault();
  const name = document.getElementById('add-student-name').value.trim();
  const seatNo = document.getElementById('add-student-seat').value.trim();
  try {
    const response = await apiFetch('/admin/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, seatNo })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '新增失敗');
    await renderAdminTables();
    showToast("新增成功！", "fa-circle-check");
    e.target.reset();
  } catch (error) { showToast(error.message, 'fa-triangle-exclamation'); }
}

function handleCsvFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const lines = evt.target.result.split(/\r\n|\n/);
    for (const [index, line] of lines.entries()) {
      const parts = line.split(',');
      if (parts.length >= 2 && index > 0) {
        const name = parts[0].trim();
        const seatNo = parts[1].trim();
        if (seatNo.length === 5) {
          await apiFetch('/admin/students', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, seatNo })
          });
        }
      }
    }
    await renderAdminTables();
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
  let csvText = "\uFEFF座號,姓名,英文完成天數,英文單字進度,英文測驗次數,英文平均,數學測驗次數,數學平均\n";
  adminAnalytics.forEach(s => {
    csvText += `${s.seat_no},${s.name},${s.total_days || 0},${s.learned_count || 0},${s.total_quizzes || 0},${s.avg_score || ''},${s.math_quizzes || 0},${s.math_avg_score || ''}\n`;
  });
  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvText);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "學習成效報表.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function deleteStudent(seatNo, refresh = true) {
  const normalizedSeatNo = String(seatNo || '').trim();
  if (!/^\d{5}$/.test(normalizedSeatNo)) {
    showToast('無效的學生座號，已停止刪除', 'fa-triangle-exclamation');
    return;
  }
  try {
    const response = await apiFetch(`/admin/students/${encodeURIComponent(normalizedSeatNo)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '刪除失敗');
    if (refresh) await renderAdminTables();
  } catch (error) { showToast(error.message, 'fa-triangle-exclamation'); }
}

async function clearAllStudents() {
  for (const student of [...studentsList]) await deleteStudent(student.seatNo, false);
  await renderAdminTables();
}

async function loadAdminWords() {
  const params = new URLSearchParams({ page: adminWordsPage, limit: ADMIN_WORDS_PAGE_SIZE });
  const search = document.getElementById('word-search').value.trim();
  const level = document.getElementById('word-filter-level').value;
  const enabled = document.getElementById('word-filter-enabled').value;
  if (search) params.set('search', search);
  if (level) params.set('level', level);
  if (enabled !== '') params.set('enabled', enabled);
  const tbody = document.getElementById('admin-words-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">載入中…</td></tr>';
  try {
    const response = await apiFetch(`/admin/words?${params}`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '單字資料載入失敗');
    adminWordsTotal = Number(result.pagination?.total || 0);
    renderAdminWords(result.data || []);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message || '單字資料載入失敗', 'fa-triangle-exclamation');
  }
}

function renderAdminWords(words) {
  const tbody = document.getElementById('admin-words-tbody');
  tbody.innerHTML = '';
  for (const word of words) {
    const enabled = Boolean(word.learning_enabled);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3"><div class="font-bold text-brand-600">${escapeHtml(word.vocabulary)}</div><div class="text-slate-400 mt-1">${escapeHtml(word.phonetic)}</div></td>
      <td class="p-3">${escapeHtml(word.chinese)}</td>
      <td class="p-3 max-w-sm"><div>${escapeHtml(word.sentence)}</div><div class="text-slate-400 mt-1">${escapeHtml(word.translate)}</div></td>
      <td class="p-3 font-bold">Level ${Number(word.level)}</td>
      <td class="p-3"><button type="button" class="px-3 py-1.5 rounded-lg font-bold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${enabled ? '已啟用' : '已停用'}</button></td>`;
    tr.querySelector('button').onclick = () => toggleWordLearning(word.id, !enabled);
    tbody.appendChild(tr);
  }
  if (!words.length) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">找不到符合條件的單字</td></tr>';
  const totalPages = Math.max(1, Math.ceil(adminWordsTotal / ADMIN_WORDS_PAGE_SIZE));
  document.getElementById('word-pagination-summary').textContent = `${adminWordsTotal} 個單字 · 第 ${adminWordsPage} / ${totalPages} 頁`;
  document.getElementById('word-prev-page').disabled = adminWordsPage <= 1;
  document.getElementById('word-next-page').disabled = adminWordsPage >= totalPages;
}

async function toggleWordLearning(id, learningEnabled) {
  try {
    const response = await apiFetch(`/admin/words/${encodeURIComponent(id)}/learning-enabled`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learningEnabled })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '狀態更新失敗');
    await loadAdminWords();
    showToast(learningEnabled ? '單字已啟用' : '單字已停用', 'fa-circle-check');
  } catch (error) { showToast(error.message || '狀態更新失敗', 'fa-triangle-exclamation'); }
}

async function handleAddWord(event) {
  event.preventDefault();
  const payload = {
    vocabulary: document.getElementById('add-word-vocabulary').value.trim(),
    phonetic: document.getElementById('add-word-phonetic').value.trim(),
    chinese: document.getElementById('add-word-chinese').value.trim(),
    sentence: document.getElementById('add-word-sentence').value.trim(),
    translate: document.getElementById('add-word-translate').value.trim(),
    level: Number(document.getElementById('add-word-level').value),
    learningEnabled: document.getElementById('add-word-enabled').checked
  };
  try {
    const response = await apiFetch('/admin/words', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || '新增單字失敗');
    event.target.reset();
    document.getElementById('add-word-enabled').checked = true;
    adminWordsPage = 1;
    await loadAdminWords();
    showToast('單字新增成功', 'fa-circle-check');
  } catch (error) { showToast(error.message || '新增單字失敗', 'fa-triangle-exclamation'); }
}
