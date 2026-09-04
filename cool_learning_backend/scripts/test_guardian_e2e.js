const http = require('http');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function testFullGuardianFlow() {
  console.log('--- Testing Full Guardian & Child Flow ---');
  const testEmail = `parent_${Date.now()}@coollearning.test`;
  const testPassword = 'ParentPassword123';

  // 1. Register Guardian
  console.log('1. Registering guardian...');
  const regRes = await request('http://localhost:3000/api/guardian/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    password: testPassword,
    displayName: '陳爸爸'
  });
  console.log('Register status:', regRes.status, regRes.body.success ? 'SUCCESS' : regRes.body);
  if (!regRes.body.success) process.exit(1);

  const token = regRes.body.token;

  // 2. Add Child with password
  console.log('2. Adding child with password...');
  const addChildRes = await request('http://localhost:3000/api/guardian/children', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    nickname: '小宇',
    gradeLevel: '國小六年級',
    childPassword: 'Child1234'
  });
  console.log('Add child status:', addChildRes.status, addChildRes.body);
  if (!addChildRes.body.success) process.exit(1);

  const childId = addChildRes.body.data.id;
  const seatNo = addChildRes.body.data.linked_seat_no;
  console.log(`Child created: ID=${childId}, SeatNo=${seatNo}`);

  // 3. Test Student Autonomous Login with nickname + seatNo + password
  console.log('3. Testing student autonomous login...');
  const studentLoginRes = await request('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: '小宇',
    seatNo: seatNo,
    password: 'Child1234'
  });
  console.log('Student Login status:', studentLoginRes.status, studentLoginRes.body.success ? 'SUCCESS' : studentLoginRes.body);
  if (!studentLoginRes.body.success) process.exit(1);

  // 4. Test Guardian One-Click Select Child (代登)
  console.log('4. Testing guardian one-click select child...');
  const selectRes = await request(`http://localhost:3000/api/guardian/children/${childId}/select`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Select child status:', selectRes.status, selectRes.body.success ? 'SUCCESS' : selectRes.body);
  if (!selectRes.body.success) process.exit(1);

  // 5. Test Child 4-Subject Learning Summary
  console.log('5. Testing child learning summary...');
  const summaryRes = await request(`http://localhost:3000/api/guardian/children/${childId}/summary`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Summary status:', summaryRes.status, summaryRes.body.summary);
  if (!summaryRes.body.success) process.exit(1);

  // 6. Test Updating Child Info
  console.log('6. Testing update child...');
  const updateRes = await request(`http://localhost:3000/api/guardian/children/${childId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    nickname: '大宇',
    gradeLevel: '國中七年級'
  });
  console.log('Update child status:', updateRes.status, updateRes.body.success ? 'SUCCESS' : updateRes.body);
  if (!updateRes.body.success) process.exit(1);

  // 7. Test Deleting Child
  console.log('7. Testing delete child...');
  const delRes = await request(`http://localhost:3000/api/guardian/children/${childId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Delete child status:', delRes.status, delRes.body.success ? 'SUCCESS' : delRes.body);
  if (!delRes.body.success) process.exit(1);

  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
}

testFullGuardianFlow().catch(console.error);
