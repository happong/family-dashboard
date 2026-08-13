// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcNmjEguHoCH_ltxwfObYNNs8A3D1dYQw",
  authDomain: "family-dashboard-5cf14.firebaseapp.com",
  projectId: "family-dashboard-5cf14",
  storageBucket: "family-dashboard-5cf14.firebasestorage.app",
  messagingSenderId: "543109371218",
  appId: "1:543109371218:web:789a2dd557067badf9d68b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};

// 접속을 허용할 가족 구성원의 Google 계정 이메일
const ALLOWED_EMAILS = [
   "eun1009sin@gmail.com",
  // "example1@gmail.com",
  // "example2@gmail.com",
];
