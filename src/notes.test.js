import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateNotes} from './notes.js';
const note={id:'1',page:'assets',target:'list',label:'资产列表',text:'确认字段'};
test('valid notes preserve text without extra properties',()=>assert.deepEqual(validateNotes([{...note,other:1}]),[note]));
test('invalid imports are rejected',()=>{for(const x of [null,{},[{}],[note,note]])assert.throws(()=>validateNotes(x));});
