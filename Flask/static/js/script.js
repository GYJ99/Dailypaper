document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let currentDate = new Date();
    let workData = {};
    let selectedDate = null;
    let simpleMDE = null;
    
    // 初始化Markdown编辑器
    simpleMDE = new SimpleMDE({ 
        element: document.getElementById('report-editor'),
        spellChecker: false,
        placeholder: '请输入工作日报内容...',
        autosave: {
            enabled: true,
            uniqueId: 'workReportEditor',
            delay: 1000,
        },
        toolbar: [
            'bold', 'italic', 'heading', '|', 
            'unordered-list', 'ordered-list', '|',
            'link', 'code', '|',
            'preview'
        ],
        status: false,  // 关闭状态栏
        renderingConfig: {
            codeSyntaxHighlighting: false  // 关闭代码高亮，避免加载外部资源
        }
    });
    
    // 初始化
    fetchWorkData();
    
    // 事件监听
    document.getElementById('prev-month').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        updateStats();
    });
    
    document.getElementById('next-month').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        updateStats();
    });
    
    // 上下班时间变更监听
    document.getElementById('start-time').addEventListener('change', calculateWorkHours);
    document.getElementById('end-time').addEventListener('change', calculateWorkHours);
    
    // 保存日报按钮
    document.getElementById('save-report').addEventListener('click', function() {
        if (!selectedDate) {
            alert('请先选择一个日期');
            return;
        }
        
        const reportContent = simpleMDE.value();
        saveReport(selectedDate, reportContent);
    });
    
    // 删除日报按钮
    document.getElementById('delete-report').addEventListener('click', function() {
        if (!selectedDate) {
            alert('请先选择一个日期');
            return;
        }
        
        if (confirm('确定要删除该日期的日报吗？')) {
            deleteReport(selectedDate);
        }
    });
    
    // 模态框中保存时间设置按钮
    document.getElementById('save-time-settings').addEventListener('click', function() {
        const date = document.getElementById('modal-date').dataset.date;
        const startTime = document.getElementById('modal-start-time').value;
        const endTime = document.getElementById('modal-end-time').value;
        
        if (!startTime || !endTime) {
            alert('请设置上下班时间');
            return;
        }
        
        updateWorkTime(date, startTime, endTime);
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('timeSettingModal'));
        modal.hide();
    });
    
    // 模态框中删除时间设置按钮
    document.getElementById('delete-time-settings').addEventListener('click', function() {
        const date = document.getElementById('modal-date').dataset.date;
        
        if (confirm('确定要删除该日期的工作时间吗？')) {
            deleteWorkTime(date);
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('timeSettingModal'));
            modal.hide();
        }
    });
    
    // 获取工作数据
    function fetchWorkData() {
        fetch('/api/work_data')
            .then(response => response.json())
            .then(data => {
                workData = data;
                renderCalendar();
                updateStats();
            })
            .catch(error => console.error('获取工作数据失败:', error));
    }
    
    // 渲染日历
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // 更新标题
        document.getElementById('current-month-year').textContent = `${year}年${month + 1}月`;
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 获取当月第一天是星期几（0-6，0表示星期日）
        const firstDayOfWeek = firstDay.getDay();
        
        // 获取当月天数
        const daysInMonth = lastDay.getDate();
        
        // 获取上个月的最后几天（用于填充日历第一行）
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        // 清空日历
        const calendarBody = document.getElementById('calendar-body');
        calendarBody.innerHTML = '';
        
        // 当前日期
        const today = new Date();
        const todayDateStr = formatDate(today);
        
        // 生成日历
        let date = 1;
        let nextMonthDate = 1;
        
        // 创建6行（最多6行可以显示一个月的所有日期）
        for (let i = 0; i < 6; i++) {
            // 如果已经超过当月最后一天且已经是下个月的第一周，则不再创建新行
            if (date > daysInMonth && i > 0) break;
            
            const row = document.createElement('tr');
            
            // 创建7列（一周7天）
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                cell.className = 'calendar-day';
                
                let dateObj, dateStr;
                
                // 填充上个月的日期
                if (i === 0 && j < firstDayOfWeek) {
                    const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - j - 1);
                    dateObj = new Date(year, month - 1, prevMonthDay);
                    dateStr = formatDate(dateObj);
                    
                    cell.innerHTML = `
                        <div class="day-number">${prevMonthDay}</div>
                    `;
                    cell.classList.add('other-month');
                }
                // 填充下个月的日期
                else if (date > daysInMonth) {
                    dateObj = new Date(year, month + 1, nextMonthDate);
                    dateStr = formatDate(dateObj);
                    
                    cell.innerHTML = `
                        <div class="day-number">${nextMonthDate}</div>
                    `;
                    cell.classList.add('other-month');
                    nextMonthDate++;
                }
                // 填充当月的日期
                else {
                    dateObj = new Date(year, month, date);
                    dateStr = formatDate(dateObj);
                    
                    // 检查是否是工作日
                    const isWorkingDay = workData[dateStr] && workData[dateStr].is_working;
                    const workHours = (workData[dateStr] && workData[dateStr].hours) || 0;
                    
                    cell.innerHTML = `
                        <div class="day-number">${date}</div>
                        ${isWorkingDay ? `<div class="work-hours">${workHours}小时</div>` : ''}
                    `;
                    
                    if (isWorkingDay) {
                        cell.classList.add('working-day');
                    }
                    
                    // 标记今天
                    if (dateStr === todayDateStr) {
                        cell.classList.add('today');
                    }
                    
                    date++;
                }
                
                // 设置日期属性
                cell.dataset.date = dateStr;
                
                // 添加左键点击事件（查看日期信息和日报）
                cell.addEventListener('click', function(e) {
                    const date = this.dataset.date;
                    selectedDate = date;
                    
                    // 更新选中日期信息
                    updateSelectedDateInfo(date);
                    
                    // 加载日报内容
                    loadReportContent(date);
                    
                    // 注意：移除了点击自动切换工作日状态的功能
                    // 现在需要通过右键菜单来设置或删除工作时间
                });
                
                // 添加右键点击事件（设置上下班时间）
                cell.addEventListener('contextmenu', function(e) {
                    e.preventDefault(); // 阻止默认右键菜单
                    
                    const date = this.dataset.date;
                    selectedDate = date;
                    
                    // 如果是其他月份的日期，不处理
                    if (this.classList.contains('other-month')) {
                        return;
                    }
                    
                    // 显示时间设置模态框
                    const modal = new bootstrap.Modal(document.getElementById('timeSettingModal'));
                    
                    // 设置日期信息
                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
                    document.getElementById('modal-date').textContent = formattedDate;
                    document.getElementById('modal-date').dataset.date = date;
                    
                    // 设置当前时间值
                    if (workData[date] && workData[date].start_time) {
                        document.getElementById('modal-start-time').value = workData[date].start_time;
                    } else {
                        document.getElementById('modal-start-time').value = document.getElementById('start-time').value;
                    }
                    
                    if (workData[date] && workData[date].end_time) {
                        document.getElementById('modal-end-time').value = workData[date].end_time;
                    } else {
                        document.getElementById('modal-end-time').value = document.getElementById('end-time').value;
                    }
                    
                    modal.show();
                });
                
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
        }
    }
    
    // 计算工作时长
    function calculateWorkHours() {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        
        if (startTime && endTime) {
            // 解析时间字符串为小时和分钟
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            // 计算工作时长（小时）
            let hours = (endHour - startHour) + (endMinute - startMinute) / 60;
            if (hours < 0) {  // 处理跨天情况
                hours += 24;
            }
            
            document.getElementById('calculated-hours').textContent = hours.toFixed(1) + '小时';
            
            // 如果有选中的日期，更新该日期的工作时间
            if (selectedDate) {
                updateWorkTime(selectedDate, startTime, endTime);
            }
        }
    }
    
    // 更新工作时间
    function updateWorkTime(date, startTime, endTime) {
        fetch('/api/work_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                is_working: true,
                start_time: startTime,
                end_time: endTime
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新本地数据
                if (!workData[date]) {
                    workData[date] = {};
                }
                workData[date].is_working = true;
                workData[date].start_time = startTime;
                workData[date].end_time = endTime;
                workData[date].hours = data.hours || calculateHoursFromTimes(startTime, endTime);
                
                // 更新UI
                renderCalendar();
                updateStats();
                updateSelectedDateInfo(date);
            } else {
                console.error('更新工作时间失败:', data.error);
            }
        })
        .catch(error => console.error('更新工作时间请求失败:', error));
    }
    
    // 保存日报内容
    function saveReport(date, content) {
        fetch('/api/work_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                is_working: true,
                report_content: content
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新本地数据
                if (!workData[date]) {
                    workData[date] = {};
                }
                workData[date].report_content = content;
                alert('日报保存成功！');
            } else {
                console.error('保存日报失败:', data.error);
                alert('日报保存失败！');
            }
        })
        .catch(error => {
            console.error('保存日报请求失败:', error);
            alert('日报保存请求失败！');
        });
    }
    
    // 删除日报内容
    function deleteReport(date) {
        if (!confirm('确定要删除这天的日报吗？')) {
            return;
        }
        
        fetch('/api/work_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                report_content: ''
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新本地数据
                if (!workData[date]) {
                    workData[date] = {};
                }
                workData[date].report_content = '';
                
                // 清空编辑器
                simpleMDE.value('');
                
                // 更新UI
                renderCalendar();
                updateStats();
                
                alert('日报删除成功！');
            } else {
                console.error('删除日报失败:', data.error);
                alert('删除日报失败！');
            }
        })
        .catch(error => {
            console.error('删除日报请求失败:', error);
            alert('删除日报请求失败！');
        });
    }
    
    // 删除工作时间
    function deleteWorkTime(date) {
        if (!confirm('确定要删除这天的工作时间吗？')) {
            return;
        }
        
        fetch('/api/work_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                is_working: false,
                start_time: '',
                end_time: ''
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新本地数据
                if (workData[date]) {
                    workData[date].is_working = false;
                    workData[date].start_time = '';
                    workData[date].end_time = '';
                    workData[date].hours = 0;
                }
                
                // 更新UI
                renderCalendar();
                updateStats();
                updateSelectedDateInfo(date);
                
                alert('工作时间删除成功！');
            } else {
                console.error('删除工作时间失败:', data.error);
                alert('删除工作时间失败！');
            }
        })
        .catch(error => {
            console.error('删除工作时间请求失败:', error);
            alert('删除工作时间请求失败！');
        });
    }
    
    // 更新工作日状态（标记/取消标记）
    function updateWorkDay(date, isWorking) {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        
        fetch('/api/work_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                is_working: isWorking,
                start_time: isWorking ? startTime : '',
                end_time: isWorking ? endTime : ''
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新本地数据
                if (!workData[date]) {
                    workData[date] = {};
                }
                workData[date].is_working = isWorking;
                workData[date].hours = isWorking ? hours : 0;
                
                // 更新UI
                renderCalendar();
                updateSelectedDateInfo(date);
                
                // 更新统计信息
                updateStats();
            } else {
                console.error('更新工作日失败:', data.error);
            }
        })
        .catch(error => console.error('更新工作日请求失败:', error));
    }
    
    // 更新统计信息
    function updateStats() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        fetch(`/api/stats?year=${year}&month=${month}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('total-days').textContent = `${data.total_days}天`;
                document.getElementById('total-hours').textContent = `${data.total_hours}小时`;
                document.getElementById('month-days').textContent = `${data.month_days}天`;
                document.getElementById('month-hours').textContent = `${data.month_hours}小时`;
            })
            .catch(error => console.error('获取统计数据失败:', error));
    }
    
    // 更新选中日期信息
    function updateSelectedDateInfo(date) {
        if (!date) return;
        
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        
        const dateInfo = workData[date] || { is_working: false, hours: 0, start_time: '', end_time: '', report_content: '' };
        
        let infoHTML = `
            <h6 class="mb-3">${formattedDate}</h6>
            <div class="mb-2">
                <strong>工作状态：</strong>
                <span class="badge ${dateInfo.is_working ? 'bg-success' : 'bg-secondary'}">
                    ${dateInfo.is_working ? '工作日' : '非工作日'}
                </span>
            </div>
        `;
        
        if (dateInfo.is_working) {
            infoHTML += `
                <div class="mb-2">
                    <strong>上班时间：</strong> ${dateInfo.start_time || '未设置'}
                </div>
                <div class="mb-2">
                    <strong>下班时间：</strong> ${dateInfo.end_time || '未设置'}
                </div>
                <div class="mb-2">
                    <strong>工作时长：</strong> ${dateInfo.hours || 0}小时
                </div>
            `;
        }
        
        document.getElementById('selected-date-info').innerHTML = infoHTML;
        document.getElementById('report-date').textContent = dateObj.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    }
    
    // 加载日报内容
    function loadReportContent(date) {
        fetch(`/api/report?date=${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const reportContent = data.data.report_content || '';
                    simpleMDE.value(reportContent);
                }
            })
            .catch(error => console.error('获取日报内容失败:', error));
    }
    
    // 从上下班时间计算工作时长
    function calculateHoursFromTimes(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        // 解析时间字符串为小时和分钟
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        // 计算工作时长（小时）
        let hours = (endHour - startHour) + (endMinute - startMinute) / 60;
        if (hours < 0) {  // 处理跨天情况
            hours += 24;
        }
        
        return parseFloat(hours.toFixed(1));
    }
    
    // 格式化日期为YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});
