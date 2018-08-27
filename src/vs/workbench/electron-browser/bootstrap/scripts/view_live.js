const electron = require('electron');
const {app} = require('electron').remote;
const path = require('path');
const ipc = electron.ipcRenderer;
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');

var lectureId = 0;
var lessonId = 0;
var token = '';

// Publish Javascript ----------------------------------------------------------------------------
let leftTreeExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type"),
    leftTreeExitA = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:first-of-type a"),
    sideMenuBox = document.getElementById("side_menu_cont"),
    sideMenuClicker = document.getElementById("side_menu_cont").querySelector("div > a"),
    btnExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type"),
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
    let rootDir = path.join(app.getPath('appData'),'moducoding');
    let downloadDir = path.join(app.getPath('appData'),'moducoding','download');

    if (!fs.existsSync(rootDir)){
        fs.mkdirSync(rootDir);
    }

    if (!fs.existsSync(downloadDir)){
        fs.mkdirSync(downloadDir);
    }

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
    lectureId = args.lectureId;
    lessonId = args.lessonId;
    token = args.token;
});

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

        //여기서 다시 화면을 이전 화면으로 옮기기...
        ipc.send("command-back-to-dashboard");
    }
};

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
        modal.style.right = "-500px";
    }, time);
    else setTimeout(function () { modal.style.right = "-500px"; }, 1500);
};
// ---------------------------------------------------------------------------- Publish Javascript

//전역 변수 ----------------------------------------------------------------------------
/**
 * 전체 문제 Array, 초기 시험을 시작할 때 서버와의 통신으로 데이터를 저장.
 */
var _questionVM = null;
/**
 * 사용할 문제 Object
 * _questionVM에서 가져온다.
 */
var _selectedVM = null;
/**
 * 현재 사용중인 _selectedVM의 기본 _questionVM 절대값.
 */
var currentIndex = null;


let selectorTimer = document.getElementById("examTimer"),
    submittedQuestionCnt = document.getElementById("submittedQuestionCnt"),
    currentQuestionIndex = document.getElementsByClassName("currentQuestionIndex"),
    totalQuestionIndex = document.getElementsByClassName("totalQuestionIndex");
// ---------------------------------------------------------------------------- 전역 변수

// 페이지 초기 로딩시 발생 이벤트. "시험 응시하기" 버튼을 누르지 전일 경우도 포함.
window.onload = function () {
    // 시험 제목, 시험 시간, 제출한 시험 문제 수, 총 시험 문제 수
    document.getElementById("txtExamTitle").innerHTML = "";
    // 시험 제한 시간(분 단위), 시험 응시 시작 일자, 시험 응시 종료 일자
    document.getElementById("startLimitTime").innerHTML = "";
    document.getElementById("startStartDate").innerHTML = "";
    document.getElementById("startEndDate").innerHTML = "";
    // 상단 타이머, 제출한 문제 수, 현재 문제 수
    selectorTimer.innerHTML = "0";
    submittedQuestionCnt.innerHTML = "0";
    currentQuestionIndex.innerHTML = "";
};

let btnStartExam = document.getElementById("getStart").querySelector(".start_btn button"),
    btnCodingInOut = document.getElementById("btnCodingInOut"),
    btnMultipleSubmit = document.getElementById("btnMultipleSubmit"),
    btnSubjectiveSubmit = document.getElementById("btnSubjectiveSubmit"),
    btnCodingSubmit = document.getElementById("btnCodingSubmit"),
    btnExamFinish = document.getElementById("btnExamFinish");

// 초기 화면, "시험 응시하기" 버튼 클릭시 이벤트
btnStartExam.onclick = function () {
    fnFadeInOut("getStart");
    AlertModal("지금부터 시험을 시작합니다.");
    fnGetExam();

    startExamTimer(selectorTimer, 30, function () {
        // 시간이 지났을 때 이벤트
        fnCompleteExam("timeout");
    });
};

let codingInOuts = document.getElementsByClassName("code_answer")[0];
// 코딩 문제의 "입출력 예시 보기" 버튼 클릭시 이벤트
btnCodingInOut.onclick = function () {
    var inOutLength = 1;
    for (var i = 0; i < inOutLength; i++) {
        var template = '<p class="tit">입력</p><div class="input_box"><p class="input_cont" id="coding_input"><%this.inputTxt%></p></div><p class="tit">출력</p><div class="output_box"><p class="output_cont" id="coding_output"><%this.outputTxt%></p></div>';
        var newTemplate = fnTemplateEngine(template, {
            inputTxt: "입력 내용",
            outputTxt: "출력 내용"
        });
        codingInOuts.innerHTML = codingInOuts.innerHTML + newTemplate;
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
        multiDesc = document.getElementById("multiple_description")
    // 주관식 문제 선택자
    let subWrap = document.getElementsByClassName("write")[0],
        subTitle = document.getElementById("subjective_title"),
        subScore = document.getElementById("subjective_score"),
        subDesc = document.getElementById("subjective_description"),
        subAnswer = document.getElementById("txtSubjectiveAnswer");
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

    var target = _selectedVM;
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
    if(_index === 2) {
        downloadAttachedZipFile('https://modustorage.blob.core.windows.net/projects/201ef9b5-1cc2-468c-8a85-9659642c9be4.zip');
    }
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
        answer = txtSubjectiveAnswer.value;

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
        sendPost("http://localhost:5070/api/Question/Submit", data,
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
    sendPost("http://localhost:5070/api/Question", data,
        function (result)
        {
            _questionVM = result.questionsVM;
            for (var i = 0; i < _questionVM.length; i++) {
                _questionVM[i].index = i;
                if (_questionVM[i].isSubmited)
                    submittedQuestionCnt.innerHTML = Number(submittedQuestionCnt.innerHTML) + 1;
            }
            fnFillQuestion(0);
            fnMakeMenus();
            totalQuestionIndex[0].innerHTML = _questionVM.length;
            totalQuestionIndex[1].innerHTML = _questionVM.length;
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
var fnGetQuestionId = function () {
    var questionId = _questionVM.find(_q => _q.index == currentIndex).questionId;
    return questionId;
};

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
    if (type == "timeout") {
        AlertModal("시험 시간이 종료되었습니다. 수고하셨습니다.", true, 5000);
    } else if (type == "exit") {
        AlertModal("현재까지 제출된 정답으로 최종 완료됩니다.", true, 5000);
    } else {
        AlertModal("최종 완료되었습니다. 수고하셨습니다.", true, 5000);
    }

};

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
            var _value = menuLists[i].outerHTML;
            if (_value.indexOf("●") < 0) {
                menuLists[i].classList.add("toss");
            }
        }

        if (selectOpts[i].getAttribute("data-index") == _index) {
            var _value = selectOpts[i].innerHTML;
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

    for (var i = 0; i < menuLists.length; i++) {
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

function sendPost(url, jsonData, success, fail) {
    fetch(url, {
        method: 'post',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(jsonData)
    }).then(res => {
        if (!res.ok) {
            throw Error(res.statusText);
        }
        return res.json();
    }).then(res => success(res))
        .catch(error => {
            fail();
        });
}

function fnToggleLoaderBox() {
    var loaderBox = document.getElementById("loaderBox");
    if (loaderBox.style.display == "none")
        loaderBox.style.display = "block";
    else
        loaderBox.style.display = "none";
}