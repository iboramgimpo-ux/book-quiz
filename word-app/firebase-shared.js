// ============================================================
// firebase-shared.js
// 그림 단어장 - 학생 정보 연동 공용 스크립트
//
// 기존에 운영 중인 학생/가족 관리 사이트(index.html)와 같은 Firebase
// 프로젝트(같은 Firestore "students" 컬렉션)를 그대로 바라봅니다.
// 그래서 그 사이트에 등록된 학생 정보가 여기서도 그대로 조회됩니다.
//
// ⚠ 만약 학생 데이터가 다른 Firebase 프로젝트에 있다면,
//   아래 firebaseConfig 값을 그 프로젝트 설정 값으로 바꿔주세요.
//   (기존 사이트의 소스코드 안에서 "firebaseConfig" 를 검색하면 찾을 수 있어요)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCPa5LJHQV-nm4F3djEL1481htlJlrE0hU",
  authDomain: "book-quiz-5cfec.firebaseapp.com",
  projectId: "book-quiz-5cfec",
  storageBucket: "book-quiz-5cfec.firebasestorage.app",
  messagingSenderId: "352729909403",
  appId: "1:352729909403:web:8cbc1b592995bc2fe91e3e",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const GRADES = ['4세','5세','6세','7세','초1','초2','초3','초4','초5','초6','중1','중2','중3','고등이상'];

// 입학 당시 학년 + 입학일 기준으로 "현재" 학년을 계산합니다 (기존 사이트와 동일 로직).
function calcCurrentGrade(joinGrade, joinDateStr) {
  if (!joinGrade || joinGrade === '고등이상') return joinGrade || '-';
  if (!joinDateStr) return joinGrade;
  const joinDate = new Date(joinDateStr);
  const now = new Date();
  const yearsPassed = now.getFullYear() - joinDate.getFullYear();
  const gradeIdx = GRADES.indexOf(joinGrade);
  if (gradeIdx === -1) return joinGrade;
  const newIdx = Math.min(gradeIdx + yearsPassed, GRADES.length - 1);
  return GRADES[newIdx];
}
