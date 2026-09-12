import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId

app = Flask(__name__)
CORS(app) # 允許前端跨來源請求

# MongoDB 連線設定 (本地開發預設連線 localhost；正式環境改用 MONGODB_URI 環境變數，例如 MongoDB Atlas)
MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGODB_URI)
db = client['timeplanner']
tasks_collection = db['tasks']
memos_collection = db['memos']
schedule_collection = db['schedule'] # 新增課表集合
schedule_tables_collection = db['schedule_tables'] # 課表分組 (可同時存在多份課表)
schedule_exceptions_collection = db['schedule_exceptions'] # 課程「單日」時間例外（不影響其他週次）

# 輔助函式：將 MongoDB 的 Document 轉換為 JSON 可讀格式
def serialize_doc(doc):
    doc['_id'] = str(doc['_id'])
    return doc

# 輔助函式：將 "HH:MM - HH:MM" 轉換成 (開始分鐘數, 結束分鐘數)
def parse_time_range(time_str):
    start_str, end_str = time_str.split(' - ')
    def to_minutes(s):
        h, m = s.strip().split(':')
        return int(h) * 60 + int(m)
    return to_minutes(start_str), to_minutes(end_str)

def minutes_to_hhmm(mins):
    return f'{mins // 60:02d}:{mins % 60:02d}'

# 新任務加入時，若跟同一天既有任務的時段重疊，優先保留新任務，
# 既有任務會自動往前後裁切/拆分（完全被覆蓋則整筆移除）
# exclude_id：搬動/編輯既有任務時，排除自己本身，避免跟自己比較
def resolve_time_conflicts(new_task, exclude_id=None):
    if not new_task.get('time') or not new_task.get('date'):
        return
    try:
        new_start, new_end = parse_time_range(new_task['time'])
    except (ValueError, AttributeError):
        return

    query = {'date': new_task['date']}
    if exclude_id:
        query['_id'] = {'$ne': exclude_id}

    for existing in tasks_collection.find(query):
        if not existing.get('time'):
            continue
        try:
            ex_start, ex_end = parse_time_range(existing['time'])
        except (ValueError, AttributeError):
            continue

        if ex_end <= new_start or ex_start >= new_end:
            continue  # 沒有重疊

        has_before = ex_start < new_start
        has_after = ex_end > new_end

        if has_before and has_after:
            tasks_collection.update_one(
                {'_id': existing['_id']},
                {'$set': {'time': f'{minutes_to_hhmm(ex_start)} - {minutes_to_hhmm(new_start)}'}}
            )
            tasks_collection.insert_one({
                'title': existing.get('title'),
                'time': f'{minutes_to_hhmm(new_end)} - {minutes_to_hhmm(ex_end)}',
                'date': existing.get('date'),
                'category': existing.get('category', 'work'),
                'status': existing.get('status', '待處理')
            })
        elif has_before:
            tasks_collection.update_one(
                {'_id': existing['_id']},
                {'$set': {'time': f'{minutes_to_hhmm(ex_start)} - {minutes_to_hhmm(new_start)}'}}
            )
        elif has_after:
            tasks_collection.update_one(
                {'_id': existing['_id']},
                {'$set': {'time': f'{minutes_to_hhmm(new_end)} - {minutes_to_hhmm(ex_end)}'}}
            )
        else:
            tasks_collection.delete_one({'_id': existing['_id']})

# --- 課表分組 API (支援多份課表切換) ---
@app.route('/api/schedule-tables', methods=['GET'])
def get_schedule_tables():
    tables = list(schedule_tables_collection.find())
    return jsonify([serialize_doc(t) for t in tables])

@app.route('/api/schedule-tables', methods=['POST'])
def add_schedule_table():
    data = request.json
    new_table = {
        'name': data.get('name'),
        'semesterStart': data.get('semesterStart', '2026-02-16'),
        'semesterEnd': data.get('semesterEnd', '2026-06-22'),
        'showOnCalendar': data.get('showOnCalendar', True) # 是否把這份課表的回圈時段合併顯示到行事曆/首頁/時間軸
    }
    result = schedule_tables_collection.insert_one(new_table)
    new_table['_id'] = str(result.inserted_id)
    return jsonify(new_table), 201

@app.route('/api/schedule-tables/<id>', methods=['PATCH'])
def update_schedule_table(id):
    data = request.json
    schedule_tables_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
    return jsonify({'message': 'Schedule table updated successfully'})

@app.route('/api/schedule-tables/<id>', methods=['DELETE'])
def delete_schedule_table(id):
    course_ids = [str(c['_id']) for c in schedule_collection.find({'tableId': id})]
    schedule_collection.delete_many({'tableId': id})
    if course_ids:
        schedule_exceptions_collection.delete_many({'scheduleId': {'$in': course_ids}})
    schedule_tables_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Schedule table deleted successfully'})

# --- 課表 API (每週重複) ---
@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    table_id = request.args.get('tableId')
    query = {'tableId': table_id} if table_id else {}
    items = list(schedule_collection.find(query))
    return jsonify([serialize_doc(item) for item in items])

@app.route('/api/schedule', methods=['POST'])
def add_schedule_item():
    data = request.json
    new_item = {
        'name': data.get('name'),
        'day': data.get('day'), # 1-7 (週一到週日)
        'time': data.get('time'),
        'room': data.get('room'),
        'category': data.get('category', 'work'),
        'tableId': data.get('tableId')
    }
    result = schedule_collection.insert_one(new_item)
    new_item['_id'] = str(result.inserted_id)
    return jsonify(new_item), 201

@app.route('/api/schedule/<id>', methods=['PATCH'])
def update_schedule_item(id):
    data = request.json
    schedule_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
    return jsonify({'message': 'Schedule item updated successfully'})

@app.route('/api/schedule/<id>', methods=['DELETE'])
def delete_schedule_item(id):
    schedule_collection.delete_one({'_id': ObjectId(id)})
    schedule_exceptions_collection.delete_many({'scheduleId': id})
    return jsonify({'message': 'Schedule item deleted successfully'})

# --- 課程單日例外 API（只調整某一天的課程時間，不影響其他週次）---
@app.route('/api/schedule-exceptions', methods=['GET'])
def get_schedule_exceptions():
    date = request.args.get('date')
    query = {'date': date} if date else {}
    items = list(schedule_exceptions_collection.find(query))
    return jsonify([serialize_doc(item) for item in items])

@app.route('/api/schedule-exceptions', methods=['POST'])
def upsert_schedule_exception():
    data = request.json
    schedule_id = data.get('scheduleId')
    date = data.get('date')
    schedule_exceptions_collection.update_one(
        {'scheduleId': schedule_id, 'date': date},
        {'$set': {'scheduleId': schedule_id, 'date': date, 'time': data.get('time')}},
        upsert=True
    )
    return jsonify({'message': 'Schedule exception saved'}), 201

@app.route('/api/schedule-exceptions/<id>', methods=['DELETE'])
def delete_schedule_exception(id):
    schedule_exceptions_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Schedule exception deleted'})

# --- 任務 API ---
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    date = request.args.get('date')   # ?date=2026-05-06
    month = request.args.get('month') # ?month=2026-05
    query = {}
    if date:
        query['date'] = date
    elif month:
        query['date'] = {'$regex': f'^{month}'}
    tasks = list(tasks_collection.find(query))
    return jsonify([serialize_doc(task) for task in tasks])

# API: 新增任務
@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    new_task = {
        'title': data.get('title'),
        'time': data.get('time'),
        'date': data.get('date'),
        'category': data.get('category', 'work'),
        'status': data.get('status', '待處理')
    }
    resolve_time_conflicts(new_task)
    result = tasks_collection.insert_one(new_task)
    new_task['_id'] = str(result.inserted_id)
    return jsonify(new_task), 201

# API: 更新任務狀態
@app.route('/api/tasks/<id>', methods=['PATCH'])
def update_task(id):
    data = request.json
    obj_id = ObjectId(id)

    if 'time' in data:
        current = tasks_collection.find_one({'_id': obj_id})
        if current:
            merged = {**current, **data}
            resolve_time_conflicts(merged, exclude_id=obj_id)

    tasks_collection.update_one({'_id': obj_id}, {'$set': data})
    return jsonify({'message': 'Task updated successfully'})

# API: 刪除任務
@app.route('/api/tasks/<id>', methods=['DELETE'])
def delete_task(id):
    tasks_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Task deleted successfully'})

# API: 讓某個時段淨空（用於課表課程搬動到某天時，自動裁切/移除那天衝突的單次任務）
@app.route('/api/tasks/resolve-conflicts', methods=['POST'])
def resolve_conflicts_endpoint():
    data = request.json
    resolve_time_conflicts({'time': data.get('time'), 'date': data.get('date')})
    return jsonify({'message': 'Conflicts resolved'})

# --- 備忘錄 API ---
@app.route('/api/memos', methods=['GET'])
def get_memos():
    memos = list(memos_collection.find())
    return jsonify([serialize_doc(memo) for memo in memos])

@app.route('/api/memos', methods=['POST'])
def add_memo():
    data = request.json
    new_memo = {
        'content': data.get('content'),
        'category': data.get('category', 'work'),
        'created_at': data.get('created_at')
    }
    result = memos_collection.insert_one(new_memo)
    new_memo['_id'] = str(result.inserted_id)
    return jsonify(new_memo), 201

@app.route('/api/memos/<id>', methods=['PATCH'])
def update_memo(id):
    data = request.json
    memos_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
    return jsonify({'message': 'Memo updated successfully'})

@app.route('/api/memos/<id>', methods=['DELETE'])
def delete_memo(id):
    memos_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Memo deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
