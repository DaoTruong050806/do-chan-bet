"use client";

import React, { useState, useRef, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

export default function FlatfootDetector() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [angle, setAngle] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const labels = [
    "P1: Điểm cẳng chân trên (T1)",
    "P2: Điểm cẳng chân dưới (T2)",
    "P3: Điểm cổ chân/gót trên (A)",
    "P4: Điểm đáy gót (B)"
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setPoints([]);
      setAngle(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const maxWidth = 500;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Vẽ trục cẳng chân (T1 - T2) màu xanh dương
      if (points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Vẽ trục gót chân (A - B) màu vàng
      if (points.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Vẽ các điểm và nhãn
      points.forEach((pt, index) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#16a34a";
        ctx.fillText(`P${index + 1}`, pt.x + 10, pt.y + 4);
      });
    };
  }, [imageSrc, points]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || points.length >= 4) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    // Khi đủ 4 điểm thì tính góc giữa 2 đường thẳng (T1T2 và AB)
    if (newPoints.length === 4) {
      calculateAngle4Points(newPoints);
    }
  };

  const calculateAngle4Points = (pts: Point[]) => {
    // Trục cẳng chân: Vector P1 -> P2 (T1 -> T2)
    const v1 = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
    // Trục gót chân: Vector P3 -> P4 (A -> B)
    const v2 = { x: pts[3].x - pts[2].x, y: pts[3].y - pts[2].y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2 + 1e-6)));
    const deg = (Math.acos(cosTheta) * 180) / Math.PI;
    setAngle(Number(deg.toFixed(2)));
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 text-slate-800">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-5 space-y-4">
        <h1 className="text-xl font-bold text-center text-blue-700">
          Đo Góc Lệch Trục Gót Chân (4 Điểm)
        </h1>

        <div className="flex flex-col gap-2">
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition">
            📷 Tải ảnh chân lên để phân tích
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {imageSrc && points.length < 4 && (
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-200">
            👉 Hãy click điểm thứ <b>{points.length + 1}/4</b>:{" "}
            <b>{labels[points.length]}</b>
          </div>
        )}

        {imageSrc && (
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full h-auto border rounded-lg cursor-crosshair shadow-sm"
            />
            <button
              onClick={() => {
                setPoints([]);
                setAngle(null);
              }}
              className="mt-3 text-sm text-slate-600 underline hover:text-red-600"
            >
              Chọn lại từ đầu (Reset 4 điểm)
            </button>
          </div>
        )}

        {angle !== null && (
          <div
            className={`p-4 rounded-lg border text-center space-y-1 ${
              angle <= 5.1
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <p className="text-sm uppercase font-semibold">Góc lệch STCA đo được</p>
            <p className="text-3xl font-extrabold">{angle}°</p>
            <p className="font-medium pt-1">
              {angle <= 5.1
                ? "✅ Trung tính (0° - 5.1°): Bình thường"
                : "⚠️ Vẹo ngoài (> 5.1°): Nguy cơ Bàn chân bẹt"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}