const { LoroDoc } = require('loro-crdt');

console.log('=== Loro CRDT Tree Loop Creation Test ===\n');

function analyzeTree(doc, userName) {
  const treeData = doc.toJSON().hierarchy;
  
  console.log(`${userName} tree structure:`, JSON.stringify(treeData, null, 2));
  
  // Check for potential loops by tracking visited nodes
  function detectCycles(node, visited = new Set(), path = []) {
    if (!node || typeof node !== 'object') return [];
    
    const nodeId = JSON.stringify(node);
    
    if (visited.has(nodeId)) {
      return [{
        type: 'CYCLE_DETECTED',
        path: [...path, node],
        cycleStart: node
      }];
    }
    
    visited.add(nodeId);
    path.push(node);
    
    let issues = [];
    
    // Check children
    if (node.children && Array.isArray(node.children)) {
      for (let child of node.children) {
        issues = issues.concat(detectCycles(child, new Set(visited), [...path]));
      }
    }
    
    return issues;
  }
  
  const cycles = treeData ? detectCycles(treeData) : [];
  
  return {
    structure: treeData,
    cycles: cycles,
    hasCycles: cycles.length > 0
  };
}

function verifyTreeIntegrity(userA, userB, stageName) {
  console.log(`\n--- ${stageName} TREE VERIFICATION ---`);
  
  const analysisA = analyzeTree(userA, 'User A');
  const analysisB = analyzeTree(userB, 'User B');
  
  // Check if trees are identical
  const identical = JSON.stringify(analysisA.structure) === JSON.stringify(analysisB.structure);
  
  console.log(`✓ Trees identical: ${identical}`);
  console.log(`✓ User A cycles: ${analysisA.hasCycles ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`✓ User B cycles: ${analysisB.hasCycles ? '❌ FOUND' : '✅ NONE'}`);
  
  if (analysisA.cycles.length > 0) {
    console.log('⚠️  User A CYCLES DETECTED:');
    analysisA.cycles.forEach((cycle, i) => {
      console.log(`  Cycle ${i + 1}:`, cycle.path.map(n => n.id || 'unknown'));
    });
  }
  
  if (analysisB.cycles.length > 0) {
    console.log('⚠️  User B CYCLES DETECTED:');
    analysisB.cycles.forEach((cycle, i) => {
      console.log(`  Cycle ${i + 1}:`, cycle.path.map(n => n.id || 'unknown'));
    });
  }
  
  const treeValid = !analysisA.hasCycles && !analysisB.hasCycles && identical;
  console.log(`\n🌳 ${stageName} TREE RESULT: ${treeValid ? '✅ VALID' : '❌ INVALID'}`);
  
  return treeValid;
}

// Create two documents
const alice = new LoroDoc();
const bob = new LoroDoc();

console.log('1. Initialize tree structure...');

// Create initial tree: Root -> A -> B -> C
//                            -> D -> E
const aliceTree = alice.getTree('hierarchy');

// Create nodes without parent first
const rootId = aliceTree.createNode();
const nodeA = aliceTree.createNode();
const nodeB = aliceTree.createNode();
const nodeC = aliceTree.createNode();
const nodeD = aliceTree.createNode();
const nodeE = aliceTree.createNode();

// Now establish parent-child relationships
// Root -> A -> B -> C
aliceTree.move(nodeA, rootId);
aliceTree.move(nodeB, nodeA);
aliceTree.move(nodeC, nodeB);

// Root -> D -> E
aliceTree.move(nodeD, rootId);
aliceTree.move(nodeE, nodeD);

console.log('Alice creates initial tree:');
analyzeTree(alice, 'Alice');

// Sync to Bob
const initSnapshot = alice.export({mode: 'snapshot'});
bob.import(initSnapshot);

console.log('\nBob receives tree:');
analyzeTree(bob, 'Bob');

const initialValid = verifyTreeIntegrity(alice, bob, 'INITIAL');

console.log('\n2. ATTEMPT 1: Create simple loop - Move NodeC under NodeA...');

// Alice: Try to move NodeC (currently under B) to be under NodeA
// This would create: Root -> A -> NodeC (moved here)
//                         -> B (NodeC's original parent)
// If NodeC keeps its child relationship to something under B, we might get a loop

const aliceTreeRef = alice.getTree('hierarchy');

// Use the node IDs we already have
if (nodeC && nodeA) {
  console.log('Alice moves NodeC under NodeA...');
  aliceTreeRef.move(nodeC, nodeA);
  console.log('Alice after move:');
  analyzeTree(alice, 'Alice');
} else {
  console.log('Alice could not find nodes to move');
}

// Bob: Simultaneously try to move NodeA under NodeC (reverse direction!)
const bobTreeRef = bob.getTree('hierarchy');

// Bob uses the same node IDs (they should be synchronized)
if (nodeA && nodeC) {
  console.log('Bob moves NodeA under NodeC (reverse direction)...');
  bobTreeRef.move(nodeA, nodeC);
  console.log('Bob after move:');
  analyzeTree(bob, 'Bob');
} else {
  console.log('Bob could not find nodes to move');
}

// Sync and check for loops
console.log('\n3. SYNC ATTEMPT 1 - Checking for loops...');
const snapshot1A = alice.export({mode: 'snapshot'});
const snapshot1B = bob.export({mode: 'snapshot'});

alice.import(snapshot1B);
bob.import(snapshot1A);

const attempt1Valid = verifyTreeIntegrity(alice, bob, 'ATTEMPT 1');

console.log('\n4. ATTEMPT 2: Complex loop creation...');

// Create more complex scenario
// Alice: Move NodeE under NodeB
// Bob: Move NodeB under NodeE
// This should definitely create a loop if not handled correctly

const aliceTreeRef2 = alice.getTree('hierarchy');
const bobTreeRef2 = bob.getTree('hierarchy');

console.log('Alice tries to move NodeE under NodeB...');
if (nodeE && nodeB) {
  try {
    aliceTreeRef2.move(nodeE, nodeB);
    console.log('Alice move succeeded');
    analyzeTree(alice, 'Alice');
  } catch (error) {
    console.log('Alice move failed:', error.message);
  }
}

console.log('Bob tries to move NodeB under NodeE (creating potential loop)...');
if (nodeB && nodeE) {
  try {
    bobTreeRef2.move(nodeB, nodeE);
    console.log('Bob move succeeded');
    analyzeTree(bob, 'Bob');
  } catch (error) {
    console.log('Bob move failed:', error.message);
  }
}

console.log('\n5. SYNC ATTEMPT 2 - Final loop check...');
const snapshot2A = alice.export({mode: 'snapshot'});
const snapshot2B = bob.export({mode: 'snapshot'});

alice.import(snapshot2B);
bob.import(snapshot2A);

const attempt2Valid = verifyTreeIntegrity(alice, bob, 'ATTEMPT 2');

console.log('\n6. STRESS TEST: Multiple concurrent ancestor-descendant swaps...');

// Create several nodes and try multiple conflicting moves
const aliceStress = alice.getTree('hierarchy');
const bobStress = bob.getTree('hierarchy');

// Add some more nodes for testing
const newNode1 = aliceStress.createNode();
const newNode2 = aliceStress.createNode();

// Sync new nodes
const stressInitSnapshot = alice.export({mode: 'snapshot'});
bob.import(stressInitSnapshot);

console.log('Performing stress test moves...');

// Alice: Try to move newNode1 under existing nodes
try {
  aliceStress.move(newNode1, nodeA);
  console.log('Alice stress move 1 succeeded');
} catch (error) {
  console.log('Alice stress move 1 blocked:', error.message);
}

try {
  aliceStress.move(nodeD, newNode2);
  console.log('Alice stress move 2 succeeded');
} catch (error) {
  console.log('Alice stress move 2 blocked:', error.message);
}

// Bob: Try conflicting moves
try {
  bobStress.move(newNode2, nodeC);
  console.log('Bob stress move 1 succeeded');
} catch (error) {
  console.log('Bob stress move 1 blocked:', error.message);
}

try {
  bobStress.move(nodeA, newNode1);
  console.log('Bob stress move 2 succeeded');
} catch (error) {
  console.log('Bob stress move 2 blocked:', error.message);
}

console.log('\n7. FINAL SYNC - Ultimate loop test...');
const finalSnapshotA = alice.export({mode: 'snapshot'});
const finalSnapshotB = bob.export({mode: 'snapshot'});

alice.import(finalSnapshotB);
bob.import(finalSnapshotA);

const finalValid = verifyTreeIntegrity(alice, bob, 'FINAL');

console.log('\n=== LOOP CREATION TEST SUMMARY ===');
console.log(`Initial setup: ${initialValid ? '✅' : '❌'}`);
console.log(`Simple loop attempt: ${attempt1Valid ? '✅' : '❌'}`);
console.log(`Complex loop attempt: ${attempt2Valid ? '✅' : '❌'}`);
console.log(`Stress test: ${finalValid ? '✅' : '❌'}`);

const allTestsPassed = initialValid && attempt1Valid && attempt2Valid && finalValid;
console.log(`\n🌳 OVERALL RESULT: ${allTestsPassed ? '✅ TREE INTEGRITY MAINTAINED' : '❌ TREE CORRUPTION DETECTED'}`);

if (!allTestsPassed) {
  console.log('\n⚠️  LORO TREE IMPLEMENTATION HAS VULNERABILITIES TO LOOP CREATION!');
} else {
  console.log('\n✅ LORO TREE SUCCESSFULLY PREVENTED ALL LOOP CREATION ATTEMPTS!');
}

console.log('\n=== Tree Loop Creation Test Complete ===');