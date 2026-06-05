# BYRAchieve Mobile

## 项目说明

`apps/mobile` 是仓库中的移动端应用，基于 Expo、React Native 与 Expo Router 构建。

当前仓库已经完成了 Expo 项目绑定与 EAS 构建基础配置：

- Expo owner: `yinyra`
- Expo slug: `byrachieve`
- EAS projectId: `055670c5-bb3f-4fc4-92d7-ae1ee587a5d1`

## 目录位置

所有移动端相关命令都应在本目录执行：

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
```

不要在仓库根目录直接执行 `expo` 或 `eas` 命令。

## 本地开发

安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm --filter @bbs/mobile start
```

如果已经进入 `apps/mobile` 目录，也可以直接执行：

```bash
npx expo start
```

常用命令：

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

## 构建配置

当前已配置的 EAS profile 位于 [eas.json](/Users/ghost/code/BBSAchieve/apps/mobile/eas.json)：

- `development`
  用于开发调试版，包含 development client。
- `preview`
  用于测试分发。
- `production`
  用于正式发布。

应用基础配置位于 [app.json](/Users/ghost/code/BBSAchieve/apps/mobile/app.json)。

## 首次登录 Expo

如果本机还没有登录 Expo，先执行：

```bash
npx eas-cli@latest login
```

可以通过下面的命令确认当前绑定项目是否正确：

```bash
npx eas-cli@latest project:info
```

## 打包测试版

Android 测试包：

```bash
npx eas-cli@latest build --platform android --profile preview
```

iOS 测试包：

```bash
npx eas-cli@latest build --platform ios --profile preview
```

构建完成后，可以在 Expo Dashboard 的 Builds 页面下载安装包或查看构建日志。

## 发布正式版

Android 正式包：

```bash
npx eas-cli@latest build --platform android --profile production
```

iOS 正式包：

```bash
npx eas-cli@latest build --platform ios --profile production
```

如果需要提交到应用商店，再执行：

```bash
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```

## 更新内容后怎么重新提交

如果你已经修改了移动端页面、文案、样式或逻辑，通常按下面步骤处理。

### 1. 先提交代码

在仓库根目录执行：

```bash
cd /Users/ghost/code/BBSAchieve
git status
git add .
git commit -m "更新移动端内容"
```

如果只想提交移动端文件，可以改成：

```bash
git add apps/mobile
git commit -m "更新移动端内容"
```

再推送到远端：

```bash
git push
```

### 2. 如果要让测试用户安装新包

重新发一个测试构建：

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
npx eas-cli@latest build --platform android --profile preview
```

如果是 iOS：

```bash
npx eas-cli@latest build --platform ios --profile preview
```

这适用于：

- 改了原生配置
- 改了 `app.json`
- 更新了图标、启动图、包名、插件
- 还没有接入 OTA 更新

### 3. 如果要发正式版本

重新构建 production 包：

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
npx eas-cli@latest build --platform android --profile production
```

需要上架时再执行 submit。

## 什么时候必须重新打包

出现下面这些改动时，必须重新执行 `eas build`：

- 修改 `app.json`
- 修改 `eas.json`
- 新增或调整 Expo 插件
- 修改应用图标、启动图、包名、scheme
- 安装涉及原生能力的依赖

## 什么时候后续可以只发热更新

如果后面接入 `EAS Update`，那么这类纯前端改动通常可以直接发 OTA 更新，而不必重新打包：

- 页面文案
- 样式
- 业务逻辑
- 大部分 TypeScript / JavaScript 代码

当前仓库还没有配置 `EAS Update`，所以现在默认按“修改后重新 build”处理最稳妥。

## 环境变量

当前移动端公共阅读链路依赖 `EXPO_PUBLIC_WEB_BASE_URL`，用于请求 Web 暴露的公开阅读 API。

建议在 `apps/mobile` 目录创建：

```bash
apps/mobile/.env
```

Expo 前端可读取的变量应使用 `EXPO_PUBLIC_` 前缀，例如：

```env
EXPO_PUBLIC_WEB_BASE_URL=http://127.0.0.1:3000
```

如果使用 Kinde 登录，还需要配置：

```env
EXPO_PUBLIC_KINDE_DOMAIN=https://example.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=mobile-client-id
EXPO_PUBLIC_KINDE_API_AUDIENCE=https://example.com/api
EXPO_PUBLIC_KINDE_REDIRECT_URL=byrachieve://example.kinde.com/kinde_callback
```

代码中不要在业务文件里直接读取 `process.env.EXPO_PUBLIC_*`。移动端环境变量统一放在：

```ts
src/config/env.ts
```

新增变量时，在这个文件里用静态形式读取，例如 `process.env.EXPO_PUBLIC_NEW_VAR`，再导出结构化 helper 给业务代码使用。仓库里有测试约束，防止其他 `src` 文件直接读取 `EXPO_PUBLIC_`。

当前首页会请求：

```txt
GET {EXPO_PUBLIC_WEB_BASE_URL}/api/public/boards
```

注意事项：

- `EXPO_PUBLIC_WEB_BASE_URL` 必须指向可被移动端访问到的 Web 服务地址。
- 可以写成 `http://127.0.0.1:3000` 或 `http://192.168.x.x:3000`，代码会自动去掉末尾多余的 `/`。
- 如果没有配置这个变量，移动端公共阅读 client 会直接抛出错误：`Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API`。
- `npx eas-cli@latest build --platform android --profile preview` 使用 EAS 远程环境里的变量，不会依赖本机被 gitignore 的 `.env`。需要在 EAS 的 `preview` 环境中配置上面的 `EXPO_PUBLIC_` 变量后重新打包。
- 当前 `eas.json` 已把 `preview` profile 绑定到 EAS 的 `preview` 环境。
- 不要把密钥、令牌等敏感信息放进前端环境变量。

## 常见问题

### Android application id 是什么

例如：

```txt
com.yinyra.byrachieve
```

这是 Android 应用唯一标识，不要求你真的拥有对应域名，但要尽量保证唯一。一旦正式上架，后续不要轻易更改。

### `Install and run the Android build on an emulator?` 是什么

这是在问构建完成后，是否自动安装到本机 Android 模拟器中运行。

- 有本地模拟器并且想马上预览：选 `Y`
- 只是先打包，或者没有开模拟器：选 `n`

## 参考文档

- Expo Build setup: https://docs.expo.dev/build/setup/
- Expo monorepo: https://docs.expo.dev/guides/monorepos/
- Expo environment variables: https://docs.expo.dev/guides/environment-variables/
- EAS Update: https://docs.expo.dev/eas-update/getting-started/
