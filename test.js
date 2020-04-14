const assert = require('assert');
const index = require('./index.js');
let testUnit = {
    [Symbol('test.no')] : async function() {
        console.log('write test cost more time?')
    },
}

async function run(testUnitList) {
    for(let testUnitValue of testUnitList) {
        for(let testFunc of Object.getOwnPropertySymbols(testUnitValue)) {
            await testUnitValue[testFunc]();
        }
    }
}
run([testUnit]);