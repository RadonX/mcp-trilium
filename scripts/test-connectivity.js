#!/usr/bin/env node

import 'dotenv/config';
import axios from 'axios';

// Configuration from environment or defaults
const TRILIUM_URL = process.env.TRILIUM_URL || 'http://localhost:8081';
const TRILIUM_AUTH_TOKEN = process.env.TRILIUM_AUTH_TOKEN;

console.log('🔍 TriliumNext API Connectivity Test');
console.log('=====================================');
console.log(`URL: ${TRILIUM_URL}`);
console.log(`Token: ${TRILIUM_AUTH_TOKEN ? TRILIUM_AUTH_TOKEN.substring(0, 10) + '...' : 'Not provided'}`);
console.log('');

async function testConnectivity() {
  console.log('1️⃣ Testing basic connectivity...');
  
  try {
    // Test basic server connectivity (without auth)
    const response = await axios.get(`${TRILIUM_URL}`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`   ✅ Server responded with status: ${response.status}`);
    console.log(`   📄 Server headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    if (response.status === 200) {
      console.log('   ✅ TriliumNext server is running and accessible');
    } else {
      console.log(`   ⚠️  Server returned status ${response.status} - this might be normal for the root endpoint`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Is TriliumNext running? Try starting it first.');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   💡 Check the TRILIUM_URL - hostname not found.');
    }
    return false;
  }
}

async function testETAPIEndpoint() {
  console.log('\n2️⃣ Testing ETAPI endpoint accessibility...');
  
  try {
    const response = await axios.get(`${TRILIUM_URL}/etapi`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`   ✅ ETAPI endpoint responded with status: ${response.status}`);
    return response.status < 500; // Accept 4xx but not 5xx errors
  } catch (error) {
    console.log(`   ❌ ETAPI endpoint failed: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n3️⃣ Testing authentication...');
  
  if (!TRILIUM_AUTH_TOKEN) {
    console.log('   ❌ No authentication token provided');
    console.log('   💡 Set TRILIUM_AUTH_TOKEN environment variable');
    return false;
  }
  
  try {
    const response = await axios.get(`${TRILIUM_URL}/etapi/notes?search=*&limit=1`, {
      headers: {
        'Authorization': `Bearer ${TRILIUM_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`   ✅ Auth request responded with status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ Authentication successful!');
      console.log(`   📝 Found ${Array.isArray(response.data) ? response.data.length : 'unknown'} notes`);
      return true;
    } else if (response.status === 401) {
      console.log('   ❌ Authentication failed - invalid token');
      console.log('   💡 Check your TRILIUM_AUTH_TOKEN');
      return false;
    } else if (response.status === 403) {
      console.log('   ❌ Access forbidden - token lacks permissions');
      return false;
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testBasicOperations() {
  console.log('\n4️⃣ Testing basic API operations...');
  
  if (!TRILIUM_AUTH_TOKEN) {
    console.log('   ⏭️  Skipping - no auth token');
    return false;
  }
  
  const headers = {
    'Authorization': `Bearer ${TRILIUM_AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test getting notes with search (search parameter is mandatory)
    console.log('   🔍 Testing note search...');
    const searchResponse = await axios.get(`${TRILIUM_URL}/etapi/notes?search=*&limit=1`, {
      headers,
      timeout: 10000
    });
    
    if (searchResponse.status === 200) {
      console.log('   ✅ Note search successful');
      
      const notes = searchResponse.data;
      if (Array.isArray(notes) && notes.length > 0) {
        const testNote = notes[0];
        console.log(`   📝 Sample note: "${testNote.title}" (${testNote.noteId})`);
        
        // Test getting specific note content
        console.log('   📄 Testing note content retrieval...');
        const contentResponse = await axios.get(`${TRILIUM_URL}/etapi/notes/${testNote.noteId}/content`, {
          headers,
          timeout: 10000
        });
        
        if (contentResponse.status === 200) {
          console.log('   ✅ Note content retrieval successful');
          console.log(`   📏 Content length: ${typeof contentResponse.data === 'string' ? contentResponse.data.length : 'binary'} characters`);
        } else {
          console.log(`   ⚠️  Note content failed with status: ${contentResponse.status}`);
        }
      } else {
        console.log('   ℹ️  No notes found in TriliumNext instance');
      }
    } else {
      console.log(`   ❌ Note search failed with status: ${searchResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Basic operations test failed: ${error.message}`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('\n🏥 Running diagnostics...');
  
  // Check if we're using the right port
  if (TRILIUM_URL.includes(':8080')) {
    console.log('   ⚠️  Using port 8080 - make sure TriliumNext is running on this port');
  } else if (TRILIUM_URL.includes(':8081')) {
    console.log('   ℹ️  Using port 8081 - make sure TriliumNext is running on this port');
  }
  
  // Check token format
  if (TRILIUM_AUTH_TOKEN) {
    if (TRILIUM_AUTH_TOKEN.length < 20) {
      console.log('   ⚠️  Auth token seems short - verify it\'s complete');
    } else {
      console.log('   ✅ Auth token length looks reasonable');
    }
  }
  
  console.log('\n💡 Troubleshooting tips:');
  console.log('   • Make sure TriliumNext is running: check http://localhost:8081 in browser');
  console.log('   • Verify auth token: go to TriliumNext → Options → ETAPI');
  console.log('   • Check port: TriliumNext might be on 8080 instead of 8081');
  console.log('   • Test manually: curl -H "Authorization: Bearer TOKEN" "http://localhost:8081/etapi/notes?search=*&limit=1"');
}

async function main() {
  const tests = [
    testConnectivity,
    testETAPIEndpoint, 
    testAuthentication,
    testBasicOperations
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) passed++;
  }
  
  await runDiagnostics();
  
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Passed: ${passed}/${tests.length} tests`);
  
  if (passed === tests.length) {
    console.log('🎉 All tests passed! TriliumNext API is working correctly.');
    console.log('✅ Your MCP server should work fine.');
  } else {
    console.log('❌ Some tests failed. Fix the issues above before using the MCP server.');
  }
  
  process.exit(passed === tests.length ? 0 : 1);
}

main().catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});