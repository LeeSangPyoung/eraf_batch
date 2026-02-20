const axios = require('axios');

const API_BASE = 'http://192.168.152.130:8080';

async function login() {
  const response = await axios.post(`${API_BASE}/user/login`, {
    user_id: 'admin',
    password: 'admin123'
  });
  return response.data.data.token;
}

async function getServers(token) {
  const response = await axios.get(`${API_BASE}/server/getFilter`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

async function getGroupId(token, groupName) {
  const response = await axios.get(`${API_BASE}/group/getFilter`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const group = response.data.data.find(g => g.name === groupName);
  return group ? group.id : null;
}

async function registerJob(token, jobData) {
  const response = await axios.post(`${API_BASE}/job/create`, jobData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

// 10 jobs with specific time-based schedules (15:xx KST for testing)
const scheduledJobs = [
  {
    name: '일일 정산 마감 배치',
    rrule: 'FREQ=DAILY;BYHOUR=15;BYMINUTE=5;BYSECOND=0',
    desc: '매일 15:05:00 실행',
    action: 'python /workspace/sample-jobs/python/data_processor.py "Daily Settlement"',
  },
  {
    name: '오전/오후 데이터 동기화',
    rrule: 'FREQ=DAILY;BYHOUR=15,20;BYMINUTE=10;BYSECOND=0',
    desc: '매일 15:10:00, 20:10:00 (하루 2회)',
    action: 'python /workspace/sample-jobs/python/data_processor.py "Data Sync Twice Daily"',
  },
  {
    name: '주간 실적 리포트 (월/목)',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TH;BYHOUR=15;BYMINUTE=15;BYSECOND=0',
    desc: '매주 월/목 15:15:00 (주 2회)',
    action: 'python /workspace/sample-jobs/python/report_generator.py "Weekly Performance Report"',
  },
  {
    name: 'DB 최적화 배치',
    rrule: 'FREQ=DAILY;BYHOUR=15;BYMINUTE=20;BYSECOND=0',
    desc: '매일 15:20:00 실행',
    action: 'java -jar /workspace/sample-jobs/springboot/batch-test-job-1.0.0.jar --job.name="DB Optimization"',
  },
  {
    name: '보안 점검 배치 (월/수/금)',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=15;BYMINUTE=25;BYSECOND=30',
    desc: '매주 월/수/금 15:25:30 (주 3회)',
    action: 'python /workspace/sample-jobs/python/cleanup_job.py "Security Check"',
  },
  {
    name: '일일 마감 정리',
    rrule: 'FREQ=DAILY;BYHOUR=15;BYMINUTE=30;BYSECOND=0',
    desc: '매일 15:30:00 실행',
    action: 'python /workspace/sample-jobs/python/cleanup_job.py "Daily Closing Cleanup"',
  },
  {
    name: '외부 시스템 연동 (화/금)',
    rrule: 'FREQ=WEEKLY;BYDAY=TU,FR;BYHOUR=15;BYMINUTE=35;BYSECOND=0',
    desc: '매주 화/금 15:35:00 (주 2회)',
    action: 'java -jar /workspace/sample-jobs/springboot/batch-test-job-1.0.0.jar --job.name="External System Sync"',
  },
  {
    name: '오전/오후 캐시 갱신',
    rrule: 'FREQ=DAILY;BYHOUR=15,21;BYMINUTE=40;BYSECOND=0',
    desc: '매일 15:40:00, 21:40:00 (하루 2회)',
    action: 'python /workspace/sample-jobs/python/backup_job.py "Cache Refresh Twice Daily"',
  },
  {
    name: '토요일 풀백업',
    rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=15;BYMINUTE=45;BYSECOND=0',
    desc: '매주 토요일 15:45:00 (주 1회)',
    action: 'java -jar /workspace/sample-jobs/springboot/batch-test-job-1.0.0.jar --job.name="Full Backup Saturday"',
  },
  {
    name: '오후 통계 산출',
    rrule: 'FREQ=DAILY;BYHOUR=15;BYMINUTE=50;BYSECOND=0',
    desc: '매일 15:50:00 실행',
    action: 'python /workspace/sample-jobs/python/report_generator.py "Afternoon Statistics"',
  },
];

async function main() {
  try {
    console.log('Logging in...');
    const token = await login();

    const servers = await getServers(token);
    console.log(`Found ${servers.length} servers`);

    const groupId = await getGroupId(token, 'Sample Jobs');
    if (!groupId) {
      console.error('Sample Jobs group not found!');
      return;
    }

    console.log(`\nRegistering 10 time-scheduled jobs...\n`);

    for (let i = 0; i < scheduledJobs.length; i++) {
      const job = scheduledJobs[i];
      const serverIndex = i % servers.length;

      const jobData = {
        job_name: job.name,
        job_type: 'EXECUTABLE',
        group_id: groupId,
        system_id: servers[serverIndex].id,
        secondary_system_id: servers[(serverIndex + 1) % servers.length].id,
        tertiary_system_id: servers[(serverIndex + 2) % servers.length].id,
        job_action: job.action,
        start_date: Date.now(),
        end_date: Date.now() + (365 * 24 * 60 * 60 * 1000),
        repeat_interval: job.rrule,
        is_enabled: true,
        retry_delay: 60,
        job_comments: job.desc,
        timezone: 'Asia/Seoul'
      };

      const result = await registerJob(token, jobData);
      if (result.success) {
        console.log(`[${i + 1}/10] ${job.name}`);
        console.log(`        Schedule: ${job.desc}`);
        console.log(`        RRULE: ${job.rrule}`);
        console.log(`        Server: ${servers[serverIndex].name}\n`);
      } else {
        console.error(`[${i + 1}/10] FAILED: ${job.name} - ${result.errorMsg}`);
      }
    }

    console.log('Done! 10 time-scheduled jobs registered.');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
