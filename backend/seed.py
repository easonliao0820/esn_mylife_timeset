from pymongo import MongoClient
import datetime

# MongoDB 連線設定
client = MongoClient('mongodb://localhost:27017/')
db = client['timeplanner']
tasks_collection = db['tasks']
memos_collection = db['memos']

def seed_data():
    # 1. 先清空現有資料
    tasks_collection.delete_many({})
    memos_collection.delete_many({})
    print("🗑️  已清空舊資料")

    today = datetime.datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # 2. 建立更豐富的假任務 (包含時間重疊)
    sample_tasks = [
        # 早晨
        {'title': '晨間冥想', 'time': '07:00 - 07:30', 'date': today_str, 'status': '已完成'},
        {'title': '早餐與新聞', 'time': '07:45 - 08:30', 'date': today_str, 'status': '已完成'},
        
        # 上午 (有重疊)
        {'title': '電子郵件處理', 'time': '09:00 - 10:00', 'date': today_str, 'status': '已完成'},
        {'title': '核心開發工作', 'time': '09:30 - 12:00', 'date': today_str, 'status': '執行中'},
        {'title': '短暫休息', 'time': '10:30 - 10:45', 'date': today_str, 'status': '已完成'},
        
        # 中午
        {'title': '午餐休息', 'time': '12:00 - 13:30', 'date': today_str, 'status': '待處理'},
        
        # 下午 (密集)
        {'title': '客戶視訊會議', 'time': '14:00 - 15:00', 'date': today_str, 'status': '待處理'},
        {'title': '文件校對', 'time': '14:30 - 16:00', 'date': today_str, 'status': '待處理'},
        {'title': '團隊腦力激盪', 'time': '16:00 - 17:30', 'date': today_str, 'status': '待處理'},
        
        # 晚上
        {'title': '健身房重量訓練', 'time': '18:30 - 20:00', 'date': today_str, 'status': '待處理'},
        {'title': '晚餐', 'time': '20:30 - 21:30', 'date': today_str, 'status': '待處理'},
        {'title': '閱讀與放鬆', 'time': '22:00 - 23:00', 'date': today_str, 'status': '待處理'},
    ]
    tasks_collection.insert_many(sample_tasks)
    print(f"✅ 已插入 {len(sample_tasks)} 筆任務資料")

    # 3. 建立假備忘錄
    sample_memos = [
        {'content': '記得買貓砂', 'created_at': '2026/05/06 10:00:00'},
        {'content': '下週三要交報告', 'created_at': '2026/05/06 11:30:00'},
        {'content': '訂閱 Netflix 續費', 'created_at': '2026/05/06 14:00:00'},
        {'content': '週末去北美館看展', 'created_at': '2026/05/06 15:00:00'},
    ]
    memos_collection.insert_many(sample_memos)
    print(f"✅ 已插入 {len(sample_memos)} 筆備忘錄資料")

if __name__ == '__main__':
    try:
        seed_data()
        print("\n🚀 豐富的假資料已建立！請查看儀表板、行事曆與時間線。")
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")
