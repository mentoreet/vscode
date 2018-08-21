const electron = require('electron');
const ipc = electron.ipcRenderer;

let btnSome = getElem("btnSome");
btnSome.onclick = function () {
	ipc.send('control-someaction');
};
let txtFocused = getElem("txtFocused");

ipc.on("control-someaction-reply", (evt, args) => {
	let str = '';
	for(var i=0; i<args.length; i++)
	{
		str += args[i] + ', ';
	}
	alert(`어쩌고 저쩌고! , ${str}`);
});

ipc.on("vscode-focused-out", () => {
	txtFocused.innerHTML = '포커스 아웃 감지!';
});
ipc.on("vscode-focused-in", () => {
	txtFocused.innerHTML = '포커스 인 감지!';
});

let cmdLeftTop = getElem("cmdLeftTop");
cmdLeftTop.onclick = function () {
	ipc.send("command-controlwindow-lefttop");
};
let cmdLeftBottom = getElem("cmdLeftBottom");
cmdLeftBottom.onclick = function () {
	ipc.send("command-controlwindow-leftbottom");
};
let cmdRightTop = getElem("cmdRightTop");
cmdRightTop.onclick = function () {
	ipc.send("command-controlwindow-righttop");
};
let cmdRightBottom = getElem("cmdRightBottom");
cmdRightBottom.onclick = function () {
	ipc.send("command-controlwindow-rightbottom");
};

let recentLecturesCount = 1;
if(recentLecturesCount < 1) {
	let elems = getElemByClass("right_content");
	for(var i=0; i<elems.length; i++) {
		elems[i].setAttribute("style","height: 1px;");
	}

	let divNoRecentLectures = getElem("divNoRecentLectures");
	show(divNoRecentLectures);
}
else {
	let divRecentLectures = getElem("divRecentLectures");
	show(divRecentLectures);
}

let lblUsername = getElem("lblUsername");
let lblEmail = getElem("lblEmail");
lblUsername.innerHTML ="어쩌고 저쩌고";
lblEmail.innerHTML ="netscout82@naver.com";

let isExpert = true;
if(isExpert) {
	let divExpertSetting = getElem("divExpertSetting");
	show(divExpertSetting);
}

let sampleData = {
	"TotalLessonCnt": 454,
	"TotalMemberLessonCnt": 165,
	"TotalLectureCnt": 25,
	"NewAlarm": 1,
	"UnreadAlarm": 18,
	"TotalAlarm": 185,
	"EndOfDurationLectures": [{
		"LectureStudentId": 297,
		"LectureId": 184,
		"MemberId": 2074,
		"IsApproved": true,
		"CreateDate":"2018-07-05T20:19:11.22",
		"ModifyDate":"2018-07-05T11:19:11.87",
		"StartDate": null,
		"EndDate":"2018-06-29T00:00:00",
		"RecentDate":"0001-01-01T00:00:00",
		"Title":"React JS의 이론 학습",
		"Description":"<p>리액트의 기초를 배우는 강좌 입니다.전문가 영역으로 강좌 수강전 반드시 자신의 실력을 확인하고 수강하세요~ < /p>",
		"OwnerMemberId": 2992,
		"IsNewIcon": true,
		"Tags":"데이터 베이스,mysql",
		"RecommendCount": 0,
		"ThumbnailUrl":"https:/ / modustorage.blob.core.windows.net / image / 950e e589 - 4 c0 - 4 bfc - b1cc - 69 a523322e1e___ReactJS.png",
		"Price": 0.0,
		"IsSale": false,
		"SalePrice": 0.0,
		"Lecturer":"테스트 채널장",
		"Difficulty":"고급",
		"TeachingMaterial":"자체강의 교재",
		"Weeks": 0,
		"SimpleDescription":"리액트의 기초를 배우는 강좌 입니다.",
		"DurationDay": 0,
		"Category": 2,
		"State": 3,
		"AlwaysOpen": 0,
		"LessonCnt": 2,
		"MemberLessonCnt": 0,
		"TotalAVGLessonCnt": 1.0,
		"LastLessonId": null,
		"LessonModifyDate": null
	}],
	"InProgressLectures": [{
		"LectureStudentId": 297,
		"LectureId": 184,
		"MemberId": 2074,
		"IsApproved": true,
		"CreateDate":"2018-07-05T20:19:11.22",
		"ModifyDate":"2018-07-05T11:19:11.87",
		"StartDate": null,
		"EndDate":"2018-06-29T00:00:00",
		"RecentDate":"0001-01-01T00:00:00",
		"Title":"React JS의 이론 학습",
		"Description":"<p>리액트의 기초를 배우는 강좌 입니다.전문가 영역으로 강좌 수강전 반드시 자신의 실력을 확인하고 수강하세요~ < /p>",
		"OwnerMemberId": 2992,
		"IsNewIcon": true,
		"Tags":"데이터 베이스,mysql",
		"RecommendCount": 0,
		"ThumbnailUrl":"https:/ / modustorage.blob.core.windows.net / image / 950e e589 - 4 c0 - 4 bfc - b1cc - 69 a523322e1e___ReactJS.png",
		"Price": 0.0,
		"IsSale": false,
		"SalePrice": 0.0,
		"Lecturer":"테스트 채널장",
		"Difficulty":"고급",
		"TeachingMaterial":"자체강의 교재",
		"Weeks": 0,
		"SimpleDescription":"리액트의 기초를 배우는 강좌 입니다.",
		"DurationDay": 0,
		"Category": 2,
		"State": 3,
		"AlwaysOpen": 0,
		"LessonCnt": 2,
		"MemberLessonCnt": 0,
		"TotalAVGLessonCnt": 1.0,
		"LastLessonId": null,
		"LessonModifyDate": null
	}, {
		"LectureStudentId": 297,
		"LectureId": 184,
		"MemberId": 2074,
		"IsApproved": true,
		"CreateDate":"2018-07-05T20:19:11.22",
		"ModifyDate":"2018-07-05T11:19:11.87",
		"StartDate": null,
		"EndDate":"2018-06-29T00:00:00",
		"RecentDate":"0001-01-01T00:00:00",
		"Title":"React JS의 이론 학습",
		"Description":"<p>리액트의 기초를 배우는 강좌 입니다.전문가 영역으로 강좌 수강전 반드시 자신의 실력을 확인하고 수강하세요~ < /p>",
		"OwnerMemberId": 2992,
		"IsNewIcon": true,
		"Tags":"데이터 베이스,mysql",
		"RecommendCount": 0,
		"ThumbnailUrl":"https:/ / modustorage.blob.core.windows.net / image / 950e e589 - 4 c0 - 4 bfc - b1cc - 69 a523322e1e___ReactJS.png",
		"Price": 0.0,
		"IsSale": false,
		"SalePrice": 0.0,
		"Lecturer":"테스트 채널장",
		"Difficulty":"고급",
		"TeachingMaterial":"자체강의 교재",
		"Weeks": 0,
		"SimpleDescription":"리액트의 기초를 배우는 강좌 입니다.",
		"DurationDay": 0,
		"Category": 2,
		"State": 3,
		"AlwaysOpen": 0,
		"LessonCnt": 2,
		"MemberLessonCnt": 0,
		"TotalAVGLessonCnt": 1.0,
		"LastLessonId": null,
		"LessonModifyDate": null
	}],
	"NotApprovedLectures": [],
	"RecentLectures": [{
		"LectureStudentId": 297,
		"LectureId": 184,
		"MemberId": 2074,
		"IsApproved": true,
		"CreateDate":"2018-07-05T20:19:11.22",
		"ModifyDate":"2018-07-05T11:19:11.87",
		"StartDate": null,
		"EndDate":"2018-06-29T00:00:00",
		"RecentDate":"0001-01-01T00:00:00",
		"Title":"React JS의 이론 학습",
		"Description":"<p>리액트의 기초를 배우는 강좌 입니다.전문가 영역으로 강좌 수강전 반드시 자신의 실력을 확인하고 수강하세요~ < /p>",
		"OwnerMemberId": 2992,
		"IsNewIcon": true,
		"Tags":"데이터 베이스,mysql",
		"RecommendCount": 0,
		"ThumbnailUrl":"https:/ / modustorage.blob.core.windows.net / image / 950e e589 - 4 c0 - 4 bfc - b1cc - 69 a523322e1e___ReactJS.png",
		"Price": 0.0,
		"IsSale": false,
		"SalePrice": 0.0,
		"Lecturer":"테스트 채널장",
		"Difficulty":"고급",
		"TeachingMaterial":"자체강의 교재",
		"Weeks": 0,
		"SimpleDescription":"리액트의 기초를 배우는 강좌 입니다.",
		"DurationDay": 0,
		"Category": 2,
		"State": 3,
		"AlwaysOpen": 0,
		"LessonCnt": 2,
		"MemberLessonCnt": 0,
		"TotalAVGLessonCnt": 1.0,
		"LastLessonId": null,
		"LessonModifyDate": null
	}, {
		"LectureStudentId": 297,
		"LectureId": 184,
		"MemberId": 2074,
		"IsApproved": true,
		"CreateDate":"2018-07-05T20:19:11.22",
		"ModifyDate":"2018-07-05T11:19:11.87",
		"StartDate": null,
		"EndDate":"2018-06-29T00:00:00",
		"RecentDate":"0001-01-01T00:00:00",
		"Title":"React JS의 이론 학습",
		"Description":"<p>리액트의 기초를 배우는 강좌 입니다.전문가 영역으로 강좌 수강전 반드시 자신의 실력을 확인하고 수강하세요~ < /p>",
		"OwnerMemberId": 2992,
		"IsNewIcon": true,
		"Tags":"데이터 베이스,mysql",
		"RecommendCount": 0,
		"ThumbnailUrl":"https:/ / modustorage.blob.core.windows.net / image / 950e e589 - 4 c0 - 4 bfc - b1cc - 69 a523322e1e___ReactJS.png",
		"Price": 0.0,
		"IsSale": false,
		"SalePrice": 0.0,
		"Lecturer":"테스트 채널장",
		"Difficulty":"고급",
		"TeachingMaterial":"자체강의 교재",
		"Weeks": 0,
		"SimpleDescription":"리액트의 기초를 배우는 강좌 입니다.",
		"DurationDay": 0,
		"Category": 2,
		"State": 3,
		"AlwaysOpen": 0,
		"LessonCnt": 2,
		"MemberLessonCnt": 0,
		"TotalAVGLessonCnt": 1.0,
		"LastLessonId": null,
		"LessonModifyDate": null
	}]
};

function recentLecturesTemplate(item){
	let leftDay = "--";
	if(item.AlwaysOpen === 1)
	{
		leftDay = "∞";
	}
	else if(item.EndDate !== null && item.AlwaysOpen === 0)
	{
		// var endDate = item.EndDate;
		// dayCalculate = endDate.Subtract(DateTime.Now);
		// if (dayCalculate < DateTime.Now.TimeOfDay)
		// {
		// 	leftDay ="--";
		// }
		// else
		// {
		// 	leftDay = DateTime.Now.Subtract(endDate).ToString("dd") +" 일";
		// }
	}

	return `<tr>
	<td>${new Date(item.CreateDate).yyyymmdd()}</td>
	${item.Category === 3 ?
		`<td><a href="/live/@item.LectureId">${item.Title}</a></td>` :
		`<td><a href="/Vod/@item.LectureId">${item.Title}</a></td>`
	}
	<td class="idx_pro_bar">
		<span>나</span>
		<div class="ui aqua progress studentProgress privateProgress" data-value="${Math.trunc(item.StudentProgress)}" data-one="${item.MemberLessonCnt}" data-two="${item.LessonCnt}" data-total="100">
			<div class="bar">
				<div class="progress"></div>
			</div>
		</div>
		<div class="label"><span class="t-black">${item.MemberLessonCnt}</span> / ${item.LessonCnt}</div>
		<br />
		<span>평균</span>
		<div class="ui aqua avg progress studentProgress" data-value="${Math.trunc(item.AverageProgress)}" data-total="100">
			<div class="bar">
				<div class="progress"></div>
			</div>
		</div>
		<div class="label"><span class="t-black">${Math.floor(item.TotalAVGLessonCnt)}</span> / ${item.LessonCnt}</div>
	</td>
	${leftDay ==="--" ?
		`<td>기한 만료</td><td>-</td>` :
		`<td class="count_down">${leftDay}</td>`
	}
	${(item.Category !== 3) ?
		`${item.LastLessonId === null ?
			`<td><a href="/Vod/${item.LectureId}" class="continue">이어서하기</a></td>` :
			`<td><a href="/Vod/${item.LectureId}/Lesson/${item.LastLessonId}" class="continue">이어서하기</a></td>`
		}` :
		`${item.LastLessonId === null ?//else
			`<td><a href="/live/${item.LectureId}" class="continue">이어서하기</a></td>` :
			`<td><a href="/live/${item.LectureId}/Lesson/${item.LastLessonId}" class="continue">이어서하기</a></td>`
		}`
	}
	</tr>`;
 }

 function renderData(data)
{
	let txtInProgressLecturesCount = getElem("txtInProgressLecturesCount");
	let txtEndOfDurationLecturesCount = getElem("txtEndOfDurationLecturesCount");
	let txtNotApprovedLecturesCount = getElem("txtNotApprovedLecturesCount");

	let progressBar = getElem("progressBar");
	let txtProgressVal = getElem("txtProgressVal");

	let txtWholeLessonCount = getElem("txtWholeLessonCount");
	let txtEndOfDurationLecturesCount2 = getElem("txtEndOfDurationLecturesCount2");

	let txtNewAlarmCount = getElem("txtNewAlarmCount");
	let txtUnreadAlarmCount = getElem("txtUnreadAlarmCount");
	let txtTotalAlarmCount = getElem("txtTotalAlarmCount");

	txtInProgressLecturesCount.innerHTML = data.InProgressLectures.length;
	txtEndOfDurationLecturesCount.innerHTML = data.EndOfDurationLectures.length;
	txtNotApprovedLecturesCount.innerHTML = data.NotApprovedLectures.length;

	let wholeLesson = data.EndOfDurationLectures.length +
	data.InProgressLectures.length;
	let progressVal = Math.trunc((data.EndOfDurationLectures.length / wholeLesson) * 100);
	let styleStr = `${progressVal > 50 ? "over50" : ""} p${progressVal}`;
	progressBar.style.cssText = styleStr;
	progressBar.dataset.progress = progressVal;
	txtProgressVal.innerHTML = `${progressVal}%`;

	txtWholeLessonCount.innerHTML = wholeLesson;
	txtEndOfDurationLecturesCount2.innerHTML = data.EndOfDurationLectures.length;

	txtNewAlarmCount.innerHTML = data.NewAlarm;
	txtUnreadAlarmCount.innerHTML = data.UnreadAlarm;
	txtTotalAlarmCount.innerHTML = data.TotalAlarm;

	let templateString ="";

	data.RecentLectures.forEach(function(item) {
		templateString += recentLecturesTemplate(item);
	});

	let tbodyRecentLectures = getElem('tbodyRecentLectures');
	tbodyRecentLectures.innerHTML = templateString;
}

sendPost('http://localhost:3000/login',
	{"MemberId" : 1},
	function (result) { //성공시
		if (result.length > 0) {
			renderData(result);
		}
		else {
			//실패시 처리.
		}
	},
	function () { //실패시

});

renderData(sampleData);