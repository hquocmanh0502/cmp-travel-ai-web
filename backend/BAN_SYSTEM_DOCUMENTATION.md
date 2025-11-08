# Hệ Thống Ban User cho Spam/Toxic Replies

## Tổng quan
Hệ thống ban user tự động và thủ công được thiết kế để:
- Tự động ban user khi phát hiện spam/toxic content
- Cho phép admin quản lý bans thủ công
- Theo dõi violations và ban history
- Cung cấp giao diện admin dashboard

## Quy tắc Ban tự động

### Spam Violations
- **3 violations**: Ban 24 giờ
- **6 violations**: Ban 3 ngày  
- **10 violations**: Ban 1 tuần
- **15 violations**: Ban 1 tháng
- **20 violations**: Ban vĩnh viễn

### Toxic Violations  
- **2 violations**: Ban 24 giờ
- **4 violations**: Ban 3 ngày
- **7 violations**: Ban 1 tuần
- **10 violations**: Ban 1 tháng
- **12 violations**: Ban vĩnh viễn

### Hate Speech & Harassment
- Quy tắc nghiêm khắc hơn với threshold thấp hơn

## Cấu trúc Database

### UserViolation Model
```javascript
{
  userId: ObjectId,           // User bị vi phạm
  replyId: ObjectId,          // Reply có nội dung vi phạm
  commentId: ObjectId,        // Comment chứa reply
  tourId: ObjectId,           // Tour liên quan
  violationType: String,      // 'spam', 'toxic', 'hate_speech', 'harassment'
  content: String,            // Nội dung vi phạm
  severity: String,           // 'low', 'medium', 'high', 'critical'
  confidence: Number,         // Độ tin cậy của AI (0-1)
  reviewStatus: String,       // 'pending', 'confirmed', 'dismissed'
  createdAt: Date
}
```

### UserBan Model
```javascript
{
  userId: ObjectId,           // User bị ban
  banType: String,            // 'reply_ban', 'comment_ban', 'full_ban'
  reason: String,             // Lý do ban
  severity: String,           // 'temporary', 'permanent'
  duration: Number,           // Thời gian ban (hours)
  startDate: Date,            // Ngày bắt đầu
  endDate: Date,              // Ngày kết thúc
  isActive: Boolean,          // Trạng thái ban
  bannedBy: ObjectId,         // Admin thực hiện ban
  bannedByType: String,       // 'auto', 'manual'
  appealStatus: String,       // 'none', 'pending', 'approved', 'rejected'
  appealReason: String        // Lý do kháng cáo
}
```

## API Endpoints

### Admin Ban Management (`/api/admin-ban`)
- `GET /stats` - Thống kê tổng quan
- `GET /bans` - Danh sách bans đang hoạt động
- `POST /bans` - Ban user thủ công
- `DELETE /bans/:banId` - Gỡ ban
- `GET /users/search` - Tìm kiếm user
- `GET /users/:userId` - Chi tiết user và lịch sử vi phạm
- `GET /violations` - Danh sách violations cần review
- `PATCH /violations/:violationId/review` - Review violation

### User Ban Status (`/api/comments`)
- `GET /ban-status` - Kiểm tra trạng thái ban
- `POST /appeal-ban` - Gửi kháng cáo ban

## Tích hợp vào hệ thống Reply

### 1. Middleware kiểm tra ban
```javascript
const checkBanStatus = async (req, res, next) => {
  const userId = req.userId;
  const banInfo = await UserBanService.isUserBanned(userId);
  
  if (banInfo) {
    return res.status(403).json({
      error: 'You are banned from posting replies',
      banInfo: {
        reason: banInfo.reason,
        remainingTime: banInfo.getRemainingTime()
      }
    });
  }
  
  next();
};
```

### 2. Record violations sau khi AI detect
```javascript
// Trong reply processing
if (classification.isSpam && classification.confidence > 0.7) {
  await UserBanService.recordViolation({
    userId: userId,
    replyId: savedReply._id,
    commentId: commentId,
    tourId: comment.tourId,
    violationType: 'spam',
    content: text.trim(),
    severity: classification.confidence > 0.9 ? 'high' : 'medium',
    confidence: classification.confidence
  });
}
```

## Admin Dashboard

### Ban Management Page
- **Stats Overview**: Hiển thị số liệu ban và violations
- **Active Bans Tab**: Danh sách users đang bị ban
- **Violations Tab**: Violations cần admin review
- **Search Users**: Tìm kiếm và ban user thủ công
- **User Details**: Xem chi tiết lịch sử vi phạm của user

### Tính năng chính:
1. **Manual Ban**: Admin có thể ban user với custom reason/duration
2. **Lift Ban**: Gỡ ban với lý do cụ thể
3. **Review Violations**: Confirm hoặc dismiss violations
4. **User Search**: Tìm kiếm user để ban
5. **Ban Appeal**: Xem và xử lý kháng cáo

## Frontend Integration

### Ban Status Checker
File: `/frontend/js/ban-status-checker.js`

Tự động:
- Kiểm tra ban status khi load page
- Intercept reply submissions
- Hiển thị notification nếu user bị ban
- Cung cấp form kháng cáo

### Usage:
```html
<script src="/js/ban-status-checker.js"></script>
```

Script sẽ tự động tích hợp với existing reply forms.

## Quy trình vận hành

### 1. Tự động ban
1. User post reply có spam/toxic content
2. AI detection phát hiện và classify
3. System record violation
4. Kiểm tra số violations trong 30 ngày
5. Tự động ban nếu đạt threshold

### 2. Manual ban
1. Admin search user
2. Chọn ban type, duration, reason
3. System tạo ban record
4. User nhận notification

### 3. Ban appeal
1. User submit appeal qua frontend
2. Admin review trong dashboard
3. Admin approve/reject appeal
4. System update ban status

### 4. Maintenance
- Cleanup expired bans định kỳ
- Monitor violation trends
- Adjust ban rules nếu cần

## Testing

Chạy test script:
```bash
cd backend
node test-ban-system.js
```

Test các scenario:
- Record violations
- Auto ban triggers
- Manual ban/unban
- Appeal system
- Cleanup expired bans

## Notes cho Admin

1. **Monitoring**: Theo dõi thường xuyên violations dashboard
2. **False Positives**: Review và dismiss các violations không chính xác
3. **Appeal Handling**: Xử lý kháng cáo một cách công bằng
4. **Rule Adjustments**: Có thể điều chỉnh threshold trong `UserBanService.BAN_RULES`
5. **Cleanup**: Chạy cleanup expired bans định kỳ

## Hạn chế và cải tiến

### Hạn chế hiện tại:
- Chưa có email notification
- Chưa có escalation system cho repeat offenders
- Chưa có IP-based banning

### Cải tiến tương lai:
- Email/SMS notifications
- Machine learning để improve detection
- User behavior analysis
- Integration với external moderation services