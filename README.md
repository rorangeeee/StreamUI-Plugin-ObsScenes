# StreamUI-Plugin-ObsScenes

StreamUICore 的独立 OBS WebSocket v5 观察插件。需要 Windows x64、.NET 10 SDK 和原生 Contracts SDK major 1。

## 构建与使用

克隆到 Core/plugins/obs-scenes，然后执行：

~~~powershell
powershell.exe -NoProfile -File build.ps1 -SdkPath <Core>/sdk/native
~~~

在“插件配置 → OBS 场景联动”填写地址、密码并连接。各场景对应的 OBS 场景名由预设自己的配置页提供，本插件不保存绑定，也不决定场景动效。

## 公开能力

- plugin.obs-scenes.status：{state,scene,error,transition,detail}。
- plugin.obs-scenes.scene-changed：{id,name,startedAt}，仅在实际输出场景名改变时发布。周期健康查询不会重复发布相同场景。
- status.transition 可包含 OBS 转场时钟和阶段；是否使用它由场景组件决定。

客户端可从 plugins[].topics.status 取得初始状态。地址和密码保存在插件私有设置，不在公开状态中。插件只观察 OBS，不发送切换 OBS 场景的命令。

预设组件必须忽略预览中的真实自动联动；使用场景自己的非空绑定匹配 name，再通过 SDK 选择输出场景。匹配、空值处理和动效全部属于预设。

## 验证

~~~powershell
powershell.exe -NoProfile -File tests/test.ps1 -SdkPath <Core>/sdk/native
~~~

测试使用本机模拟 OBS，验证认证、转场状态及场景事件去重，不需要连接实际 OBS。

仓库保留源码和构建配置；DLL、deps.json、bin、obj、.local 不提交。更新前退出 Core，保留个人源码修改，合并 Git 更新后构建。Core 直接从安装目录加载。legacySettingsKey 声明旧连接配置的导入键，已存在的插件设置不会被覆盖。
