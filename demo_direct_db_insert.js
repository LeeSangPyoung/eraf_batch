const axios = require('axios');
const { Client } = require('pg');

const API_BASE = 'http://192.168.152.130:8080';
const DB_CONFIG = {
  host: '192.168.152.130',
  port: 5432,
  database: 'batch_scheduler',
  user: 'batch_user',
  password: 'batch_password'
};

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

async function getGroup(token, groupName) {
  const response = await axios.get(`${API_BASE}/group/getFilter`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const group = response.data.data.find(g => g.name === groupName);
  return group ? group.id : null;
}

async function insertJobDirectlyToDB(jobData) {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const query = `
    INSERT INTO scheduler_jobs (
      job_id, job_name, job_type, system_id, group_id, job_action,
      start_date, end_date, repeat_interval, is_enabled, current_state,
      run_count, failure_count, retry_count, timezone, retry_delay,
      job_comments, frst_reg_date, last_chg_date,
      frst_reg_user_id, last_reg_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      0, 0, 0, $12, $13, $14, $15, $15, $16, $16
    )
    RETURNING job_id, job_name;
  `;

  const values = [
    jobData.job_id,
    jobData.job_name,
    jobData.job_type,
    jobData.system_id,
    jobData.group_id,
    jobData.job_action,
    jobData.start_date,
    jobData.end_date,
    jobData.repeat_interval,
    jobData.is_enabled,
    'SCHEDULED',
    jobData.timezone || 'Asia/Seoul',
    jobData.retry_delay || 60,
    jobData.job_comments || '',
    Date.now(),
    'admin-uuid-0001-0001-000000000001'
  ];

  const result = await client.query(query, values);
  await client.end();

  return result.rows[0];
}

async function checkJobInQuartz() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const result = await client.query('SELECT COUNT(*) as count FROM qrtz_triggers');
  await client.end();

  return result.rows[0].count;
}

async function getJobFromDB(jobId) {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const result = await client.query(
    'SELECT job_name, next_run_date, current_state FROM scheduler_jobs WHERE job_id = $1',
    [jobId]
  );
  await client.end();

  return result.rows[0];
}

async function reloadScheduler(token) {
  const response = await axios.post(`${API_BASE}/job/reloadScheduler`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

async function main() {
  try {
    console.log('\n🎯 Demo: DB 직접 INSERT 후 스케줄러 자동 로드\n');
    console.log('=' .repeat(60));

    // Step 1: Login and get necessary IDs
    console.log('\n📝 Step 1: 로그인 및 서버/그룹 정보 가져오기');
    const token = await login();
    console.log('✅ 로그인 성공');

    const servers = await getServers(token);
    const groupId = await getGroup(token, 'Sample Jobs');

    if (!servers.length || !groupId) {
      console.error('❌ 서버 또는 그룹을 찾을 수 없습니다');
      return;
    }

    console.log(`✅ 서버: ${servers[0].name} (${servers[0].id})`);
    console.log(`✅ 그룹: ${groupId}`);

    // Step 2: Check Quartz before
    console.log('\n📝 Step 2: Quartz 트리거 확인 (INSERT 전)');
    const quartzCountBefore = await checkJobInQuartz();
    console.log(`   Quartz triggers: ${quartzCountBefore}개`);

    // Step 3: Insert job directly to DB
    console.log('\n📝 Step 3: DB에 직접 INSERT (API 사용 안함)');
    const jobId = `test-direct-${Date.now()}`;
    const jobData = {
      job_id: jobId,
      job_name: `Test Direct Insert ${new Date().toLocaleTimeString()}`,
      job_type: 'EXECUTABLE',
      system_id: servers[0].id,
      group_id: groupId,
      job_action: 'echo "Test job from direct DB insert"',
      start_date: Date.now(),
      end_date: Date.now() + (24 * 60 * 60 * 1000), // 1 day
      repeat_interval: 'FREQ=MINUTELY;INTERVAL=5',
      is_enabled: true,
      job_comments: 'Demo: DB에 직접 INSERT한 테스트 job'
    };

    const insertedJob = await insertJobDirectlyToDB(jobData);
    console.log(`✅ DB INSERT 완료: ${insertedJob.job_name}`);
    console.log(`   Job ID: ${insertedJob.job_id}`);

    // Step 4: Check job status
    console.log('\n📝 Step 4: DB에서 job 확인');
    let jobInfo = await getJobFromDB(jobId);
    console.log(`   Job Name: ${jobInfo.job_name}`);
    console.log(`   State: ${jobInfo.current_state}`);
    console.log(`   Next Run: ${jobInfo.next_run_date || 'NULL (아직 스케줄링 안됨)'}`);

    // Step 5: Call reload API
    console.log('\n📝 Step 5: Reload Scheduler API 호출');
    const reloadResult = await reloadScheduler(token);

    if (reloadResult.success) {
      console.log(`✅ ${reloadResult.data}`);
    } else {
      console.log(`❌ Error: ${reloadResult.errorMsg}`);
      return;
    }

    // Step 6: Check job status after reload
    console.log('\n📝 Step 6: Reload 후 job 상태 확인');
    jobInfo = await getJobFromDB(jobId);
    console.log(`   State: ${jobInfo.current_state}`);
    console.log(`   Next Run: ${jobInfo.next_run_date ? new Date(parseInt(jobInfo.next_run_date)).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'NULL'}`);

    // Step 7: Check Quartz after
    console.log('\n📝 Step 7: Quartz 트리거 확인 (Reload 후)');
    const quartzCountAfter = await checkJobInQuartz();
    console.log(`   Quartz triggers: ${quartzCountAfter}개`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 결과 요약:');
    console.log('='.repeat(60));
    console.log(`✅ DB에 직접 INSERT: 성공`);
    console.log(`✅ Reload API 호출: 성공`);
    console.log(`✅ Next run date 계산: ${jobInfo.next_run_date ? '완료' : '실패'}`);
    console.log(`✅ 서버 재시작: 불필요!`);
    console.log('\n💡 이제부터 DB에 직접 job을 INSERT한 후,');
    console.log('   POST /job/reloadScheduler API만 호출하면');
    console.log('   서버 재시작 없이 스케줄링 됩니다!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
