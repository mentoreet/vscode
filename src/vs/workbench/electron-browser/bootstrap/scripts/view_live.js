//....... 머해야하지.... 문제 선택시.... 아.....

// Publish Javascript ----------------------------------------------------------------------------
let leftTreeExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type"),
    leftTreeExitA = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:first-of-type a"),
    sideMenuList = document.getElementById("side_menu_cont"),
    sideMenuClicker = document.getElementById("side_menu_cont").querySelector("div > a"),
    btnExit = document.getElementsByClassName("view_left_menu")[0].querySelector("ul li:last-of-type");
leftTreeExit.onpointerenter = function () {
    this.querySelector(".balloon").classList.add("m_on");
}
leftTreeExit.onpointerleave = function () {
    this.querySelector(".balloon").classList.remove("m_on");
}
leftTreeExitA.onclick = function () {
    if (sideMenuList.classList.contains("open")) {
        sideMenuList.style.left = "50px";
        sideMenuList.style.zIndex = 9999;
        sideMenuList.classList.remove("open");
    } else {
        sideMenuList.style.left = "-450px";
        sideMenuList.style.zIndex = 3;
        sideMenuList.classList.add("open");
    }
}
sideMenuClicker.onclick = function () {
    sideMenuList.classList.add("open");
    sideMenuList.style.left = "-450px";
}
btnExit.onclick = function () {
    if (!confirm("정말로 시험을 포기하시겠습니까?")) {
        fnCompleteExam("exit");
    }
}

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
}
// ---------------------------------------------------------------------------- Publish Javascript


let selectorTimer = document.getElementById("examTimer"),
    examTitle = document.getElementById("txtExamTitle"),
    submittedQuestionCnt = document.getElementById("submittedQuestionCnt"),
    totalQuestionCnt = document.getElementsByClassName("totalQuestionCnt"),
    startLimitTime = document.getElementById("startLimitTime"),
    startStartDate = document.getElementById("startStartDate"),
    startEndDate = document.getElementById("startEndDate");
// 페이지 초기 로딩시 발생 이벤트. "시험 응시하기" 버튼을 누르지 전일 경우도 포함.
window.onload = function () {
    // 시험 제목, 시험 시간, 제출한 시험 문제 수, 총 시험 문제 수
    examTitle.innerHTML = "";
    selectorTimer.innerHTML = "";
    submittedQuestionCnt.innerHTML = "";
    totalQuestionCnt.innerHTML = "";
    // 시험 제한 시간(분 단위), 시험 응시 시작 일자, 시험 응시 종료 일자
    startLimitTime.innerHTML = "";
    startStartDate.innerHTML = "";
    startEndDate.innerHTML = "";
}

let btnStartExam = document.getElementById("getStart").querySelector(".start_btn button"),
    btnCodingInOut = document.getElementById("btnCodingInOut"),
    btnMultipleSubmit = document.getElementById("btnMultipleSubmit"),
    btnSubjectiveSubmit = document.getElementById("btnSubjectiveSubmit"),
    btnCodingSubmit = document.getElementById("btnCodingSubmit");

// 초기 화면, "시험 응시하기" 버튼 클릭시 이벤트
btnStartExam.onclick = function () {
    fnFadeInOut("getStart");
    AlertModal("지금부터 시험을 시작합니다.");
    startExamTimer(selectorTimer, 0.5, function () {
        // 시간이 지났을 때 이벤트
        fnCompleteExam("timeout");
    });
}

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
    console.log(codingInOuts);
}

var fnTemplateEngine = function (html, options) {
    var re = /<%([^%>]+)?%>/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];\n', cursor = 0, match;
    var add = function (line, js) {
        js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
            (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
        return add;
    }
    while (match = re.exec(html)) {
        add(html.slice(cursor, match.index))(match[1], true);
        cursor = match.index + match[0].length;
    }
    add(html.substr(cursor, html.length - cursor));
    code += 'return r.join("");';
    return new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
}

// 객관식 문제, "답안 제출" 버튼 클릭시 이벤트
btnMultipleSubmit.onclick = function () {
}

// 주관식 문제, "답안 제출" 버튼 클릭시 이벤트
btnSubjectiveSubmit.onclick = function () {
}

// 코딩 문제, "답안 제출" 버튼 클릭시 이벤트
btnCodingSubmit.onclick = function () {
}

var _selectedVM = null;

var fnFillQuestion = function (questionId) {
    // 공통 선택자
    let currentQuestionIndex = document.getElementsByClassName("currentQuestionIndex");

    // 객관식 문제 선택자 
    let multiTitle = document.getElementById("multiple_title"),
        multiScore = document.getElementById("multiple_score"),
        multiDesc = document.getElementById("multiple_description"),
        multiExample1 = document.getElementById("multiple1"),
        multiExample2 = document.getElementById("multiple2"),
        multiExample3 = document.getElementById("multiple3"),
        multiExample4 = document.getElementById("multiple4");
    // 주관식 문제 선택자
    let subTitle = document.getElementById("subjective_title"),
        subScore = document.getElementById("subjective_score"),
        subDesc = document.getElementById("subjective_description");

    let codingTitle = document.getElementById("coding_title"),
        codingScore = document.getElementById("coding_score"),
        codingDesc = document.getElementById("coding_description");




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
}

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
    /*
    $("#loaderBox").show();
    var obj = new Object();
    obj.LessonId = 0;
    $.ajax({
        type: "post",
        url: "https://www.moducoding.com/Exam/Complete",
        data: JSON.stringify(obj),
        timeout: 60 * 1000 * 30,
        contentType: 'application/json; charset=utf-8',
        error: function (response) {
            AlertModal("데이터 전송중 오류가 발생했습니다", false);
        },
        success: function (response) {
            // 부모창을 리로딩 시킨다.
            window.opener.window.location.reload();
            setTimeout(function () {
                window.close();
            }, 5000);
        }
    });
    */
}
