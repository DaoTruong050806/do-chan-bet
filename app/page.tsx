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
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Xử lý khi chọn ảnh hoặc chụp ảnh
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

  // Vẽ lại ảnh, các điểm và đường nối lên Canvas mỗi khi điểm thay đổi
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      // Chuẩn hóa chiều rộng hiển thị tối đa 500px để vừa màn hình điện thoại & PC
      const maxWidth = 500;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Vẽ ảnh gốc
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Vẽ đường nối nếu có từ 2 điểm trở lên
      if (points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.strokeStyle = "#3b82f6"; // Trục cẳng chân (Xanh dương)
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (points.length === 3) {
        ctx.beginPath();
        ctx.moveTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.strokeStyle = "#eab308"; // Trục gót chân (Vàng)
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Vẽ các chấm tròn và nhãn P1, P2, P3
      const labels = ["P1: Bắp chân", "P2: Cổ chân", "P3: Đáy gót"];
      points.forEach((pt, index) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#22c55e";
        ctx.fillText(labels[index], pt.x + 10, pt.y + 5);
      });
    };
  }, [imageSrc, points]);

  // Xử lý click chuột / chạm màn hình lên Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || points.length >= 3) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Tính tọa độ chính xác kể cả khi CSS co giãn canvas
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    // Đủ 3 điểm thì tính góc lệch STCA
    if (newPoints.length === 3) {
      calculateAngle(newPoints[0], newPoints[1], newPoints[2]);
    }
  };

  const calculateAngle = (p1: Point, p2: Point, p3: Point) => {
    // Vector P1 -> P2 và P2 -> P3
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

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
          Đo Góc Lệch Trục Gót Chân (STCA)
        </h1>

        {/* Nút chọn ảnh hoặc chụp trực tiếp */}
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-center transition">
            📷 Chụp ảnh / Tải ảnh chân lên
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Hướng dẫn chọn điểm */}
        {imageSrc && points.length < 3 && (
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-200">
            👉 Hãy chạm/click vào điểm thứ <b>{points.length + 1}/3</b>:{" "}
            <b>
              {points.length === 0
                ? "Giữa bắp chân trên (P1)"
                : points.length === 1
                ? "Vùng thắt cổ chân / gân Achilles (P2)"
                : "Chính giữa đáy gót chân (P3)"}
            </b>
          </div>
        )}

        {/* Khung hiển thị ảnh & thao tác click */}
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
              Chọn lại 3 điểm
            </button>
          </div>
        )}

        {/* Kết quả phân tích */}
        {angle !== null && (
          <div
            className={`p-4 rounded-lg border text-center space-y-1 ${
              angle <= 5.0
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <p className="text-sm uppercase font-semibold">Góc lệch đo được</p>
            <p className="text-3xl font-extrabold">{angle}°</p>
            <p className="font-medium pt-1">
              {angle <= 5.0
                ? "✅ Trung tính (Bình thường)"
                : "⚠️ Vẹo ngoài -> Nguy cơ Bàn chân bẹt (>5.1°)"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}