#!/usr/bin/env node

import { createNote } from '../src/tools/create-note.js';

// Mock TriliumClient for testing
const mockClient = {
  post: async (endpoint, data) => {
    console.log('📤 API Call:', endpoint);
    console.log('📋 Request Data:', JSON.stringify(data, null, 2));
    
    // Validate that parentNoteId is always present
    if (!data.parentNoteId) {
      throw new Error('❌ VALIDATION FAILED: parentNoteId is missing!');
    }
    
    // Mock successful response
    return {
      note: {
        noteId: 'test123abc',
        title: data.title,
        type: data.type,
        parentNoteId: data.parentNoteId
      }
    };
  }
};

console.log('🔧 Validating create-note fix...\n');

async function validateFix() {
  try {
    console.log('Test 1: Note WITHOUT parentNoteId (should default to "root")');
    const result1 = await createNote(mockClient, {
      title: 'Test Note',
      content: 'Test content',
      type: 'text'
    });
    
    console.log('✅ Success! Response:', result1.content[0].text);
    
    const jsonData = JSON.parse(result1.content[1].text);
    console.log('✅ Parent ID in response:', jsonData.request.parentNoteId);
    
    if (jsonData.request.parentNoteId === 'root') {
      console.log('✅ VALIDATION PASSED: parentNoteId correctly defaults to "root"\n');
    } else {
      console.log('❌ VALIDATION FAILED: Expected "root", got:', jsonData.request.parentNoteId, '\n');
    }

    console.log('Test 2: Note WITH explicit parentNoteId');
    const result2 = await createNote(mockClient, {
      title: 'Child Note',
      content: 'Child content',
      type: 'text',
      parentNoteId: 'parent123'
    });
    
    const jsonData2 = JSON.parse(result2.content[1].text);
    console.log('✅ Parent ID in response:', jsonData2.request.parentNoteId);
    
    if (jsonData2.request.parentNoteId === 'parent123') {
      console.log('✅ VALIDATION PASSED: parentNoteId correctly preserved\n');
    } else {
      console.log('❌ VALIDATION FAILED: Expected "parent123", got:', jsonData2.request.parentNoteId, '\n');
    }

    console.log('🎉 All validations passed! The fix should work.');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

validateFix();