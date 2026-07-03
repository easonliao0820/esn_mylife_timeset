/**
 * 資料融合服務 - 負責合併單次任務、每週課表、人生規劃里程碑
 */
import { planMilestones } from './planData';

export const fetchMergedTasks = async (dateStr) => {
  try {
    // 1. 同時獲取任務與課表
    const [tasksRes, scheduleRes] = await Promise.all([
      fetch(`/api/tasks?date=${dateStr}`),
      fetch('/api/schedule')
    ]);
    
    const oneOffTasks = await tasksRes.json();
    const scheduleItems = await scheduleRes.json();

    // 2. 獲取學期範圍 (從 localStorage)
    const semesterStart = localStorage.getItem('tt_semesterStart') || '2026-02-16';
    const semesterEnd = localStorage.getItem('tt_semesterEnd') || '2026-06-22';
    
    const targetDate = new Date(dateStr);
    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);

    // 3. 判斷日期是否在學期內
    const isInSemester = targetDate >= start && targetDate <= end;
    
    let merged = [...oneOffTasks];

    if (isInSemester) {
      // 獲取今天是週幾 (1-7, 週一為 1)
      let dayOfWeek = targetDate.getDay();
      dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      // 過濾出課表中對應週幾的課程，並轉化為任務格式
      const dailyCourses = scheduleItems
        .filter(item => item.day === dayOfWeek)
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
    }

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
