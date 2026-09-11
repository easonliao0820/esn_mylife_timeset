/**
 * 資料融合服務 - 負責合併單次任務、每週課表、人生規劃里程碑
 */
import { planMilestones } from './planData';

export const fetchMergedTasks = async (dateStr) => {
  try {
    // 1. 同時獲取任務、課表項目、課表分組（各自的學期日期範圍存在後端）
    const [tasksRes, scheduleRes, tablesRes] = await Promise.all([
      fetch(`/api/tasks?date=${dateStr}`),
      fetch('/api/schedule'),
      fetch('/api/schedule-tables')
    ]);

    const oneOffTasks = await tasksRes.json();
    const scheduleItems = await scheduleRes.json();
    const tables = await tablesRes.json();
    const tableById = Object.fromEntries(tables.map(t => [t._id, t]));

    const targetDate = new Date(dateStr);
    let dayOfWeek = targetDate.getDay(); // 0-6 (週日為 0)
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // 轉成 1-7 (週一為 1)

    let merged = [...oneOffTasks];

    // 2. 只合併「有勾選顯示在行事曆」且日期落在該課表自己學期範圍內的課程，避免不同課表互相干擾或重複
    const dailyCourses = scheduleItems
      .filter(item => item.day === dayOfWeek)
      .filter(item => {
        const table = tableById[item.tableId];
        if (!table || table.showOnCalendar === false) return false;
        const start = new Date(table.semesterStart || '2026-02-16');
        const end = new Date(table.semesterEnd || '2026-06-22');
        return targetDate >= start && targetDate <= end;
      })
      .map(course => ({
        _id: `course-${course._id}`,
        title: course.name,
        time: course.time,
        date: dateStr,
        status: '循環課程',
        category: course.category,
        isRecurring: true // 標記為循環課程
      }));

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
