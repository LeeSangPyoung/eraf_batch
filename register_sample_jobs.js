const axios = require('axios');

const API_BASE = 'http://192.168.152.130:8080';

// Job templates
const pythonJobs = [
  { name: 'Data Processor', script: 'data_processor.py', desc: 'Process daily data records' },
  { name: 'Report Generator', script: 'report_generator.py', desc: 'Generate daily reports' },
  { name: 'Backup Job', script: 'backup_job.py', desc: 'Backup system data' },
  { name: 'Cleanup Job', script: 'cleanup_job.py', desc: 'Clean temporary files' },
];

const springBootJobs = [
  { name: 'Batch Processor', jar: 'batch-test-job-1.0.0.jar', desc: 'Spring Boot batch processing' },
];

async function login() {
  const response = await axios.post(`${API_BASE}/user/login`, {
    user_id: 'admin',
    password: 'admin123'
  });
  if (response.data.success && response.data.data && response.data.data.token) {
    return response.data.data.token;
  }
  throw new Error('Login failed: ' + (response.data.errorMsg || 'Unknown error'));
}

async function getServers(token) {
  const response = await axios.get(`${API_BASE}/server/getFilter`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

async function getUserId(token) {
  // Get current user info from token
  return 'admin-uuid-0001-0001-000000000001'; // Admin user ID
}

async function createGroup(token, groupName) {
  const userId = await getUserId(token);

  // First try to find existing group
  try {
    const groupsResponse = await axios.get(`${API_BASE}/group/getFilter`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (groupsResponse.data.success && groupsResponse.data.data) {
      const existingGroup = groupsResponse.data.data.find(g => g.name === groupName);
      if (existingGroup) {
        return existingGroup.id;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch existing groups:', error.message);
  }

  // If not found, create new group
  try {
    const response = await axios.post(`${API_BASE}/group/create`, {
      group_name: groupName,
      comment: 'Sample jobs group',
      reg_user_id: userId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success && response.data.data) {
      return response.data.data.id;
    }
    throw new Error('Failed to create group: ' + (response.data.errorMsg || 'Unknown error'));
  } catch (error) {
    throw error;
  }
}

async function registerJob(token, jobData) {
  if (!jobData.system_id) {
    console.error('Warning: No system_id in jobData:', jobData.job_name);
  }
  const response = await axios.post(`${API_BASE}/job/create`, jobData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

function getRandomMinutes() {
  return Math.floor(Math.random() * 5) + 1; // 1-5 minutes
}

function generateRRuleExpression(minutes) {
  return `FREQ=MINUTELY;INTERVAL=${minutes}`;
}

async function main() {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('✓ Logged in successfully');

    console.log('Fetching servers...');
    const servers = await getServers(token);
    console.log(`✓ Found ${servers.length} servers`);
    console.log('Server IDs:', servers.map(s => ({ name: s.name, id: s.id, system_id: s.system_id })));

    if (servers.length === 0) {
      console.error('No servers found! Please register servers first.');
      return;
    }

    console.log('Creating job group...');
    const groupId = await createGroup(token, 'Sample Jobs');
    console.log(`✓ Group created/found: ${groupId}`);

    const userId = await getUserId(token);
    console.log(`✓ User ID: ${userId}`);

    console.log('\nRegistering 30 sample jobs...');

    let jobCount = 0;

    // Register Python jobs (20 jobs)
    for (let i = 0; i < 20; i++) {
      const template = pythonJobs[i % pythonJobs.length];
      const serverIndex = i % servers.length;
      const minutes = getRandomMinutes();

      const jobData = {
        job_name: `${template.name} ${i + 1}`,
        job_type: 'EXECUTABLE',
        group_id: groupId,
        system_id: servers[serverIndex].id,
        secondary_system_id: servers[(serverIndex + 1) % servers.length].id,
        tertiary_system_id: servers[(serverIndex + 2) % servers.length].id,
        job_action: `/usr/bin/python3 /workspace/sample-jobs/python/${template.script} "${template.name} ${i + 1}"`,
        start_date: Date.now(),
        end_date: Date.now() + (365 * 24 * 60 * 60 * 1000),
        repeat_interval: generateRRuleExpression(minutes),
        is_enabled: true,
        retry_delay: 60,
        job_comments: `${template.desc} - Runs every ${minutes} minute(s)`,
        timezone: 'Asia/Seoul'
      };

      await registerJob(token, jobData);
      jobCount++;
      console.log(`✓ [${jobCount}/30] Registered: ${jobData.job_name} (every ${minutes} min on ${servers[serverIndex].name})`);
    }

    // Register Spring Boot jobs (10 jobs)
    for (let i = 0; i < 10; i++) {
      const template = springBootJobs[i % springBootJobs.length];
      const serverIndex = i % servers.length;
      const minutes = getRandomMinutes();

      const jobData = {
        job_name: `${template.name} ${i + 1}`,
        job_type: 'EXECUTABLE',
        group_id: groupId,
        system_id: servers[serverIndex].id,
        secondary_system_id: servers[(serverIndex + 1) % servers.length].id,
        tertiary_system_id: servers[(serverIndex + 2) % servers.length].id,
        job_action: `java -jar /workspace/sample-jobs/springboot/${template.jar} --job.name="${template.name} ${i + 1}"`,
        start_date: Date.now(),
        end_date: Date.now() + (365 * 24 * 60 * 60 * 1000),
        repeat_interval: generateRRuleExpression(minutes),
        is_enabled: true,
        retry_delay: 60,
        job_comments: `${template.desc} - Runs every ${minutes} minute(s)`,
        timezone: 'Asia/Seoul'
      };

      await registerJob(token, jobData);
      jobCount++;
      console.log(`✓ [${jobCount}/30] Registered: ${jobData.job_name} (every ${minutes} min on ${servers[serverIndex].name})`);
    }

    console.log(`\n✓ Successfully registered ${jobCount} jobs!`);
    console.log('\nJob distribution:');
    console.log(`  - Python jobs: 20`);
    console.log(`  - Spring Boot jobs: 10`);
    console.log(`  - Interval: 1-5 minutes (random)`);
    console.log(`  - Servers: Round-robin across ${servers.length} servers with failover`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
