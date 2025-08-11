const { LoroDoc } = require('loro-crdt');

console.log('=== Basic Loro CRDT Example ===\n');

// Create two Loro documents representing different peers
const docA = new LoroDoc();
const docB = new LoroDoc();

console.log('1. Creating collaborative text documents...');

// Create text containers in both documents
const textA = docA.getText('shared-text');
const textB = docB.getText('shared-text');

// Peer A inserts some text
textA.insert(0, 'Hello ');
console.log('Peer A adds "Hello ": ', docA.toJSON());

// Peer B inserts text at the beginning
textB.insert(0, 'Hi ');
console.log('Peer B adds "Hi ": ', docB.toJSON());

console.log('\n2. Synchronizing documents...');

// Export updates from each document
const updatesA = docA.export({mode: 'snapshot'});
const updatesB = docB.export({mode: 'snapshot'});

// Apply updates to sync the documents
docA.import(updatesB);
docB.import(updatesA);

console.log('After sync - Peer A: ', docA.toJSON());
console.log('After sync - Peer B: ', docB.toJSON());

console.log('\n3. Working with maps and lists...');

// Create a map for user data
const mapA = docA.getMap('users');
mapA.set('alice', { name: 'Alice', age: 30 });
mapA.set('bob', { name: 'Bob', age: 25 });

// Create a list for tasks
const listA = docA.getList('tasks');
listA.insert(0, 'Buy groceries');
listA.insert(1, 'Walk the dog');

console.log('Document with map and list: ', docA.toJSON());

// Sync with peer B
const updatesA2 = docA.export({mode: 'snapshot'});
docB.import(updatesA2);

console.log('Peer B after receiving updates: ', docB.toJSON());

console.log('\n4. Concurrent editing...');

// Both peers edit the shared text simultaneously
const textA2 = docA.getText('shared-text');
const textB2 = docB.getText('shared-text');

textA2.insert(textA2.length, ' from A');
textB2.insert(textB2.length, ' from B');

console.log('Before final sync:');
console.log('Peer A: ', docA.getText('shared-text').toString());
console.log('Peer B: ', docB.getText('shared-text').toString());

// Final sync
const finalUpdatesA = docA.export({mode: 'snapshot'});
const finalUpdatesB = docB.export({mode: 'snapshot'});

docA.import(finalUpdatesB);
docB.import(finalUpdatesA);

console.log('\nAfter final sync:');
console.log('Peer A: ', docA.getText('shared-text').toString());
console.log('Peer B: ', docB.getText('shared-text').toString());
console.log('Both documents converged: ', docA.getText('shared-text').toString() === docB.getText('shared-text').toString());

console.log('\n=== Example Complete ===');