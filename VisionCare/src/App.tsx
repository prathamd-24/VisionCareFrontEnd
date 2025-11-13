import { useRef, useEffect, useState } from "react";
import "./App.css";

// TypeScript declarations for MediaPipe globals
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

// Eye landmark indices (from MediaPipe documentation)
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

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
  const blinkStateRef = useRef(false);
  const startTimeRef = useRef(Date.now());

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
        <h1 className="title">👁️ VisionCare - Blink Detection</h1>
        <p className="subtitle">AI-powered eye tracking and blink monitoring</p>
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
