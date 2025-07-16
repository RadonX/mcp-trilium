#!/usr/bin/env node

import 'dotenv/config';
import { TriliumClient } from '../src/utils/trilium-client.js';
import { createNote } from '../src/tools/create-note.js';

console.log('🔍 Create Note Debugging Script');
console.log('================================');

const client = new TriliumClient();

async function debugCreateNote() {
  try {
    console.log('📊 Testing different scenarios...\n');

    // Test 1: Without parentNoteId (current failing case)
    console.log('1️⃣ Testing without parentNoteId (likely to fail):');
    try {
      const result1 = await createNote(client, {
        title: 'Test Note 1',
        content: 'This is a test note without parentNoteId',
        type: 'text'
      });
      console.log('✅ Success:', result1.content[0].text);
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }

    console.log('\n2️⃣ Testing with parentNoteId="root":');
    try {
      const result2 = await createNote(client, {
        title: 'Test Note 2',
        content: 'This is a test note with root parentNoteId',
        type: 'text',
        parentNoteId: 'root'
      });
      console.log('✅ Success:', result2.content[0].text);
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }

    console.log('\n3️⃣ Testing direct API call to understand response:');
    try {
      const directResult = await client.post('create-note', {
        title: 'Direct API Test',
        content: 'Testing direct API call',
        type: 'text',
        parentNoteId: 'root'
      });
      console.log('✅ Direct API Success:', JSON.stringify(directResult, null, 2));
    } catch (error) {
      console.log('❌ Direct API Failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    console.log('\n4️⃣ Testing what happens with missing title:');
    try {
      const result4 = await createNote(client, {
        content: 'Note without title',
        type: 'text',
        parentNoteId: 'root'
      });
      console.log('✅ Success without title:', result4.content[0].text);
    } catch (error) {
      console.log('❌ Failed without title:', error.message);
    }

  } catch (error) {
    console.error('🚨 Debugging script failed:', error);
  }
}

// First test connectivity
console.log('🔗 Testing connectivity...');
try {
  const info = await client.get('app-info');
  console.log('✅ Connected to TriliumNext:', info?.appVersion || 'Unknown version');
  console.log();
  
  await debugCreateNote();
} catch (error) {
  console.error('❌ Cannot connect to TriliumNext:', error.message);
  process.exit(1);
}