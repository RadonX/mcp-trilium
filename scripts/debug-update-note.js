#!/usr/bin/env node

console.log('🔍 Update Note API Debugging');
console.log('============================');

console.log('❌ CURRENT IMPLEMENTATION (WRONG):');
console.log('await triliumClient.put(`notes/${noteId}/content`, { content });');
console.log('');
console.log('Sends JSON: { "content": "note content here" }');
console.log('Content-Type: application/json');
console.log('');

console.log('✅ TRILIUM API EXPECTS (CORRECT):');
console.log('PUT /notes/{noteId}/content');
console.log('Content-Type: text/plain');
console.log('Request body: raw string content');
console.log('');

console.log('🔧 REQUIRED FIX:');
console.log('Send raw content string, not JSON object');
console.log('Set Content-Type to text/plain');
console.log('');

console.log('📝 IMPLEMENTATION CHANGE NEEDED:');
console.log('// OLD:');
console.log('await triliumClient.put(`notes/${noteId}/content`, { content });');
console.log('');
console.log('// NEW:');
console.log('await triliumClient.putRaw(`notes/${noteId}/content`, content);');
console.log('// OR modify existing put method to handle raw content');