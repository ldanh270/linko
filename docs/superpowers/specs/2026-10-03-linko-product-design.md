# Linko — Product design, SRS và RDS

**Phiên bản:** 0.1 · **Ngày:** 2026-10-03 · **Trạng thái:** Bản thiết kế để review

Tài liệu này thống nhất hướng sản phẩm, hệ thống giao diện, yêu cầu phần mềm (SRS — Software Requirements Specification) và thiết kế giải pháp (RDS — Requirements & Design Specification). Các quyết định sản phẩm dưới đây là đề xuất cụ thể cho bản đầu, không mô tả tất cả là tính năng đã có trong mã nguồn.

## 1. Mục tiêu và phạm vi

### 1.1 Định vị

Linko là ứng dụng trò chuyện cho **nhóm riêng có chung sở thích**. Một nhóm có một phòng chat; thành viên tham gia qua lời mời. Trải nghiệm cần làm cho việc tạo nhóm, đưa bạn bè vào, trò chuyện và tìm lại thông tin quan trọng trở nên dễ dàng, gần gũi.

Nhóm mục tiêu đầu tiên là các nhóm bạn cùng đọc sách, chơi game, học ngoại ngữ, làm đồ thủ công hoặc tổ chức một hoạt động chung. Linko không cung cấp danh mục cộng đồng công khai trong bản đầu.

### 1.2 Kết quả mong muốn

- Một người mới có thể đăng ký, tạo nhóm riêng và chia sẻ lời mời mà không cần chuẩn bị sẵn thành viên.
- Người được mời hiểu mình sắp tham gia nhóm nào trước khi xác nhận.
- Thành viên có thể trao đổi tin nhắn, trả lời, nhắc tên, gửi tệp và xem thông tin nhóm trên cả desktop lẫn điện thoại.
- Chủ nhóm và quản trị viên kiểm soát lời mời, thành viên và nội dung ghim.
- Nội dung nhóm và tệp đính kèm chỉ đến được người có quyền; trạng thái gửi và lỗi mạng được giải thích rõ trong giao diện.

### 1.3 Giả định và giới hạn bản đầu

| Chủ đề | Quyết định bản đầu |
|---|---|
| Nền tảng | Web responsive, ưu tiên desktop và điện thoại; chưa làm ứng dụng native. |
| Kiểu nhóm | Riêng tư, tham gia bằng lời mời; một nhóm = một `GROUP` conversation. |
| Quy mô | Tối đa 100 thành viên mỗi nhóm; tối đa 100 nhóm/người dùng. Đây là giới hạn sản phẩm và tải kiểm thử ban đầu. |
| Lịch sử khi vào nhóm | Thành viên mới chỉ xem tin nhắn gửi từ thời điểm tham gia; lời mời và màn xem trước nêu rõ quy tắc này. |
| Chat riêng | Giữ quy tắc hiện có: chỉ hai người đã kết bạn mới bắt đầu chat riêng. |
| Tệp | Tối đa 5 tệp/tin, 10 MiB/tệp; dùng các loại tệp backend đang chấp nhận. |
| Ngôn ngữ | Giao diện tiếng Việt trước; nội dung và tên người dùng dùng Unicode. |
| Gọi thoại/video | Không thuộc bản đầu; chỉ xem xét khi vòng sử dụng nhóm và chat đã ổn định. |

### 1.4 Phân kỳ

| Giai đoạn | Phạm vi |
|---|---|
| MVP | Tài khoản, hồ sơ, nhóm riêng, lời mời, vai trò, hộp thư, chat chữ/tệp/trả lời/nhắc tên, chưa đọc, ghim tối đa 3 tin, tùy chọn tắt thông báo nhóm, trạng thái lỗi và responsive. |
| Sau MVP | Tìm kiếm nội dung tin nhắn, phản ứng emoji, sửa/thu hồi tin, bộ sưu tập ảnh/tệp, thông báo đẩy, chặn/báo cáo, nhiều tùy chọn riêng tư. |
| Xa hơn | Lịch hẹn, khảo sát, nhiều phòng theo chủ đề, gọi thoại/video, ứng dụng native. |

## 2. Người dùng, quyền và hành trình

### 2.1 Vai trò

| Vai trò | Khả năng |
|---|---|
| Khách | Xem trang giới thiệu và phần xem trước an toàn của một lời mời; cần đăng nhập để tham gia. |
| Thành viên | Đọc/gửi tin từ khi tham gia, tải tệp được phép, xem thành viên, rời nhóm, tắt thông báo cá nhân. |
| Quản trị viên | Quyền thành viên, tạo/thu hồi lời mời, ghim/bỏ ghim tin, xóa thành viên thường, sửa thông tin nhóm. |
| Chủ nhóm | Quyền quản trị viên, cấp/thu hồi quyền quản trị, chuyển quyền sở hữu, đóng nhóm. |

Quản trị viên không thể xóa hoặc hạ quyền chủ nhóm. Chủ nhóm phải chuyển quyền sở hữu trước khi rời nhóm nếu vẫn còn thành viên khác. Đóng nhóm dừng gửi tin và thu hồi toàn bộ lời mời; việc xóa dữ liệu vĩnh viễn cần một quy trình riêng sau MVP.

### 2.2 Hành trình chính

1. Người dùng đăng ký hoặc đăng nhập.
2. Từ khu vực **Nhóm**, họ tạo nhóm với tên và mô tả; nhóm được tạo với một thành viên là chủ nhóm.
3. Chủ nhóm tạo link mời có hạn 7 ngày, tối đa 25 lượt tham gia và có thể thu hồi sớm.
4. Người nhận mở link, xem tên, ảnh, mô tả, số thành viên và quy tắc lịch sử; đăng nhập và xác nhận tham gia.
5. Nhóm xuất hiện trong hộp thư. Thành viên trao đổi trong một phòng chat, xem tin ghim và quản lý thông báo.

Link mời là bí mật có thể chuyển tiếp. Bất kỳ người có link hợp lệ và tài khoản Linko đều có thể xin vào nhóm cho tới khi hết hạn/hết lượt; người tạo lời mời kiểm soát bằng cách thu hồi. Bản đầu không có duyệt thủ công từng yêu cầu tham gia.

## 3. Hướng thiết kế giao diện

### 3.1 Tính cách và nguyên tắc

**Warm Social:** ấm, gần gũi, tinh gọn. Ảnh đại diện, tên và nội dung nhóm đem lại cá tính; cấu trúc ứng dụng giữ yên tĩnh để người dùng đọc và trả lời lâu. Nền ấm nhẹ, màu nhấn tím chàm, góc bo mềm, rất ít hiệu ứng trang trí. Không dùng hình nền chat nhiều chi tiết, hiệu ứng kính mờ phủ nội dung hoặc thẻ nổi cho từng dòng tin.

Ba nguyên tắc khi thiết kế màn hình:

1. **Cuộc trò chuyện đứng đầu:** nội dung và ô soạn luôn có thứ bậc rõ hơn điều khiển phụ.
2. **Nhóm có ngữ cảnh:** tên, mô tả, người tham gia và tin ghim dễ thấy mà không chiếm quá nhiều diện tích chat.
3. **Quyền riêng tư rõ ràng:** lời mời, thành viên, tệp và lỗi truy cập dùng ngôn ngữ dễ hiểu; không ám chỉ nhóm là công khai.

### 3.2 Màu sắc

| Token | Light | Dark | Cách dùng |
|---|---|---|---|
| `background` | `#FAF9F6` | `#17171C` | Nền ngoài và khoảng trống. |
| `surface` | `#FFFFFF` | `#24242B` | Danh sách, vùng chat, hộp thoại. |
| `surface-subtle` | `#F4F2EE` | `#2C2C34` | Hover và vùng phụ. |
| `text-primary` | `#252525` | `#F5F4F2` | Nội dung chính. |
| `text-secondary` | `#6B6B73` | `#B8B7C0` | Thời gian, mô tả phụ. |
| `brand` | `#4F46E5` | `#A69DFF` | CTA, tab được chọn, liên kết. |
| `brand-soft` | `#EDEBFF` | `#373257` | Tin nhắn của mình, trạng thái chọn. |
| `border` | `#E9E7E2` | `#383840` | Đường phân cách. |
| `positive` | `#147D64` | `#67D4AC` | Đã gửi/thành công/trực tuyến khi cần. |
| `danger` | `#C2410C` | `#FF9B82` | Lỗi và hành động có hậu quả. |

Tin nhắn của người khác dùng `surface-subtle`, tin của mình dùng `brand-soft`; chữ vẫn là `text-primary`. Màu không là tín hiệu duy nhất: trạng thái gửi, lỗi và chưa đọc còn có biểu tượng hoặc chữ. Cặp màu chữ/nền bản sáng cần đạt WCAG 2.2 AA: chữ thường ít nhất 4,5:1; chữ lớn và thành phần giao diện ít nhất 3:1. Các cặp màu mới phải được kiểm tra trước khi đưa vào UI.

### 3.3 Chữ, khoảng cách và hình khối

- **Font:** Be Vietnam Pro cho toàn bộ UI, trọng số 400/500/600/700; fallback `system-ui, sans-serif`. Không trộn nhiều font trong phòng chat.
- **Thang chữ:** tiêu đề trang 28/36 px; tiêu đề vùng 20/28 px; nhãn/tên 14/21 px với độ đậm 600; tin nhắn 15/23 px; nội dung phụ 13/20 px; metadata 12/18 px. Người dùng có thể phóng to trang tới 200% mà không mất chức năng.
- **Spacing:** đơn vị 4 px; ưu tiên 8, 12, 16, 24, 32 px. Padding ngang mobile 16 px, desktop 24 px. Khoảng cách giữa hai nhóm tin của cùng người gửi 4 px; đổi người gửi hoặc ngày 16–24 px.
- **Kích thước:** dòng danh sách chat khoảng 72 px; avatar danh sách 44 px, trong nhóm tin 32 px; vùng bấm ưu tiên tối thiểu 44 × 44 px; ô soạn tối thiểu cao 48 px.
- **Bo góc:** control 10–12 px, card/hộp thoại 16 px, bong bóng tin 18 px với một góc hướng về người gửi 6 px. Không lạm dụng bóng đổ; ưu tiên viền và phân lớp bằng nền.
- **Icon:** kích thước 20 px, nét 1,75–2 px, luôn có nhãn truy cập. Chuyển động 120–180 ms và tôn trọng `prefers-reduced-motion`.

### 3.4 Responsive và điều hướng

| Bề rộng viewport | Bố cục |
|---|---|
| Dưới 768 px | Một màn tại một thời điểm; thanh dưới **Tin nhắn · Nhóm · Cá nhân**. Từ danh sách mở phòng chat toàn màn; nút quay lại rõ ràng. |
| 768–1199 px | Thanh điều hướng hẹp, danh sách chat khoảng 300 px, vùng chat linh hoạt; thông tin nhóm mở dạng panel phủ. |
| Từ 1200 px | Thanh điều hướng 72 px, danh sách 320 px, vùng chat linh hoạt, bảng thông tin nhóm khoảng 320 px khi mở. |

Khung chat tối ưu chiều rộng đọc; bong bóng tin tối đa 560 px hoặc 72% vùng chat. Trên mobile, ô soạn nằm trên bàn phím ảo và không che tin mới. Khi không chọn hội thoại ở desktop, vùng chat có trạng thái chào mừng ngắn và hành động mở/tạo nhóm.

## 4. Bản đồ màn hình và trạng thái

| ID | Màn hình | Nội dung / hành động | Trạng thái đặc biệt |
|---|---|---|---|
| UI-01 | Chào mừng | Lời giới thiệu ngắn, đăng ký, đăng nhập. | Đã có phiên thì vào hộp thư. |
| UI-02 | Đăng ký | Username, tên hiển thị, email, mật khẩu. | Trùng tài khoản, dữ liệu không hợp lệ, lỗi mạng. |
| UI-03 | Đăng nhập | Username và mật khẩu. | Sai thông tin, phiên hết hạn, lỗi mạng. |
| UI-04 | Hộp thư | Nhóm và chat riêng theo hoạt động mới nhất; số chưa đọc; bộ lọc Tất cả/Nhóm/Cá nhân. | Chưa có hội thoại, đang tải, mất kết nối. |
| UI-05 | Danh sách nhóm | Nhóm đang tham gia, nút tạo nhóm, lời mời chờ mở. | Chưa có nhóm. |
| UI-06 | Tạo nhóm | Tên, mô tả, ảnh tùy chọn; tạo xong có thể mời ngay. | Tên trống/quá dài, upload lỗi. |
| UI-07 | Xem trước lời mời | Tên/ảnh/mô tả/số thành viên, quy tắc lịch sử, nút tham gia. | Hết hạn, hết lượt, bị thu hồi, đã là thành viên. |
| UI-08 | Phòng chat nhóm | Header nhóm, danh sách tin, ô soạn, tệp, trả lời, nhắc tên, tin ghim. | Gửi lỗi/thử lại, đang tải lịch sử, mất kết nối. |
| UI-09 | Phòng chat riêng | Cùng hệ chat, thông tin người kia. | Không còn là bạn, người kia không khả dụng. |
| UI-10 | Thông tin nhóm | Mô tả, thành viên, tin ghim, tắt thông báo, lời mời nếu có quyền. | Không còn tư cách thành viên. |
| UI-11 | Quản lý nhóm | Đổi tên/ảnh/mô tả, vai trò, xóa thành viên, đóng nhóm. | Không đủ quyền; xác nhận hành động quan trọng. |
| UI-12 | Tạo/quản lý lời mời | Tạo link, sao chép, hạn/lượt dùng, thu hồi. | Không có lời mời còn hiệu lực. |
| UI-13 | Bạn bè và hồ sơ người khác | Tìm người dùng, kết bạn, bắt đầu chat riêng khi đã là bạn. | Không có kết quả, lời mời đang chờ. |
| UI-14 | Hồ sơ của tôi | Avatar, ảnh nền, tên, bio, chỉnh sửa. | Ảnh sai định dạng/quá lớn. |
| UI-15 | Cài đặt | Giao diện sáng/tối/theo hệ thống, thông báo, tài khoản, đăng xuất. | Lưu thất bại. |
| UI-16 | Trình xem tệp/ảnh | Xem trước ảnh đủ quyền và tải các tệp khác. | Tệp bị xóa, không còn quyền, tải thất bại. |

Quên/đặt lại mật khẩu là một luồng cần có trước khi phát hành công khai, nhưng chưa có backend hiện tại và không thuộc MVP nội bộ này. MVP cần thông báo rõ kênh hỗ trợ tài khoản thay vì hiển thị nút đặt lại mật khẩu chưa hoạt động.

## 5. SRS — Software Requirements Specification

### 5.1 Yêu cầu chức năng MVP

Mỗi mã `FR` là một yêu cầu có thể kiểm thử. Tất cả yêu cầu trong bảng là mức **Must** cho MVP trừ khi ghi khác.

| Mã | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| FR-01 | Đăng ký, đăng nhập, làm mới phiên và đăng xuất. | Tài khoản hợp lệ vào được ứng dụng; tài khoản chưa xác thực không đọc được dữ liệu riêng; đăng xuất vô hiệu hóa phiên hiện tại. |
| FR-02 | Xem và sửa hồ sơ cá nhân. | Tên, bio, avatar/ảnh nền cập nhật và xuất hiện nhất quán ở màn liên quan; file không hợp lệ có thông báo cụ thể. |
| FR-03 | Tạo nhóm riêng với chủ nhóm là người tạo. | Có thể tạo nhóm chỉ với một người, bắt buộc tên dài 1–80 ký tự, mô tả tối đa 500 ký tự; nhóm không xuất hiện trong tìm kiếm công khai. |
| FR-04 | Tạo và thu hồi link mời. | Owner/Admin tạo link có hạn 7 ngày và 25 lượt tham gia; token khó đoán, lưu dưới dạng hash; thu hồi làm link vô hiệu ngay. |
| FR-05 | Xem trước và chấp nhận lời mời. | Người mở link xem thông tin tối thiểu; đăng nhập để tham gia; lời mời hết hạn/hết lượt/thu hồi không thêm thành viên; tham gia lặp lại không tạo bản ghi trùng. |
| FR-06 | Quản lý thành viên và vai trò. | Owner/Admin làm đúng quyền ở §2.1; không tự nâng quyền; chủ nhóm chuyển quyền trước khi rời. |
| FR-07 | Liệt kê nhóm và hội thoại. | Chỉ trả nhóm đang tham gia; sắp theo tin gần nhất; hiển thị chưa đọc và loại hội thoại. |
| FR-08 | Gửi, nhận và phân trang tin nhắn. | Thành viên gửi tin tối đa 4.000 ký tự; tin lưu thành công có ID ổn định; không gửi trùng khi thử lại; người không thuộc nhóm không đọc/gửi được. |
| FR-09 | Trả lời và nhắc tên. | `replyTo` chỉ trỏ tới tin trong cùng hội thoại mà người dùng được xem; nhắc tên chỉ chấp nhận thành viên hiện tại. |
| FR-10 | Gửi và tải tệp. | Tối đa 5 tệp/tin và 10 MiB/tệp; chỉ định dạng backend cho phép; tải file riêng phải kiểm tra quyền với từng yêu cầu. |
| FR-11 | Cập nhật chat thời gian thực. | Thành viên đang mở nhóm nhận tin mới sau khi server lưu; client xử lý mất kết nối và đồng bộ lại, không nhân đôi tin. |
| FR-12 | Đánh dấu đã đọc và đếm chưa đọc. | Mở phòng chat đánh dấu các tin đã nhận là đã đọc; số chưa đọc của chính người dùng cập nhật khi có tin mới/đọc; không rò trạng thái cá nhân qua nhóm khác. |
| FR-13 | Ghim tối đa ba tin của nhóm. | Owner/Admin ghim/bỏ ghim tin còn tồn tại; thành viên mở nhanh tin ghim mà mình có quyền xem. |
| FR-14 | Tùy chọn thông báo cho từng nhóm. | Thành viên tắt/bật thông báo trong ứng dụng của riêng mình; khi tắt, tin mới không hiện toast nhưng số chưa đọc vẫn tăng và lựa chọn của người khác không đổi. |
| FR-15 | Quản lý vòng đời nhóm. | Thành viên rời nhóm thì mất quyền đọc/gửi/tải tệp; đóng nhóm chặn tin mới và lời mời; chỉ chủ nhóm được đóng. |
| FR-16 | Chat riêng giữa bạn bè. | Chỉ cặp đã kết bạn bắt đầu chat riêng; một cặp không tạo nhiều `DIRECT` conversation; hủy kết bạn chặn tin mới. |

### 5.2 Quy tắc dữ liệu và riêng tư

- Thành viên mới chỉ nhận các tin có `createdAt >= joinedAt` của lần tham gia hiện tại. Tin ghim cũ không hiện nếu không thuộc lịch sử được xem.
- Bản xem trước tin cuối trong hộp thư cũng tuân theo `joinedAt`; không để lộ nội dung cũ qua `lastMessage`, tìm kiếm hay dữ liệu socket. Route tải tệp kiểm tra cả membership hiện tại lẫn thời gian của tin chứa tệp.
- Thành viên rời hoặc bị xóa không thể lấy lịch sử/tệp nhóm qua REST, Socket.IO hay URL cũ. Truy cập tệp lịch sử dạng URL công khai đã tồn tại không thể thu hồi bằng quyền ứng dụng; bản MVP phải đánh dấu riêng giới hạn này và không tạo tệp công khai mới.
- Với chat riêng, backend kiểm tra tình trạng bạn bè cả khi gửi bằng `recipientId` lẫn khi gửi bằng `conversationId`; một cuộc trò chuyện cũ không được dùng để vượt qua quy tắc kết bạn.
- Khi tạo link mời, giao diện nhắc rằng người có link có thể chuyển tiếp; chỉ owner/admin được xem và thu hồi link.
- Nội dung nhóm không xuất hiện trên trang công khai, trong kết quả tìm kiếm người dùng hoặc metadata của lời mời ngoài phần xem trước tối thiểu.
- Mọi thao tác nhạy cảm kiểm tra quyền ở server; trạng thái ẩn/hiện của nút trong UI không thay cho kiểm tra quyền.

### 5.3 Yêu cầu phi chức năng

| Mã | Yêu cầu có thể kiểm thử |
|---|---|
| NFR-01 — Responsive | Các luồng MVP dùng được ở viewport rộng 360–1440 px mà không có cuộn ngang toàn trang hay phần điều khiển bị che. |
| NFR-02 — Accessibility | Mục tiêu WCAG 2.2 AA cho giao diện web: tương phản, focus rõ, bàn phím, nhãn trình đọc màn hình, thứ tự tab, không chỉ dùng màu để báo trạng thái; zoom 200% vẫn dùng được. |
| NFR-03 — Hiệu năng | Ở môi trường thử nghiệm có 100 người đồng thời và nhóm 100 thành viên, p95 `GET` hộp thư và trang đầu tin nhắn dưới 1 giây; p95 tin mới xuất hiện ở client đang kết nối dưới 2 giây sau khi API ghi thành công. Đo trong cùng khu vực mạng; tách thời gian upload tệp. |
| NFR-04 — Khả năng phục hồi | Khi mất kết nối, tin chưa được server xác nhận hiển thị trạng thái chờ/lỗi; thử lại dùng khóa idempotency; khi kết nối lại, client lấy phần tin còn thiếu theo cursor. |
| NFR-05 — Bảo mật | Xác thực REST và Socket.IO, phân quyền theo conversation trên mỗi thao tác; giới hạn tốc độ đăng nhập/tạo lời mời; token mời lưu hash; không lộ khóa R2 hoặc đường dẫn bucket riêng. |
| NFR-06 — Dữ liệu | Tin nhắn phân trang bằng cursor và sắp xếp ổn định; các thao tác tạo tin/lời mời/tham gia có bảo vệ chống gửi lặp. |
| NFR-07 — Quan sát | Ghi log lỗi có request ID, mã thao tác và conversation ID khi phù hợp; không ghi mật khẩu, token, nội dung tin hoặc khóa lưu trữ. |

## 6. RDS — Requirements & Design Specification

### 6.1 Kiến trúc chức năng

| Khối | Trách nhiệm | Phần hiện có / cần bổ sung |
|---|---|---|
| Frontend Next.js | Điều hướng, UI responsive, trạng thái gửi, session, đồng bộ REST/Socket. | Hiện là trang mẫu; cần xây mới UI sản phẩm. |
| Auth/Profile API | Tài khoản, phiên, hồ sơ. | Có nền backend; cần hoàn thiện phản hồi lỗi và tích hợp frontend. |
| Group/Invitation API | Tạo nhóm, vai trò, thành viên, link mời, ghim. | Có model conversation và tạo nhóm; cần API vòng đời nhóm/lời mời/quyền. |
| Messaging API | Gửi, tải, phân trang tin và tệp, đánh dấu đã đọc. | Có một phần; cần hoàn thiện read state và các ràng buộc nhóm. |
| Realtime gateway | Xác thực socket, vào room, phát sự kiện tin/conversation, đồng bộ sau reconnect. | Socket.IO mới có kết nối/ngắt kết nối; cần sự kiện và kiểm tra quyền. |
| MongoDB | User, Session, Friendship, Conversation, Message và Invitation. | Các model trừ Invitation đã có; một số trường cần bổ sung. |
| R2 | Ảnh hồ sơ công khai, tệp tin nhắn riêng. | Đã có luồng upload và tải tệp riêng qua API. |

Các khối giao tiếp qua API/sự kiện có hợp đồng rõ. Frontend không ghi trực tiếp vào MongoDB/R2. Socket chỉ phát trạng thái sau khi dữ liệu đã được lưu; REST là nguồn dữ liệu xác thực khi tải lại hoặc kết nối lại.

### 6.2 Mô hình dữ liệu đề xuất

| Thực thể | Các trường / thay đổi quan trọng | Ràng buộc |
|---|---|---|
| `User` | Giữ username, email, displayName, avatar, background, bio. | Username/email duy nhất; không trả hashedPassword ra client. |
| `Session` | Giữ phiên làm mới. | Đăng xuất vô hiệu hóa phiên và xóa cookie đúng tên. |
| `Conversation` | `conversationType`, `participants`, `group`, `lastMessage`; thêm `status=ACTIVE/CLOSED`, `group.pinnedMessageIds` tối đa 3. | DIRECT đúng 2 người; GROUP tối đa 100 thành viên; danh sách hội thoại chỉ truy xuất theo thành viên. |
| `Participant` trong `Conversation` | `userId`, `role`, `joinedAt`, `mutedUntil`, `lastReadAt`. | Một user chỉ có một participant đang hoạt động mỗi conversation. Rời nhóm thì xóa participant; tham gia lại tạo participant mới với `joinedAt` mới. |
| `Message` | `conversationId`, `senderId`, `content`, `replyTo`, `mentions`, `attachments`, timestamps; thêm `clientMessageId` để chống trùng. | Index `(conversationId, createdAt, _id)` phục vụ cursor; `clientMessageId` duy nhất theo người gửi và hội thoại. |
| `Invitation` mới | `conversationId`, `createdBy`, `tokenHash`, `expiresAt`, `maxUses=25`, `useCount`, `revokedAt`. | Token gốc chỉ hiện lúc tạo; xác nhận tham gia kiểm tra hiệu lực và tăng lượt dùng an toàn khi có yêu cầu đồng thời. |

Vì nhóm chỉ có tối đa 100 người trong MVP, có thể giữ `participants` nhúng trong `Conversation` theo cấu trúc hiện tại. Khi quy mô lớn hơn, phải đánh giá lại kích thước tài liệu, tần suất cập nhật chưa đọc và chiến lược tách membership. `seenBy` hiện ở cấp conversation không đủ làm mốc đọc chính xác theo từng thành viên; cần một trường đọc theo participant.

### 6.3 Hợp đồng API và sự kiện

Giữ các route auth/user/friend/message đang có khi hành vi phù hợp. Bổ sung hoặc hoàn thiện các khả năng sau; tên endpoint trong bảng là hợp đồng đề xuất cho RDS, chưa phải route đã triển khai.

| Khả năng | API đề xuất | Quyền |
|---|---|---|
| Tạo/liệt kê nhóm | `POST /api/conversations`, `GET /api/conversations` | Người đăng nhập. |
| Xem/sửa thông tin nhóm | `GET/PATCH /api/conversations/:id` | Thành viên / Owner hoặc Admin để sửa. |
| Thành viên và vai trò | `GET/POST/PATCH/DELETE /api/conversations/:id/participants` | Theo ma trận vai trò. |
| Tạo/liệt kê/thu hồi lời mời | `/api/conversations/:id/invitations` | Owner/Admin. |
| Xem trước và chấp nhận | `GET /api/invitations/:token/preview`, `POST /api/invitations/:token/accept` | Xem trước công khai giới hạn; tham gia cần đăng nhập. |
| Ghim và bỏ ghim | `PUT/DELETE /api/conversations/:id/pins/:messageId` | Owner/Admin. |
| Đánh dấu đã đọc | `PUT /api/conversations/:id/read` | Thành viên. |
| Tin và tệp | Route `/api/messages` hiện có và route tải tệp được bảo vệ. | Thành viên, kiểm tra từng yêu cầu. |

Socket xác thực tại handshake, tham gia room `conversation:{id}` chỉ sau khi kiểm tra membership. Server phát `message:created`, `conversation:updated`, `membership:changed`; sự kiện mang ID và dữ liệu tối thiểu. Sau khi mất kết nối, client gọi lại REST theo cursor. Khi tạo tin, client gửi `clientMessageId`; API trả tin đã lưu, socket phát cùng ID, frontend gộp hai phản hồi thành một tin duy nhất.

### 6.4 Luồng và lỗi quan trọng

**Gửi tin:** kiểm tra nội dung/tệp → xác thực và kiểm tra membership (thêm kiểm tra tình trạng bạn bè cho DIRECT) → lưu tệp riêng nếu có → lưu tin trong MongoDB → cập nhật `lastMessage`/chưa đọc → trả tin có ID → phát sự kiện. Nếu lưu tin thất bại sau upload, xóa các object mới. Client không gắn nhãn “đã gửi” trước khi API xác nhận.

**Tham gia bằng link:** xem trước tối thiểu → đăng nhập → xác nhận → kiểm tra token, nhóm còn hoạt động, sức chứa và tình trạng thành viên → ghi membership và lượt dùng trong thao tác chống tranh chấp → điều hướng tới phòng chat. Link sai/hết hạn/thu hồi/hết lượt có trang giải thích riêng.

**Rời hoặc bị xóa:** cập nhật membership → rời socket room → thu hồi quyền đọc/gửi/tải tệp ngay ở API → loại nhóm khỏi hộp thư. Client còn mở phòng chat chuyển sang màn thông báo không còn quyền.

**Mất kết nối:** ô soạn và tin nháp được giữ trong phiên trình duyệt; tin đang gửi hiển thị trạng thái rõ ràng; khi trở lại, đồng bộ theo cursor rồi mới đánh dấu đã đọc. Không tự gửi lại tin chưa xác nhận nếu chưa có khóa idempotency.

### 6.5 Đối chiếu hiện trạng repo

| Phần | Hiện trạng đọc từ repo | Hệ quả cho triển khai |
|---|---|---|
| Frontend | `frontend/app/page.tsx` vẫn là trang mặc định Next.js. | Thiết kế màn hình và hệ token sẽ cần triển khai từ đầu. |
| Auth | Có route signup/login/logout/refresh. | Cần kiểm tra và sửa các phản hồi HTTP/cookie trước khi tích hợp UI. |
| Nhóm | Có model GROUP và tạo nhóm, nhưng đang yêu cầu ít nhất hai thành viên được thêm khi tạo. | Đổi sang tạo nhóm một mình và mời sau; bổ sung quản trị thành viên/lời mời. |
| Participant | Các handler trong `conversationRoutes/participant.route.ts` còn rỗng. | Chưa thể dùng màn quản lý nhóm cho đến khi API hoàn thiện. |
| Tin nhắn | Có gửi, tải danh sách và tải tệp riêng; sửa/thu hồi/ẩn tin còn rỗng. | Chỉ thiết kế MVP theo chức năng gửi/đọc; sửa/thu hồi đưa sau MVP. |
| Realtime | `socket/socket.ts` mới xử lý kết nối và ngắt kết nối. | Cần xác thực, room, sự kiện và đồng bộ reconnect. |
| Friend request | Route từ chối đang trùng path với chấp nhận. | Sửa trước khi dùng luồng bạn bè ở UI. |

## 7. Ma trận nghiệm thu theo luồng

| Luồng kiểm tra | Yêu cầu | Màn hình | Kết quả cần thấy |
|---|---|---|---|
| Tạo nhóm một mình rồi mời | FR-03–05 | UI-05–07, UI-12 | Link hợp lệ đưa người nhận vào đúng nhóm; người lạ không thấy nhóm trong hộp thư. |
| Hai người dùng chat cùng nhóm | FR-07–12 | UI-04, UI-08 | Tin chỉ xuất hiện một lần, số chưa đọc và mốc đọc cập nhật đúng. |
| Thành viên mới xem lịch sử | FR-05, FR-08 | UI-07–08 | Chỉ thấy tin từ khi tham gia; tệp/tin ghim cũ không mở được. |
| Admin loại thành viên | FR-06, FR-15 | UI-10–11 | Người bị loại mất quyền đọc/gửi/tải tệp và socket room. |
| Upload tệp sai/đứt mạng | FR-10–11, NFR-04 | UI-08, UI-16 | Lỗi dễ hiểu, không có tin ma hoặc object R2 bị bỏ quên. |
| Bàn phím và mobile | NFR-01–02 | Toàn bộ UI-01–16 | Đi hết luồng bằng bàn phím, focus nhìn rõ; màn 360 px không che hành động. |

## 8. Thứ tự thiết kế và triển khai

Đây là một **bản thiết kế tổng thể**; không nên coi toàn bộ bảng FR là một lần triển khai. Chia thành các lát cắt có thể dùng và kiểm thử độc lập:

1. **Nền giao diện và phiên:** token, shell responsive, đăng nhập/đăng ký, hồ sơ.
2. **Nhóm và lời mời:** tạo nhóm một mình, xem trước, tham gia, vai trò, quản trị thành viên.
3. **Chat hoàn chỉnh:** inbox, phòng chat, tệp, trả lời/nhắc tên, realtime, đọc/chưa đọc, trạng thái lỗi.
4. **Ngữ cảnh nhóm:** ghim tin, tắt thông báo, thông tin nhóm, kiểm tra accessibility và hiệu năng toàn luồng.

Mỗi lát cắt cần kế hoạch riêng với hợp đồng API, thay đổi dữ liệu, màn hình và bài kiểm thử của chính nó. Sau khi tài liệu này được duyệt, bước lập kế hoạch đầu tiên nên tập trung vào **nền giao diện và phiên**.

## 9. Tài liệu tham chiếu

- [NASA Software Engineering Handbook — Software Requirements Specification](https://swehb.nasa.gov/spaces/SWEHBVB/pages/32604425/SRS%2B-%2BSoftware%2BRequirements%2BSpecification?desktop=true&macroName=div): cách trình bày yêu cầu, khả năng truy vết và phân kỳ.
- [W3C WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) và [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): chuẩn kiểm tra giao diện.
- [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro) và [giấy phép trong Google Fonts](https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt): nguồn phông chữ đề xuất.
