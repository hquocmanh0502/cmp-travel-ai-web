# 🏦 CASSO BANKING INTEGRATION - SETUP GUIDE

## Tổng quan
Tích hợp Casso.vn để tự động nhận tiền nạp vào ví CMP Travel thông qua chuyển khoản ngân hàng.

---

## 📋 Yêu cầu
- Tài khoản ngân hàng Việt Nam (VCB, TCB, MB, VietinBank, BIDV, ACB, etc.)
- Email và số điện thoại để đăng ký Casso

---

## 🚀 BƯỚC 1: Đăng ký Casso.vn

### 1.1 Tạo tài khoản
1. Truy cập: https://casso.vn/
2. Click **"Đăng ký miễn phí"**
3. Điền thông tin:
   - Email
   - Số điện thoại
   - Mật khẩu
4. Xác nhận email

### 1.2 Liên kết ngân hàng
1. Đăng nhập vào Casso
2. Vào **"Quản lý ngân hàng"** → **"Thêm ngân hàng"**
3. Chọn ngân hàng của bạn (VD: Vietcombank)
4. Có 2 cách liên kết:
   
   **Cách 1: SMS Banking (Đề xuất)**
   - Bật SMS Banking trên app ngân hàng
   - Forward SMS về số của Casso
   - Casso tự động đọc thông báo giao dịch
   
   **Cách 2: Email Banking**
   - Bật Email Banking
   - Forward email về email của Casso
   - Casso tự động đọc thông báo giao dịch

5. Làm theo hướng dẫn trên màn hình để hoàn tất

---

## 🔑 BƯỚC 2: Lấy API Key

### 2.1 Tạo API Key
1. Vào **"Cài đặt"** → **"API"**
2. Click **"Tạo API Key"**
3. Copy API Key (format: `AK_CS.xxxxxxxxxxxxxxxx`)
4. **LƯU Ý**: Chỉ hiển thị 1 lần, copy và lưu lại ngay!

### 2.2 Cấu hình trong Backend
1. Mở file `backend/.env`
2. Thêm API Key:
```bash
CASSO_API_KEY=AK_CS.xxxxxxxxxxxxxxxx
CASSO_WEBHOOK_SECRET=your_random_secret_string
```

3. Thêm thông tin ngân hàng:
```bash
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=CONG TY TNHH CMP TRAVEL
BANK_BRANCH=Ho Chi Minh
```

---

## 🔔 BƯỚC 3: Setup Webhook (Real-time)

### 3.1 Deploy Backend lên Internet
Để nhận webhook, backend phải có URL public. Các option:

**Option A: Ngrok (Development/Testing)**
```bash
# Install ngrok
npm install -g ngrok

# Start backend
cd backend
node server.js

# In another terminal, expose port 3000
ngrok http 3000

# Copy URL: https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

**Option B: Deploy lên Heroku/Railway/Render (Production)**
- Deploy backend lên một trong các platform trên
- Lấy URL public: `https://your-app.herokuapp.com`

### 3.2 Thêm Webhook URL vào Casso
1. Vào **"Cài đặt"** → **"Webhook"**
2. Click **"Thêm Webhook"**
3. Điền thông tin:
   - **URL**: `https://your-domain.com/api/wallet/webhook/casso`
   - **Method**: POST
   - **Secret** (optional): Same as `CASSO_WEBHOOK_SECRET` in .env
4. Click **"Lưu"**

### 3.3 Test Webhook
1. Casso sẽ gửi test webhook
2. Check logs backend xem có nhận được không:
```bash
🔔 Casso Webhook received: {...}
```

---

## ✅ BƯỚC 4: Kiểm tra hoạt động

### 4.1 Test nạp tiền
1. Vào frontend profile page
2. Click **"Top Up"** button
3. Nhập số tiền (VD: 100,000 VND)
4. Click **"Generate QR Code"**
5. Scan QR và chuyển khoản **ĐÚNG NỘI DUNG**

### 4.2 Verify
- **Webhook mode**: Tiền vào ví sau 10-30 giây
- **Polling mode**: Click "Check Status" để kiểm tra

### 4.3 Check logs
```bash
# Backend logs
✅ Wallet updated for user 673abc123: +$100000 (100000 VND)
```

---

## 💰 Giá & Gói dịch vụ Casso

### Free Plan
- ✅ 100 giao dịch/tháng
- ✅ 1 tài khoản ngân hàng
- ✅ Webhook real-time
- ✅ API access

### Pro Plan - 99,000 VND/tháng
- ✅ Không giới hạn giao dịch
- ✅ Nhiều tài khoản ngân hàng
- ✅ Priority support
- ✅ Advanced analytics

**Đề xuất**: Dùng Free plan cho testing, upgrade Pro khi có >100 transactions/tháng

---

## 🔒 Bảo mật

### Bắt buộc:
1. **Không commit** `.env` file lên Git
2. **Không share** API Key
3. **Sử dụng HTTPS** cho webhook URL
4. **Verify webhook signature** (đã implement trong code)

### Best practices:
```bash
# Add to .gitignore
.env
.env.local
```

---

## 📊 API Endpoints đã implement

### 1. Generate QR Code
```http
POST /api/wallet/:userId/topup/casso
Content-Type: application/json

{
  "amount": 100000  // VND
}

Response:
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://img.vietqr.io/image/...",
    "bankInfo": {
      "bankName": "Vietcombank",
      "accountNumber": "1234567890",
      "accountName": "CONG TY TNHH CMP TRAVEL"
    },
    "amount": 100000,
    "amountWallet": 100000,
    "transferContent": "CMPTRAVEL673abc_1234567890",
    "transactionRef": "CMPTRAVEL673abc_1234567890"
  }
}
```

### 2. Webhook Receiver (Auto-called by Casso)
```http
POST /api/wallet/webhook/casso
Content-Type: application/json
X-Casso-Signature: sha256_signature

{
  "data": [{
    "amount": 100000,
    "description": "CMPTRAVEL673abc_1234567890 ...",
    "tid": "FT21234567890",
    "when": "2025-10-30 10:30:00"
  }]
}
```

### 3. Check Transfer Status (Polling)
```http
GET /api/wallet/:userId/topup/check/:transactionRef

Response:
{
  "success": true,
  "status": "completed",
  "message": "Top-up successful!",
  "data": {
    "amount": 100000,
    "balance": 500000,
    "completedAt": "2025-10-30T10:30:00.000Z"
  }
}
```

---

## 🐛 Troubleshooting

### Webhook không hoạt động?
1. **Check backend logs**: Có nhận request không?
2. **Check Casso dashboard**: Webhook status = Success/Failed?
3. **Verify URL**: Public và accessible?
4. **Test with Postman**: Gửi test request thủ công

### Không nhận được tiền?
1. **Check nội dung chuyển khoản**: Có đúng format `CMPTRAVEL{userId}_{timestamp}`?
2. **Check số tiền**: Có đúng với số tiền đã chọn?
3. **Check Casso dashboard**: Transaction có xuất hiện không?
4. **Check backend logs**: Có process webhook không?

### Transaction pending mãi?
1. **Click "Check Status"** để force check
2. **Wait 1-2 phút** cho SMS/Email đến Casso
3. **Check bank statement**: Tiền đã trừ chưa?

---

## 📞 Support

- **Casso Support**: support@casso.vn / Live chat trên website
- **Docs**: https://docs.casso.vn/
- **Dashboard**: https://casso.vn/dashboard

---

## ✨ Features đã implement

✅ QR Code động với số tiền cụ thể
✅ Auto-detect payment qua webhook
✅ Fallback polling nếu webhook fail
✅ Transaction reference unique cho từng user
✅ Auto cộng tiền vào wallet
✅ Transaction history tracking
✅ 1 VND = 1 USD conversion
✅ Min/Max amount validation
✅ Webhook signature verification

---

## 🎯 Next Steps (Optional enhancements)

- [ ] Email notification khi nạp tiền thành công
- [ ] SMS notification
- [ ] Transaction receipt PDF
- [ ] Multiple bank accounts support
- [ ] Auto-refund for failed transactions
- [ ] Admin dashboard for monitoring

---

**Hoàn thành! 🎉**

Giờ bạn có thể nhận tiền nạp tự động vào ví CMP Travel!
