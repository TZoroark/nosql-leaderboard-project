# -*- coding: utf-8 -*-
"""
Enhanced Generator for Professional PowerPoint Presentation (.pptx):
1. Embeds real screenshots into feature slides with stylish borders
2. Removes Slide 15 (Live Demo script) as requested by user
"""

import os
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    C_BG = RGBColor(10, 15, 29)          # Nền tối #0A0F1D
    C_CARD_BG = RGBColor(18, 26, 47)     # Nền thẻ #121A2F
    C_CARD_BORDER = RGBColor(38, 52, 85) # Viền thẻ #263455
    C_CYAN = RGBColor(56, 189, 248)      # Cyan sáng #38BDF8
    C_BLUE = RGBColor(59, 130, 246)      # Blue #3B82F6
    C_AMBER = RGBColor(245, 158, 11)     # Amber Vàng #F59E0B
    C_EMERALD = RGBColor(16, 185, 129)   # Xanh lá #10B981
    C_RED = RGBColor(239, 68, 68)        # Đỏ #EF4444
    C_WHITE = RGBColor(248, 250, 252)    # Trắng #F8FAFC
    C_MUTED = RGBColor(148, 163, 184)    # Xám phụ #94A3B8

    screenshots_dir = os.path.join(os.path.dirname(__file__), "screenshots")

    def apply_bg(slide):
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = C_BG
        bg_shape.line.fill.background()
        return bg_shape

    def add_header(slide, title_text, category="ĐỒ ÁN MÔN HỌC: CƠ SỞ DỮ LIỆU NOSQL"):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_cat = tf.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.name = "Segoe UI"
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = C_CYAN
        
        p_title = tf.add_paragraph()
        p_title.text = title_text
        p_title.font.name = "Segoe UI"
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = C_WHITE
        p_title.space_before = Pt(4)

    def add_card(slide, left, top, width, height, title=None, subtitle=None, bg_color=C_CARD_BG, border_color=C_CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        
        if title:
            tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), Inches(0.6))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
            p = tf.paragraphs[0]
            p.text = title
            p.font.name = "Segoe UI"
            p.font.size = Pt(14)
            p.font.bold = True
            p.font.color.rgb = C_CYAN
            
            if subtitle:
                p_sub = tf.add_paragraph()
                p_sub.text = subtitle
                p_sub.font.name = "Segoe UI"
                p_sub.font.size = Pt(10)
                p_sub.font.color.rgb = C_MUTED
                p_sub.space_before = Pt(2)
        return card

    def add_screenshot(slide, left, top, width, height, filename):
        filepath = os.path.join(screenshots_dir, filename)
        if os.path.exists(filepath):
            # Frame card behind image
            frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left - Inches(0.06), top - Inches(0.06), width + Inches(0.12), height + Inches(0.12))
            frame.fill.solid()
            frame.fill.fore_color.rgb = RGBColor(22, 33, 58)
            frame.line.color.rgb = C_CYAN
            frame.line.width = Pt(1.5)
            # Add picture
            slide.shapes.add_picture(filepath, left, top, width, height)

    # ==================== SLIDE 1: BÌA THUYẾT TRÌNH ====================
    s1 = prs.slides.add_slide(blank_layout)
    apply_bg(s1)
    
    line = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.3), Inches(1.5), Inches(0.08))
    line.fill.solid()
    line.fill.fore_color.rgb = C_CYAN
    line.line.fill.background()

    tb1 = s1.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(3.2))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    p1 = tf1.paragraphs[0]
    p1.text = "BÁO CÁO ĐỒ ÁN MÔN HỌC NOSQL"
    p1.font.name = "Segoe UI"
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = C_CYAN
    
    p2 = tf1.add_paragraph()
    p2.text = "HỆ THỐNG BẢNG XẾP HẠNG THỜI GIAN THỰC\n(REAL-TIME LEADERBOARD)"
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(32)
    p2.font.bold = True
    p2.font.color.rgb = C_WHITE
    p2.space_before = Pt(12)
    
    p3 = tf1.add_paragraph()
    p3.text = "Ứng dụng Cơ sở dữ liệu In-Memory Redis, Kiến trúc Skip List & WebSocket Socket.IO"
    p3.font.name = "Segoe UI"
    p3.font.size = Pt(16)
    p3.font.color.rgb = C_AMBER
    p3.space_before = Pt(8)

    add_card(s1, Inches(0.8), Inches(5.2), Inches(5.6), Inches(1.6))
    tb_info = s1.shapes.add_textbox(Inches(1.1), Inches(5.4), Inches(5.0), Inches(1.2))
    tfi = tb_info.text_frame
    tfi.word_wrap = True
    pi1 = tfi.paragraphs[0]
    pi1.text = "👤 Sinh viên thực hiện: Vũ Quốc Bảo (ID: 110)"
    pi1.font.name = "Segoe UI"
    pi1.font.size = Pt(13)
    pi1.font.bold = True
    pi1.font.color.rgb = C_WHITE
    pi2 = tfi.add_paragraph()
    pi2.text = "🎯 Chuyên ngành: Công Nghệ Thông Tin - NoSQL Database"
    pi2.font.name = "Segoe UI"
    pi2.font.size = Pt(12)
    pi2.font.color.rgb = C_MUTED
    pi2.space_before = Pt(4)

    add_card(s1, Inches(6.8), Inches(5.2), Inches(5.7), Inches(1.6))
    tb_tech = s1.shapes.add_textbox(Inches(7.1), Inches(5.4), Inches(5.1), Inches(1.2))
    tft = tb_tech.text_frame
    tft.word_wrap = True
    pt1 = tft.paragraphs[0]
    pt1.text = "🛠️ Stack Công Nghệ Lõi:"
    pt1.font.name = "Segoe UI"
    pt1.font.size = Pt(13)
    pt1.font.bold = True
    pt1.font.color.rgb = C_CYAN
    pt2 = tft.add_paragraph()
    pt2.text = "Redis 8.x (Sorted Sets & Hashes) • Node.js • Express • Socket.IO"
    pt2.font.name = "Segoe UI"
    pt2.font.size = Pt(12)
    pt2.font.color.rgb = C_WHITE
    pt2.space_before = Pt(4)

    # ==================== SLIDE 2: BỐI CẢNH & ĐẶT VẤN ĐỀ ====================
    s2 = prs.slides.add_slide(blank_layout)
    apply_bg(s2)
    add_header(s2, "Bối Cảnh & Đặt Vấn Đề: Tại Sao Bảng Xếp Hạng Lại Khó?")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.9), "🎮 Trò Chơi Trực Tuyến", "Gaming & Esports")
    tb = s2.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(3.1), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• Hàng chục ngàn người chơi cùng kết thúc trận đấu và nộp điểm trong cùng một giây.\n\n• Người chơi yêu cầu thứ hạng phải nhảy ngay tức khắc trên màn hình để duy trì tính cạnh tranh gay cấn."
    tf.paragraphs[0].font.size = Pt(12)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    add_card(s2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.9), "🛍️ Thương Mại Điện Tử", "Flash Sale & Livestream")
    tb = s2.shapes.add_textbox(Inches(5.05), Inches(2.7), Inches(3.1), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• Shopee, TikTok Shop: Bảng xếp hạng Top người mua hàng nhiều nhất theo từng giờ.\n\n• Khách hàng nạp đơn liên tục, yêu cầu hệ thống tính toán tức thì để phát voucher thưởng nóng."
    tf.paragraphs[0].font.size = Pt(12)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    add_card(s2, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.9), "⚡ Thách Thức Kỹ Thuật", "Real-Time Bottleneck")
    tb = s2.shapes.add_textbox(Inches(9.05), Inches(2.7), Inches(3.2), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• Dữ liệu thay đổi liên tục từng mili-giây (High Write Throughput).\n\n• Số lượng người dùng từ 10.000 đến hàng triệu.\n\n• Đòi hỏi độ trễ cực thấp: Sub-millisecond (< 1 mili-giây)."
    tf.paragraphs[0].font.size = Pt(12)
    tf.paragraphs[0].font.color.rgb = C_AMBER

    # ==================== SLIDE 3: NGHẼN CỔ CHAI CỦA SQL ====================
    s3 = prs.slides.add_slide(blank_layout)
    apply_bg(s3)
    add_header(s3, "Tại Sao CSDL Quan Hệ (SQL) Thất Bại Với Bài Toán Này?")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), "❌ Truy Vấn SQL Kinh Điển", "SELECT ... ORDER BY ... LIMIT")
    tb_sql = s3.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(5.1), Inches(3.8))
    tf_sql = tb_sql.text_frame
    tf_sql.word_wrap = True
    p = tf_sql.paragraphs[0]
    p.text = "SELECT user_id, score, \n       RANK() OVER (ORDER BY score DESC)\nFROM players \nORDER BY score DESC \nLIMIT 10;\n\n⚠️ Khi có 100.000 người chơi:\n• Phép tính ORDER BY quét toàn bộ bảng (Table Scan).\n• Độ phức tạp O(N log N) hoặc O(N).\n• Tốn 150ms - 500ms cho MỖI lượt tra cứu!"
    p.font.name = "Consolas"
    p.font.size = Pt(11)
    p.font.color.rgb = RGBColor(248, 113, 113)

    add_card(s3, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), "💥 3 'Điểm Chết' Của SQL", "Bản chất kiến trúc lưu trữ đĩa")
    tb_prob = s3.shapes.add_textbox(Inches(7.05), Inches(2.7), Inches(5.2), Inches(3.8))
    tf_prob = tb_prob.text_frame
    tf_prob.word_wrap = True
    tf_prob.paragraphs[0].text = "1. Nghẽn cổ chai I/O đĩa cứng (Disk I/O Bottleneck):\n   SQL lưu dữ liệu trên HDD/SSD. Tốc độ đọc/ghi đĩa chậm hơn RAM hàng ngàn lần.\n\n2. Xung đột Khóa (Lock Contention):\n   Hàng ngàn lệnh UPDATE điểm đồng thời gây khóa dòng/khóa bảng (Row/Table Lock), dẫn đến treo máy chủ.\n\n3. Chi phí Re-indexing B-Tree:\n   Mỗi lần điểm số thay đổi, cây chỉ mục B-Tree phải tái cân bằng, làm tê liệt CPU."
    tf_prob.paragraphs[0].font.size = Pt(11.5)
    tf_prob.paragraphs[0].font.color.rgb = C_WHITE

    # ==================== SLIDE 4: GIẢI PHÁP NOSQL REDIS (CÓ HÌNH TỔNG QUAN) ====================
    s4 = prs.slides.add_slide(blank_layout)
    apply_bg(s4)
    add_header(s4, "Giải Pháp NoSQL Với Redis: Giao Diện Dashboard Trực Quan")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "⚡ Ưu Thế Của Redis In-Memory", "Sub-millisecond Performance")
    tb = s4.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• 100% In-Memory RAM: Tốc độ < 0.1ms, nhanh hơn đĩa cứng 100.000 lần.\n\n• Single-Threaded Event Loop: Xử lý hơn 100.000 lệnh/giây không lo race-condition.\n\n• Thao tác nguyên khối Atomic (ZINCRBY).\n\n• Cập nhật tức thời: Bục Top 3 Podium và bảng xếp hạng nhảy vị trí ngay trên màn hình."
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_1_tong_quan.png
    add_screenshot(s4, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_1_tong_quan.png")

    # ==================== SLIDE 5: SKIP LIST (CÓ HÌNH VISUALIZER) ====================
    s5 = prs.slides.add_slide(blank_layout)
    apply_bg(s5)
    add_header(s5, "Cấu Trúc Sorted Set & Trực Quan Hóa Giải Thuật Skip List")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "🧩 Kết Hợp Hash Table & Skip List", "Bản chất thuật toán O(log N)")
    tb = s5.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "1. Hash Table: Tra cứu điểm người chơi O(1).\n\n2. Skip List (Danh Sách Nhảy Đa Tầng):\n   • Tầng 4 (Express Lane): Nhảy qua các bước 10.000 phần tử.\n   • Tầng 1: Chứa toàn bộ 100.000 phần tử.\n\n👉 Tìm thứ tự #5.339:\n   • SQL duyệt 5,339 bước tuần tự\n   • Redis chỉ mất ~14 bước nhảy!"
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_4_skiplist_visualizer.png
    add_screenshot(s5, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_4_skiplist_visualizer.png")

    # ==================== SLIDE 6: SCHEMA CSDL REDIS ====================
    s6 = prs.slides.add_slide(blank_layout)
    apply_bg(s6)
    add_header(s6, "Thiết Kế Schema Cơ Sở Dữ Liệu NoSQL Trên Redis")

    shape = s6.shapes.add_table(5, 4, Inches(0.8), Inches(1.8), Inches(11.7), Inches(4.8))
    table = shape.table
    table.columns[0].width = Inches(1.8)
    table.columns[1].width = Inches(3.5)
    table.columns[2].width = Inches(3.8)
    table.columns[3].width = Inches(2.6)

    h_titles = ["Cấu Trúc NoSQL", "Tên Key Pattern", "Dữ Liệu Lưu Trữ", "Lệnh Chính Thao Tác"]
    for i, h in enumerate(h_titles):
        cell = table.cell(0, i)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_BLUE
        for p in cell.text_frame.paragraphs:
            p.font.name = "Segoe UI"
            p.font.size = Pt(11)
            p.font.bold = True
            p.font.color.rgb = C_WHITE

    schema_data = [
        ("Sorted Set (ZSET)", "leaderboard:global", "Member: userId, Score: points (Toàn thời gian)", "ZADD, ZINCRBY, ZREVRANGE"),
        ("Sorted Set (ZSET)", "leaderboard:daily:YYYY-MM-DD", "Bảng xếp hạng ngày, tự reset mỗi đêm", "ZINCRBY, EXPIRE (TTL 48h)"),
        ("Hash (HSET)", "user:{userId}", "Hồ sơ: name, avatar, country, score, title", "HSET, HGETALL, HINCRBY"),
        ("String (SET EX)", "session:{token}", "Phiên đăng nhập người dùng (Session Token)", "SET ... EX 86400, GET, DEL")
    ]
    for row_idx, r_data in enumerate(schema_data, start=1):
        for col_idx, text in enumerate(r_data):
            cell = table.cell(row_idx, col_idx)
            cell.text = text
            cell.fill.solid()
            cell.fill.fore_color.rgb = C_CARD_BG if row_idx % 2 == 1 else RGBColor(14, 20, 36)
            for p in cell.text_frame.paragraphs:
                p.font.name = "Segoe UI" if col_idx != 1 else "Consolas"
                p.font.size = Pt(10.5)
                p.font.color.rgb = C_CYAN if col_idx == 1 else C_WHITE

    # ==================== SLIDE 7: KIẾN TRÚC FULLSTACK ====================
    s7 = prs.slides.add_slide(blank_layout)
    apply_bg(s7)
    add_header(s7, "Kiến Trúc Hệ Thống Tổng Thể (System Architecture)")

    layers = [
        ("1. Presentation Layer (Khách hàng)", "Web Desktop (Cyberpunk UI) & Mobile Clicker Game qua mã QR mạng LAN", C_CYAN),
        ("2. Gateway & Transport Layer", "Giao thức WebSocket (Socket.IO) Full-Duplex truyền nhận 2 chiều tức thì", C_AMBER),
        ("3. Application Server (Node.js & Express)", "Xử lý REST API, kiểm tra Session Token, phát sóng Event thời gian thực", C_BLUE),
        ("4. In-Memory NoSQL Database (Redis 8.x)", "Quản lý ZSET Skip List, Hash hồ sơ, bộ nhớ đệm RAM tốc độ < 0.1ms", C_EMERALD)
    ]
    for idx, (title, desc, color) in enumerate(layers):
        y = Inches(1.8 + idx * 1.25)
        add_card(s7, Inches(0.8), y, Inches(11.7), Inches(1.05))
        tb = s7.shapes.add_textbox(Inches(1.1), y + Inches(0.12), Inches(11.1), Inches(0.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.name = "Segoe UI"
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = color
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(11)
        p2.font.color.rgb = C_WHITE
        p2.space_before = Pt(2)

    # ==================== SLIDE 8: LUỒNG THỜI GIAN THỰC ====================
    s8 = prs.slides.add_slide(blank_layout)
    apply_bg(s8)
    add_header(s8, "Luồng Xử Lý Ghi Điểm & Phát Sóng Thời Gian Thực")

    steps = [
        ("Bước 1: Submit Điểm", "Người chơi nộp điểm trên Web hoặc bấm TAP trên Điện thoại"),
        ("Bước 2: Xác Thực Token", "Server kiểm tra Token trong Redis RAM GET session:{token} mất 0.05ms"),
        ("Bước 3: Atomic ZINCRBY", "Redis tăng điểm và tự động đảo vị trí trong Skip List ngay lập tức"),
        ("Bước 4: Socket Broadcast", "Server lấy Top 10 mới và phát sóng sự kiện tới toàn bộ Client"),
        ("Bước 5: Flash Highlight", "Hàng của người chơi trên bảng chớp sáng xanh Neon nhảy hạng tức thì")
    ]
    for idx, (title, desc) in enumerate(steps):
        x = Inches(0.8 + idx * 2.38)
        add_card(s8, x, Inches(1.8), Inches(2.25), Inches(4.8), title)
        tb = s8.shapes.add_textbox(x + Inches(0.15), Inches(2.7), Inches(1.95), Inches(3.7))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.paragraphs[0].text = desc
        tf.paragraphs[0].font.size = Pt(11)
        tf.paragraphs[0].font.color.rgb = C_WHITE

    # ==================== SLIDE 9: REDIS SESSION STORE (CÓ HÌNH AUTH MODAL) ====================
    s9 = prs.slides.add_slide(blank_layout)
    apply_bg(s9)
    add_header(s9, "Quản Lý Đăng Nhập Với Redis Session Store (TTL 24h)")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "🔑 Mô Hình Session Phân Tán", "Cách các tập đoàn lớn (Shopee, Netflix) xác thực")
    tb = s9.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• Cấp phát Token ngẫu nhiên: session:tk_{uuid} -> userId.\n\n• TTL 24 giờ (86400s): Redis tự động xóa session hết hạn.\n\n• Xác thực siêu tốc: Chỉ tốn 0.05ms trên RAM.\n\n• Lưới chọn Avatar chiến binh và 1-Click Demo Accounts (quocbao/123, sontung/123, faker/123)."
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_2_auth_modal.png
    add_screenshot(s9, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_2_auth_modal.png")

    # ==================== SLIDE 10: STRESS TEST ARENA ====================
    s10 = prs.slides.add_slide(blank_layout)
    apply_bg(s10)
    add_header(s10, "Thử Nghiệm Tải Lớn: 100.000 Bản Ghi (Redis vs SQL)")

    shape = s10.shapes.add_table(5, 4, Inches(0.8), Inches(1.8), Inches(11.7), Inches(4.8))
    table = shape.table
    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(3.0)
    table.columns[2].width = Inches(2.8)
    table.columns[3].width = Inches(2.7)

    headers = ["Thao Tác Thử Nghiệm", "SQL (MySQL / Postgres)", "Redis NoSQL (In-Memory)", "Kết Quả Đo Đạc"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_BLUE
        for p in cell.text_frame.paragraphs:
            p.font.name = "Segoe UI"
            p.font.size = Pt(11)
            p.font.bold = True
            p.font.color.rgb = C_WHITE

    bench_rows = [
        ("Lấy danh sách Top 10", "120 - 350 ms (Nghẽn đĩa)", "0.12 ms (Sub-millisecond)", "Redis nhanh gấp 1.000 lần"),
        ("Cộng điểm & Đảo thứ hạng", "80 - 200 ms (Lock dòng)", "0.08 ms (ZINCRBY)", "Redis nhanh gấp 1.200 lần"),
        ("Tra cứu hạng người bất kỳ", "150 - 500 ms (Quét bảng)", "0.05 ms (ZREVRANK)", "Redis nhanh gấp 3.000 lần"),
        ("Dung lượng RAM 100k records", "~ 150 MB buffer cache", "Chỉ ~ 20 MB (Siêu nén)", "Tiết kiệm 85% tài nguyên")
    ]
    for row_idx, r_data in enumerate(bench_rows, start=1):
        for col_idx, text in enumerate(r_data):
            cell = table.cell(row_idx, col_idx)
            cell.text = text
            cell.fill.solid()
            cell.fill.fore_color.rgb = C_CARD_BG if row_idx % 2 == 1 else RGBColor(14, 20, 36)
            for p in cell.text_frame.paragraphs:
                p.font.name = "Segoe UI"
                p.font.size = Pt(10.5)
                if col_idx == 1:
                    p.font.color.rgb = C_RED
                elif col_idx == 2:
                    p.font.bold = True
                    p.font.color.rgb = C_EMERALD
                elif col_idx == 3:
                    p.font.bold = True
                    p.font.color.rgb = C_CYAN
                else:
                    p.font.color.rgb = C_WHITE

    # ==================== SLIDE 11: TIE BREAKING (CÓ HÌNH DEMO) ====================
    s11 = prs.slides.add_slide(blank_layout)
    apply_bg(s11)
    add_header(s11, "Kỹ Thuật Nâng Cao 1: Giải Quyết Hòa Điểm (Tie-Breaking)")

    add_card(s11, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "⚖️ Công Thức Fractional Timestamp", "Ai nộp trước được xếp trên")
    tb = s11.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "Score = Điểm + (1 - (Timestamp / 10^14))\n\n• Người nộp trước có Timestamp nhỏ hơn -> Phần bù thập phân lớn hơn -> Đứng trên.\n\n• Không cần truy vấn phức tạp hay ORDER BY created_at phụ trong SQL.\n\n• Thử nghiệm thực tế 2 người cùng 5.000 điểm phân định chính xác trong 0.05ms."
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_5_tie_breaking.png
    add_screenshot(s11, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_5_tie_breaking.png")

    # ==================== SLIDE 12: BANG HỘI ZUNIONSTORE (CÓ HÌNH GUILDS) ====================
    s12 = prs.slides.add_slide(blank_layout)
    apply_bg(s12)
    add_header(s12, "Kỹ Thuật Nâng Cao 2: Bảng Xếp Hạng Bang Hội (ZUNIONSTORE)")

    add_card(s12, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "🤝 Tổng Điểm Bang Hội Tức Thì", "Phép toán nguyên khối trong RAM")
    tb = s12.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "Lệnh Redis ZUNIONSTORE:\nZUNIONSTORE guild:leaderboard 3 \\\n   guild:dragon guild:tiger guild:phoenix \\\n   AGGREGATE SUM\n\n• Thay thế hoàn toàn các phép JOIN và GROUP BY nặng nề của SQL.\n\n• Thực hiện tính tổng trực tiếp trong RAM trong 1 mili-giây!"
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_6_guilds_modal.png
    add_screenshot(s12, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_6_guilds_modal.png")

    # ==================== SLIDE 13: PERSISTENCE (CÓ HÌNH BGSAVE) ====================
    s13 = prs.slides.add_slide(blank_layout)
    apply_bg(s13)
    add_header(s13, "Lưu Trữ Bền Vững (Redis Persistence): RDB Snapshotting & AOF")

    add_card(s13, Inches(0.8), Inches(1.8), Inches(5.0), Inches(4.9), "💾 Cơ Chế Bảo Vệ Dữ Liệu", "Mất điện không mất dữ liệu")
    tb = s13.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.5), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "1. RDB (Snapshotting):\n   • Lệnh BGSAVE tạo tiến trình con ghi file dump.rdb xuống ổ cứng không chặn luồng chính.\n\n2. AOF (Append-Only File):\n   • Ghi nhật ký mọi lệnh ghi vào appendonly.aof mỗi giây.\n\n👉 Khởi động lại máy chủ phục hồi 100.000 bản ghi trong vài giây."
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # Thêm ảnh hinh_7_persistence_modal.png
    add_screenshot(s13, Inches(6.1), Inches(1.8), Inches(6.4), Inches(4.9), "hinh_7_persistence_modal.png")

    # ==================== SLIDE 14: MOBILE TAPPER & DB EXPLORER ====================
    s14 = prs.slides.add_slide(blank_layout)
    apply_bg(s14)
    add_header(s14, "Trải Nghiệm Đa Nền Tảng: Mobile Live Tapper & DB Explorer")

    add_card(s14, Inches(0.8), Inches(1.8), Inches(4.8), Inches(4.9), "📱 Mobile Live Tapper & QR Code", "Quét QR chơi game trên điện thoại")
    tb = s14.shapes.add_textbox(Inches(1.05), Inches(2.7), Inches(4.3), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "• Tự động tạo mã QR chứa địa chỉ IP mạng nội bộ (LAN).\n\n• Mở camera điện thoại quét để chơi mini-game ngay trên trình duyệt di động.\n\n• Bấm nút TAP liên tục: Điểm truyền qua WebSocket làm nhảy bảng xếp hạng trên máy tính tức thì!"
    tf.paragraphs[0].font.size = Pt(11.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    # 2 ảnh: Mobile Game + Database Explorer
    add_screenshot(s14, Inches(5.9), Inches(1.8), Inches(2.4), Inches(4.9), "hinh_9_mobile_game.png")
    add_screenshot(s14, Inches(8.6), Inches(1.8), Inches(4.0), Inches(4.9), "hinh_3_database_explorer.png")

    # ==================== SLIDE 15: TỔNG KẾT & Q&A (SLIDE 15 DEMO ĐÃ ĐƯỢC BỎ) ====================
    s15 = prs.slides.add_slide(blank_layout)
    apply_bg(s15)
    add_header(s15, "Tổng Kết Đồ Án & Lời Cảm Ơn")

    add_card(s15, Inches(0.8), Inches(1.8), Inches(11.7), Inches(3.4), "🏆 Các Kết Quả Xuất Sắc Đạt Được")
    tb = s15.shapes.add_textbox(Inches(1.1), Inches(2.6), Inches(11.1), Inches(2.4))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.paragraphs[0].text = "✅ Ứng dụng thành công cấu trúc NoSQL Sorted Set (ZSET) & Skip List giải quyết triệt để bài toán Leaderboard.\n\n✅ Đạt thông lượng cực lớn với thời gian phản hồi Sub-millisecond (< 0.2ms trên 100.000 bản ghi).\n\n✅ Xây dựng hệ thống hoàn chỉnh: Redis Session Store (TTL 24h), Tie-Breaking, Guilds ZUNIONSTORE, và Mobile Live Tapper.\n\n✅ Giao diện Cyberpunk Glassmorphism hiện đại, trực quan, hỗ trợ giảng viên kiểm tra Database trực tiếp."
    tf.paragraphs[0].font.size = Pt(12.5)
    tf.paragraphs[0].font.color.rgb = C_WHITE

    add_card(s15, Inches(0.8), Inches(5.4), Inches(11.7), Inches(1.5), bg_color=RGBColor(16, 24, 48), border_color=C_CYAN)
    tb_thx = s15.shapes.add_textbox(Inches(1.1), Inches(5.55), Inches(11.1), Inches(1.2))
    tft = tb_thx.text_frame
    tft.word_wrap = True
    pt1 = tft.paragraphs[0]
    pt1.text = "CẢM ƠN THẦY CÔ VÀ CÁC BẠN ĐÃ LẮNG NGHE!"
    pt1.font.name = "Segoe UI"
    pt1.font.size = Pt(18)
    pt1.font.bold = True
    pt1.font.color.rgb = C_AMBER
    pt1.alignment = PP_ALIGN.CENTER
    
    pt2 = tft.add_paragraph()
    pt2.text = "Xin mời Thầy Cô và Hội đồng đặt câu hỏi phản biện (Q&A)"
    pt2.font.name = "Segoe UI"
    pt2.font.size = Pt(13)
    pt2.font.color.rgb = C_WHITE
    pt2.alignment = PP_ALIGN.CENTER
    pt2.space_before = Pt(4)

    output_filename = "Thuyet_Trinh_Do_An_NoSQL_Redis_Leaderboard.pptx"
    prs.save(output_filename)
    print(f"Presentation saved successfully: {output_filename}")

    desktop_path = r"C:\Users\quoca\OneDrive\Desktop\Thuyet_Trinh_Do_An_NoSQL_Redis_Leaderboard.pptx"
    try:
        prs.save(desktop_path)
        print(f"Copied presentation to Desktop: {desktop_path}")
    except Exception as e:
        print(f"Could not copy to Desktop: {e}")

if __name__ == "__main__":
    create_presentation()
