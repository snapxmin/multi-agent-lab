// src/lib/scenarios.ts
var subNodes = [
  { id: "user", label: "\u7528\u6237", sub: "SDK \u5347\u7EA7\u9700\u6C42\u65B9", x: 90, y: 270, kind: "user" },
  { id: "human", label: "\u4EBA\u7C7B", sub: "\u53EA\u80FD\u548C\u7236 Agent \u5BF9\u8BDD", x: 90, y: 465, kind: "human" },
  { id: "main", label: "\u7236 Agent \xB7 \u5DE5\u5934", sub: "\u6240\u6709\u5224\u65AD\u4E0E\u8BA1\u6570\u90FD\u5728\u8FD9", x: 335, y: 270, kind: "main" },
  { id: "s_scan", label: "\u5B50 Agent \xB7 \u626B\u63CF", sub: "\u627E\u51FA\u5F85\u6539\u6587\u4EF6", x: 590, y: 100, kind: "sub", appearAt: 2.6 },
  { id: "s_dev", label: "\u5B50 Agent \xB7 \u6539\u9020", sub: "SDK \u4EE3\u7801\u5347\u7EA7", x: 655, y: 210, kind: "sub", appearAt: 6.8 },
  { id: "s_test", label: "\u5B50 Agent \xB7 \u6D4B\u8BD5", sub: "\u8FD0\u884C\u5355\u5143\u6D4B\u8BD5", x: 655, y: 330, kind: "sub", appearAt: 11.2 },
  { id: "s_dev2", label: "\u5B50 Agent \xB7 \u6539\u9020#2", sub: "\u7F51\u7EDC+\u4E1A\u52A1\u6A21\u5757", x: 590, y: 445, kind: "sub", appearAt: 21.8 }
];
var subPackets = [
  { t: 0.6, from: "user", to: "main", dur: 0.9, kind: "task", label: "SDK \u5927\u7248\u672C\u5347\u7EA7" },
  // ① 扫描
  { t: 2.6, from: "main", to: "s_scan", dur: 0.7, kind: "task", label: "\u626B\u63CF\u4ED3\u5E93" },
  { t: 5, from: "s_scan", to: "main", dur: 0.7, kind: "result", label: "12 \u4E2A\u6587\u4EF6\u6E05\u5355" },
  // ② 改造基础模块
  { t: 6.8, from: "main", to: "s_dev", dur: 0.7, kind: "task", label: "\u6539\u9020\xB7\u57FA\u7840\u6A21\u5757" },
  { t: 10, from: "s_dev", to: "main", dur: 0.7, kind: "result", label: "\u6539\u9020\u4EE3\u7801" },
  // ③ 测试 → 失败
  { t: 11.2, from: "main", to: "s_test", dur: 0.7, kind: "task", label: "\u8FD0\u884C\u5355\u6D4B" },
  { t: 14, from: "s_test", to: "main", dur: 0.7, kind: "result", label: "\u274C 2 \u4E2A\u7528\u4F8B\u5931\u8D25" },
  // ④ 重试 1
  { t: 15.2, from: "main", to: "s_dev", dur: 0.7, kind: "task", label: "\u4FEE\u590D\xB7\u91CD\u8BD5 \xD71" },
  { t: 17.6, from: "s_dev", to: "main", dur: 0.7, kind: "result", label: "\u4FEE\u590D\u4EE3\u7801" },
  { t: 18.4, from: "main", to: "s_test", dur: 0.7, kind: "task", label: "\u590D\u6D4B" },
  { t: 20.6, from: "s_test", to: "main", dur: 0.7, kind: "result", label: "\u2705 \u5168\u90E8\u901A\u8FC7" },
  // ⑤ 失忆后继续：网络+业务（依赖乱序）
  { t: 21.8, from: "main", to: "s_dev2", dur: 0.7, kind: "task", label: "\u6539\u9020\xB7\u7F51\u7EDC+\u4E1A\u52A1" },
  { t: 25, from: "s_dev2", to: "main", dur: 0.7, kind: "result", label: "8 \u4E2A\u6587\u4EF6\u4EE3\u7801" },
  { t: 26.2, from: "main", to: "s_test", dur: 0.7, kind: "task", label: "\u5168\u91CF\u6D4B\u8BD5" },
  { t: 28.4, from: "s_test", to: "main", dur: 0.7, kind: "result", label: "\u274C 3 \u4E2A\u7528\u4F8B\u5931\u8D25" },
  // ⑥ 规则失控，直接收尾
  { t: 30, from: "main", to: "user", dur: 1, kind: "final", label: "\u53D8\u66F4\u6E05\u5355" }
];
var subWorks = [
  { t: 1.4, node: "main", dur: 1.1 },
  { t: 3.3, node: "s_scan", dur: 1.7 },
  { t: 5.9, node: "main", dur: 0.9 },
  { t: 7.5, node: "s_dev", dur: 2.5 },
  { t: 11.9, node: "s_test", dur: 2.1 },
  { t: 14.7, node: "main", dur: 0.5 },
  { t: 15.9, node: "s_dev", dur: 1.7 },
  { t: 19.1, node: "s_test", dur: 1.5 },
  { t: 21, node: "main", dur: 0.8 },
  { t: 22.5, node: "s_dev2", dur: 2.5 },
  { t: 26.9, node: "s_test", dur: 1.5 },
  { t: 29.1, node: "main", dur: 0.9 }
];
var subagentScenario = {
  id: "subagent",
  duration: 32,
  nodes: subNodes,
  edges: [
    { from: "user", to: "main" },
    { from: "human", to: "main", dashed: true },
    { from: "main", to: "s_scan" },
    { from: "main", to: "s_dev" },
    { from: "main", to: "s_test" },
    { from: "main", to: "s_dev2" }
  ],
  packets: subPackets,
  works: subWorks,
  logs: [
    { t: 0.2, text: "\u7CFB\u7EDF\u5C31\u7EEA\uFF1A\u661F\u578B\u62D3\u6251 \u2014\u2014 \u8D26\u672C\u3001\u8BA1\u6570\u5668\u5168\u5728\u7236 Agent \u7684\u300C\u5927\u8111\u5185\u5B58\u300D\u91CC", tone: "system" },
    { t: 1.4, text: "\u7236 Agent \u89C4\u5212\uFF1A\u626B\u63CF \u2192 \u5206\u7EC4\u6539\u9020 \u2192 \u5355\u6D4B \u2192 \u5931\u8D25\u91CD\u8BD5\u22643\u6B21 \u2192 \u6C47\u603B", tone: "info" },
    { t: 5, text: "12 \u4E2A\u6587\u4EF6\u6E05\u5355\u56DE\u6D41 \u2014\u2014 \u5168\u90E8\u585E\u8FDB\u7236\u5BF9\u8BDD\u4E0A\u4E0B\u6587", tone: "info" },
    { t: 6.8, text: "\u62C6\u5206 3 \u4E2A\u6A21\u5757\u7EC4\uFF0C\u9010\u7EC4\u6D3E\u5355\uFF08\u540C\u65F6\u53EA\u8DD1 1 \u4E2A\u5B50\u4EFB\u52A1\uFF09", tone: "info" },
    { t: 14, text: "\u5931\u8D25\u65E5\u5FD7\u4E22\u8FDB\u4E0A\u4E0B\u6587 \u2014\u2014 \u91CD\u8BD5\u8BA1\u6570\u5168\u9760\u7236 Agent \u81EA\u5DF1\u8BB0", tone: "warn" },
    { t: 15.2, text: "\u7236 Agent \u5224\u65AD\uFF1A\u7B2C 1 \u6B21\u91CD\u8BD5", tone: "info" },
    { t: 20.6, text: "\u57FA\u7840\u6A21\u5757\u901A\u8FC7 \u2705\uFF08\u4E0A\u4E0B\u6587\u5DF2\u5360\u7528 80%\uFF09", tone: "info" },
    { t: 21.2, text: "\u26A0\uFE0F \u7F3A\u9677\u2460\u4E0A\u4E0B\u6587\u5929\u82B1\u677F\uFF1A\u7236 Agent \u5F00\u59CB\u9057\u5FD8\u300C\u7F51\u7EDC\u6A21\u5757\u4F9D\u8D56\u57FA\u7840\u6A21\u5757\u300D", tone: "warn" },
    { t: 22.2, text: "\u26A0\uFE0F \u7F3A\u9677\u2462\u4F9D\u8D56\u4E71\u5E8F\uFF1A\u672A\u786E\u8BA4\u4F9D\u8D56\u5C31\u6539\u9020\u7F51\u7EDC+\u4E1A\u52A1\u6A21\u5757", tone: "warn" },
    { t: 28.6, text: "\u26A0\uFE0F \u7F3A\u9677\u2461\u89C4\u5219\u5931\u63A7\uFF1A\u5FD8\u8BB0\u5DF2\u91CD\u8BD5 2 \u6B21\uFF0C\u6CA1\u89E6\u53D1\u7B2C 3 \u6B21\u91CD\u8BD5\u5C31\u76F4\u63A5\u6536\u5C3E \u2014\u2014 \u89C4\u5219\u6CA1\u6709\u4EE3\u7801\u9501\u6B7B", tone: "warn" },
    { t: 29.4, text: "\u7236 Agent \u6C47\u603B\u53D8\u66F4\u6E05\u5355\uFF08\u98CE\u9669\u62A5\u544A\u88AB\u9057\u6F0F\uFF09", tone: "info" },
    { t: 31.2, text: "\u590D\u76D8\uFF1A\u5927\u8111\u88C5\u4E0D\u4E0B\u5C31\u5931\u5FC6\uFF0C\u6D41\u7A0B\u89C4\u5219\u53EA\u80FD\u9760\u81EA\u89C9 \u2717", tone: "system" }
  ],
  stats: [
    { t: 5, key: "ctx", delta: 15 },
    { t: 10, key: "ctx", delta: 20 },
    { t: 14, key: "ctx", delta: 15 },
    { t: 17.6, key: "ctx", delta: 20 },
    { t: 20.6, key: "ctx", delta: 10 },
    { t: 25, key: "ctx", delta: 20 },
    { t: 21.2, key: "risk", delta: 1 },
    { t: 22.2, key: "risk", delta: 1 },
    { t: 28.6, key: "risk", delta: 1 }
  ]
};
var teamNodes = [
  { id: "user", label: "\u7528\u6237", sub: "SDK \u5347\u7EA7\u9700\u6C42\u65B9", x: 85, y: 270, kind: "user" },
  { id: "human", label: "\u4EBA\u7C7B", sub: "\u53EF\u76F4\u8FBE\u4EFB\u610F\u6210\u5458", x: 100, y: 470, kind: "human" },
  { id: "lead", label: "Lead \xB7 \u603B\u534F\u8C03", sub: "\u62C6\u89E3\u4EFB\u52A1 \xB7 \u51ED\u8BB0\u5FC6\u51B3\u7B56", x: 320, y: 250, kind: "lead" },
  { id: "m1", label: "\u6539\u9020 Agent", sub: "SDK \u4EE3\u7801\u5347\u7EA7", x: 545, y: 85, kind: "member" },
  { id: "m2", label: "\u6D4B\u8BD5 Agent", sub: "\u8FD0\u884C\u5355\u5143\u6D4B\u8BD5", x: 660, y: 200, kind: "member" },
  { id: "m3", label: "\u98CE\u9669\u5BA1\u6838 Agent", sub: "\u8F93\u51FA\u98CE\u9669\u62A5\u544A", x: 600, y: 365, kind: "member" },
  { id: "m4", label: "\u626B\u63CF Agent", sub: "\u627E\u51FA\u5F85\u6539\u6587\u4EF6", x: 420, y: 445, kind: "member" }
];
var teamMesh = ["lead", "m1", "m2", "m3", "m4"];
var teamEdges = teamMesh.flatMap(
  (a, i) => teamMesh.slice(i + 1).map((b) => ({ from: a, to: b, faint: true }))
);
teamEdges.push({ from: "user", to: "lead" });
teamEdges.push({ from: "human", to: "m1", dashed: true });
teamEdges.push({ from: "human", to: "m2", dashed: true });
var teamPackets = [
  { t: 0.6, from: "user", to: "lead", dur: 0.9, kind: "task", label: "SDK \u5927\u7248\u672C\u5347\u7EA7" },
  { t: 2.6, from: "lead", to: "m4", dur: 0.7, kind: "task", label: "\u626B\u63CF\u4ED3\u5E93" },
  { t: 5.4, from: "m4", to: "lead", dur: 0.7, kind: "result", label: "12 \u4E2A\u6587\u4EF6\u6E05\u5355" },
  { t: 6.4, from: "lead", to: "m1", dur: 0.7, kind: "task", label: "\u6539\u9020\u5168\u90E8\u6A21\u5757" },
  // 成员间反复确认（无效 token 消耗）
  { t: 7.4, from: "m1", to: "m2", dur: 0.8, kind: "chat", label: "\u65B0\u63A5\u53E3\u600E\u4E48\u8C03\uFF1F" },
  { t: 8.3, from: "m2", to: "m1", dur: 0.8, kind: "chat", label: "\u5148\u770B\u8FC1\u79FB\u6587\u6863" },
  { t: 9.2, from: "m1", to: "m2", dur: 0.8, kind: "chat", label: "\u8FD9\u4E2A\u7B7E\u540D\u5BF9\u5417" },
  { t: 10.1, from: "m2", to: "m1", dur: 0.8, kind: "chat", label: "\u518D\u786E\u8BA4\u4E00\u4E0B" },
  { t: 11, from: "m1", to: "m2", dur: 0.8, kind: "chat", label: "\u7248\u672C\u53F7\u5BF9\u9F50\u6CA1" },
  { t: 11.9, from: "m2", to: "m1", dur: 0.8, kind: "chat", label: "OK \u4E86" },
  { t: 14.5, from: "m1", to: "m2", dur: 0.7, kind: "chat", label: "\u6539\u5B8C\u4E86\uFF0C\u53EF\u4EE5\u6D4B" },
  { t: 18, from: "m2", to: "lead", dur: 0.7, kind: "result", label: "\u274C 3 \u4E2A\u6587\u4EF6\u5931\u8D25" },
  { t: 18.8, from: "lead", to: "m1", dur: 0.7, kind: "chat", label: "\u4FEE\u590D\xB7\u91CD\u8BD5 \xD71" },
  { t: 21.5, from: "m1", to: "m2", dur: 0.7, kind: "chat", label: "\u4FEE\u597D\u4E86\uFF0C\u590D\u6D4B" },
  { t: 23.5, from: "m2", to: "lead", dur: 0.7, kind: "result", label: "\u2705 \u901A\u8FC7\uFF08\u6F0F 2 \u4E2A\u6587\u4EF6\uFF09" },
  { t: 24.6, from: "lead", to: "m3", dur: 0.7, kind: "task", label: "\u98CE\u9669\u5BA1\u6838" },
  { t: 26.4, from: "m3", to: "lead", dur: 0.7, kind: "result", label: "\u98CE\u9669\u62A5\u544A" },
  { t: 27.4, from: "lead", to: "user", dur: 1, kind: "final", label: "\u5347\u7EA7\u603B\u7ED3" }
];
var teamWorks = [
  { t: 1.5, node: "lead", dur: 1 },
  { t: 3.3, node: "m4", dur: 2.1 },
  { t: 7.1, node: "m1", dur: 7.4 },
  { t: 15.2, node: "m2", dur: 2.8 },
  { t: 19.5, node: "m1", dur: 2 },
  { t: 22.2, node: "m2", dur: 1.3 },
  { t: 25.3, node: "m3", dur: 1.1 },
  { t: 27, node: "lead", dur: 0.4 }
];
var teamScenario = {
  id: "team",
  duration: 29.5,
  nodes: teamNodes,
  edges: teamEdges,
  packets: teamPackets,
  works: teamWorks,
  logs: [
    { t: 0.2, text: "\u7CFB\u7EDF\u5C31\u7EEA\uFF1A\u7F51\u72B6\u62D3\u6251 \u2014\u2014 \u6D88\u606F\u5206\u6563\u5728\u5404\u6210\u5458\u4F1A\u8BDD\uFF0C\u6CA1\u6709\u72EC\u7ACB\u8BA1\u6570\u5668", tone: "system" },
    { t: 1.5, text: "Lead \u62C6\u89E3 SDK \u5347\u7EA7\u4EFB\u52A1\uFF0C\u5148\u5B89\u6392\u626B\u63CF", tone: "info" },
    { t: 6.4, text: "Lead \u5B89\u6392\u6539\u9020 Agent \u5F00\u5DE5", tone: "info" },
    { t: 7.6, text: "\u6539\u9020 \u2194 \u6D4B\u8BD5\u5F00\u59CB\u4E92\u76F8\u786E\u8BA4\u63A5\u53E3\u7EC6\u8282", tone: "info" },
    { t: 12.2, text: "\u26A0\uFE0F \u7F3A\u9677\u2461\u65E0\u6548 Token \u6D88\u8017\uFF1A6 \u6B21\u6765\u56DE\u786E\u8BA4 \u2014\u2014 \u5F00\u653E\u5F0F\u8BA8\u8BBA \u2260 \u6807\u51C6\u5316\u6D41\u6C34\u7EBF", tone: "warn" },
    { t: 18, text: "\u6D4B\u8BD5 Agent \u628A\u5931\u8D25\u7ED3\u679C\u540C\u6B65\u7ED9 Lead", tone: "info" },
    { t: 18.8, text: "\u26A0\uFE0F \u7F3A\u9677\u2460\u300C\u6700\u591A\u91CD\u8BD5 3 \u6B21\u300D\u4ECD\u53EA\u662F\u6587\u5B57\u7EA6\u5B9A \u2014\u2014 Lead \u51ED\u8BB0\u5FC6\u51B3\u7B56\uFF0C\u65E0\u5F3A\u5236", tone: "warn" },
    { t: 23.5, text: "\u26A0\uFE0F \u7F3A\u9677\u2462\u4EFB\u52A1\u9057\u6F0F\uFF1A\u4E1A\u52A1\u6A21\u5757 2 \u4E2A\u6587\u4EF6\u88AB\u9057\u5FD8\uFF0C\u6CA1\u6709\u5B8C\u6210\u5347\u7EA7", tone: "warn" },
    { t: 26.4, text: "\u98CE\u9669\u5BA1\u6838 Agent \u4EA4\u4ED8\u98CE\u9669\u62A5\u544A", tone: "info" },
    { t: 28.6, text: "\u590D\u76D8\uFF1A\u9002\u5408\u8BA8\u8BBA\uFF0C\u4E0D\u9002\u5408\u6279\u91CF\u6D41\u6C34\u7EBF \u2014\u2014 \u6F0F\u4E8B\u3001\u5931\u63A7\u3001\u6210\u672C\u9AD8 \u2717", tone: "system" }
  ],
  stats: [
    { t: 18.7, key: "ctx", delta: 12 },
    { t: 24.2, key: "ctx", delta: 10 },
    { t: 27.1, key: "ctx", delta: 8 },
    { t: 12.2, key: "risk", delta: 1 },
    { t: 23.5, key: "risk", delta: 1 }
  ]
};
var wfNodes = [
  { id: "user", label: "\u7528\u6237", sub: "SDK \u5347\u7EA7\u9700\u6C42\u65B9", x: 80, y: 110, kind: "user" },
  { id: "human", label: "\u4EBA\u7C7B", sub: "\u4E2D\u9014\u96BE\u4EE5\u5E72\u9884", x: 80, y: 320, kind: "human" },
  { id: "script", label: "JS \u7F16\u6392\u811A\u672C", sub: "\u89C4\u5219\u4EE3\u7801\u9501\u6B7B", x: 250, y: 280, kind: "script" },
  { id: "runtime", label: "Runtime \u72B6\u6001", sub: "\u91CD\u8BD5\u8BA1\u6570 \xB7 \u8FDB\u5EA6 \xB7 \u98CE\u9669", x: 250, y: 465, kind: "runtime" },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `f${i + 1}`,
    label: `f${i + 1}`,
    sub: void 0,
    x: 480 + i % 4 * 95,
    y: 110 + Math.floor(i / 4) * 130,
    kind: "sub",
    appearAt: i < 3 ? 3 : i < 7 ? 8.2 : 16
  }))
];
var wfEdges = [
  { from: "user", to: "script" },
  { from: "human", to: "script", dashed: true },
  { from: "script", to: "runtime", dashed: true },
  ...Array.from({ length: 12 }, (_, i) => ({ from: "script", to: `f${i + 1}`, faint: true, dashed: true }))
];
var filePlans = [
  { id: "f1", dispatch: 3, workStart: 3.5, workDur: 2.4, attempts: 1, pass: true },
  { id: "f2", dispatch: 3.1, workStart: 3.6, workDur: 1.6, attempts: 2, pass: true },
  { id: "f3", dispatch: 3.2, workStart: 3.7, workDur: 2.6, attempts: 1, pass: true },
  { id: "f4", dispatch: 8.2, workStart: 8.7, workDur: 2.2, attempts: 1, pass: true },
  { id: "f5", dispatch: 8.3, workStart: 8.8, workDur: 1.8, attempts: 3, pass: false },
  { id: "f6", dispatch: 8.4, workStart: 8.9, workDur: 2.4, attempts: 1, pass: true },
  { id: "f7", dispatch: 8.5, workStart: 9, workDur: 2.6, attempts: 1, pass: true },
  { id: "f8", dispatch: 16, workStart: 16.5, workDur: 2.2, attempts: 1, pass: true },
  { id: "f9", dispatch: 16.1, workStart: 16.6, workDur: 2.4, attempts: 1, pass: true },
  { id: "f10", dispatch: 16.2, workStart: 16.7, workDur: 2.6, attempts: 1, pass: true },
  { id: "f11", dispatch: 16.3, workStart: 16.8, workDur: 2.8, attempts: 1, pass: true },
  { id: "f12", dispatch: 16.4, workStart: 16.9, workDur: 3, attempts: 1, pass: true }
];
var RETRY_GAP = 0.6;
var wfPackets = [
  { t: 0.5, from: "user", to: "script", dur: 0.8, kind: "task", label: "SDK \u5347\u7EA7 \xD712 \u6587\u4EF6" }
];
var wfWorks = [
  { t: 1.2, node: "script", dur: 1 },
  { t: 2.4, node: "script", dur: 0.5 }
];
var wfStats = [];
for (const fp of filePlans) {
  let start = fp.workStart;
  for (let attempt = 1; attempt <= fp.attempts; attempt++) {
    const isRetry = attempt > 1;
    const dispatch = isRetry ? start - RETRY_GAP - 0.5 : fp.dispatch;
    wfPackets.push({
      t: dispatch,
      from: "script",
      to: fp.id,
      dur: 0.5,
      kind: "task",
      label: isRetry ? `\u91CD\u8BD5 \xD7${attempt - 1}` : void 0
    });
    const dur = isRetry ? fp.workDur * 0.6 : fp.workDur;
    wfWorks.push({ t: start, node: fp.id, dur });
    const end = start + dur;
    const lastAttempt = attempt === fp.attempts;
    const passed = lastAttempt && fp.pass;
    wfPackets.push({
      t: end,
      from: fp.id,
      to: "script",
      dur: 0.5,
      kind: "result",
      label: passed ? "\u2705" : lastAttempt ? "\u26D4 \u7194\u65AD" : "\u274C",
      countsDone: lastAttempt
    });
    if (isRetry) wfStats.push({ t: dispatch, key: "retries", delta: 1 });
    if (lastAttempt) {
      wfPackets.push({ t: end + 0.5, from: "script", to: "runtime", dur: 0.4, kind: "state", label: passed ? void 0 : "\u98CE\u9669\u62A5\u544A +1" });
      wfStats.push({ t: end + 0.9, key: "ctx", delta: passed ? 8 : 4 });
    }
    start = end + 0.5 + RETRY_GAP;
  }
}
wfWorks.push({ t: 20.4, node: "script", dur: 1.2 });
wfPackets.push({ t: 21.8, from: "script", to: "user", dur: 1, kind: "final", label: "\u53D8\u66F4\u6E05\u5355 + \u98CE\u9669\u62A5\u544A" });
var wfScript = {
  file: "sdk-upgrade.workflow.js",
  lines: [
    `// sdk-upgrade.workflow.js \u2014\u2014 \u7F16\u6392\u903B\u8F91\u56FA\u5316\u4E3A\u4EE3\u7801`,
    `const files = await scanRepo('./src')      // \u2460 \u626B\u63CF\u4ED3\u5E93`,
    `const groups = groupByModule(files)       // \u2461 \u6309\u6A21\u5757\u5206\u7EC4`,
    `const done = [], risk = []`,
    `for (const g of topoSort(groups)) {       // \u2462 \u4F9D\u8D56\u6392\u5E8F\uFF1A\u57FA\u7840\u2192\u7F51\u7EDC\u2192\u4E1A\u52A1`,
    `  await parallel(g.files.map(async f => {`,
    `    let retries = 0                        // \u8BA1\u6570\u5668\u4F4F\u5728\u811A\u672C\u53D8\u91CF\u91CC`,
    `    while (true) {`,
    `      const code = await worker.transform(f) // \u2463 LLM \u53EA\u505A\u667A\u529B\u5DE5\u4F5C`,
    `      const test = await worker.test(f)      // \u2464 \u81EA\u52A8\u8FD0\u884C\u5355\u6D4B`,
    `      if (test.pass) { done.push(f); break }`,
    `      if (++retries >= 3) {                  // \u2465 \u786C\u6027\u89C4\u5219\uFF1A\u4EE3\u7801\u9501\u6B7B`,
    `        risk.push({ file: f, log: test.log })`,
    `        break`,
    `      }`,
    `    }`,
    `  }))`,
    `}`,
    `return summary(done, risk)                 // \u2466 \u6C47\u603B\u6E05\u5355 + \u98CE\u9669\u62A5\u544A`
  ],
  spans: [
    { t0: 1.2, t1: 2.3, line: 2 },
    { t0: 2.4, t1: 2.9, line: 3 },
    { t0: 2.9, t1: 3.3, line: 5 },
    { t0: 3.3, t1: 5.3, line: 9 },
    { t0: 4.8, t1: 5.4, line: 10 },
    { t0: 5.2, t1: 5.6, line: 12 },
    { t0: 5.8, t1: 7.3, line: 9 },
    { t0: 5.9, t1: 6.1, line: 11 },
    { t0: 7.2, t1: 7.4, line: 11 },
    { t0: 8, t1: 8.3, line: 5 },
    { t0: 8.3, t1: 11.6, line: 9 },
    { t0: 10.2, t1: 11.8, line: 10 },
    { t0: 10.6, t1: 10.9, line: 12 },
    { t0: 11.2, t1: 12.8, line: 9 },
    { t0: 12.7, t1: 13, line: 12 },
    { t0: 13.4, t1: 15, line: 9 },
    { t0: 14.9, t1: 15.2, line: 12 },
    { t0: 15.1, t1: 15.8, line: 13 },
    { t0: 15.8, t1: 16.1, line: 5 },
    { t0: 16, t1: 19.6, line: 9 },
    { t0: 18.6, t1: 20, line: 10 },
    { t0: 19.6, t1: 20.1, line: 11 },
    { t0: 20.4, t1: 21.8, line: 19 }
  ]
};
var wfVars = [
  { t: 2.2, key: "files", value: 12 },
  { t: 3, key: "\u5F53\u524D\u7EC4", value: "\u57FA\u7840\u7EC4 (f1-f3)" },
  { t: 5.8, key: "retries.f2", value: 1 },
  { t: 7.3, key: "done", value: 3 },
  { t: 8.2, key: "\u5F53\u524D\u7EC4", value: "\u7F51\u7EDC\u7EC4 (f4-f7)" },
  { t: 11.2, key: "retries.f5", value: 1 },
  { t: 11.7, key: "done", value: 7 },
  { t: 13.4, key: "retries.f5", value: 2 },
  { t: 15.1, key: "retries.f5", value: 3 },
  { t: 15.2, key: "risk", value: 1 },
  { t: 16, key: "\u5F53\u524D\u7EC4", value: "\u4E1A\u52A1\u7EC4 (f8-f12)" },
  { t: 20, key: "done", value: 11 }
];
var workflowScenario = {
  id: "workflow",
  duration: 24,
  nodes: wfNodes,
  edges: wfEdges,
  packets: wfPackets,
  works: wfWorks,
  logs: [
    { t: 0.2, text: "\u7CFB\u7EDF\u5C31\u7EEA\uFF1A\u811A\u672C\u8C03\u5EA6 \u2014\u2014 \u89C4\u5219\u3001\u8BA1\u6570\u5668\u3001\u4F9D\u8D56\u5168\u90E8\u5199\u8FDB\u4EE3\u7801", tone: "system" },
    { t: 1.3, text: "\u2460 scanRepo\uFF1A\u626B\u63CF\u4ED3\u5E93 \u2192 12 \u4E2A\u5F85\u6539\u6587\u4EF6", tone: "info" },
    { t: 2.5, text: "\u2461\u2462 groupByModule + topoSort\uFF1A\u57FA\u7840 \u2192 \u7F51\u7EDC \u2192 \u4E1A\u52A1\uFF08\u4F9D\u8D56\u6392\u5E8F\u7531\u4EE3\u7801\u4FDD\u8BC1\uFF09", tone: "info" },
    { t: 3.1, text: "\u57FA\u7840\u7EC4 3 \u4E2A\u6587\u4EF6\u5E76\u884C\u6539\u9020", tone: "info" },
    { t: 5.3, text: "f2 \u6D4B\u8BD5\u5931\u8D25 \u2192 \u811A\u672C\u81EA\u52A8\u91CD\u8BD5\uFF08retries.f2: 0\u21921\uFF09", tone: "info" },
    { t: 8, text: "\u2713 \u4F9D\u8D56\u9501\uFF1A\u57FA\u7840\u7EC4\u5168\u90E8\u901A\u8FC7\uFF0C\u7F51\u7EDC\u7EC4\u624D\u5141\u8BB8\u5F00\u5DE5", tone: "success" },
    { t: 10.7, text: "f5 \u7B2C 1 \u6B21\u5931\u8D25 \u2192 \u81EA\u52A8\u91CD\u8BD5\uFF08\u8BA1\u6570\u5668\u5728\u811A\u672C\u53D8\u91CF\uFF0C\u4E0D\u9760 LLM \u8BB0\u5FC6\uFF09", tone: "info" },
    { t: 12.9, text: "f5 \u7B2C 2 \u6B21\u5931\u8D25 \u2192 \u518D\u91CD\u8BD5\uFF08retries.f5 = 2\uFF09", tone: "info" },
    { t: 15.1, text: "\u26D4 f5 \u8FDE\u7EED\u5931\u8D25 3 \u6B21 \u2014\u2014 \u4EE3\u7801\u7194\u65AD\uFF1A\u7EC8\u6B62\u5E76\u5199\u5165\u98CE\u9669\u62A5\u544A\uFF0C\u89C4\u5219\u5F3A\u5236\u6267\u884C", tone: "warn" },
    { t: 16.1, text: "\u4E1A\u52A1\u7EC4 5 \u4E2A\u6587\u4EF6\u5E76\u884C\u5F00\u5DE5\uFF08\u65E0\u4EBA\u503C\u5B88\uFF09", tone: "info" },
    { t: 20.5, text: "\u2466 \u6C47\u603B\uFF1A11 \u4E2A\u6587\u4EF6\u5347\u7EA7\u5B8C\u6210 + 1 \u4EFD\u98CE\u9669\u62A5\u544A \u2014\u2014 \u72B6\u6001\u5168\u5728 Runtime\uFF0C\u9876\u5C42\u5BF9\u8BDD\u96F6\u6C61\u67D3", tone: "info" },
    { t: 23, text: "\u4EFB\u52A1\u5B8C\u6210 \u2713 \u53EF\u590D\u73B0\u6027\u6700\u9AD8\uFF1A\u540C\u4E00\u4EE3\u7801\u5E93\u8DD1\u4E24\u6B21\uFF0C\u6D41\u7A0B\u5B8C\u5168\u4E00\u81F4", tone: "success" }
  ],
  stats: wfStats,
  script: wfScript,
  vars: wfVars
};
var scenarios = {
  subagent: subagentScenario,
  team: teamScenario,
  workflow: workflowScenario
};
var archMetas = [
  {
    id: "subagent",
    name: "Subagent",
    cn: "\u7236\u5B50\u5B50\u4EE3\u7406",
    en: "Parent-Child Subagent",
    tagline: "\u7236 Agent \u72EC\u81EA\u8BB0\u6240\u6709\u53F0\u8D26",
    color: "#22d3ee",
    colorSoft: "rgba(34, 211, 238, 0.12)",
    topology: "\u661F\u578B",
    control: "\u7236 Agent\uFF08LLM \u9010\u8F6E\u51B3\u7B56\uFF09",
    bestFor: "\u8FB9\u754C\u6E05\u6670\u7684\u4E32\u884C\u5B50\u4EFB\u52A1",
    concurrency: "2 ~ 8 \u4E2A",
    cost: "\u6700\u4F4E",
    reproducibility: "\u4F4E",
    stats: [
      { key: "done", label: "\u5DF2\u56DE\u6D41\u73AF\u8282", max: 7 },
      { key: "conc", label: "\u5F53\u524D\u5E76\u53D1", max: 4 },
      { key: "ctx", label: "\u7236\u4E0A\u4E0B\u6587\u5360\u7528", max: 100, format: (v) => `${Math.round(v)}%`, tone: "danger" },
      { key: "risk", label: "\u26A0\uFE0F \u89C4\u5219\u8FDD\u80CC", max: 3, tone: "danger" }
    ]
  },
  {
    id: "team",
    name: "Agent Team",
    cn: "\u667A\u80FD\u4F53\u56E2\u961F",
    en: "Agent Team",
    tagline: "\u9879\u76EE\u5FAE\u4FE1\u7FA4\u5F0F\u534F\u4F5C",
    color: "#e879f9",
    colorSoft: "rgba(232, 121, 249, 0.12)",
    topology: "\u7F51\u72B6",
    control: "Lead Agent \u4E3B\u5BFC\uFF0C\u6210\u5458\u53EF\u534F\u5546",
    bestFor: "\u8FB9\u63A2\u7D22\u8FB9\u8C03\u6574\u7684\u5F00\u653E\u95EE\u9898",
    concurrency: "3 ~ 6 \u4EBA",
    cost: "\u4E2D\u7B49\u504F\u9AD8",
    reproducibility: "\u4E2D",
    stats: [
      { key: "done", label: "\u5DF2\u4EA4\u4ED8\u6210\u679C", max: 4 },
      { key: "conc", label: "\u5E76\u884C\u6210\u5458", max: 4 },
      { key: "msgs", label: "\u534F\u4F5C\u6D88\u606F\u6570", max: 18 },
      { key: "risk", label: "\u26A0\uFE0F \u5931\u63A7 / \u9057\u6F0F", max: 2, tone: "danger" }
    ]
  },
  {
    id: "workflow",
    name: "Dynamic Workflow",
    cn: "\u52A8\u6001\u5DE5\u4F5C\u6D41",
    en: "Dynamic Workflow",
    tagline: "\u89C4\u5219\u5168\u90E8\u5199\u8FDB\u7F16\u6392\u811A\u672C",
    color: "#34d399",
    colorSoft: "rgba(52, 211, 153, 0.12)",
    topology: "\u811A\u672C\u8C03\u5EA6",
    control: "JS \u7F16\u6392\u811A\u672C + Runtime",
    bestFor: "\u65E0\u4EBA\u503C\u5B88\u7684\u6279\u91CF\u6267\u884C",
    concurrency: "\u6570\u5341 ~ \u4E0A\u767E\u4E2A",
    cost: "\u6700\u9AD8",
    reproducibility: "\u9AD8",
    stats: [
      { key: "done", label: "\u5DF2\u5904\u7406\u6587\u4EF6", max: 12 },
      { key: "conc", label: "\u5F53\u524D\u5E76\u53D1", max: 5 },
      { key: "retries", label: "\u81EA\u52A8\u91CD\u8BD5", max: 3 },
      { key: "ctx", label: "Runtime \u72B6\u6001", max: 100, format: (v) => `${Math.round(v)}%`, tone: "ok" }
    ]
  }
];
export {
  archMetas,
  scenarios
};
