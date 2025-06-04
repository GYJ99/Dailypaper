const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

const app = createApp({
  setup() {
    // 全局变量
    const currentDate = ref(new Date());
    const workData = ref({});
    const selectedDate = ref(null);
    const fileInput = ref(null);
    const selectedDateInfo = reactive({
      isWorkingDay: false,
      startTime: '',
      endTime: '',
      hours: 0,
      reportContent: ''
    });
    
    // 工作时间设置
    const startTime = ref('09:00');
    const endTime = ref('18:00');
    const calculatedHours = ref(9);
    
    // 模态框数据
    const modalDate = ref('');
    const modalStartTime = ref('09:00');
    const modalEndTime = ref('18:00');
    
    // 统计数据
    const stats = reactive({
      totalDays: 0,
      totalHours: 0,
      monthDays: 0,
      monthHours: 0
    });
    
    // 日历数据
    const calendar = ref([]);
    
    // SimpleMDE实例
    let simpleMDE = null;
    
    // 计算属性：当前月份和年份
    const currentMonthYear = computed(() => {
      return `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`;
    });
    
    // 生命周期钩子：组件挂载时
    onMounted(() => {
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
      
      // 加载工作数据
      loadWorkData();
      
      // 初始化日历
      renderCalendar();
      
      // 初始化模态框
      initModal();
    });
    
    // 监听当前日期变化，重新渲染日历
    watch(currentDate, () => {
      renderCalendar();
      updateStats();
    });
    
    // 监听选中日期变化，更新日期信息
    watch(selectedDate, (newDate) => {
      if (newDate) {
        updateSelectedDateInfo(newDate);
        loadReportContent(newDate);
      }
    });
    
    // 初始化模态框
    function initModal() {
      const timeSettingModal = document.getElementById('timeSettingModal');
      timeSettingModal.addEventListener('hidden.bs.modal', () => {
        // 模态框关闭时重置数据
        modalStartTime.value = '09:00';
        modalEndTime.value = '18:00';
      });
    }
    
    // 加载工作数据
    function loadWorkData() {
      const savedData = localStorage.getItem('workReportData');
      if (savedData) {
        try {
          workData.value = JSON.parse(savedData);
          updateStats();
          // 已经有数据，直接渲染日历
          renderCalendar();
        } catch (e) {
          console.error('解析工作数据失败:', e);
          workData.value = {};
          loadInitialData();
        }
      } else {
        // 如果本地没有数据，加载初始示例数据
        loadInitialData();
      }
    }
    
    // 加载初始示例数据
    function loadInitialData() {
      // 检查是否已经有数据，避免重复加载
      if (Object.keys(workData.value).length > 0) {
        renderCalendar();
        updateStats();
        return;
      }
      
      fetch('./data/initial_data.json')
        .then(response => response.json())
        .then(data => {
          workData.value = data;
          saveWorkData();
          renderCalendar();
          updateStats();
        })
        .catch(error => {
          console.error('加载初始数据失败:', error);
          workData.value = {};
          renderCalendar();
          updateStats();
        });
    }
    
    // 保存工作数据
    function saveWorkData() {
      localStorage.setItem('workReportData', JSON.stringify(workData.value));
      updateStats();
    }
    
    // 导出数据到JSON文件
    function exportData() {
      const dataStr = JSON.stringify(workData.value, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      link.download = `日报数据备份_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    // 触发文件选择器
    function triggerFileInput() {
      if (fileInput.value) {
        fileInput.value.click();
      }
    }
    
    // 处理文件上传
    function handleFileUpload(event) {
      if (!event || !event.target || !event.target.files) return;
      
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          // 合并导入的数据与现有数据
          workData.value = importedData;
          saveWorkData();
          alert('数据导入成功！');
          renderCalendar(); // 重新渲染日历
          if (selectedDate.value) {
            selectDate(selectedDate.value); // 更新选中日期的信息
          }
        } catch (error) {
          console.error('导入数据失败:', error);
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // 重置文件输入，允许重复选择同一文件
    }
    
    // 渲染日历
    function renderCalendar() {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      
      // 获取当月第一天和最后一天
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // 获取当月第一天是星期几（0-6，0表示星期日）
      const firstDayOfWeek = firstDay.getDay();
      
      // 获取当月天数
      const daysInMonth = lastDay.getDate();
      
      // 获取上个月的最后几天（用于填充日历第一行）
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      
      // 生成日历数据
      const calendarData = [];
      let date = 1;
      let nextMonthDate = 1;
      
      // 创建6行（最多6行可以显示一个月的所有日期）
      for (let i = 0; i < 6; i++) {
        // 如果已经超过当月最后一天且已经是下个月的第一周，则不再创建新行
        if (date > daysInMonth && i > 0) break;
        
        const week = { id: i, days: [] };
        
        // 创建7列（一周7天）
        for (let j = 0; j < 7; j++) {
          let dayObj, dateStr;
          
          // 填充上个月的日期
          if (i === 0 && j < firstDayOfWeek) {
            const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - j - 1);
            const dateObj = new Date(year, month - 1, prevMonthDay);
            dateStr = formatDate(dateObj);
            
            week.days.push({
              dayNumber: prevMonthDay,
              date: dateObj,
              dateStr: dateStr,
              isOtherMonth: true,
              isWorkingDay: workData.value[dateStr] && workData.value[dateStr].is_working,
              workHours: (workData.value[dateStr] && workData.value[dateStr].hours) || 0
            });
          }
          // 填充下个月的日期
          else if (date > daysInMonth) {
            const dateObj = new Date(year, month + 1, nextMonthDate);
            dateStr = formatDate(dateObj);
            
            week.days.push({
              dayNumber: nextMonthDate,
              date: dateObj,
              dateStr: dateStr,
              isOtherMonth: true,
              isWorkingDay: workData.value[dateStr] && workData.value[dateStr].is_working,
              workHours: (workData.value[dateStr] && workData.value[dateStr].hours) || 0
            });
            nextMonthDate++;
          }
          // 填充当月的日期
          else {
            const dateObj = new Date(year, month, date);
            dateStr = formatDate(dateObj);
            
            week.days.push({
              dayNumber: date,
              date: dateObj,
              dateStr: dateStr,
              isOtherMonth: false,
              isWorkingDay: workData.value[dateStr] && workData.value[dateStr].is_working,
              workHours: (workData.value[dateStr] && workData.value[dateStr].hours) || 0
            });
            date++;
          }
        }
        
        calendarData.push(week);
      }
      
      calendar.value = calendarData;
    }
    
    // 选择日期
    function selectDate(date) {
      selectedDate.value = date;
    }
    
    // 判断是否是选中的日期
    function isSelectedDate(date) {
      return selectedDate.value === date;
    }
    
    // 上个月
    function prevMonth() {
      const newDate = new Date(currentDate.value);
      newDate.setMonth(newDate.getMonth() - 1);
      currentDate.value = newDate;
    }
    
    // 下个月
    function nextMonth() {
      const newDate = new Date(currentDate.value);
      newDate.setMonth(newDate.getMonth() + 1);
      currentDate.value = newDate;
    }
    
    // 计算工作时长
    function calculateWorkHours() {
      if (startTime.value && endTime.value) {
        calculatedHours.value = calculateHoursFromTimes(startTime.value, endTime.value);
      }
    }
    
    // 打开时间设置模态框
    function openTimeSettingModal(date) {
      modalDate.value = date;
      
      // 如果该日期有工作记录，填充上下班时间
      if (workData.value[date] && workData.value[date].is_working) {
        modalStartTime.value = workData.value[date].start_time;
        modalEndTime.value = workData.value[date].end_time;
      } else {
        // 否则使用默认时间
        modalStartTime.value = '09:00';
        modalEndTime.value = '18:00';
      }
      
      // 显示模态框
      const modal = new bootstrap.Modal(document.getElementById('timeSettingModal'));
      modal.show();
    }
    
    // 保存时间设置
    function saveTimeSettings() {
      const date = modalDate.value;
      
      if (!modalStartTime.value || !modalEndTime.value) {
        alert('请设置上下班时间');
        return;
      }
      
      updateWorkTime(date, modalStartTime.value, modalEndTime.value);
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('timeSettingModal'));
      modal.hide();
    }
    
    // 更新工作时间
    function updateWorkTime(date, startTime, endTime) {
      if (!date) return;
      
      // 计算工作时长
      const hours = calculateHoursFromTimes(startTime, endTime);
      
      // 如果日期不存在于工作数据中，创建一个新记录
      if (!workData.value[date]) {
        workData.value[date] = {
          is_working: true,
          hours: hours,
          start_time: startTime,
          end_time: endTime,
          report_content: ''
        };
      } else {
        // 否则更新现有记录
        workData.value[date].is_working = true;
        workData.value[date].hours = hours;
        workData.value[date].start_time = startTime;
        workData.value[date].end_time = endTime;
      }
      
      // 保存数据
      saveWorkData();
      
      // 重新渲染日历
      renderCalendar();
      
      // 如果当前选中的是这个日期，更新日期信息
      if (selectedDate.value === date) {
        updateSelectedDateInfo(date);
      }
    }
    
    // 删除工作时间
    function deleteWorkTime() {
      const date = modalDate.value;
      
      if (!date) return;
      
      // 如果日期存在于工作数据中
      if (workData.value[date]) {
        // 保留日报内容，但删除工作时间相关信息
        const reportContent = workData.value[date].report_content;
        
        if (reportContent) {
          // 如果有日报内容，只更新工作状态和时间
          workData.value[date] = {
            is_working: false,
            hours: 0,
            start_time: '',
            end_time: '',
            report_content: reportContent
          };
        } else {
          // 如果没有日报内容，完全删除该日期的记录
          delete workData.value[date];
        }
        
        // 保存数据
        saveWorkData();
        
        // 重新渲染日历
        renderCalendar();
        
        // 如果当前选中的是这个日期，更新日期信息
        if (selectedDate.value === date) {
          updateSelectedDateInfo(date);
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('timeSettingModal'));
        modal.hide();
      }
    }
    
    // 保存日报
    function saveReport() {
      if (!selectedDate.value) {
        alert('请先选择一个日期');
        return;
      }
      
      const reportContent = simpleMDE.value();
      
      // 如果日期不存在于工作数据中，创建一个新记录
      if (!workData.value[selectedDate.value]) {
        workData.value[selectedDate.value] = {
          is_working: false,
          hours: 0,
          start_time: '',
          end_time: '',
          report_content: reportContent
        };
      } else {
        // 否则更新现有记录
        workData.value[selectedDate.value].report_content = reportContent;
      }
      
      // 保存数据
      saveWorkData();
      
      // 更新日期信息
      updateSelectedDateInfo(selectedDate.value);
      
      alert('日报保存成功！');
    }
    
    // 删除日报
    function deleteReport() {
      if (!selectedDate.value) {
        alert('请先选择一个日期');
        return;
      }
      
      if (!confirm('确定要删除该日期的日报吗？')) {
        return;
      }
      
      // 如果日期存在于工作数据中
      if (workData.value[selectedDate.value]) {
        // 如果是工作日，只删除日报内容
        if (workData.value[selectedDate.value].is_working) {
          workData.value[selectedDate.value].report_content = '';
        } else {
          // 如果不是工作日，完全删除该日期的记录
          delete workData.value[selectedDate.value];
        }
        
        // 保存数据
        saveWorkData();
        
        // 清空编辑器
        simpleMDE.value('');
        
        // 更新日期信息
        updateSelectedDateInfo(selectedDate.value);
        
        alert('日报删除成功！');
      }
    }
    
    // 更新统计信息
    function updateStats() {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth() + 1;
      
      // 计算总工作天数和总工作时长
      let totalDays = 0;
      let totalHours = 0;
      
      // 计算当月工作天数和工作时长
      let monthDays = 0;
      let monthHours = 0;
      
      for (const date in workData.value) {
        const data = workData.value[date];
        if (data.is_working) {
          totalDays += 1;
          totalHours += data.hours;
          
          // 检查是否是当前选择的年月
          const dateObj = new Date(date);
          if (dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month) {
            monthDays += 1;
            monthHours += data.hours;
          }
        }
      }
      
      stats.totalDays = totalDays;
      stats.totalHours = totalHours.toFixed(1);
      stats.monthDays = monthDays;
      stats.monthHours = monthHours.toFixed(1);
    }
    
    // 更新选中日期信息
    function updateSelectedDateInfo(date) {
      if (!date) return;
      
      if (workData.value[date]) {
        const data = workData.value[date];
        selectedDateInfo.isWorkingDay = data.is_working;
        selectedDateInfo.startTime = data.start_time;
        selectedDateInfo.endTime = data.end_time;
        selectedDateInfo.hours = data.hours;
        selectedDateInfo.reportContent = data.report_content;
      } else {
        // 重置日期信息
        selectedDateInfo.isWorkingDay = false;
        selectedDateInfo.startTime = '';
        selectedDateInfo.endTime = '';
        selectedDateInfo.hours = 0;
        selectedDateInfo.reportContent = '';
      }
    }
    
    // 加载日报内容
    function loadReportContent(date) {
      if (!date) return;
      
      if (workData.value[date] && workData.value[date].report_content) {
        simpleMDE.value(workData.value[date].report_content);
      } else {
        simpleMDE.value('');
      }
    }
    
    // 下载JSON格式数据
    function downloadJson() {
      const dataStr = JSON.stringify(workData.value, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileName = 'work_report.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    }
    
    // 下载CSV格式数据
    function downloadCsv() {
      // 获取所有可能的键作为表头
      const headers = ['date'];
      
      // 如果有数据，添加第一条数据的所有键
      if (Object.keys(workData.value).length > 0) {
        const firstKey = Object.keys(workData.value)[0];
        const firstData = workData.value[firstKey];
        headers.push(...Object.keys(firstData));
      }
      
      // 创建CSV内容
      let csvContent = headers.join(',') + '\\n';
      
      // 添加数据行
      for (const date in workData.value) {
        const data = workData.value[date];
        const row = [date];
        
        // 添加其他列数据
        for (let i = 1; i < headers.length; i++) {
          const key = headers[i];
          let value = data[key];
          
          // 处理包含逗号的字符串
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          }
          
          row.push(value !== undefined ? value : '');
        }
        
        csvContent += row.join(',') + '\\n';
      }
      
      // 创建下载链接
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const exportFileName = 'work_report.csv';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
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
      
      return Math.round(hours * 10) / 10;  // 保留一位小数
    }
    
    // 格式化日期为YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return {
      // 变量
      currentDate,
      workData,
      selectedDate,
      fileInput,
      selectedDateInfo,
      startTime,
      endTime,
      calculatedHours,
      modalDate,
      modalStartTime,
      modalEndTime,
      stats,
      calendar,
      currentMonthYear,
      selectDate,
      isSelectedDate,
      prevMonth,
      nextMonth,
      exportData,
      triggerFileInput,
      handleFileUpload,
      calculateWorkHours,
      openTimeSettingModal,
      saveTimeSettings,
      deleteWorkTime,
      saveReport,
      deleteReport,
      downloadJson,
      downloadCsv
    };
  }
}).mount('#app');
