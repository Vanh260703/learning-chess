export interface OpeningStep {
  san: string; // move in SAN, e.g. "Nf3"
  comment: string; // why this move / what it achieves
}

export interface OpeningLine {
  id: string;
  name: string;
  eco: string;
  steps: OpeningStep[];
}

export interface OpeningFamily {
  id: string;
  name: string;
  summary: string;
  forColor: "white" | "black";
  eco: string;
  lines: OpeningLine[];
}

export const OPENINGS: OpeningFamily[] = [
  {
    id: "italian",
    name: "Ý (Italian Game)",
    summary: "1.e4 e5 2.Nf3 Nc6 3.Bc4 — phát triển nhanh, nhắm vào f7, kiểm soát trung tâm.",
    forColor: "white",
    eco: "C50",
    lines: [
      {
        id: "italian-giuoco-piano",
        name: "Giuoco Piano (biến cổ điển)",
        eco: "C53",
        steps: [
          { san: "e4", comment: "Chiếm trung tâm, mở đường cho hậu và tượng." },
          { san: "e5", comment: "Đen đáp trả đối xứng, tranh trung tâm." },
          { san: "Nf3", comment: "Phát triển mã, tấn công tốt e5." },
          { san: "Nc6", comment: "Bảo vệ tốt e5." },
          { san: "Bc4", comment: "Tượng nhắm vào f7 — điểm yếu nhất của Đen." },
          { san: "Bc5", comment: "Đen phát triển tượng đối xứng, cũng nhắm f2." },
          { san: "c3", comment: "Chuẩn bị d4 để chiếm trung tâm lớn." },
          { san: "Nf6", comment: "Đen phát triển mã, tấn công e4." },
          { san: "d3", comment: "Củng cố e4 một cách chắc chắn trước khi tính tiếp." },
        ],
      },
      {
        id: "italian-evans-gambit",
        name: "Evans Gambit",
        eco: "C51",
        steps: [
          { san: "e4", comment: "" },
          { san: "e5", comment: "" },
          { san: "Nf3", comment: "" },
          { san: "Nc6", comment: "" },
          { san: "Bc4", comment: "" },
          { san: "Bc5", comment: "" },
          { san: "b4", comment: "Thí tốt để giành thêm 1 tempo và mở đường cho tượng c4/hậu." },
          { san: "Bxb4", comment: "Đen ăn tốt, chấp nhận gambit." },
          { san: "c3", comment: "Đuổi tượng, chuẩn bị d4 với trung tâm lớn." },
          { san: "Ba5", comment: "Tượng lùi về giữ đường chéo a5-e1." },
          { san: "d4", comment: "Trắng có trung tâm tốt rộng và phát triển nhanh để đổi lấy con tốt." },
        ],
      },
    ],
  },
  {
    id: "ruy-lopez",
    name: "Tây Ban Nha (Ruy Lopez)",
    summary: "1.e4 e5 2.Nf3 Nc6 3.Bb5 — khai cuộc lâu đời và được tin dùng nhất ở cấp cao, gây áp lực lên mã c6.",
    forColor: "white",
    eco: "C60",
    lines: [
      {
        id: "ruylopez-closed",
        name: "Biến đóng (Closed Ruy Lopez)",
        eco: "C84",
        steps: [
          { san: "e4", comment: "" },
          { san: "e5", comment: "" },
          { san: "Nf3", comment: "" },
          { san: "Nc6", comment: "" },
          { san: "Bb5", comment: "Đe doạ ăn mã c6 (gián tiếp qua đòn ghim với Vua e8 sau...), gây sức ép." },
          { san: "a6", comment: "Đen buộc Trắng quyết định với tượng." },
          { san: "Ba4", comment: "Giữ tượng trên đường chéo, duy trì sức ép lên c6." },
          { san: "Nf6", comment: "Đen phát triển và tấn công e4." },
          { san: "O-O", comment: "Nhập thành, chuẩn bị Re1 bảo vệ e4." },
          { san: "Be7", comment: "Chuẩn bị nhập thành, giữ thế trận chắc chắn (Closed Ruy Lopez)." },
        ],
      },
      {
        id: "ruylopez-berlin",
        name: "Phòng thủ Berlin",
        eco: "C67",
        steps: [
          { san: "e4", comment: "" },
          { san: "e5", comment: "" },
          { san: "Nf3", comment: "" },
          { san: "Nc6", comment: "" },
          { san: "Bb5", comment: "" },
          { san: "Nf6", comment: "Thay vì a6, Đen phản công thẳng vào e4 — Berlin Defense, rất chắc và hay dẫn tới cờ tàn cân bằng." },
          { san: "O-O", comment: "" },
          { san: "Nxe4", comment: "Đen ăn tốt e4 tạm thời." },
          { san: "d4", comment: "Trắng mở trung tâm để lấy lại thế chủ động, hướng tới đổi quân nhanh." },
        ],
      },
    ],
  },
  {
    id: "sicilian",
    name: "Sicilian (Phòng thủ Sicilia)",
    summary: "1.e4 c5 — khai cuộc được chơi nhiều nhất của Đen để đấu tranh trung tâm bất đối xứng, tạo cơ hội phản công.",
    forColor: "black",
    eco: "B20",
    lines: [
      {
        id: "sicilian-open",
        name: "Open Sicilian",
        eco: "B40",
        steps: [
          { san: "e4", comment: "" },
          { san: "c5", comment: "Đen không tranh e5 trực diện mà kiểm soát d4 từ bên, hướng tới phản công cạnh c/d." },
          { san: "Nf3", comment: "Chuẩn bị d4 mở trung tâm." },
          { san: "d6", comment: "Chuẩn bị Nf6 và e5/d5 linh hoạt." },
          { san: "d4", comment: "Mở trung tâm." },
          { san: "cxd4", comment: "Đổi tốt, cân bằng vật chất." },
          { san: "Nxd4", comment: "Trắng có trung tâm và phát triển nhanh, Đen có nửa cột c mở để phản công." },
        ],
      },
      {
        id: "sicilian-najdorf",
        name: "Biến Najdorf",
        eco: "B90",
        steps: [
          { san: "e4", comment: "" },
          { san: "c5", comment: "" },
          { san: "Nf3", comment: "" },
          { san: "d6", comment: "" },
          { san: "d4", comment: "" },
          { san: "cxd4", comment: "" },
          { san: "Nxd4", comment: "" },
          { san: "Nf6", comment: "" },
          { san: "Nc3", comment: "" },
          { san: "a6", comment: "Nước đặc trưng của Najdorf: ngăn Nb5/Bb5 và chuẩn bị b5 phản công cánh hậu." },
        ],
      },
      {
        id: "sicilian-dragon",
        name: "Biến Dragon",
        eco: "B70",
        steps: [
          { san: "e4", comment: "" },
          { san: "c5", comment: "" },
          { san: "Nf3", comment: "" },
          { san: "d6", comment: "" },
          { san: "d4", comment: "" },
          { san: "cxd4", comment: "" },
          { san: "Nxd4", comment: "" },
          { san: "Nf6", comment: "" },
          { san: "Nc3", comment: "" },
          { san: "g6", comment: "Fianchetto tượng sang g7, tạo thế trận sắc bén, hai bên thường chạy đua tấn công hai cánh." },
        ],
      },
    ],
  },
  {
    id: "french",
    name: "Phòng thủ Pháp (French Defense)",
    summary: "1.e4 e6 — Đen chuẩn bị d5 để chặn trung tâm, nhận thế trận chắc chắn nhưng bị hạn chế tượng ô sáng.",
    forColor: "black",
    eco: "C00",
    lines: [
      {
        id: "french-advance",
        name: "Biến tiến tốt (Advance Variation)",
        eco: "C02",
        steps: [
          { san: "e4", comment: "" },
          { san: "e6", comment: "Chuẩn bị d5 mà không bị Nc3/đổi tốt ngay." },
          { san: "d4", comment: "" },
          { san: "d5", comment: "Đen thách thức trung tâm." },
          { san: "e5", comment: "Trắng đẩy tốt tiến, giành không gian nhưng tốt e5 có thể thành mục tiêu về sau." },
          { san: "c5", comment: "Đen phản công cạnh hậu, tấn công d4." },
        ],
      },
      {
        id: "french-winawer",
        name: "Biến Winawer",
        eco: "C15",
        steps: [
          { san: "e4", comment: "" },
          { san: "e6", comment: "" },
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "Nc3", comment: "" },
          { san: "Bb4", comment: "Đen ghim mã c3, tạo thế trận phức tạp và mất cân bằng — đặc trưng Winawer." },
        ],
      },
    ],
  },
  {
    id: "caro-kann",
    name: "Phòng thủ Caro-Kann",
    summary: "1.e4 c6 — chuẩn bị d5 giữ cấu trúc tốt chắc chắn hơn Pháp (không kẹt tượng ô sáng).",
    forColor: "black",
    eco: "B10",
    lines: [
      {
        id: "carokann-classical",
        name: "Biến cổ điển",
        eco: "B18",
        steps: [
          { san: "e4", comment: "" },
          { san: "c6", comment: "Chuẩn bị d5 với hậu c6 bảo vệ." },
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "Nc3", comment: "" },
          { san: "dxe4", comment: "" },
          { san: "Nxe4", comment: "" },
          { san: "Bf5", comment: "Đen phát triển tượng ra ngoài trước khi chơi e6, tránh bị kẹt — ưu điểm so với Pháp." },
        ],
      },
    ],
  },
  {
    id: "queens-gambit",
    name: "Gambit Hậu (Queen's Gambit)",
    summary: "1.d4 d5 2.c4 — thí tốt tạm thời để giành quyền kiểm soát trung tâm và không gian.",
    forColor: "white",
    eco: "D06",
    lines: [
      {
        id: "qg-accepted",
        name: "Queen's Gambit Accepted",
        eco: "D20",
        steps: [
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "c4", comment: "Thí tốt c để Đen rời trung tâm, đổi lấy việc Trắng phát triển nhanh và có thể lấy lại tốt." },
          { san: "dxc4", comment: "Đen ăn tốt — nhưng khó giữ lâu dài vì Trắng kiểm soát trung tâm." },
          { san: "Nf3", comment: "Chuẩn bị e4/e3 và Bxc4 lấy lại tốt với lợi thế phát triển." },
        ],
      },
      {
        id: "qg-declined",
        name: "Queen's Gambit Declined",
        eco: "D30",
        steps: [
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "c4", comment: "" },
          { san: "e6", comment: "Đen từ chối ăn tốt, giữ cấu trúc chắc và chuẩn bị Nf6/Be7." },
          { san: "Nc3", comment: "" },
          { san: "Nf6", comment: "" },
        ],
      },
      {
        id: "qg-slav",
        name: "Biến Slav",
        eco: "D10",
        steps: [
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "c4", comment: "" },
          { san: "c6", comment: "Đen chuẩn bị giữ tốt d5 bằng c6, cho phép tượng c8 ra ngoài qua f5/g4 sau này." },
        ],
      },
    ],
  },
  {
    id: "kings-indian",
    name: "Ấn Độ Vua (King's Indian Defense)",
    summary: "1.d4 Nf6 2.c4 g6 — Đen nhường trung tâm tạm thời, fianchetto và phản công bằng ...e5/...d5 sau.",
    forColor: "black",
    eco: "E60",
    lines: [
      {
        id: "kid-classical",
        name: "Biến cổ điển",
        eco: "E90",
        steps: [
          { san: "d4", comment: "" },
          { san: "Nf6", comment: "" },
          { san: "c4", comment: "" },
          { san: "g6", comment: "Chuẩn bị Bg7, fianchetto để kiểm soát đường chéo lớn từ xa." },
          { san: "Nc3", comment: "" },
          { san: "Bg7", comment: "" },
          { san: "e4", comment: "Trắng chiếm trung tâm lớn." },
          { san: "d6", comment: "Đen chuẩn bị O-O rồi phản công bằng e5 hoặc c5." },
        ],
      },
    ],
  },
  {
    id: "english",
    name: "Khai cuộc Anh (English Opening)",
    summary: "1.c4 — kiểm soát d5 từ xa, linh hoạt chuyển sang nhiều cấu trúc khác nhau.",
    forColor: "white",
    eco: "A10",
    lines: [
      {
        id: "english-symmetrical",
        name: "Biến đối xứng",
        eco: "A30",
        steps: [
          { san: "c4", comment: "Kiểm soát d5, trì hoãn quyết định cấu trúc trung tâm." },
          { san: "c5", comment: "Đen đáp đối xứng." },
          { san: "Nf3", comment: "" },
          { san: "Nf6", comment: "" },
          { san: "Nc3", comment: "" },
        ],
      },
    ],
  },
  {
    id: "scandinavian",
    name: "Phòng thủ Scandinavia",
    summary: "1.e4 d5 — Đen thách thức trung tâm ngay nước 1, đổi hậu sớm thường dẫn tới thế trận đơn giản.",
    forColor: "black",
    eco: "B01",
    lines: [
      {
        id: "scandi-main",
        name: "Biến chính 2...Qxd5",
        eco: "B01",
        steps: [
          { san: "e4", comment: "" },
          { san: "d5", comment: "Đen thách thức trung tâm ngay lập tức." },
          { san: "exd5", comment: "" },
          { san: "Qxd5", comment: "Hậu ra sớm, Đen chấp nhận mất tempo đổi lấy thế trận rõ ràng." },
          { san: "Nc3", comment: "Trắng tấn công hậu, giành tempo phát triển." },
          { san: "Qa5", comment: "" },
        ],
      },
    ],
  },
  {
    id: "london",
    name: "Hệ thống London (London System)",
    summary: "1.d4 2.Bf4 — hệ thống dễ học, phát triển tượng trước khi bị kẹt bởi tốt e3, phù hợp mọi câu trả lời của Đen.",
    forColor: "white",
    eco: "D02",
    lines: [
      {
        id: "london-main",
        name: "Thế trận điển hình",
        eco: "D02",
        steps: [
          { san: "d4", comment: "" },
          { san: "d5", comment: "" },
          { san: "Bf4", comment: "Phát triển tượng ra ngoài trước khi chơi e3 — ý tưởng cốt lõi của London System." },
          { san: "Nf6", comment: "" },
          { san: "e3", comment: "Giờ mới đóng đường chéo, vì tượng đã ra ngoài." },
          { san: "e6", comment: "" },
          { san: "Nf3", comment: "Thế trận chắc chắn, dễ chơi cho Trắng ở mọi cấp độ." },
        ],
      },
    ],
  },
];
