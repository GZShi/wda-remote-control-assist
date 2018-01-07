# wda-remote-control-assist

iOS 设备远程控制助手

> A Vue.js project

## WebDriverAgent安装与使用步骤
* 操作系统：OSX
* 开发工具：Xcode
* 依赖管理工具：[Carthage](https://github.com/Carthage/Carthage)
* Nodejs包管理：[npm](https://www.npmjs.com/)
* 下载[WebDriverAgent](https://github.com/facebook/WebDriverAgent)
  * `git clone https://github.com/facebook/WebDriverAgent.git your-folder`
  * `cd your-folder`
  * `./Scripts/bootstrap.sh`
  * 使用Xcode打开`WebDriverAgent.xcodeproj`项目。你可能需要免费注册一个苹果个人开发者账号，然后修改项目里面的几个`BundleID`以保证其唯一性。详细步骤可以参阅[这里](https://testerhome.com/topics/10463)
  * 以上步骤就绪后，用USB连接设备，然后在Xcode上运行测试框架：Xcode->Product->Test
  * 手机上先会黑屏，然后再回到主屏，Xcode上显示状态为Testing，表示WebDriverAgent已经运行起来了
  * 此时手机会监听`8100`端口，在同一个局域网内访问`http://手机ip:8100/inspector`可以看到框架提供的默认调试工具
  * 接下来开始运行本工程：`npm run dev`，即可进入Web控制台

## Web控制台起步

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
