from flask import Flask, render_template, request, jsonify, send_file
import csv
from io import StringIO, BytesIO
import os
import json
from datetime import datetime

app = Flask(__name__)

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
WORK_DATA_FILE = os.path.join(DATA_DIR, 'work_data.json')

# 确保数据目录存在
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# 初始化数据文件
if not os.path.exists(WORK_DATA_FILE):
    with open(WORK_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

def get_work_data():
    try:
        with open(WORK_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def save_work_data(data):
    with open(WORK_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/work_data', methods=['GET'])
def get_data():
    return jsonify(get_work_data())

@app.route('/api/work_data', methods=['POST'])
def update_data():
    data = request.json
    work_data = get_work_data()
    
    date = data.get('date')
    is_working = data.get('is_working')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    report_content = data.get('report_content', '')
    
    if date:
        # 如果日期存在但记录不存在，创建一个新记录
        if date not in work_data:
            work_data[date] = {'is_working': False, 'hours': 0, 'start_time': '', 'end_time': '', 'report_content': ''}
        
        # 如果提供了工作状态，更新它
        if is_working is not None:
            work_data[date]['is_working'] = is_working
        
        # 如果提供了上下班时间，计算工作时长
        if is_working and start_time and end_time:
            # 解析时间字符串为小时和分钟
            start_hour, start_minute = map(int, start_time.split(':'))
            end_hour, end_minute = map(int, end_time.split(':'))
            
            # 计算工作时长（小时）
            hours = (end_hour - start_hour) + (end_minute - start_minute) / 60
            if hours < 0:  # 处理跨天情况
                hours += 24
            
            work_data[date]['start_time'] = start_time
            work_data[date]['end_time'] = end_time
            work_data[date]['hours'] = round(hours, 1)
        elif not is_working:
            work_data[date]['hours'] = 0
            work_data[date]['start_time'] = ''
            work_data[date]['end_time'] = ''
        
        # 如果提供了日报内容，更新它
        if report_content is not None:
            work_data[date]['report_content'] = report_content
        
        save_work_data(work_data)
        return jsonify({'success': True, 'hours': work_data[date]['hours']})
    
    return jsonify({'success': False, 'error': '无效的数据'})

@app.route('/api/report', methods=['GET'])
def get_report():
    date = request.args.get('date')
    if not date:
        return jsonify({'success': False, 'error': '未提供日期'})
    
    work_data = get_work_data()
    if date in work_data:
        return jsonify({
            'success': True,
            'data': work_data[date]
        })
    else:
        return jsonify({
            'success': True,
            'data': {'is_working': False, 'hours': 0, 'start_time': '', 'end_time': '', 'report_content': ''}
        })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    work_data = get_work_data()
    year = request.args.get('year', datetime.now().strftime('%Y'))
    month = request.args.get('month', datetime.now().strftime('%m'))
    
    # 计算总工作天数和总工作时长
    total_days = 0
    total_hours = 0
    
    # 计算当月工作天数和工作时长
    month_days = 0
    month_hours = 0
    
    for date, data in work_data.items():
        if data['is_working']:
            total_days += 1
            total_hours += data['hours']
            
            # 检查是否是当前选择的年月
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            if date_obj.strftime('%Y') == year and date_obj.strftime('%m') == month:
                month_days += 1
                month_hours += data['hours']
    
    return jsonify({
        'total_days': total_days,
        'total_hours': total_hours,
        'month_days': month_days,
        'month_hours': month_hours
    })

@app.route('/api/download/json')
def download_json():
    work_data = get_work_data()
    # 创建一个内存文件
    mem_file = StringIO()
    json.dump(work_data, mem_file, ensure_ascii=False, indent=2)
    mem_file.seek(0)
    
    # 将StringIO转换为BytesIO
    bytes_data = mem_file.getvalue().encode('utf-8')
    output = BytesIO(bytes_data)
    
    return send_file(
        output,
        mimetype='application/json',
        as_attachment=True,
        download_name='work_report.json'
    )

@app.route('/api/download/csv')
def download_csv():
    work_data = get_work_data()
    # 创建一个内存文件
    mem_file = StringIO()
    writer = csv.writer(mem_file)
    
    # 获取所有可能的键作为表头
    headers = ['date'] + list(next(iter(work_data.values())).keys()) if work_data else ['date']
    writer.writerow(headers)
    
    # 写入数据
    for date, data in work_data.items():
        row = [date] + [data.get(key, '') for key in headers[1:]]
        writer.writerow(row)
    
    mem_file.seek(0)
    
    # 将StringIO转换为BytesIO
    bytes_data = mem_file.getvalue().encode('utf-8')
    output = BytesIO(bytes_data)
    
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='work_report.csv'
    )

if __name__ == '__main__':
    app.run(debug=True)
