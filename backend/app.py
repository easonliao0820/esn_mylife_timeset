from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId

app = Flask(__name__)
CORS(app) # 允許前端跨來源請求

# MongoDB 連線設定 (預設連線到本地端的 timeplanner 資料庫)
client = MongoClient('mongodb://localhost:27017/')
db = client['timeplanner']
tasks_collection = db['tasks']
memos_collection = db['memos']
schedule_collection = db['schedule'] # 新增課表集合

# 輔助函式：將 MongoDB 的 Document 轉換為 JSON 可讀格式
def serialize_doc(doc):
    doc['_id'] = str(doc['_id'])
    return doc

# --- 課表 API (每週重複) ---
@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    items = list(schedule_collection.find())
    return jsonify([serialize_doc(item) for item in items])

@app.route('/api/schedule', methods=['POST'])
def add_schedule_item():
    data = request.json
    new_item = {
        'name': data.get('name'),
        'day': data.get('day'), # 1-7 (週一到週日)
        'time': data.get('time'),
        'room': data.get('room'),
        'category': data.get('category', 'work')
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
    return jsonify({'message': 'Schedule item deleted successfully'})

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
    result = tasks_collection.insert_one(new_task)
    new_task['_id'] = str(result.inserted_id)
    return jsonify(new_task), 201

# API: 更新任務狀態
@app.route('/api/tasks/<id>', methods=['PATCH'])
def update_task(id):
    data = request.json
    tasks_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
    return jsonify({'message': 'Task updated successfully'})

# API: 刪除任務
@app.route('/api/tasks/<id>', methods=['DELETE'])
def delete_task(id):
    tasks_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Task deleted successfully'})

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
        'created_at': data.get('created_at')
    }
    result = memos_collection.insert_one(new_memo)
    new_memo['_id'] = str(result.inserted_id)
    return jsonify(new_memo), 201

@app.route('/api/memos/<id>', methods=['DELETE'])
def delete_memo(id):
    memos_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'message': 'Memo deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
