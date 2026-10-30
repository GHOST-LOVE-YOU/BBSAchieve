import { describe,expect,it } from 'vitest';
import { parseForumBody } from '@/src/lib/forum-content';
describe('论坛正文整理',()=>{
 it('隐藏末尾签名分隔线并提取引用',()=>{const blocks=parseForumBody('正文\n--\n【 在 IWhisper#366 的大作中提到：】\n：回复内容\n--');expect(blocks).toEqual([{type:'text',text:'正文'},{type:'quote',author:'IWhisper#366',text:'回复内容'}]);});
 it('不会把普通冒号正文误判成引用',()=>{expect(parseForumBody('提醒：这是正文\n下一行')).toEqual([{type:'text',text:'提醒：这是正文\n下一行'}]);});
});
