const axios = require('axios');

const API_BASE = 'http://192.168.152.130:8080';

async function login() {
  const response = await axios.post(`${API_BASE}/user/login`, {
    user_id: 'admin',
    password: 'admin123'
  });
  return response.data.data.token;
}

async function reloadScheduler(token) {
  console.log('\n🔄 Calling reload scheduler API...');
  const response = await axios.post(`${API_BASE}/job/reloadScheduler`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.data.success) {
    console.log('✅ ' + response.data.data);
  } else {
    console.log('❌ Error: ' + response.data.errorMsg);
  }
  return response.data;
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Logged in successfully');

    // Now call the reload API
    await reloadScheduler(token);

    console.log('\n✅ Test completed!');
    console.log('\n📝 Usage:');
    console.log('1. DB에 직접 INSERT로 job 추가');
    console.log('2. 이 스크립트 실행: node test_db_direct_insert.js');
    console.log('3. 서버 재시작 없이 job이 스케줄링됨!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
