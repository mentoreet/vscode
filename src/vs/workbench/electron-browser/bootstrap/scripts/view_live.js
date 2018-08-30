const electron = require('electron');
const {app} = require('electron').remote;
const path = require('path');
const ipc = electron.ipcRenderer;
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');

let lectureId = 0;
let lessonId = 0;
let token = '';
let isCompleted = false;

let rootDir = '';
let downloadDir = '';

/**
 * 전체 문제 Array, 초기 시험을 시작할 때 서버와의 통신으로 데이터를 저장.
 */
let _questionVM = null;
/**
 * 사용할 문제 Object
 * _questionVM에서 가져온다.
 */
let _selectedVM = null;
/**
 * 현재 사용중인 _selectedVM의 기본 _questionVM 절대값.
 */
let currentIndex = null;

let selectorTimer = document.getElementById("examTimer"),
    submittedQuestionCnt = document.getElementById("submittedQuestionCnt"),
    currentQuestionIndex = document.getElementsByClassName("currentQuestionIndex"),
    totalQuestionIndex = document.getElementsByClassName("totalQuestionIndex");
// ---------------------------------------------------------------------------- 전역 변수

// Publish Javascript ----------------------------------------------------------------------------
let leftTreeExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type"),
    leftTreeExitA = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:first-of-type a"),
    sideMenuBox = document.getElementById("side_menu_cont"),
    sideMenuClicker = document.getElementById("side_menu_cont").querySelector("div > a"),
    btnExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type"),
    btnComplete = document.getElementById("btnExamFinish"),
    btnNext = document.getElementById("btnNext"),
    btnPrev = document.getElementById("btnPrev");

const download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    /*var request =*/ https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};

const writeFile = function(filePath, content) {
    fs.writeFile(filePath, content, function(err) {
        if(err) {
            console.log(err);
            return false;
        }
        console.log("File saved successfully!");
    });

    return true;
};

const getCodeFileExtension = function(lang) {
    let ext = '';
    switch (lang) {
        case "c":
            ext = 'c';
            break;
        case "cpp":
            ext = 'cpp';
            break;
        case "csharp":
            ext = 'cs';
            break;
        case "fsharp":
            ext = 'fs';
            break;
        case "go":
            ext = 'go';
            break;
        case "java":
            ext = 'java';
            break;
        case "javascript":
            ext = 'js';
            break;
        case "lua":
            ext = 'lua';
            break;
        case "objective-c":
            ext = 'mm';
            break;
        case "php":
            ext = 'php';
            break;
        case "python":
            ext = 'py';
            break;
        case "r":
            ext = 'fs';
            break;
        case "ruby":
            ext = 'rb';
            break;
        case "sql":
            ext = 'sql';
            break;
        case "swift":
            ext = 'swift';
            break;
        case "typescript":
            ext = 'ts';
            break;
        default:
            ext = '';
    }

    return ext;
};

let prepareProject = function(lang, codeFileName, codeFileDir, callback) {
    let writeResult = false;
    let dotVSCodeDir = path.join(codeFileDir, '.vscode');
    let launch_json_filepath = path.join(dotVSCodeDir, 'launch.json');
    let settings_json_filepath = path.join(dotVSCodeDir, 'settings.json');
    let tasks_json_filepath = path.join(dotVSCodeDir, 'tasks.json');
    if (!fs.existsSync(dotVSCodeDir)){
        fs.mkdirSync(dotVSCodeDir);
    }

    let c_cpp_launch_json_content = `{
        // IntelliSense를 사용하여 가능한 특성에 대해 알아보세요.
        // 기존 특성에 대한 설명을 보려면 가리킵니다.
        // 자세한 내용을 보려면 https://go.microsoft.com/fwlink/?linkid=830387을(를) 방문하세요.
        "version": "0.2.0",
        "configurations": [
            {
                "name": "(gdb) Launch",
                "type": "cppdbg",
                "request": "launch",
                "program": "\${workspaceFolder}/\${fileBasenameNoExtension}.exe",
                "args": [],
                "stopAtEntry": false,
                "cwd": "\${workspaceFolder}",
                "environment": [],
                "externalConsole": true,
                "MIMode": "gdb",
                "miDebuggerPath": "C:\\Program Files\\mingw-w64\\x86_64-8.1.0-posix-seh-rt_v6-rev0\\mingw64\\bin\\gdb.exe",
                "setupCommands": [
                    {
                        "description": "Enable pretty-printing for gdb",
                        "text": "-enable-pretty-printing",
                        "ignoreFailures": true
                    }
                ]
            }
        ]
    }`;
    let c_cpp_tasks_json_content = `{
        // See https://go.microsoft.com/fwlink/?LinkId=733558
        // for the documentation about the tasks.json format
        "version": "2.0.0",
        "tasks": [
            {
                "label": "build app",
                "type": "shell",
                "command": "gcc",
                "args":[
                    "-g",
                    "-o",
                    "\${fileBasenameNoExtension}.exe",
                    \${file}"
                ],
                "group": {
                    "kind": "build",
                    "isDefault": true
                }
            },
            {
                "label": "run app",
                "type": "shell",
                "command": "./\${fileBasenameNoExtension}.exe"
            }
        ]
    }`;

    let python_launch_json_content = `{
        // Use IntelliSense to learn about possible attributes.
        // Hover to view descriptions of existing attributes.
        // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Python: Current File",
                "type": "python",
                "request": "launch",
                "program": "\${file}"
            }
        ]
    }`;
    let python_settings_json_content = `{
        "python.pythonPath": "C:\\\\Program Files (x86)\\\\Python37-32\\\\python.exe"
    }`;

    let js_launch_json_content = `{
        // IntelliSense를 사용하여 가능한 특성에 대해 알아보세요.
        // 기존 특성에 대한 설명을 보려면 가리킵니다.
        // 자세한 내용을 보려면 https://go.microsoft.com/fwlink/?linkid=830387을(를) 방문하세요.
        "version": "0.2.0",
        "configurations": [
            {
                "type": "node",
                "request": "launch",
                "name": "프로그램 시작",
                "program": "\${workspaceFolder}/${codeFileName}"
            }
        ]
    }`;

    switch (lang) {
        case "c":
        case "cpp":
            writeResult = writeFile(launch_json_filepath, c_cpp_launch_json_content);

            if(writeResult) {
                writeResult = writeFile(tasks_json_filepath, c_cpp_tasks_json_content);
            }

            if(writeResult) {
                console.log('vscode 설정 성공');
                callback();
            }
            else {
                console.log('vscode 설정 실패');
            }
            break;
        case "csharp":
            exec(`"C:\\Program Files\\dotnet\\dotnet" new console -o "${codeFileDir}"`, (error, stdout, stderr) => {
                if(error) {
                    console.log(error);
                    return;
                }

                callback();
            });
            break;
        case "fsharp":
            break;
        case "go":
            break;
        case "java":
            break;
        case "javascript":
            writeResult = writeFile(launch_json_filepath, js_launch_json_content);

            if(writeResult) {
                console.log('vscode 설정 성공');
                callback();
            }
            else {
                console.log('vscode 설정 실패');
            }
            break;
        case "lua":
            break;
        case "objective-c":
            break;
        case "php":
            break;
        case "python":
            writeResult = writeFile(launch_json_filepath, python_launch_json_content);

            if(writeResult) {
                writeResult = writeFile(settings_json_filepath, python_settings_json_content);
            }

            if(writeResult) {
                console.log('vscode 설정 성공');
                callback();
            }
            else {
                console.log('vscode 설정 실패');
            }
            break;
        case "r":
            break;
        case "ruby":
            break;
        case "sql":
            break;
        case "swift":
            break;
        case "typescript":
            break;
        default:
    }
};

let getFileNameByExt = function(codeFileExt, questionId) {
    let fileName = `${questionId}.${codeFileExt}`;
    switch (codeFileExt) {
        case "cs":
            fileName = "Program.cs";
            break;
        case "cpp":
            break;
        case "csharp":
            break;
        case "fsharp":
            break;
        case "go":
            break;
        case "java":
            break;
        case "javascript":
            break;
        case "lua":
            break;
        case "objective-c":
            break;
        case "php":
            break;
        case "python":
            break;
        case "r":
            break;
        case "ruby":
            break;
        case "sql":
            break;
        case "swift":
            break;
        case "typescript":
            break;
        default:
    }

    return fileName;
};

function getFileNameFromUrl(url) {
    //this removes the anchor at the end, if there is one
    url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
    //this removes the query after the file name, if there is one
    url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
    //this removes everything before the last slash in the path
    url = url.substring(url.lastIndexOf("/") + 1, url.length);
    //return
    return url;
}

function downloadAttachedZipFile(url) {
    //'https://modustorage.blob.core.windows.net/projects/201ef9b5-1cc2-468c-8a85-9659642c9be4.zip'
    let info = {
        url:url,
        to:downloadDir
    };

    // ipc.send('command-downloadExamSample', {
    //     url:'https://modustorage.blob.core.windows.net/projects/201ef9b5-1cc2-468c-8a85-9659642c9be4.zip',
    //     to:directory
    // });
//url, dest, cb
//getFileNameFromUrl
    let filename = getFileNameFromUrl(info.url);
    let filepath = path.join(downloadDir, filename);

    download(info.url,
        path.join(downloadDir, filename),
        () => {
            let targetDir = path.join(downloadDir, filename.replace(".zip", ""));

            if(filename.indexOf('.zip') > 0) {
                // let cmd = `7z e "${filepath}" -o"${targetDir}" -aoa`;
                // alert(cmd);
                //압축풀기
                exec(`"C:\\Program Files\\7-Zip\\7z.exe" e "${filepath}" -o"${targetDir}" -aoa`, (error, stdout, stderr) => {
                    if(error) {
                        alert(error);
                        return;
                    }

                    // let temp = `"C:\\Program Files\\Unity\\Editor\\unity.exe" -projectPath "${targetDir}"`;
                    // exec(temp);
                });
                //let zip1 = new admzip(filepath);
                //zip1.extractAllTo(targetDir, true);
            }
            // alert('코딩 샘플 다운로드 완료!');
        });
}

ipc.on("control-exam-load", (evt, args) => {
    // lectureId = args.lectureId;
    // lessonId = args.lessonId;
    token = args.token;

    //폴더 정보 세팅 및 생성
    rootDir = path.join(app.getPath('appData'),'moducoding');
    downloadDir = path.join(app.getPath('appData'),'moducoding','download');

    if (!fs.existsSync(rootDir)){
        fs.mkdirSync(rootDir);
    }

    if (!fs.existsSync(downloadDir)){
        fs.mkdirSync(downloadDir);
    }

    loadWindow();
});

function backToDashboard() {
    //여기서 다시 화면을 이전 화면으로 옮기기...
    ipc.send("command-back-to-dashboard");
}

leftTreeExit.onpointerenter = function () {
    this.querySelector(".balloon").classList.add("m_on");
};
leftTreeExit.onpointerleave = function () {
    this.querySelector(".balloon").classList.remove("m_on");
};
leftTreeExitA.onclick = function () {
    if (sideMenuBox.classList.contains("open")) {
        sideMenuBox.style.left = "50px";
        sideMenuBox.classList.remove("open");
    } else {
        sideMenuBox.style.left = "-450px";
        sideMenuBox.classList.add("open");
    }
};
sideMenuClicker.onclick = function () {
    sideMenuBox.classList.add("open");
    sideMenuBox.style.left = "-450px";
};
btnExit.onclick = function () {
    if (confirm("정말로 시험을 포기하시겠습니까?")) {
        fnCompleteExam("exit");

        backToDashboard();
    }
};

btnComplete.onclick = function () {
    if (Number(currentQuestionIndex[0].innerHTML) != Number(totalQuestionIndex[0].innerHTML)) {
        if (!confirm("답안에 미 제출된 문제가 있습니다.\n최종 완료 이후에는 추가 제출할 수 없습니다.\n그래도 시험을 최종 완료하시겠습니까?")) {
            return;
        }
    }
    else {
        if (!confirm("최종 완료 이후에는 추가 제출할 수 없습니다.\n그래도 시험을 최종 완료하시겠습니까?")) {
            return;
        }
    }

    fnCompleteExam("self");
};

let //exam_detail_box = document.getElementsByClassName("exam_detail_box")[0],
    exam_list_cov = document.getElementsByClassName("exam_list_cov")[0];

/**
 * JQuery .fadeIn, .fadeOut와 같은 방식으로 순수 자바스크립트화.
 * selector: 선택자
*/
function fnFadeInOut(selector) {
    var fadeTarget = document.getElementById(selector);
    var fadeEffect = setInterval(function () {
        if (!fadeTarget.style.opacity) {
            fadeTarget.style.opacity = 1;
        }
        if (fadeTarget.style.opacity > 0) {
            fadeTarget.style.opacity -= 0.1;
        } else {
            document.getElementById("getStart").remove();
            clearInterval(fadeEffect);
        }
    }, 50);
}

/**
 * 모두의 코딩 자체 알리미
 * text: 표시할 내용
 * type: (null) 파란색 (false) 빨간색
 * time: 지속 시간
 */
var AlertModal = function (text, type, time) {
    let modal = document.getElementById("alertModal");
    document.getElementById("alertModal").querySelector("#saveModalText").innerHTML = text;
    modal.setAttribute("style", "right: 0;");
    modal.style.right = "0";
    if (type == "error" || type == "Error" || type == "false" || type == false || type == "red") {
        modal.style.background = "#dd1111";
    } else {
        modal.style.background = "rgb(46, 174, 248, 1)";
    }
    if (time != null) setTimeout(function () {
        modal.style.right = "-600px";
    }, time);
    else setTimeout(function () { modal.style.right = "-600px"; }, 1500);
};
// ---------------------------------------------------------------------------- Publish Javascript

// 페이지 초기 로딩시 발생 이벤트. "시험 응시하기" 버튼을 누르지 전일 경우도 포함.
window.onload = function () {
    //이 이벤트는 메인 프로세스로 부터 토큰 키를 받고 나서 실행!
    //loadWindow();
};

function loadWindow() {
    var list_box = document.querySelectorAll(".exam_list_cov ul li").length;
    if (list_box > 5) {
        exam_list_cov.classList.add("over_five");
    } else {
        exam_list_cov.classList.remove("over_five");
    }

    getMemberExamList();

    // // 시험 제목, 시험 시간, 제출한 시험 문제 수, 총 시험 문제 수
    // document.getElementById("txtExamTitle").innerHTML = "";
    // // 시험 제한 시간(분 단위), 시험 응시 시작 일자, 시험 응시 종료 일자
    // document.getElementById("startLimitTime").innerHTML = "";
    // document.getElementById("startStartDate").innerHTML = "";
    // document.getElementById("startEndDate").innerHTML = "";
    // 상단 타이머, 제출한 문제 수, 현재 문제 수
    selectorTimer.innerHTML = "0";
    submittedQuestionCnt.innerHTML = "0";
    currentQuestionIndex.innerHTML = "";
}

let btnStartExam = document.getElementById("getStart").querySelector(".start_btn button"),
    //btnCodingInOut = document.getElementById("btnCodingInOut"),
    btnMultipleSubmit = document.getElementById("btnMultipleSubmit"),
    btnSubjectiveSubmit = document.getElementById("btnSubjectiveSubmit"),
    btnCodingSubmit = document.getElementById("btnCodingSubmit"),
    btnExamFinish = document.getElementById("btnExamFinish");

// 초기 화면, "시험 응시하기" 버튼 클릭시 이벤트
btnStartExam.onclick = function () {
    if (document.querySelector(".active_list") != null) {
        lectureId = document.querySelector(".active_list").dataset.lectureid;
        lessonId = document.querySelector(".active_list").dataset.lessonid;
        isCompleted = document.querySelector(".active_list").dataset.complete;
    }
    if (lessonId < 1) { AlertModal("응시할 시험을 선택해주세요", false); return; }
    if (isCompleted == "true") { AlertModal("이미 응시한 시험입니다", false); return; }
    fnFadeInOut("getStart");
    AlertModal("지금부터 시험을 시작합니다.");
    fnGetExam();

    var limitMinutes = Number(document.querySelector(".active_list").dataset.limit);
    startExamTimer(selectorTimer, limitMinutes, function () {
        // 시간이 지났을 때 이벤트
        fnCompleteExam("timeout");
    });
};

// let codingInOuts = document.getElementsByClassName("code_answer")[0];
// 코딩 문제의 "입출력 예시 보기" 버튼 클릭시 이벤트
// btnCodingInOut.onclick = function () {
//     var inOutLength = 1;
//     for (var i = 0; i < inOutLength; i++) {
//         var template = '<p class="tit">입력</p><div class="input_box"><p class="input_cont" id="coding_input"><%this.inputTxt%></p></div><p class="tit">출력</p><div class="output_box"><p class="output_cont" id="coding_output"><%this.outputTxt%></p></div>';
//         var newTemplate = fnTemplateEngine(template, {
//             inputTxt: "입력 내용",
//             outputTxt: "출력 내용"
//         });
//         codingInOuts.innerHTML = codingInOuts.innerHTML + newTemplate;
//     }
// };

// active_list uno_val
var getMemberExamList = function () {
    fnToggleLoaderBox();
    var data = new Object();
    sendPostWithToken("http://localhost:5070/api/Question/List",
        token,
        data,
        function (result) {
            fnExamListInit(result);
            fnToggleLoaderBox();
        },
        function (failed) {
            console.log(failed);
            fnToggleLoaderBox();
            AlertModal("데이터 전송중 오류가 발생했습니다", false);
        }
    );
};

var fnExamListInit = function (data) {
    data = data.data;
    console.log(data);
    document.getElementById("appendExamList").innerHTML = "";
    for (var i = 0; i < data.length; i++)
    {
        var template = '<li data-complete="<%this.isCompleted%>" data-lectureid="<%this.lectureid%>" data-lessonid="<%this.lessonid%>" data-ques="<%this.questionCnt%>" data-desc="<%this.description%>" data-limit="<%this.limitMinutes%>" id="startMenu<%this.idx%>">'
            + '<a href="javascript:;"><div class="info_box"><p class="title_box">'
            + '<span class="exam_num"><%this.idx%></span>.'
            + '<span class="exam_tit"><%this.title%></span>'
            + '<span class="exam_score">(<b class=exam_scoreNum><%this.score%></b>점)</span></p>'
            + '<%if(this.startDate != null){%>'
            + '<p class="date"><i class="icon clock"></i><span class="start_date"><%this.startDate.split("T")[0]%></span>'
            + '~<span class="end_date"><%this.endDate.split("T")[0]%></span></p>'
            + '<%}else{%>'
            + '<p class="date"><i class="icon clock"></i>항상 공개</p>'
            + '<%}%>'
            + '</div><div class="status">'
            + '<%if(!this.isCompleted){%>'
            + '<span class="un-applied">미응시</span>'
            + '<%} else {%>'
            + '<span class="applied">응시완료</span>'
            + '<%}%>'
            + '</div></a></li>';
        var newTemplate = fnTemplateEngine(template, {
            idx: eval(i + 1),
            lectureid: data[i].lectureId,
            lessonid: data[i].lessonId,
            title: data[i].title,
            description: data[i].description,
            limitMinutes: data[i].limitMinutes,
            score: data[i].score,
            applyState: data[i].applyState,
            questionCnt: data[i].questionCnt,
            isCompleted: data[i].isCompleted,
            startDate: data[i].startDate,
            endDate: data[i].endDate
        });

        document.getElementById("appendExamList").innerHTML =
            document.getElementById("appendExamList").innerHTML + newTemplate;
    }
    fnStartMenuBtn();
};

var fnStartMenuBtn = function () {
    var _length = document.getElementById("appendExamList").querySelectorAll("li").length;
    //let startDetail = document.getElementsByClassName("exam_detail_box")[0];

    for (var i = 1; i < _length + 1; i++) {
        document.getElementById("startMenu" + i).onclick = function ()
        {
            for (var i = 0; i < _length; i++) {
                document.getElementById("appendExamList").querySelectorAll("li")[i].classList.remove("active_list");
                document.getElementById("appendExamList").querySelectorAll("li")[i].classList.remove("uno_val");
            }
            this.classList.add("active_list");
            this.classList.add("uno_val");
            document.getElementById("detailTit").innerHTML = this.querySelector(".exam_tit").innerHTML;
            document.getElementById("detailDesc").innerHTML = this.dataset.desc;
            document.getElementById("detailTotalCnt").innerHTML = this.dataset.ques;
            if (this.dataset.limit != "")
                document.getElementById("detailLimitTime").innerHTML = this.dataset.limit;
            else
                document.getElementById("detailLimitTime").innerHTML = "0";
            if (this.querySelector(".start_date") != null) {
                var startDate = this.querySelector(".start_date").innerHTML.split("T");
                var endDate = this.querySelector(".end_date").innerHTML.split("T");
                document.getElementById("existTime").style.display = "block";
                document.getElementById("noExistTime").style.display = "none";
                document.getElementById("detailStartDate").innerHTML = startDate[0];
                document.getElementById("detailEndDate").innerHTML = endDate[0];
            } else {
                document.getElementById("existTime").style.display = "none";
                document.getElementById("noExistTime").style.display = "block";
            }
        };
    }
};

var fnTemplateEngine = function (html, options) {
    var re = /<%([^%>]+)?%>/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];\n', cursor = 0, match;
    var add = function (line, js) {
        js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
            (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
        return add;
    };
    while (match = re.exec(html)) {
        add(html.slice(cursor, match.index))(match[1], true);
        cursor = match.index + match[0].length;
    }
    add(html.substr(cursor, html.length - cursor));
    code += 'return r.join("");';
    return new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
};

// 객관식 문제, "답안 제출" 버튼 클릭시 이벤트
btnMultipleSubmit.onclick = function () {
    fnSubmitQuestion();
};

// 주관식 문제, "답안 제출" 버튼 클릭시 이벤트
btnSubjectiveSubmit.onclick = function () {
    fnSubmitQuestion();
};

// 코딩 문제, "답안 제출" 버튼 클릭시 이벤트
btnCodingSubmit.onclick = function () {
    fnSubmitQuestion();
};

// 최종 완료 클릭
btnExamFinish.onclick = function () {
    ipc.send("command-controlwindow-lefttop");
};

/**
 * 선택된 시험 문제 데이터를 화면에 표현.
 * 호출 위치: (1) fnGetExam() 호출시 성공하면 호출.
 */
var fnFillQuestion = function (_index) {
    // 객관식 문제 선택자
    let multiWrap = document.getElementsByClassName("multiple")[0],
        multiTitle = document.getElementById("multiple_title"),
        multiScore = document.getElementById("multiple_score"),
        multiDesc = document.getElementById("multiple_description");
    // 주관식 문제 선택자
    let subWrap = document.getElementsByClassName("write")[0],
        subTitle = document.getElementById("subjective_title"),
        subScore = document.getElementById("subjective_score"),
        subDesc = document.getElementById("subjective_description");//,
        //subAnswer = document.getElementById("txtSubjectiveAnswer");
    // 코딩 문제 선택자
    let codingWrap = document.getElementsByClassName("coding")[0],
        codingTitle = document.getElementById("coding_title"),
        codingScore = document.getElementById("coding_score"),
        codingDesc = document.getElementById("coding_description"),
        codingInOut = document.getElementById("codingInOut"),
        codingInput = document.getElementById("coding_input"),
        codingOutput = document.getElementById("coding_output");

    multiWrap.style.display = "none";
    subWrap.style.display = "none";
    codingWrap.style.display = "none";
    _selectedVM = _questionVM[_index];
    fnChangeQuestionIndex();

    let target = _selectedVM;
    switch (target.type) {
        case "multiple": {
            multiTitle.innerHTML = target.title;
            multiScore.innerHTML = target.score;
            multiDesc.innerHTML = target.contents;
            var examples = target.multipleExamples;
            for (var i = 1; i < 5; i++) {
                var _target = "multiple" + i;
                document.getElementById(_target).innerHTML = examples[i-1].example;
            }
            multiWrap.style.display = "block";
            break;
        } case "subjective": {
            subTitle.innerHTML = target.title;
            subScore.innerHTML = target.score;
            subDesc.innerHTML = target.contents;
            subWrap.style.display = "block";
            break;
        } case "coding": {
            codingTitle.innerHTML = target.title;
            codingScore.innerHTML = target.score;
            codingDesc.innerHTML = target.contents;

            let sampleCodes = target.codingExamples;
            if(sampleCodes && sampleCodes.length > 0) {
                let sampleCode = sampleCodes[0];
                //샘플 코드를 파일로 저장하고 그 파일을 코드로 열자.
                let codeFileDir = path.join(downloadDir, `${target.questionId}`);
                let codeFileExt = getCodeFileExtension(sampleCode.language);
                let codeFileName = getFileNameByExt(codeFileExt, target.questionId);
                let codeFilePath = path.join(codeFileDir, codeFileName);
                let code = sampleCode.code;

                if (!fs.existsSync(codeFileDir)){
                    fs.mkdirSync(codeFileDir);
                }

                //여기서 우선 cs의 경우 dotnet프로세스를 통해서 프로젝트를 준비해야 한다.
                prepareProject(sampleCode.language, codeFileName, codeFileDir, function () {
                    let writeResult = writeFile(codeFilePath, code);

                    if(writeResult) {
                        console.log(`파일 열기 : ${codeFileDir} ${codeFilePath}`);
                        console.log([codeFileDir, codeFilePath]);
                        ipc.send('command-openfiles', [codeFileDir, codeFilePath]);
                    }
                });
            }

            var inOuts = target.codingInOuts.find(inout => inout.isExample == true);
            if (target.codingInOuts.length != 1 && inOuts == null) {
                codingInOut.style.display = "none";
            } else {
                if (target.codingInOuts.length == 1) inOuts = target.codingInOuts[0];
                codingInOut.style.display = "block";
                codingInput.innerHTML = inOuts.input;
                codingOutput.innerHTML = inOuts.output;
            }
            codingWrap.style.display = "block";
            break;
        }
    }

    //데모용 세번째 문제를 선택할 경우, 샘플소스 코드 다운로드 하도록.
    // if(_index === 2) {
    //     downloadAttachedZipFile('https://modustorage.blob.core.windows.net/projects/201ef9b5-1cc2-468c-8a85-9659642c9be4.zip');
    // }
};

/**
 * 제출하기
 */
var fnSubmitQuestion = function () {
    var type = _selectedVM.type;
    var answer = null;
    if (type == "multiple") {
        if (document.getElementsByClassName("multiple")[0].querySelector("input[type=radio]:checked") != null) {
            let multiWrap = document.getElementsByClassName("multiple")[0];
            answer = Number(multiWrap.querySelector("input[type=radio]:checked").getAttribute("data-value"));
        }
    }
    else if (type == "subjective")
        answer = document.getElementById("txtSubjectiveAnswer").value;

    if (answer == null || answer == "") {
        AlertModal("답안을 작성해주세요", false);
        return;
    }

    if (_selectedVM.isSubmited == true) {
        if (confirm("이미 제출한 답안이 있습니다.\n변경하시겠습니까?")) {
            continueSubmit(answer);
        }
    }
    else {
        submittedQuestionCnt.innerHTML = Number(submittedQuestionCnt.innerHTML) + 1;
        fnCheckMenusBySubmit();
        continueSubmit(answer);
    }
    function continueSubmit (answer) {
        fnToggleLoaderBox();

        var data = new Object();
        data.LectureId = lectureId;
        data.LessonId = lessonId;
        data.QuestionId = _selectedVM.questionId;
        data.Answer = answer;
        sendPostWithToken("http://localhost:5070/api/Question/Submit",
            token,
            data,
            function (result) {
                console.log(result);
                fnToggleLoaderBox();
                AlertModal("답안이 제출되었습니다");

                var maxIndex = _questionVM.length;
                var nextIndex = eval(currentIndex + 1);
                if (maxIndex > nextIndex)
                    document.getElementById("topSelect").options[nextIndex].selected = true;
                fnChangeVM("next");
            },
            function (failed) {
                console.log(failed);
                fnToggleLoaderBox();
                AlertModal("데이터 전송중 오류가 발생했습니다", false);
            }
        );
    }
};


/**
 * API를 통해 시험 전체 정보를 가져온다.
 * 호출 위치: 초기 "시험 시작" 버튼 클릭시 이벤트 발생.
 */
var fnGetExam = function (action) {
    fnToggleLoaderBox();

    var data = new Object();
    data.LectureId = lectureId;
    data.LessonId = lessonId;
    sendPostWithToken("http://localhost:5070/api/Question",
        token,
        data,
        function (result)
        {
            console.log(result);
            if (!result.isPossibleToTakeExam) {
                AlertModal(result.impossibleMessage, false);
            }

            _questionVM = result.questionsVM;
            for (let i = 0; i < _questionVM.length; i++) {
                _questionVM[i].index = i;
                if (_questionVM[i].isSubmited) {
                    submittedQuestionCnt.innerHTML = Number(submittedQuestionCnt.innerHTML) + 1;
                }
            }
            fnFillQuestion(0);
            fnMakeMenus();
            if(totalQuestionIndex[0]) {
                totalQuestionIndex[0].innerHTML = _questionVM.length;
            }
            if(totalQuestionIndex[1]) {
                totalQuestionIndex[1].innerHTML = _questionVM.length;
            }
            fnToggleLoaderBox();
        },
        function (failed)
        {
            console.log(failed);
            fnToggleLoaderBox();
        }
    );
};

/**
 * 현재 풀고있는 문제 Index를 표시한다.
 * 대상: 화면의 문제 제목 좌측 Index 번호.
 */
var fnChangeQuestionIndex = function () {
    currentIndex = _selectedVM.index;
    for (var i = 0; i < currentQuestionIndex.length; i++) {
        currentQuestionIndex[i].innerHTML = currentIndex + 1;
    }
    var nextIndex = eval(currentIndex + 1);
    var prevIndex = eval(currentIndex - 1);
    if (_questionVM[nextIndex] == null)
        btnNext.setAttribute("disabled", true);
    else
        btnNext.removeAttribute("disabled");

    if (_questionVM[prevIndex] == null)
        btnPrev.setAttribute("disabled", true);
    else
        btnPrev.removeAttribute("disabled");
};

/**
 * 해당 _questionVM의 questionId 값을 반환.
 */
// var fnGetQuestionId = function () {
//     var questionId = _questionVM.find(_q => _q.index == currentIndex).questionId;
//     return questionId;
// };

var fnChangeVM = function (type) {
    var targetIndex = null;
    var originalIndex = currentIndex;
    if (Number.isInteger(type)) {
        if (_questionVM[type] != null) {
            _selectedVM = _questionVM[type];
            targetIndex = type;
        }
    }
    else {
        if (type == "next")
            targetIndex = eval(currentIndex + 1);
        if (type == "prev")
            targetIndex = eval(currentIndex - 1);
    }

    try {
        if (_questionVM[targetIndex].questionId > 0) {
            _selectedVM = _questionVM[targetIndex];
            currentIndex = _selectedVM.index;
        }
    }
    catch (e) {
        console.log(e);
    }

    if (originalIndex  != currentIndex)
        fnFillQuestion(currentIndex);
};


/**
 * 최종 제출 이벤트
 * self: "최종 제출" 버튼을 통한 호출시
 * timeout: 시험 시간이 지나 호출시
 * exit: "나가기" 버튼을 통한 호출시
 */
var fnCompleteExam = function (type) {
    fnToggleLoaderBox();
    if (type == "timeout") {
        // 시간 종료로 인해 최종 완료가 되는 경우, 기본 제공 Alert 사용.
        alert("시험 시간이 종료되었습니다. 수고하셨습니다.");
        //AlertModal("시험 시간이 종료되었습니다. 수고하셨습니다.", true, 7000);
    } else if (type == "exit") {
        AlertModal("현재까지 제출된 정답으로 최종 완료됩니다.", true, 7000);
    } else {
        AlertModal("최종 완료되었습니다. 수고하셨습니다.", true, 7000);
    }

    var data = new Object();
    data.LessonId = lessonId;
    sendPostWithToken("http://localhost:5070/api/Exam/Complete",
        token,
        data,
        function (result) {
            console.log(result);

            //시험 종료 후 다시 대시보드로.
            backToDashboard();
        },
        function (failed) {
            console.log(failed);
            AlertModal("데이터 전송중 오류가 발생했습니다", false);
        }
    );
};

/**
 * 문제를 제출했을 때, 좌측 및 상단의 문제 목록에 체크 표현.
 */

var fnCheckMenusBySubmit = function () {
    var _index = _selectedVM.index;
    let sideMenuList = document.getElementById("sideMenuList"),
        menuLists = sideMenuList.querySelectorAll("li"),
        topSelect = document.getElementById("topSelect"),
        selectOpts = topSelect.querySelectorAll("option");

    for (var i = 0; i < _questionVM.length; i++) {
        if (menuLists[i].getAttribute("data-index") == _index) {
            let _value = menuLists[i].outerHTML;
            if (_value.indexOf("●") < 0) {
                menuLists[i].classList.add("toss");
            }
        }

        if (selectOpts[i].getAttribute("data-index") == _index) {
            let _value = selectOpts[i].innerHTML;
            if (_value.indexOf("●") < 0) {
                selectOpts[i].innerHTML = _value + " ●";
            }
        }
    }
};

/**
 * 좌측 문제 목록 객체 생성 이벤트
 */
function fnMakeMenus() {
    let sideMenuList = document.getElementById("sideMenuList"),
        menuLists = document.getElementById("sideMenuList").querySelectorAll("li"),
        topSelect = document.getElementById("topSelect");
    sideMenuList.innerHTML = "";
    topSelect.innerHTML = "";
    for (var i = 0; i < _questionVM.length; i++) {
        var target = _questionVM[i];
        var template = '<li data-index="<%this.realIndex%>" class="<%if(this.isSubmited == true){%>toss<%}%>">'
            + '<span class="number"><%this.index%>.</span>'
            + '<span class="exam_tit"><%this.title%>(<b><%this.score%></b> 점)</span>'
            + '<span class="exam_type menu_<%this.type%>">'
            + '<%if (this.type == "subjective") {%> 주관식 <%}%>'
            + '<%if (this.type == "multiple") {%> 객관식 <%}%>'
            + '<%if (this.type == "coding") {%> 코딩 <%}%></span >'
            + '<span class="status"><%if(this.isSubmited == false){%>미<%}%>제출</span></li>';

        var newTemplate = fnTemplateEngine(template, {
            realIndex: target.index,
            index: eval(target.index + 1),
            title: target.title,
            score: target.score,
            type: target.type,
            isSubmited: target.isSubmited
        });
        sideMenuList.innerHTML = sideMenuList.innerHTML + newTemplate;

        var optTemplate = '<option data-index="<%this.realIndex%>">문제 <%this.index%>. <%this.title%><%if(this.isSubmited == true){%> ●<%}%></option>';
        var newOptTemplate = fnTemplateEngine(optTemplate, {
            realIndex: target.index,
            index: eval(target.index + 1),
            title: target.title,
            isSubmited: target.isSubmited
        });
        topSelect.innerHTML = topSelect.innerHTML + newOptTemplate;
    }

    for (let i = 0; i < menuLists.length; i++) {
        menuLists[i].onclick = function () {
            leftTreeExitA.click();
            fnChangeVM(Number(this.getAttribute("data-index")));
        };
    }

    topSelect.onchange = function () {
        var selectedIndex = Number(this.querySelector("option:checked").getAttribute("data-index"));
        fnChangeVM(selectedIndex);
    };
}

function fnToggleLoaderBox() {
    var loaderBox = document.getElementById("loaderBox");
    if (loaderBox.style.display == "none")
        loaderBox.style.display = "block";
    else
        loaderBox.style.display = "none";
}

/**
 * 시험 시간 타이머
 * duration: 할당할 시간
 * $element: 타이머를 표현할 선택자
 * finishCallback: 타이머 시간 종료시 이벤트
 */
var startExamTimer = function ($element, duration, finishCallback) {
    var timer = 1000 * 60 * Number(duration);
    timerInterval();
    function timerInterval() {
        var seconds = parseInt((timer / 1000) % 60),
            minutes = parseInt((timer / (1000 * 60)) % 60),
            hours = parseInt((timer / (1000 * 60 * 60)) % 24);
        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;
        $element.innerHTML = hours + ":" + minutes + ":" + seconds;
        timer = timer - 100;
        if (timer == 1000 * 60 * 10) {
            AlertModal("시험 종료까지 10분 남았습니다", false);
        } else if (timer == 1000 * 60 * 5) {
            AlertModal("시험 종료까지 5분 남았습니다", false);
        } else if (timer == 1000 * 60 * 3) {
            AlertModal("시험 종료까지 3분 남았습니다", false);
        } else if (timer == 1000 * 60 * 1) {
            AlertModal("시험 종료까지 1분 남았습니다", false);
        }
        if (timer <= duration) {
            clearInterval(timerId);
            if (finishCallback)
                finishCallback();
        }
    }
    var timerId = setInterval(timerInterval, 100);
    return timerId;
};

// DateTime Format 바꾸기
Date.prototype.format = function (f) {
    if (!this.valueOf()) return " ";

    var weekName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    var d = this;
    let h = 0;

    return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p)/gi, function ($1) {
        switch ($1) {
            case "yyyy": return d.getFullYear();
            case "yy": return (d.getFullYear() % 1000).zf(2);
            case "MM": return (d.getMonth() + 1).zf(2);
            case "dd": return d.getDate().zf(2);
            case "E": return weekName[d.getDay()];
            case "HH": return d.getHours().zf(2);
            case "hh": return ((h = d.getHours() % 12) ? h : 12).zf(2);
            case "mm": return d.getMinutes().zf(2);
            case "ss": return d.getSeconds().zf(2);
            case "a/p": return d.getHours() < 12 ? "오전" : "오후";
            default: return $1;
        }
    });
};