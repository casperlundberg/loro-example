const { LoroDoc } = require('loro-crdt');

console.log('=== Loro Tree Concurrency Loop Test ===\n');

function analyzeTree(doc, userName) {
  const treeData = doc.toJSON().hierarchy;
  console.log(`${userName} tree:`, JSON.stringify(treeData, null, 2));
  
  // Simple cycle detection by tracking parent-child relationships
  function findCycles(nodes, visited = new Set(), path = []) {
    if (!Array.isArray(nodes)) return [];
    
    let cycles = [];
    
    for (let node of nodes) {
      const nodeId = node.id;
      
      if (visited.has(nodeId)) {
        cycles.push({
          type: 'CYCLE',
          path: [...path, nodeId],
          cycleNode: nodeId
        });
        continue;
      }
      
      visited.add(nodeId);
      path.push(nodeId);
      
      if (node.children && node.children.length > 0) {
        cycles = cycles.concat(findCycles(node.children, new Set(visited), [...path]));
      }
      
      path.pop();
      visited.delete(nodeId);
    }
    
    return cycles;
  }
  
  const cycles = treeData ? findCycles(treeData) : [];
  
  return {
    structure: treeData,
    cycles: cycles,
    hasCycles: cycles.length > 0
  };
}

function verifyTreeSync(alice, bob, stageName) {
  console.log(`\n--- ${stageName} VERIFICATION ---`);
  
  const analysisA = analyzeTree(alice, 'Alice');
  const analysisB = analyzeTree(bob, 'Bob');
  
  const identical = JSON.stringify(analysisA.structure) === JSON.stringify(analysisB.structure);
  const noCyclesA = !analysisA.hasCycles;
  const noCyclesB = !analysisB.hasCycles;
  
  console.log(`✓ Trees identical: ${identical}`);
  console.log(`✓ Alice no cycles: ${noCyclesA}`);
  console.log(`✓ Bob no cycles: ${noCyclesB}`);
  
  if (analysisA.hasCycles) {
    console.log('⚠️ ALICE CYCLES DETECTED:', analysisA.cycles);
  }
  
  if (analysisB.hasCycles) {
    console.log('⚠️ BOB CYCLES DETECTED:', analysisB.cycles);
  }
  
  const valid = identical && noCyclesA && noCyclesB;
  console.log(`🌳 ${stageName} RESULT: ${valid ? '✅ VALID' : '❌ INVALID/CYCLES'}`);
  
  return valid;
}

// Create two documents for concurrent testing
const alice = new LoroDoc();
const bob = new LoroDoc();

console.log('1. Initialize tree structure...');

const aliceTree = alice.getTree('hierarchy');

// Create tree: Root -> NodeA -> NodeB -> NodeC
//                   -> NodeD -> NodeE
const root = aliceTree.createNode();
root.data.set('name', 'Root');

const nodeA = root.createNode();
nodeA.data.set('name', 'NodeA');

const nodeB = nodeA.createNode();
nodeB.data.set('name', 'NodeB');

const nodeC = nodeB.createNode();
nodeC.data.set('name', 'NodeC');

const nodeD = root.createNode();
nodeD.data.set('name', 'NodeD');

const nodeE = nodeD.createNode();
nodeE.data.set('name', 'NodeE');

console.log('Alice creates initial tree:');
analyzeTree(alice, 'Alice');

// Sync to Bob
const initSnapshot = alice.export({mode: 'snapshot'});
bob.import(initSnapshot);

console.log('Bob receives tree:');
analyzeTree(bob, 'Bob');

const initialValid = verifyTreeSync(alice, bob, 'INITIAL');

console.log('\n2. LOOP ATTEMPT 1: Ancestor-descendant swap...');

// Get tree references for both users
const aliceTreeRef = alice.getTree('hierarchy');
const bobTreeRef = bob.getTree('hierarchy');

// Alice and Bob need to get their node references
// Alice gets all nodes
const aliceNodes = aliceTreeRef.nodes();
let aliceNodeA = null;
let aliceNodeC = null;

for (let node of aliceNodes) {
  const name = node.data.get('name');
  if (name === 'NodeA') aliceNodeA = node;
  if (name === 'NodeC') aliceNodeC = node;
}

// Bob gets his corresponding nodes (should be same IDs after sync)
const bobNodes = bobTreeRef.nodes();
let bobNodeA = null;
let bobNodeC = null;

for (let node of bobNodes) {
  const name = node.data.get('name');
  if (name === 'NodeA') bobNodeA = node;
  if (name === 'NodeC') bobNodeC = node;
}

console.log('Alice attempts: Move NodeC under Root (making it sibling of NodeA)...');
if (aliceNodeC) {
  try {
    aliceNodeC.move(); // Move to root
    console.log('Alice move succeeded');
    analyzeTree(alice, 'Alice');
  } catch (error) {
    console.log('Alice move failed:', error.message);
  }
}

console.log('Bob attempts: Move NodeA under NodeC (potential ancestor-descendant reversal)...');
if (bobNodeA && bobNodeC) {
  try {
    bobNodeA.move(bobNodeC); // Move NodeA under NodeC
    console.log('Bob move succeeded');
    analyzeTree(bob, 'Bob');
  } catch (error) {
    console.log('Bob move failed:', error.message);
  }
}

// Sync attempt 1
console.log('\n3. SYNC ATTEMPT 1...');
const snapshot1A = alice.export({mode: 'snapshot'});
const snapshot1B = bob.export({mode: 'snapshot'});

alice.import(snapshot1B);
bob.import(snapshot1A);

const attempt1Valid = verifyTreeSync(alice, bob, 'ATTEMPT 1');

console.log('\n4. LOOP ATTEMPT 2: Direct parent-child reversal...');

// Get updated node references after sync
const aliceNodesUpdated = aliceTreeRef.nodes();
let aliceNodeB = null;
let aliceNodeD = null;

for (let node of aliceNodesUpdated) {
  const name = node.data.get('name');
  if (name === 'NodeB') aliceNodeB = node;
  if (name === 'NodeD') aliceNodeD = node;
}

const bobNodesUpdated = bobTreeRef.nodes();
let bobNodeB = null;
let bobNodeD = null;

for (let node of bobNodesUpdated) {
  const name = node.data.get('name');
  if (name === 'NodeB') bobNodeB = node;
  if (name === 'NodeD') bobNodeD = node;
}

console.log('Alice attempts: Move NodeD under NodeB...');
if (aliceNodeD && aliceNodeB) {
  try {
    aliceNodeD.move(aliceNodeB);
    console.log('Alice move succeeded');
    analyzeTree(alice, 'Alice');
  } catch (error) {
    console.log('Alice move failed:', error.message);
  }
}

console.log('Bob attempts: Move NodeB under NodeD (creating potential cycle)...');
if (bobNodeB && bobNodeD) {
  try {
    bobNodeB.move(bobNodeD);
    console.log('Bob move succeeded');
    analyzeTree(bob, 'Bob');
  } catch (error) {
    console.log('Bob move failed:', error.message);
  }
}

// Sync attempt 2
console.log('\n5. SYNC ATTEMPT 2...');
const snapshot2A = alice.export({mode: 'snapshot'});
const snapshot2B = bob.export({mode: 'snapshot'});

alice.import(snapshot2B);
bob.import(snapshot2A);

const attempt2Valid = verifyTreeSync(alice, bob, 'ATTEMPT 2');

console.log('\n6. LOOP ATTEMPT 3: Complex multi-node cycle...');

// Create additional nodes for more complex testing
const aliceNewNode1 = aliceTreeRef.createNode();
aliceNewNode1.data.set('name', 'NewNode1');

const aliceNewNode2 = aliceTreeRef.createNode();
aliceNewNode2.data.set('name', 'NewNode2');

// Sync new nodes
const newNodesSnapshot = alice.export({mode: 'snapshot'});
bob.import(newNodesSnapshot);

// Get references to new nodes in both documents
const aliceFinalNodes = aliceTreeRef.nodes();
const bobFinalNodes = bobTreeRef.nodes();

let aliceNewNode1Ref = null;
let aliceNewNode2Ref = null;
let bobNewNode1Ref = null;
let bobNewNode2Ref = null;

for (let node of aliceFinalNodes) {
  const name = node.data.get('name');
  if (name === 'NewNode1') aliceNewNode1Ref = node;
  if (name === 'NewNode2') aliceNewNode2Ref = node;
}

for (let node of bobFinalNodes) {
  const name = node.data.get('name');
  if (name === 'NewNode1') bobNewNode1Ref = node;
  if (name === 'NewNode2') bobNewNode2Ref = node;
}

// Alice: Try to create chain NewNode1 -> NewNode2
console.log('Alice attempts: NewNode2 under NewNode1...');
if (aliceNewNode2Ref && aliceNewNode1Ref) {
  try {
    aliceNewNode2Ref.move(aliceNewNode1Ref);
    console.log('Alice complex move 1 succeeded');
  } catch (error) {
    console.log('Alice complex move 1 failed:', error.message);
  }
}

// Bob: Try to create reverse chain NewNode1 -> NewNode2 (opposite direction)
console.log('Bob attempts: NewNode1 under NewNode2 (reverse)...');
if (bobNewNode1Ref && bobNewNode2Ref) {
  try {
    bobNewNode1Ref.move(bobNewNode2Ref);
    console.log('Bob complex move 1 succeeded');
  } catch (error) {
    console.log('Bob complex move 1 failed:', error.message);
  }
}

// Final sync
console.log('\n7. FINAL SYNC...');
const finalSnapshotA = alice.export({mode: 'snapshot'});
const finalSnapshotB = bob.export({mode: 'snapshot'});

alice.import(finalSnapshotB);
bob.import(finalSnapshotA);

const finalValid = verifyTreeSync(alice, bob, 'FINAL');

console.log('\n=== TREE CONCURRENCY TEST SUMMARY ===');
console.log(`Initial setup: ${initialValid ? '✅' : '❌'}`);
console.log(`Loop attempt 1: ${attempt1Valid ? '✅' : '❌'}`);
console.log(`Loop attempt 2: ${attempt2Valid ? '✅' : '❌'}`);
console.log(`Complex cycle attempt: ${finalValid ? '✅' : '❌'}`);

const allValid = initialValid && attempt1Valid && attempt2Valid && finalValid;
console.log(`\n🌳 OVERALL: ${allValid ? '✅ LORO PREVENTED ALL LOOPS' : '❌ TREE CORRUPTION DETECTED'}`);

if (!allValid) {
  console.log('⚠️  LORO TREE HAS CONCURRENCY ISSUES OR ALLOWS CYCLES!');
} else {
  console.log('✅ LORO TREE SUCCESSFULLY HANDLED ALL CONCURRENCY CONFLICTS!');
}

console.log('\n=== Tree Concurrency Loop Test Complete ===');