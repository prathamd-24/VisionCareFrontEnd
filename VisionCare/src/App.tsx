import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

// TypeScript declarations for MediaPipe globals
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
    cv: any;
  }
}

// Eye landmark indices (from MediaPipe documentation)
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// Extended eye region for redness detection (including sclera)
const LEFT_EYE_REGION = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_REGION = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];

// Eye Aspect Ratio function
function calcEAR(landmarks: any[], eyeIndices: number[]) {
  const p = (i: number) => landmarks[i];
  const dist = (a: number, b: number) =>
    Math.hypot(p(a).x - p(b).x, p(a).y - p(b).y);

  const A = dist(eyeIndices[1], eyeIndices[5]);
  const B = dist(eyeIndices[2], eyeIndices[4]);
  const C = dist(eyeIndices[0], eyeIndices[3]);

  return (A + B) / (2.0 * C);
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [avgBlinkRate, setAvgBlinkRate] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyesDetected, setEyesDetected] = useState(false);
  const [emotion, setEmotion] = useState("Loading...");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [leftEyeRedness, setLeftEyeRedness] = useState(0);
  const [rightEyeRedness, setRightEyeRedness] = useState(0);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const blinkStateRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const emotionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rednessIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api.js models for emotion detection
  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL = "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log("face-api.js models loaded successfully");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api.js models:", err);
        setEmotion("Error loading models");
      }
    }
    loadModels();
  }, []);

  // Wait for OpenCV.js to load
  useEffect(() => {
    const checkOpenCV = () => {
      if (window.cv && window.cv.Mat) {
        console.log("OpenCV.js is ready");
        setOpencvLoaded(true);
      } else {
        setTimeout(checkOpenCV, 100);
      }
    };
    checkOpenCV();
  }, []);

  // Emotion detection interval (every 300ms)
  useEffect(() => {
    if (!modelsLoaded) return;

    emotionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;

      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detections && detections.expressions) {
          const sorted = Object.entries(detections.expressions).sort(
            (a, b) => b[1] - a[1]
          );
          const [emotionName, confidence] = sorted[0];
          setEmotion(`${emotionName} (${(confidence * 100).toFixed(1)}%)`);
        }
      } catch (err) {
        console.error("Emotion detection error:", err);
      }
    }, 300);

    return () => {
      if (emotionIntervalRef.current) {
        clearInterval(emotionIntervalRef.current);
      }
    };
  }, [modelsLoaded]);

  // Eye redness detection function
  const detectEyeRedness = (videoElement: HTMLVideoElement, landmarks: any[], eyeRegion: number[]) => {
    if (!window.cv || !opencvLoaded) return 0;

    try {
      const cv = window.cv;
      
      // Get eye region bounding box
      const eyePoints = eyeRegion.map(idx => landmarks[idx]);
      const xs = eyePoints.map(p => p.x * videoElement.videoWidth);
      const ys = eyePoints.map(p => p.y * videoElement.videoHeight);
      
      const minX = Math.max(0, Math.floor(Math.min(...xs)) - 5);
      const maxX = Math.min(videoElement.videoWidth, Math.ceil(Math.max(...xs)) + 5);
      const minY = Math.max(0, Math.floor(Math.min(...ys)) - 5);
      const maxY = Math.min(videoElement.videoHeight, Math.ceil(Math.max(...ys)) + 5);
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      if (width <= 0 || height <= 0) return 0;

      // Create canvas to extract eye region
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return 0;
      
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(minX, minY, width, height);
      
      // Convert to OpenCV Mat
      const src = cv.matFromImageData(imageData);
      const hsv = new cv.Mat();
      
      // Convert BGR to HSV
      cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
      cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
      
      // Define red color ranges in HSV
      const lower1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 70, 50, 0]);
      const upper1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [10, 255, 255, 255]);
      const lower2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [170, 70, 50, 0]);
      const upper2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, 255, 255]);
      
      const mask1 = new cv.Mat();
      const mask2 = new cv.Mat();
      const mask = new cv.Mat();
      
      // Create masks for red ranges
      cv.inRange(hsv, lower1, upper1, mask1);
      cv.inRange(hsv, lower2, upper2, mask2);
      cv.bitwise_or(mask1, mask2, mask);
      
      // Calculate red pixel percentage
      const redPixels = cv.countNonZero(mask);
      const totalPixels = width * height;
      const rednessPercent = (redPixels / totalPixels) * 100;
      
      // Cleanup
      src.delete();
      hsv.delete();
      lower1.delete();
      upper1.delete();
      lower2.delete();
      upper2.delete();
      mask1.delete();
      mask2.delete();
      mask.delete();
      
      return rednessPercent;
    } catch (err) {
      console.error("Eye redness detection error:", err);
      return 0;
    }
  };

  // Eye redness detection interval (every 200ms)
  useEffect(() => {
    if (!opencvLoaded) return;

    rednessIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !eyesDetected) return;

      // Get current landmarks from the last MediaPipe result
      const canvas = canvasRef.current;
      if (!canvas) return;

      // We'll update redness in the MediaPipe callback instead
    }, 200);

    return () => {
      if (rednessIntervalRef.current) {
        clearInterval(rednessIntervalRef.current);
      }
    };
  }, [opencvLoaded, eyesDetected]);

  useEffect(() => {
    let camera: any | null = null;

    const initCamera = async () => {
      try {
        // Wait for MediaPipe libraries to load
        if (typeof window.FaceMesh === "undefined" || typeof window.Camera === "undefined") {
          setTimeout(initCamera, 100);
          return;
        }

        // Define face mesh instance
        const faceMesh = new window.FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // Called every frame with detected results
        faceMesh.onResults((results: any) => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            setEyesDetected(false);
            return;
          }

          const landmarks = results.multiFaceLandmarks[0];
          setEyesDetected(true);

          // Draw face mesh
          ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
          ctx.lineWidth = 1;
          for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 1, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
            ctx.fill();
          }

          // Highlight eyes
          const drawEye = (eyeIndices: number[], color: string) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < eyeIndices.length; i++) {
              const point = landmarks[eyeIndices[i]];
              if (i === 0) {
                ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
              } else {
                ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
              }
            }
            ctx.closePath();
            ctx.stroke();
          };

          drawEye(LEFT_EYE, "#00ff00");
          drawEye(RIGHT_EYE, "#00ff00");

          // Eye redness detection (every few frames for performance)
          if (opencvLoaded && videoRef.current && Math.random() < 0.2) {
            const leftRedness = detectEyeRedness(videoRef.current, landmarks, LEFT_EYE_REGION);
            const rightRedness = detectEyeRedness(videoRef.current, landmarks, RIGHT_EYE_REGION);
            setLeftEyeRedness(leftRedness);
            setRightEyeRedness(rightRedness);
          }

          // Blink detection
          const leftEAR = calcEAR(landmarks, LEFT_EYE);
          const rightEAR = calcEAR(landmarks, RIGHT_EYE);
          const avgEAR = (leftEAR + rightEAR) / 2.0;

          if (avgEAR < 0.21 && !blinkStateRef.current) {
            setBlinkCount((prev) => {
              const newCount = prev + 1;
              const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
              setAvgBlinkRate(elapsedMinutes > 0 ? newCount / elapsedMinutes : 0);
              return newCount;
            });
            setIsBlinking(true);
            blinkStateRef.current = true;
          } else if (avgEAR >= 0.21) {
            setIsBlinking(false);
            blinkStateRef.current = false;
          }
        });

        // Setup webcam
        if (videoRef.current) {
          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                await faceMesh.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          camera.start();
        }
      } catch (err) {
        console.error("Camera initialization error:", err);
      }
    };

    initCamera();

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title">👁️ VisionCare - Eye Health Monitor</h1>
        <p className="subtitle">AI-powered blink detection, emotion recognition & eye redness analysis</p>
      </div>

      <div className="main-content">
        <div className="video-container">
          <video
            ref={videoRef}
            style={{ display: "none" }}
            autoPlay
            playsInline
            muted
            width="640"
            height="480"
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="video-canvas"
          />
          {eyesDetected && (
            <div className="eyes-detected-badge">
              <span className="badge-icon">✓</span>
              <span>Eyes Detected</span>
            </div>
          )}
        </div>

        <div className="dashboard">
          <div className="dashboard-card">
            <div className="card-icon">👁️</div>
            <div className="card-content">
              <h3 className="card-label">Total Blinks</h3>
              <p className="card-value">{blinkCount}</p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3 className="card-label">Avg Blink Rate</h3>
              <p className="card-value">{avgBlinkRate.toFixed(1)}</p>
              <p className="card-unit">per minute</p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">👀</div>
            <div className="card-content">
              <h3 className="card-label">Status</h3>
              <p className={`card-status ${isBlinking ? "blinking" : "normal"}`}>
                {isBlinking ? "Blinking" : "Eyes Open"}
              </p>
            </div>
          </div>

          <div className="dashboard-card emotion-card">
            <div className="card-icon">😊</div>
            <div className="card-content">
              <h3 className="card-label">Current Emotion</h3>
              <p className="card-value emotion-value">{emotion}</p>
            </div>
          </div>

          <div className="dashboard-card redness-card">
            <div className="card-icon">🔴</div>
            <div className="card-content">
              <h3 className="card-label">Eye Redness</h3>
              <div className="redness-values">
                <div className="redness-item">
                  <span className="redness-label">Left:</span>
                  <span className={`redness-value ${leftEyeRedness > 12 ? 'high' : 'normal'}`}>
                    {leftEyeRedness.toFixed(1)}%
                  </span>
                </div>
                <div className="redness-item">
                  <span className="redness-label">Right:</span>
                  <span className={`redness-value ${rightEyeRedness > 12 ? 'high' : 'normal'}`}>
                    {rightEyeRedness.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isBlinking && (
          <div className="blink-alert">
            <span className="blink-icon">👁️</span>
            <span>Blink Detected!</span>
          </div>
        )}
      </div>
    </div>
  );
}
