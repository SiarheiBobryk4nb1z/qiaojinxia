import program from "commander";
import path from "path";
import fs from "fs";
import child_process from "child_process";
import shell from "shelljs";
import watcher from "./../util/watcher.util";
import config from "./../config/index.config";

function isFile(path) {
    return fs.existsSync(path) && fs.statSync(path).isFile();
}

function fileCopy(src, dest) {
    fs.writeFileSync(dest, fs.readFileSync(src));
}

program
    .version('1.0.0')

program
    .command('start [script]')
    .description('koahub start script --watch --compile')
    .option('-w, --watch', 'auto restart when a file is modified')
    .option('-c, --compile', 'auto babel process when a file is modified')
    .action(function (script, options) {

        if (!script) {
            script = path.join(config.app, 'index.js');
        }

        const regExpJs = new RegExp(`.js$`);
        if (!regExpJs.test(script)) {
            script = path.join(script, 'index.js');
        }

        const regExp = new RegExp(`^${config.app}/?`);
        if (!regExp.test(script)) {
            throw new Error('Project directory and the runtime directory can\'t be modified');
        }

        if (!isFile(script)) {
            throw new Error('The `script` is not found.');
        }

        const rootPath = process.cwd();
        const appName = config.app;
        const appPath = path.resolve(rootPath, appName);
        const appFile = path.resolve(rootPath, script);
        const runtimeName = config.runtime;
        const runtimePath = path.resolve(rootPath, runtimeName);
        const runtimeFile = path.resolve(rootPath, script.replace(`${appName}/`, `${runtimeName}/`));

        // 监控启动
        if (options.watch == true) {

            // 编译并且监控启动
            if (options.compile == true) {
                shell.exec(`./node_modules/.bin/babel ${appName}/ --out-dir ${runtimeName}/`);
            }

            let runtimeProcess;

            function startRuntimeProcess(runtimeFile) {
                runtimeProcess.send('exit');
                runtimeProcess = child_process.fork(runtimeFile);
                runtimeProcess.on('message', (msg) => {
                    if (msg == 'restart') {
                        startRuntimeProcess(runtimeFile);
                    }
                });
            }

            // 启动运行时进程
            startRuntimeProcess(runtimeFile);

            // 监听进程退出，通知运行时进程退出
            process.on('SIGINT', function () {
                runtimeProcess.send('exit');
                process.exit(0);
            });

            // 开启文件监控
            watcher(function (file) {
                // 编译并且监控启动
                if (options.compile == true) {
                    const fileRuntimePath = file.replace(`${appName}/`, `${runtimeName}/`);
                    shell.exec(`./node_modules/.bin/babel ${file} --out-file ${fileRuntimePath}`);
                }
                startRuntimeProcess(runtimeFile);
            });

            return;
        }

        // 直接编译启动
        if (options.compile == true) {
            shell.exec(`./node_modules/.bin/babel ${appName}/ --out-dir ${runtimeName}/`);
        }

        // 直接启动
        require(runtimeFile);
    });

program
    .command('controller [name]')
    .description('koahub create controller')
    .action(function (name) {

        const destFile = path.resolve(config.app, `controller/${name}.controller.js`);
        const srcFile = path.resolve(process.mainModule.filename, '../../', 'template/controller/index.controller.js');

        fileCopy(srcFile, destFile);
    });

program
    .command('create [project]')
    .description('koahub create project')
    .action(function (project) {

        shell.exec('git clone https://github.com/einsqing/koahubjs-demo.git');
        fs.renameSync(path.resolve('koahubjs-demo'), path.resolve(project));
    });

program.parse(process.argv);

if (!program.args.length) program.help();