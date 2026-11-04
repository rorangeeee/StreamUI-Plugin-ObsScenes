# StreamUI-Plugin-ObsScenes

StreamUICore 的独立 OBS WebSocket v5 观察插件。需要 Windows x64、.NET 10 SDK 和原生 Contracts SDK major 1。

## 构建与使用

克隆到 Core/plugins/obs-scenes，然后执行：

~~~powershell
powershell.exe -NoProfile -File build.ps1 -SdkPath <Core>/sdk/native
~~~

在“设置 → 插件设置 → OBS 场景联动”填写地址、密码并连接。各场景对应的 OBS 场景名由预设提供，本插件不保存绑定，也不决定场景动效。

## 公开能力

- plugin.obs-scenes.status：{state,scene,error,transition,detail}。
- plugin.obs-scenes.scene-changed：{id,name,startedAt}，仅在节目目标场景名改变时发布。周期健康查询和转场结束通知不会重复发布相同场景。
- status.transition 可包含 OBS 转场时钟和阶段；是否使用它由场景组件决定。

客户端可从 plugins[].topics.status 取得初始状态。地址和密码保存在插件私有设置，不在公开状态中。插件只观察 OBS，不发送切换 OBS 场景的命令。

OBS 33 会在转场结束后发送 CurrentProgramSceneChanged。插件在 SceneTransitionStarted 到来时立即查询节目场景；若查询抢先于 OBS 界面线程的更新，则在下一帧重查，直到场景改变、转场结束或响应期限到达。场景事件沿用该次转场的 id 和 startedAt，插入视频（Stinger）无需播完才触发网页动效。

预设组件必须忽略预览中的真实自动联动；使用场景自己的非空绑定匹配 name，再通过 SDK 选择输出场景。匹配、空值处理和动效全部属于预设。

## 验证

~~~powershell
powershell.exe -NoProfile -File tests/test.ps1 -SdkPath <Core>/sdk/native
~~~

测试使用本机模拟 OBS，验证认证、转场开始时读取目标、界面线程时序、原始时钟、过期查询隔离及结束事件去重，不需要连接实际 OBS。

仓库保留源码和构建配置；DLL、deps.json、bin、obj、.local 不提交。更新前退出 Core，保留个人源码修改，合并 Git 更新后构建。Core 直接从安装目录加载。legacySettingsKey 声明旧连接配置的导入键，已存在的插件设置不会被覆盖。
