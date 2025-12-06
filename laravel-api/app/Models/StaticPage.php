<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaticPage extends Model
{
    protected $table = 'static_pages';

    protected $fillable = [
        'slug',
        'title',
        'content',
        'meta_description',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who last updated this page
     */
    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'updated_by', 'ID');
    }

    /**
     * Find a page by its slug
     */
    public static function findBySlug(string $slug): ?self
    {
        return self::where('slug', $slug)->first();
    }

    /**
     * Get default content for a page if it doesn't exist
     */
    public static function getDefaultContent(string $slug): array
    {
        $defaults = [
            'dieu-kien' => [
                'title' => 'Điều khoản và Điều kiện',
                'content' => self::getDefaultDieuKienContent(),
                'meta_description' => 'Điều khoản và điều kiện sử dụng dịch vụ Centimet2',
            ],
            'dieu-khoan' => [
                'title' => 'Điều khoản Dịch vụ',
                'content' => self::getDefaultDieuKhoanContent(),
                'meta_description' => 'Điều khoản dịch vụ của Centimet2',
            ],
            'chinh-sach-bao-mat' => [
                'title' => 'Chính sách Bảo mật',
                'content' => self::getDefaultChinhSachBaoMatContent(),
                'meta_description' => 'Chính sách bảo mật của Centimet2',
            ],
            'xoa-du-lieu-nguoi-dung' => [
                'title' => 'Xóa Dữ liệu Người dùng',
                'content' => self::getDefaultXoaDuLieuContent(),
                'meta_description' => 'Hướng dẫn xóa dữ liệu người dùng trên Centimet2',
            ],
            'chinh-sach-ban-hang-mua-hang' => [
                'title' => 'Chính sách Bán hàng & Mua hàng',
                'content' => self::getDefaultChinhSachBanHangContent(),
                'meta_description' => 'Chính sách bán hàng và mua hàng trên Centimet2',
            ],
            'dieu-khoan-dieu-kien' => [
                'title' => 'Điều khoản và Điều kiện',
                'content' => self::getDefaultDieuKhoanDieuKienContent(),
                'meta_description' => 'Điều khoản và điều kiện sử dụng Centimet2',
            ],
        ];

        return $defaults[$slug] ?? [
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'content' => '<p>Nội dung trang chưa được cập nhật.</p>',
            'meta_description' => '',
        ];
    }

    private static function getDefaultDieuKienContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Giới thiệu</h2>
    <p class="text-gray-700 mb-4">
        Chào mừng bạn đến với Centimet2. Bằng việc truy cập và sử dụng website của chúng tôi,
        bạn đồng ý tuân thủ và chịu ràng buộc bởi các điều khoản và điều kiện sau đây.
    </p>
    <p class="text-gray-700">
        Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ của chúng tôi.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Định nghĩa</h2>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li><strong>"Chúng tôi"</strong>, <strong>"của chúng tôi"</strong> đề cập đến Centimet2.</li>
        <li><strong>"Bạn"</strong>, <strong>"của bạn"</strong> đề cập đến người dùng hoặc khách truy cập website.</li>
        <li><strong>"Dịch vụ"</strong> đề cập đến tất cả các tính năng và chức năng được cung cấp trên website.</li>
        <li><strong>"Nội dung"</strong> bao gồm văn bản, hình ảnh, video và các tài liệu khác.</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Điều kiện sử dụng</h2>
    <p class="text-gray-700 mb-4">
        Khi sử dụng dịch vụ của chúng tôi, bạn cam kết:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Cung cấp thông tin chính xác và đầy đủ khi đăng ký tài khoản.</li>
        <li>Bảo mật thông tin đăng nhập và chịu trách nhiệm về mọi hoạt động dưới tài khoản của bạn.</li>
        <li>Không sử dụng dịch vụ cho mục đích bất hợp pháp hoặc vi phạm quyền của người khác.</li>
        <li>Không đăng tải nội dung vi phạm bản quyền, thương hiệu hoặc quyền sở hữu trí tuệ.</li>
        <li>Không spam, quấy rối hoặc gây hại cho người dùng khác.</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu bạn có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên hệ với chúng tôi:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> support@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
        <li><strong>Địa chỉ:</strong> Việt Nam</li>
    </ul>
</section>
HTML;
    }

    private static function getDefaultDieuKhoanContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Chấp nhận Điều khoản</h2>
    <p class="text-gray-700 mb-4">
        Bằng việc truy cập và sử dụng dịch vụ của Centimet2, bạn xác nhận rằng bạn đã đọc,
        hiểu và đồng ý tuân thủ các Điều khoản Dịch vụ này.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Mô tả Dịch vụ</h2>
    <p class="text-gray-700 mb-4">
        Centimet2 cung cấp một nền tảng trực tuyến cho phép người dùng:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Tạo và chia sẻ nội dung, bài viết, hình ảnh</li>
        <li>Kết nối và tương tác với người dùng khác</li>
        <li>Tham gia các nhóm cộng đồng</li>
        <li>Mua bán sản phẩm và dịch vụ thông qua các cửa hàng</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> support@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
    </ul>
</section>
HTML;
    }

    private static function getDefaultChinhSachBaoMatContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Thu thập Thông tin</h2>
    <p class="text-gray-700 mb-4">
        Chúng tôi thu thập các loại thông tin sau khi bạn sử dụng dịch vụ của Centimet2:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li><strong>Thông tin cá nhân:</strong> Tên, email, số điện thoại khi đăng ký tài khoản</li>
        <li><strong>Thông tin hồ sơ:</strong> Ảnh đại diện, tiểu sử, địa chỉ (nếu cung cấp)</li>
        <li><strong>Dữ liệu sử dụng:</strong> Lịch sử truy cập, tương tác với nội dung</li>
        <li><strong>Thông tin thiết bị:</strong> Loại thiết bị, trình duyệt, địa chỉ IP</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Sử dụng Thông tin</h2>
    <p class="text-gray-700 mb-4">
        Thông tin của bạn được sử dụng để:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Cung cấp và cải thiện dịch vụ</li>
        <li>Cá nhân hóa trải nghiệm người dùng</li>
        <li>Gửi thông báo quan trọng về tài khoản</li>
        <li>Bảo vệ an ninh và ngăn chặn gian lận</li>
        <li>Tuân thủ các yêu cầu pháp lý</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Bảo mật Thông tin</h2>
    <p class="text-gray-700 mb-4">
        Chúng tôi áp dụng các biện pháp bảo mật để bảo vệ thông tin của bạn:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Mã hóa dữ liệu khi truyền tải (SSL/TLS)</li>
        <li>Lưu trữ mật khẩu được mã hóa</li>
        <li>Kiểm soát truy cập nghiêm ngặt</li>
        <li>Giám sát và phát hiện xâm nhập</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Quyền của Bạn</h2>
    <p class="text-gray-700 mb-4">
        Bạn có các quyền sau đối với dữ liệu cá nhân:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Truy cập và xem thông tin cá nhân</li>
        <li>Chỉnh sửa thông tin không chính xác</li>
        <li>Yêu cầu xóa dữ liệu cá nhân</li>
        <li>Rút lại sự đồng ý sử dụng dữ liệu</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> privacy@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
    </ul>
</section>
HTML;
    }

    private static function getDefaultXoaDuLieuContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Giới thiệu</h2>
    <p class="text-gray-700 mb-4">
        Tại Centimet2, chúng tôi tôn trọng quyền riêng tư của bạn. Trang này hướng dẫn cách yêu cầu
        xóa dữ liệu cá nhân của bạn khỏi hệ thống của chúng tôi.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Dữ liệu Có thể Xóa</h2>
    <p class="text-gray-700 mb-4">
        Khi yêu cầu xóa dữ liệu, các thông tin sau sẽ được xóa:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Thông tin hồ sơ cá nhân (tên, email, số điện thoại)</li>
        <li>Ảnh đại diện và ảnh bìa</li>
        <li>Bài viết và nội dung bạn đã đăng</li>
        <li>Bình luận và tương tác</li>
        <li>Lịch sử tin nhắn</li>
        <li>Thông tin cửa hàng (nếu có)</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Cách Yêu cầu Xóa Dữ liệu</h2>
    <p class="text-gray-700 mb-4">
        Bạn có thể yêu cầu xóa dữ liệu bằng một trong các cách sau:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li><strong>Trong ứng dụng:</strong> Vào Cài đặt → Tài khoản → Xóa tài khoản</li>
        <li><strong>Email:</strong> Gửi yêu cầu đến privacy@centimet2.com với tiêu đề "Yêu cầu xóa dữ liệu"</li>
        <li><strong>Biểu mẫu:</strong> Điền biểu mẫu yêu cầu xóa dữ liệu trên website</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Thời gian Xử lý</h2>
    <p class="text-gray-700 mb-4">
        Yêu cầu xóa dữ liệu sẽ được xử lý trong vòng 30 ngày kể từ khi nhận được yêu cầu hợp lệ.
        Một số dữ liệu có thể được giữ lại theo yêu cầu pháp lý.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu có câu hỏi, vui lòng liên hệ:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> privacy@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
    </ul>
</section>
HTML;
    }

    private static function getDefaultChinhSachBanHangContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Quy định Chung</h2>
    <p class="text-gray-700 mb-4">
        Centimet2 là nền tảng kết nối người mua và người bán. Chúng tôi không trực tiếp bán hàng
        mà tạo điều kiện cho các giao dịch giữa người dùng.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Quy định cho Người bán</h2>
    <p class="text-gray-700 mb-4">
        Người bán trên Centimet2 cần tuân thủ các quy định sau:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Cung cấp thông tin sản phẩm chính xác, đầy đủ</li>
        <li>Đăng hình ảnh thực tế của sản phẩm</li>
        <li>Niêm yết giá rõ ràng, bao gồm các loại phí (nếu có)</li>
        <li>Giao hàng đúng hẹn và đúng mô tả</li>
        <li>Hỗ trợ đổi/trả hàng theo chính sách đã công bố</li>
        <li>Không bán hàng cấm, hàng giả, hàng nhái</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Quy định cho Người mua</h2>
    <p class="text-gray-700 mb-4">
        Người mua trên Centimet2 cần tuân thủ các quy định sau:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Cung cấp thông tin nhận hàng chính xác</li>
        <li>Thanh toán đúng hạn theo phương thức đã chọn</li>
        <li>Kiểm tra hàng khi nhận và phản hồi trong thời gian quy định</li>
        <li>Tôn trọng và giao tiếp lịch sự với người bán</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Chính sách Đổi/Trả hàng</h2>
    <p class="text-gray-700 mb-4">
        Chính sách đổi/trả hàng do từng cửa hàng quy định. Người mua nên kiểm tra kỹ chính sách
        của cửa hàng trước khi mua. Các trường hợp được đổi/trả thường bao gồm:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Sản phẩm không đúng mô tả</li>
        <li>Sản phẩm bị lỗi, hư hỏng</li>
        <li>Giao sai sản phẩm</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Giải quyết Tranh chấp</h2>
    <p class="text-gray-700 mb-4">
        Trong trường hợp có tranh chấp, người dùng có thể:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Liên hệ trực tiếp với đối tác để giải quyết</li>
        <li>Yêu cầu Centimet2 hỗ trợ hòa giải</li>
        <li>Khiếu nại qua hệ thống báo cáo</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu có câu hỏi về chính sách bán hàng/mua hàng:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> support@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
    </ul>
</section>
HTML;
    }

    private static function getDefaultDieuKhoanDieuKienContent(): string
    {
        return <<<HTML
<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Giới thiệu</h2>
    <p class="text-gray-700 mb-4">
        Chào mừng bạn đến với Centimet2. Đây là các Điều khoản và Điều kiện sử dụng dịch vụ của chúng tôi.
        Bằng việc sử dụng dịch vụ, bạn đồng ý với các điều khoản này.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Đăng ký Tài khoản</h2>
    <p class="text-gray-700 mb-4">
        Để sử dụng đầy đủ các tính năng của Centimet2, bạn cần đăng ký tài khoản với các yêu cầu:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Đủ 18 tuổi trở lên hoặc có sự đồng ý của phụ huynh</li>
        <li>Cung cấp thông tin chính xác và cập nhật</li>
        <li>Mỗi người chỉ được sở hữu một tài khoản</li>
        <li>Bảo mật thông tin đăng nhập</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Quy tắc Sử dụng</h2>
    <p class="text-gray-700 mb-4">
        Người dùng cam kết không thực hiện các hành vi sau:
    </p>
    <ul class="list-disc pl-6 text-gray-700 space-y-2">
        <li>Vi phạm pháp luật Việt Nam</li>
        <li>Đăng nội dung phản động, bạo lực, khiêu dâm</li>
        <li>Xâm phạm quyền riêng tư của người khác</li>
        <li>Spam, lừa đảo, phát tán mã độc</li>
        <li>Giả mạo danh tính</li>
        <li>Vi phạm bản quyền, sở hữu trí tuệ</li>
    </ul>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Quyền Sở hữu Nội dung</h2>
    <p class="text-gray-700 mb-4">
        Bạn giữ quyền sở hữu nội dung bạn đăng tải. Tuy nhiên, bạn cấp cho Centimet2 quyền sử dụng
        nội dung để vận hành và quảng bá dịch vụ.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Chấm dứt Tài khoản</h2>
    <p class="text-gray-700 mb-4">
        Centimet2 có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu vi phạm các điều khoản sử dụng.
        Bạn cũng có thể tự xóa tài khoản bất cứ lúc nào.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Giới hạn Trách nhiệm</h2>
    <p class="text-gray-700 mb-4">
        Centimet2 không chịu trách nhiệm về các giao dịch giữa người dùng, nội dung do người dùng đăng tải,
        hoặc các thiệt hại phát sinh từ việc sử dụng dịch vụ.
    </p>
</section>

<section class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">7. Liên hệ</h2>
    <p class="text-gray-700 mb-4">
        Nếu có câu hỏi về điều khoản và điều kiện:
    </p>
    <ul class="list-none text-gray-700 space-y-2">
        <li><strong>Email:</strong> support@centimet2.com</li>
        <li><strong>Điện thoại:</strong> 1900-xxxx</li>
    </ul>
</section>
HTML;
    }
}
