/**
 * 資料融合服務 - 負責合併單次任務、每週課表、人生規劃里程碑
 */
import { planMilestones } from './planData';

const parseTimeRange = (timeStr) => {
  const [start, end] = timeStr.split(' - ');
  const toMinutes = (s) => {
    const [h, m] = s.trim().split(':').map(Number);
    return h * 60 + m;
  };
  return [toMinutes(start), toMinutes(end)];
};

// 檢查新任務的時段是否跟同一天既有的單次任務重疊，回傳重疊到的任務清單
// excludeId：拖曳/編輯既有任務時，排除自己本身
export const findTimeConflicts = async (dateStr, timeStr, excludeId) => {
  if (!timeStr || !timeStr.includes('-')) return [];
  const [newStart, newEnd] = parseTimeRange(timeStr);
  const res = await fetch(`/api/tasks?date=${dateStr}`);
  const tasks = await res.json();
  return tasks.filter(t => {
    if (excludeId && t._id === excludeId) return false;
    if (!t.time || !t.time.includes('-')) return false;
    const [exStart, exEnd] = parseTimeRange(t.time);
    return exStart < newEnd && exEnd > newStart;
  });
};

// 檢查新任務的時段是否跟同一天的循環課程重疊，回傳重疊到的課程清單（課程是每週重複的，不會被自動調整，純提醒用）
const findCourseConflicts = async (dateStr, timeStr, excludeCourseId) => {
  if (!timeStr || !timeStr.includes('-')) return [];
  const [newStart, newEnd] = parseTimeRange(timeStr);
  const dayItems = await fetchMergedTasks(dateStr);
  return dayItems.filter(t => {
    if (!t.isRecurring || !t.time || !t.time.includes('-')) return false;
    if (excludeCourseId && t._id === `course-${excludeCourseId}`) return false;
    const [exStart, exEnd] = parseTimeRange(t.time);
    return exStart < newEnd && exEnd > newStart;
  });
};

// 新增/搬動任務前先檢查時段衝突（包含單次任務跟循環課程），有衝突就跳出確認視窗告知使用者；回傳 true 代表可以繼續
export const confirmNoTimeConflicts = async (dateStr, timeStr, excludeId) => {
  const [taskConflicts, courseConflicts] = await Promise.all([
    findTimeConflicts(dateStr, timeStr, excludeId),
    findCourseConflicts(dateStr, timeStr)
  ]);
  if (taskConflicts.length === 0 && courseConflicts.length === 0) return true;

  let msg = '';
  if (taskConflicts.length > 0) {
    const list = taskConflicts.map(c => `・${c.title}（${c.time}）`).join('\n');
    msg += `這個時段跟以下行程衝突：\n${list}\n這些行程會自動依新行程調整時間（前後裁切，完全重疊則移除）。\n\n`;
  }
  if (courseConflicts.length > 0) {
    const list = courseConflicts.map(c => `・🔖 ${c.title}（${c.time}）`).join('\n');
    msg += `這個時段也跟每週重複的課程衝突：\n${list}\n課程不會被自動調整，只是先讓你知道。\n\n`;
  }
  return window.confirm(`${msg}確定要繼續嗎？`);
};

// 搬動課表課程前的確認：課程是每週重複的，搬動會套用到所有週次；若跟單次任務衝突也一併告知
export const confirmCourseMove = async (dateStr, timeStr) => {
  const conflicts = await findTimeConflicts(dateStr, timeStr);
  let msg = '這是每週重複的課程，搬動時間後會套用到所有週次的顯示。';
  if (conflicts.length > 0) {
    const list = conflicts.map(c => `・${c.title}（${c.time}）`).join('\n');
    msg += `\n\n這個時段也跟以下行程衝突：\n${list}\n這些行程會自動依課程調整時間（前後裁切，完全重疊則移除）。`;
  }
  return window.confirm(`${msg}\n\n確定要搬動嗎？`);
};

// 讓後端把某天某時段淨空（配合課程搬動後，裁切/移除衝突到的單次任務）
export const resolveTaskConflictsOnServer = (dateStr, timeStr) => {
  return fetch('/api/tasks/resolve-conflicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateStr, time: timeStr })
  });
};

// 只調整某個課程「這一天」的時間，不影響其他週次
export const saveScheduleException = (scheduleId, dateStr, timeStr) => {
  return fetch('/api/schedule-exceptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduleId, date: dateStr, time: timeStr })
  });
};

export const fetchMergedTasks = async (dateStr) => {
  try {
    // 1. 同時獲取任務、課表項目、課表分組、當天的課程單日例外（各自的學期日期範圍存在後端）
    const [tasksRes, scheduleRes, tablesRes, exceptionsRes] = await Promise.all([
      fetch(`/api/tasks?date=${dateStr}`),
      fetch('/api/schedule'),
      fetch('/api/schedule-tables'),
      fetch(`/api/schedule-exceptions?date=${dateStr}`)
    ]);

    const oneOffTasks = await tasksRes.json();
    const scheduleItems = await scheduleRes.json();
    const tables = await tablesRes.json();
    const exceptions = await exceptionsRes.json();
    const tableById = Object.fromEntries(tables.map(t => [t._id, t]));
    const exceptionByScheduleId = Object.fromEntries(exceptions.map(e => [e.scheduleId, e]));

    const targetDate = new Date(dateStr);
    let dayOfWeek = targetDate.getDay(); // 0-6 (週日為 0)
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // 轉成 1-7 (週一為 1)

    let merged = [...oneOffTasks];

    // 2. 只合併「有勾選顯示在行事曆」且日期落在該課表自己學期範圍內的課程，避免不同課表互相干擾或重複
    //    若這一天有設定單日例外時間，優先使用例外時間（不影響其他週次）
    const dailyCourses = scheduleItems
      .filter(item => item.day === dayOfWeek)
      .filter(item => {
        const table = tableById[item.tableId];
        if (!table || table.showOnCalendar === false) return false;
        const start = new Date(table.semesterStart || '2026-02-16');
        const end = new Date(table.semesterEnd || '2026-06-22');
        return targetDate >= start && targetDate <= end;
      })
      .map(course => {
        const exception = exceptionByScheduleId[course._id];
        return {
          _id: `course-${course._id}`,
          title: course.name,
          time: exception ? exception.time : course.time,
          date: dateStr,
          status: '循環課程',
          category: course.category,
          isRecurring: true, // 標記為循環課程
          hasException: !!exception
        };
      });

    merged = [...merged, ...dailyCourses];

    // 4. 注入當天的人生規劃里程碑（若已有真實里程碑任務則略過，避免重複）
    const hasRealMilestone = oneOffTasks.some(t => t.category === 'milestone');
    const milestone = !hasRealMilestone && planMilestones.find(m => m.date === dateStr);
    if (milestone) {
      merged = [{
        _id: `milestone-${milestone.date}`,
        title: `${milestone.icon} ${milestone.label}`,
        desc: milestone.desc,
        date: dateStr,
        time: '00:00 - 00:30',
        category: 'milestone',
        status: '里程碑',
        isMilestone: true,
      }, ...merged];
    }

    return merged;
  } catch (error) {
    console.error('資料融合出錯:', error);
    return [];
  }
};
